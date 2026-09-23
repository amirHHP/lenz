import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';
import { Env, ArticleRow, HighlightRow } from '../lib/types.js';
import { CURATED_DIRECTORY } from '../lib/directory.js';
import { fetchAndParseFeed, syncFeedInD1, syncAllFeedsInD1 } from '../lib/edge-rss.js';
import { extractFullArticle } from '../lib/edge-extractor.js';
import { 
  getUserTasteProfile, 
  onArticleStarred, 
  onArticleUnstarred, 
  onHighlightCreated, 
  onHighlightDeleted, 
  onArticleRead, 
  onArticleUnread 
} from '../lib/edge-ranking.js';
import { generateTodayBriefingInD1, getGeminiApiKey } from '../lib/edge-ai.js';
import { ensureD1Schema } from '../lib/d1-db.js';
import { 
  getTelegramBotToken, 
  sendTelegramMessage, 
  generateGroupNewsDigestInD1,
  detectLatestTelegramChatInD1,
  handleTelegramWebhookUpdateInD1
} from '../lib/edge-telegram.js';

const app = new Hono<{ Bindings: Env }>().basePath('/api');

app.use('*', cors());
app.use('*', async (c, next) => {
  if (!c.env?.DB) {
    return c.json({
      error: 'Cloudflare D1 database binding (DB) is not configured.',
      message: 'Please bind a D1 database named "lenzz-dbs" in your Cloudflare dashboard (Workers & Pages > lenz > Settings > Bindings).'
    }, 503);
  }
  await ensureD1Schema(c.env.DB);
  await next();
});

app.onError((err, c) => {
  console.error('[API Error]:', err);
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

// ==================== FOLDERS ====================
app.get('/folders', async (c) => {
  const res = await c.env.DB.prepare('SELECT * FROM folders ORDER BY order_index ASC, id ASC').all();
  return c.json({ folders: res.results || [] });
});

app.post('/folders', async (c) => {
  const { name, icon = 'folder', orderIndex = 0 } = await c.req.json();
  if (!name?.trim()) {
    return c.json({ error: 'Folder name is required' }, 400);
  }
  const insertRes = await c.env.DB.prepare(
    'INSERT INTO folders (name, icon, order_index) VALUES (?, ?, ?)'
  ).bind(name.trim(), icon, orderIndex).run();

  const folder = await c.env.DB.prepare('SELECT * FROM folders WHERE id = ?').bind(insertRes.meta.last_row_id).first();
  return c.json(folder, 201);
});

app.delete('/folders/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM folders WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// ==================== FEEDS ====================
app.get('/feeds', async (c) => {
  const res = await c.env.DB.prepare(`
    SELECT f.*, 
      (SELECT COUNT(*) FROM articles a WHERE a.feed_id = f.id AND a.is_read = 0) as unread_count
    FROM feeds f
    ORDER BY f.title ASC
  `).all();
  return c.json({ feeds: res.results || [] });
});

app.post('/feeds', async (c) => {
  const { url, folderId = null, title } = await c.req.json();
  if (!url?.trim()) {
    return c.json({ error: 'Feed URL is required' }, 400);
  }

  try {
    const parsed = await fetchAndParseFeed(url.trim());
    const feedTitle = title?.trim() || parsed.title || url;

    await c.env.DB.prepare(`
      INSERT INTO feeds (folder_id, title, url, site_url, description)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(url) DO UPDATE SET folder_id = excluded.folder_id, title = excluded.title
    `).bind(folderId, feedTitle, url.trim(), parsed.siteUrl, parsed.description).run();

    const feed = await c.env.DB.prepare('SELECT * FROM feeds WHERE url = ?').bind(url.trim()).first<any>();
    if (feed) {
      await syncFeedInD1(c.env.DB, feed.id);
    }

    return c.json(feed, 201);
  } catch (err: any) {
    return c.json({ error: 'Failed to add feed: ' + (err.message || String(err)) }, 400);
  }
});

app.put('/feeds/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const { folderId, title } = await c.req.json();

  if (folderId !== undefined && title !== undefined) {
    await c.env.DB.prepare('UPDATE feeds SET folder_id = ?, title = ? WHERE id = ?').bind(folderId, title, id).run();
  } else if (folderId !== undefined) {
    await c.env.DB.prepare('UPDATE feeds SET folder_id = ? WHERE id = ?').bind(folderId, id).run();
  } else if (title !== undefined) {
    await c.env.DB.prepare('UPDATE feeds SET title = ? WHERE id = ?').bind(title, id).run();
  }

  const feed = await c.env.DB.prepare('SELECT * FROM feeds WHERE id = ?').bind(id).first();
  return c.json(feed);
});

app.delete('/feeds/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM feeds WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

app.post('/feeds/sync', async (c) => {
  const result = await syncAllFeedsInD1(c.env.DB);
  return c.json({ success: true, ...result });
});

app.post('/feeds/:id/sync', async (c) => {
  const id = Number(c.req.param('id'));
  const result = await syncFeedInD1(c.env.DB, id);
  return c.json({ success: true, ...result });
});

// ==================== ARTICLES ====================
app.get('/articles', async (c) => {
  const { folderId, feedId, isRead, isStarred, sort = 'smart', search, limit = '100', offset = '0' } = c.req.query();

  let query = `
    SELECT a.*, f.title as feed_title, f.folder_id,
      (SELECT COUNT(*) FROM highlights h WHERE h.article_id = a.id) as highlight_count
    FROM articles a
    JOIN feeds f ON a.feed_id = f.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (folderId) {
    query += ` AND f.folder_id = ?`;
    params.push(Number(folderId));
  }

  if (feedId) {
    query += ` AND a.feed_id = ?`;
    params.push(Number(feedId));
  }

  if (isRead !== undefined) {
    query += ` AND a.is_read = ?`;
    params.push(isRead === 'true' || isRead === '1' ? 1 : 0);
  }

  if (isStarred !== undefined) {
    query += ` AND a.is_starred = ?`;
    params.push(isStarred === 'true' || isStarred === '1' ? 1 : 0);
  }

  if (search?.trim()) {
    query += ` AND (a.title LIKE ? OR a.summary LIKE ? OR a.keywords LIKE ?)`;
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  // Sorting
  if (sort === 'newest') {
    query += ` ORDER BY a.is_read ASC, a.published_at DESC`;
  } else if (sort === 'oldest') {
    query += ` ORDER BY a.is_read ASC, a.published_at ASC`;
  } else {
    // Smart importance
    query += ` ORDER BY a.is_read ASC, a.importance_score DESC, a.published_at DESC`;
  }

  query += ` LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const stmt = c.env.DB.prepare(query);
  const articlesRes = await stmt.bind(...params).all<ArticleRow>();

  // Global counts for badges
  const [unreadRes, starRes, hlRes] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM articles WHERE is_read = 0').first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM articles WHERE is_starred = 1').first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM highlights').first<{ c: number }>()
  ]);

  return c.json({
    articles: articlesRes.results || [],
    total: articlesRes.results?.length || 0,
    stats: {
      unread_total: unreadRes?.c ?? 0,
      starred_total: starRes?.c ?? 0,
      highlights_total: hlRes?.c ?? 0
    }
  });
});

app.get('/articles/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const article = await c.env.DB.prepare(`
    SELECT a.*, f.title as feed_title, f.site_url, f.folder_id
    FROM articles a
    JOIN feeds f ON a.feed_id = f.id
    WHERE a.id = ?
  `).bind(id).first<any>();

  if (!article) {
    return c.json({ error: 'Article not found' }, 404);
  }

  // Auto-extract full text with Readability if not extracted yet
  if (!article.is_full_extracted && article.link) {
    try {
      const extracted = await extractFullArticle(article.link);
      if (extracted && extracted.content && extracted.content.length > (article.summary || '').length) {
        article.full_content = extracted.content;
        article.is_full_extracted = 1;
        await c.env.DB.prepare('UPDATE articles SET full_content = ?, is_full_extracted = 1 WHERE id = ?')
          .bind(extracted.content, id)
          .run();
      }
    } catch (e) {
      console.warn('Auto extraction error:', e);
    }
  }

  const highlightsRes = await c.env.DB.prepare('SELECT * FROM highlights WHERE article_id = ? ORDER BY created_at ASC')
    .bind(id)
    .all<HighlightRow>();

  return c.json({
    article,
    highlights: highlightsRes.results || []
  });
});

app.post('/articles/:id/read', async (c) => {
  const id = Number(c.req.param('id'));
  const { isRead = true } = await c.req.json();
  const val = isRead ? 1 : 0;

  await c.env.DB.prepare('UPDATE articles SET is_read = ? WHERE id = ?').bind(val, id).run();

  if (isRead) {
    await onArticleRead(c.env.DB, id);
  } else {
    await onArticleUnread(c.env.DB, id);
  }

  return c.json({ success: true, is_read: val });
});

app.post('/articles/:id/star', async (c) => {
  const id = Number(c.req.param('id'));
  const { isStarred = true } = await c.req.json();
  const val = isStarred ? 1 : 0;

  await c.env.DB.prepare('UPDATE articles SET is_starred = ? WHERE id = ?').bind(val, id).run();

  if (isStarred) {
    await onArticleStarred(c.env.DB, id);
  } else {
    await onArticleUnstarred(c.env.DB, id);
  }

  return c.json({ success: true, is_starred: val });
});

app.post('/articles/:id/extract', async (c) => {
  const id = Number(c.req.param('id'));
  const article = await c.env.DB.prepare('SELECT * FROM articles WHERE id = ?').bind(id).first<any>();
  if (!article) return c.json({ error: 'Article not found' }, 404);

  const extracted = await extractFullArticle(article.link);
  if (!extracted || !extracted.content) {
    return c.json({ error: 'Could not extract content' }, 500);
  }

  await c.env.DB.prepare('UPDATE articles SET full_content = ?, is_full_extracted = 1 WHERE id = ?')
    .bind(extracted.content, id)
    .run();

  return c.json({ success: true, fullContent: extracted.content });
});

app.post('/articles/mark-all-read', async (c) => {
  const { feedId, folderId } = await c.req.json().catch(() => ({ feedId: undefined, folderId: undefined }));

  if (feedId) {
    await c.env.DB.prepare('UPDATE articles SET is_read = 1 WHERE feed_id = ?').bind(Number(feedId)).run();
  } else if (folderId) {
    await c.env.DB.prepare(`
      UPDATE articles SET is_read = 1
      WHERE feed_id IN (SELECT id FROM feeds WHERE folder_id = ?)
    `).bind(Number(folderId)).run();
  } else {
    await c.env.DB.prepare('UPDATE articles SET is_read = 1').run();
  }

  return c.json({ success: true });
});

// ==================== HIGHLIGHTS ====================
app.get('/highlights', async (c) => {
  const { articleId } = c.req.query();
  let query = `
    SELECT h.*, a.title as article_title, a.link as article_link, f.title as feed_title
    FROM highlights h
    JOIN articles a ON h.article_id = a.id
    JOIN feeds f ON a.feed_id = f.id
  `;
  const params: any[] = [];
  if (articleId) {
    query += ' WHERE h.article_id = ?';
    params.push(Number(articleId));
  }
  query += ' ORDER BY h.created_at DESC';

  const res = await c.env.DB.prepare(query).bind(...params).all<HighlightRow>();
  return c.json({ highlights: res.results || [] });
});

app.post('/highlights', async (c) => {
  const { articleId, text, note = null, color = 'yellow' } = await c.req.json();
  if (!articleId || !text?.trim()) {
    return c.json({ error: 'articleId and text are required' }, 400);
  }

  const cleanText = text.trim();
  const insertRes = await c.env.DB.prepare(`
    INSERT INTO highlights (article_id, text, note, color)
    VALUES (?, ?, ?, ?)
  `).bind(articleId, cleanText, note, color).run();

  await onHighlightCreated(c.env.DB, articleId, cleanText);

  const row = await c.env.DB.prepare('SELECT * FROM highlights WHERE id = ?').bind(insertRes.meta.last_row_id).first();
  return c.json(row, 201);
});

app.delete('/highlights/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const row = await c.env.DB.prepare('SELECT * FROM highlights WHERE id = ?').bind(id).first<any>();
  if (row) {
    await c.env.DB.prepare('DELETE FROM highlights WHERE id = ?').bind(id).run();
    await onHighlightDeleted(c.env.DB, row.text, row.article_id);
  }
  return c.json({ success: true });
});

// ==================== BRIEFING ====================
app.get('/briefing/today', async (c) => {
  try {
    const data = await generateTodayBriefingInD1(c.env.DB, c.env);
    return c.json(data);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/briefing/generate', async (c) => {
  const todayStr = new Date().toISOString().split('T')[0];
  await c.env.DB.prepare('DELETE FROM briefings WHERE date = ?').bind(todayStr).run();
  const data = await generateTodayBriefingInD1(c.env.DB, c.env);
  return c.json(data);
});

// ==================== TASTE PROFILE ====================
app.get('/taste-profile', async (c) => {
  const profile = await getUserTasteProfile(c.env.DB);
  const sortedTopics = Object.entries(profile.topics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([topic, weight]) => ({ topic, weight }));

  return c.json({
    topics: sortedTopics,
    readCount: profile.readCount,
    starredCount: profile.starredCount,
    highlightCount: profile.highlightCount,
    lastUpdated: profile.lastUpdated
  });
});

// ==================== DIRECTORY ====================
app.get('/directory', async (c) => {
  const feedsRes = await c.env.DB.prepare('SELECT url FROM feeds').all<{ url: string }>();
  const subscribedUrls = new Set<string>();
  for (const f of (feedsRes.results || [])) {
    if (f && f.url) {
      const u = f.url.trim();
      subscribedUrls.add(u);
      subscribedUrls.add(u.endsWith('/') ? u.slice(0, -1) : u + '/');
    }
  }

  const directoryWithStatus = CURATED_DIRECTORY.map(f => ({
    ...f,
    isSubscribed: subscribedUrls.has(f.url.trim())
  }));

  return c.json({ directory: directoryWithStatus });
});

app.post('/directory/subscribe', async (c) => {
  try {
    const { directoryId, folderId } = await c.req.json();
    const item = CURATED_DIRECTORY.find(d => d.id === directoryId);
    if (!item) {
      return c.json({ error: 'منبع در دایرکتوری یافت نشد' }, 404);
    }

    const targetUrl = item.url.trim();
    const altUrl = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl + '/';
    const existing = await c.env.DB.prepare('SELECT id FROM feeds WHERE url = ? OR url = ?').bind(targetUrl, altUrl).first<any>();
    if (existing) {
      return c.json({ id: existing.id, message: 'قبلاً سابسکرایب شده است', alreadySubscribed: true });
    }

    // Determine target folder: use provided folderId, find by category name, or auto-create category folder
    let targetFolderId = folderId ? Number(folderId) : null;
    if (!targetFolderId && item.category) {
      const folder = await c.env.DB.prepare('SELECT id FROM folders WHERE name = ?').bind(item.category).first<any>();
      if (folder) {
        targetFolderId = folder.id;
      } else {
        const maxOrderRes = await c.env.DB.prepare('SELECT MAX(order_index) as m FROM folders').first<any>();
        const nextOrder = (maxOrderRes?.m ?? 0) + 1;
        await c.env.DB.prepare('INSERT INTO folders (name, icon, order_index) VALUES (?, ?, ?)')
          .bind(item.category, item.icon || 'folder', nextOrder)
          .run();
        const newFolder = await c.env.DB.prepare('SELECT id FROM folders WHERE name = ?').bind(item.category).first<any>();
        if (newFolder) targetFolderId = newFolder.id;
      }
    }

    let domain = '';
    try {
      domain = new URL(item.siteUrl).hostname;
    } catch {}
    const iconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';

    await c.env.DB.prepare(`
      INSERT INTO feeds (folder_id, title, url, site_url, description, icon_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      targetFolderId || null,
      item.title,
      targetUrl,
      item.siteUrl,
      item.description,
      iconUrl
    ).run();

    const createdFeed = await c.env.DB.prepare('SELECT * FROM feeds WHERE url = ? OR url = ?').bind(targetUrl, altUrl).first<any>();

    if (createdFeed && process.env.NODE_ENV !== 'test') {
      try {
        await Promise.race([
          syncFeedInD1(c.env.DB, createdFeed.id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
        ]);
      } catch (e) {
        console.warn('Initial sync notice for directory feed:', e);
      }
    }

    return c.json({ id: createdFeed?.id, success: true });
  } catch (error: any) {
    return c.json({ error: error.message || 'خطا در سابسکرایب' }, 500);
  }
});

// ==================== SETTINGS ====================
app.get('/settings', async (c) => {
  const key = await getGeminiApiKey(c.env.DB, c.env);
  return c.json({ geminiApiKeySet: Boolean(key) });
});

app.post('/settings', async (c) => {
  const { geminiApiKey } = await c.req.json();
  if (typeof geminiApiKey === 'string') {
    await c.env.DB.prepare('INSERT INTO user_profile (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .bind('gemini_api_key', geminiApiKey.trim())
      .run();
  }
  return c.json({ success: true });
});

// ==================== TELEGRAM ====================
app.get('/telegram/status', async (c) => {
  const botToken = await getTelegramBotToken(c.env.DB, c.env);
  const subsRes = await c.env.DB.prepare('SELECT * FROM telegram_subscriptions ORDER BY id DESC').all<any>();
  const foldersRes = await c.env.DB.prepare('SELECT * FROM folders ORDER BY order_index ASC').all<any>();

  return c.json({
    botTokenConfigured: Boolean(botToken),
    maskedBotToken: botToken ? `${botToken.slice(0, 6)}...${botToken.slice(-4)}` : null,
    subscriptions: (subsRes.results || []).map((s: any) => ({
      ...s,
      schedule_times: typeof s.schedule_times === 'string' ? JSON.parse(s.schedule_times) : s.schedule_times,
      folder_ids: s.folder_ids !== 'all' ? JSON.parse(s.folder_ids) : 'all'
    })),
    folders: foldersRes.results || []
  });
});

app.post('/telegram/bot-token', async (c) => {
  const { botToken } = await c.req.json();
  if (botToken) {
    await c.env.DB.prepare("INSERT INTO user_profile (key, value) VALUES ('telegram_bot_token', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .bind(botToken.trim())
      .run();
  } else {
    await c.env.DB.prepare("DELETE FROM user_profile WHERE key = 'telegram_bot_token'").run();
  }
  return c.json({ success: true });
});

app.post('/telegram/subscriptions', async (c) => {
  const { chatId, username, firstName, botToken, scheduleTimes, timezone, folderIds, isActive } = await c.req.json();
  if (!chatId?.trim()) {
    return c.json({ error: 'شناسه چت الزامی است.' }, 400);
  }
  const scheduleJson = JSON.stringify(Array.isArray(scheduleTimes) && scheduleTimes.length > 0 ? scheduleTimes : ['09:00', '21:00']);
  const foldersJson = folderIds === 'all' || !folderIds ? 'all' : JSON.stringify(folderIds);
  const tz = timezone || 'Asia/Tehran';
  const active = isActive === false ? 0 : 1;

  await c.env.DB.prepare(`
    INSERT INTO telegram_subscriptions (chat_id, username, first_name, bot_token, schedule_times, timezone, folder_ids, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET
      username = excluded.username,
      first_name = excluded.first_name,
      bot_token = excluded.bot_token,
      schedule_times = excluded.schedule_times,
      timezone = excluded.timezone,
      folder_ids = excluded.folder_ids,
      is_active = excluded.is_active,
      updated_at = CURRENT_TIMESTAMP
  `).bind(chatId.trim(), username || null, firstName || null, botToken?.trim() || null, scheduleJson, tz, foldersJson, active).run();

  const sub = await c.env.DB.prepare('SELECT * FROM telegram_subscriptions WHERE chat_id = ?').bind(chatId.trim()).first<any>();
  return c.json({
    success: true,
    subscription: {
      ...sub,
      schedule_times: JSON.parse(sub.schedule_times),
      folder_ids: sub.folder_ids !== 'all' ? JSON.parse(sub.folder_ids) : 'all'
    }
  });
});

app.put('/telegram/subscriptions/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const { chatId, username, firstName, scheduleTimes, timezone, folderIds, isActive } = await c.req.json();
  const existing = await c.env.DB.prepare('SELECT * FROM telegram_subscriptions WHERE id = ?').bind(id).first<any>();
  if (!existing) {
    return c.json({ error: 'اشتراک تلگرام یافت نشد.' }, 404);
  }

  const targetChatId = chatId && String(chatId).trim() ? String(chatId).trim() : existing.chat_id;
  const targetUsername = username !== undefined ? (username || null) : existing.username;
  const targetFirstName = firstName !== undefined ? (firstName || null) : existing.first_name;
  const scheduleJson = scheduleTimes ? JSON.stringify(scheduleTimes) : existing.schedule_times;
  const foldersJson = folderIds !== undefined ? (folderIds === 'all' ? 'all' : JSON.stringify(folderIds)) : existing.folder_ids;
  const tz = timezone !== undefined ? timezone : existing.timezone;
  const active = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;

  await c.env.DB.prepare(`
    UPDATE telegram_subscriptions
    SET chat_id = ?, username = ?, first_name = ?, schedule_times = ?, timezone = ?, folder_ids = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(targetChatId, targetUsername, targetFirstName, scheduleJson, tz, foldersJson, active, id).run();

  const updated = await c.env.DB.prepare('SELECT * FROM telegram_subscriptions WHERE id = ?').bind(id).first<any>();
  return c.json({
    success: true,
    subscription: {
      ...updated,
      schedule_times: JSON.parse(updated.schedule_times),
      folder_ids: updated.folder_ids !== 'all' ? JSON.parse(updated.folder_ids) : 'all'
    }
  });
});

app.delete('/telegram/subscriptions/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM telegram_subscriptions WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

app.all('/telegram/detect-chat', async (c) => {
  const body = c.req.method === 'POST' ? await c.req.json().catch(() => ({})) : {};
  const query = c.req.query();
  const botToken = (body.botToken || query.botToken) as string | undefined;
  const token = botToken || await getTelegramBotToken(c.env.DB, c.env);
  if (!token) return c.json({ ok: false, error: 'توکن ربات تلگرام تنظیم نشده است.' }, 400);

  const res = await detectLatestTelegramChatInD1(token, c.env);
  if (!res.ok) {
    return c.json(res, 400);
  }
  return c.json(res);
});

app.post('/telegram/webhook', async (c) => {
  const update = await c.req.json().catch(() => ({}));
  const res = await handleTelegramWebhookUpdateInD1(c.env.DB, c.env, update);
  return c.json(res);
});

app.post('/telegram/test', async (c) => {
  const { chatId, botToken } = await c.req.json();
  if (!chatId || !String(chatId).trim()) {
    return c.json({ error: 'شناسه چت الزامی است' }, 400);
  }
  const token = botToken || await getTelegramBotToken(c.env.DB, c.env);
  if (!token) return c.json({ error: 'توکن ربات تنظیم نشده است' }, 400);
  const testMsg = `🔔 <b>پیام تست اتصال لنز (Lenz) به تلگرام</b>\n\nحساب شما با موفقیت متصل شد. ✨`;
  const res = await sendTelegramMessage(token, String(chatId).trim(), testMsg, c.env);
  if (!res.ok) {
    return c.json({ success: false, error: res.error || 'ارسال پیام تست با خطا مواجه شد' }, 400);
  }
  return c.json({ success: true, messageId: res.messageId });
});

app.post('/telegram/digest/send', async (c) => {
  const { chatId, subscriptionId, folderIds, botToken } = await c.req.json();
  const token = botToken || await getTelegramBotToken(c.env.DB, c.env);
  if (!token) return c.json({ error: 'توکن ربات تنظیم نشده است' }, 400);

  let targetChat = chatId;
  let targetFolderIds = folderIds || 'all';

  if (subscriptionId) {
    const sub = await c.env.DB.prepare('SELECT * FROM telegram_subscriptions WHERE id = ?').bind(Number(subscriptionId)).first<any>();
    if (sub) {
      targetChat = sub.chat_id;
      if (sub.folder_ids && sub.folder_ids !== 'all') {
        try { targetFolderIds = JSON.parse(sub.folder_ids); } catch { targetFolderIds = 'all'; }
      }
    }
  }

  if (!targetChat) {
    const firstActive = await c.env.DB.prepare('SELECT chat_id FROM telegram_subscriptions WHERE is_active = 1 LIMIT 1').first<any>();
    if (firstActive) targetChat = firstActive.chat_id;
  }
  if (!targetChat) return c.json({ error: 'شناسه چت یافت نشد' }, 400);

  const digest = await generateGroupNewsDigestInD1(c.env.DB, targetFolderIds);
  for (const chunk of digest.textChunks) {
    const sendRes = await sendTelegramMessage(token, targetChat, chunk, c.env);
    if (!sendRes.ok) {
      return c.json({ success: false, error: sendRes.error }, 400);
    }
  }
  return c.json({
    success: true,
    messageCount: digest.textChunks.length,
    groupCount: digest.groupCount,
    articleCount: digest.articleCount
  });
});

export { app };
export const onRequest = handle(app);
