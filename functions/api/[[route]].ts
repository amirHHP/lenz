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
import { generateTodayBriefingInD1, generateArticleSummaryInD1, getGeminiApiKey } from '../lib/edge-ai.js';
import { ensureD1Schema } from '../lib/d1-db.js';
import { 
  getTelegramBotToken, 
  sendTelegramMessage, 
  generateGroupNewsDigestInD1,
  detectLatestTelegramChatInD1,
  handleTelegramWebhookUpdateInD1
} from '../lib/edge-telegram.js';
import {
  hashPassword,
  verifyPassword,
  createSession,
  deleteSession,
  getUserByToken,
  seedUserFoldersInD1,
  seedUserTasteProfileInD1
} from '../lib/edge-auth.js';

type Variables = {
  user: {
    id: number;
    username: string;
    displayName: string;
    email?: string | null;
  };
  isAuthenticated: boolean;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>().basePath('/api');

app.use('*', cors());
app.use('*', async (c, next) => {
  if (!c.env?.DB) {
    return c.json({
      error: 'Cloudflare D1 database binding (DB) is not configured.',
      message: 'Please bind a D1 database named "lenzz-dbs" in your Cloudflare dashboard (Workers & Pages > lenz > Settings > Bindings).'
    }, 503);
  }
  await ensureD1Schema(c.env.DB);

  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const user = await getUserByToken(c.env.DB, token);
      if (user) {
        c.set('user', user);
        c.set('isAuthenticated', true);
        await next();
        return;
      } else {
        return c.json({ error: 'نشست کاربری نامعتبر است یا منقضی شده است' }, 401);
      }
    }
  }

  c.set('user', { id: 1, username: 'admin', displayName: 'کاربر پیش‌فرض' });
  c.set('isAuthenticated', false);
  await next();
});

app.onError((err, c) => {
  console.error('[API Error]:', err);
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

// ==================== AUTH ====================
app.post('/auth/register', async (c) => {
  const { username, password, displayName, email } = await c.req.json().catch(() => ({}));
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return c.json({ error: 'نام کاربری باید حداقل ۳ کاراکتر باشد' }, 400);
  }
  if (!password || typeof password !== 'string' || password.length < 4) {
    return c.json({ error: 'رمز عبور باید حداقل ۴ کاراکتر باشد' }, 400);
  }
  if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2) {
    return c.json({ error: 'نام نمایشی باید حداقل ۲ کاراکتر باشد' }, 400);
  }

  const cleanUsername = username.trim().toLowerCase();
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
    return c.json({ error: 'نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد و خط تیره باشد' }, 400);
  }
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(cleanUsername).first();
  if (existing) {
    return c.json({ error: 'این نام کاربری قبلاً ثبت شده است' }, 409);
  }

  const pwdHash = await hashPassword(password);
  const insertRes = await c.env.DB.prepare(`
    INSERT INTO users (username, password_hash, display_name, email)
    VALUES (?, ?, ?, ?)
  `).bind(cleanUsername, pwdHash, displayName.trim(), email?.trim() || null).run();

  const userId = Number(insertRes.meta.last_row_id);
  await seedUserFoldersInD1(c.env.DB, userId);
  await seedUserTasteProfileInD1(c.env.DB, userId);

  const { token } = await createSession(c.env.DB, userId);
  return c.json({
    user: {
      id: userId,
      username: cleanUsername,
      displayName: displayName.trim(),
      email: email?.trim() || null,
      createdAt: new Date().toISOString()
    },
    token
  }, 201);
});

app.post('/auth/login', async (c) => {
  const { username, password } = await c.req.json().catch(() => ({}));
  if (!username || !password) {
    return c.json({ error: 'نام کاربری و رمز عبور الزامی است' }, 400);
  }

  const cleanUsername = username.trim().toLowerCase();
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(cleanUsername).first<any>();
  if (!user) {
    return c.json({ error: 'نام کاربری یا رمز عبور اشتباه است' }, 401);
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return c.json({ error: 'نام کاربری یا رمز عبور اشتباه است' }, 401);
  }

  const { token } = await createSession(c.env.DB, user.id);
  return c.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      email: user.email,
      createdAt: user.created_at
    },
    token
  });
});

app.post('/auth/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      await deleteSession(c.env.DB, token);
    }
  }
  return c.json({ success: true, message: 'خروج با موفقیت انجام شد' });
});

app.get('/auth/me', async (c) => {
  const isAuth = c.get('isAuthenticated');
  const user = c.get('user');
  if (isAuth && user) {
    return c.json({ authenticated: true, user });
  }
  return c.json({ authenticated: false, user: null });
});

app.put('/auth/profile', async (c) => {
  const isAuth = c.get('isAuthenticated');
  const user = c.get('user');
  if (!isAuth || !user) {
    return c.json({ error: 'برای ویرایش پروفایل ابتدا وارد شوید' }, 401);
  }

  const { displayName, currentPassword, newPassword } = await c.req.json().catch(() => ({}));
  const userId = user.id;

  if (displayName && typeof displayName === 'string' && displayName.trim().length >= 2) {
    await c.env.DB.prepare('UPDATE users SET display_name = ? WHERE id = ?').bind(displayName.trim(), userId).run();
  }

  if (newPassword) {
    if (typeof newPassword !== 'string' || newPassword.length < 4) {
      return c.json({ error: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد' }, 400);
    }
    if (!currentPassword) {
      return c.json({ error: 'وارد کردن رمز عبور فعلی الزامی است' }, 400);
    }
    const userRow = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(userId).first<any>();
    if (!userRow || !(await verifyPassword(currentPassword, userRow.password_hash))) {
      return c.json({ error: 'رمز عبور فعلی اشتباه است' }, 400);
    }
    const newHash = await hashPassword(newPassword);
    await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, userId).run();
  }

  const updated = await c.env.DB.prepare('SELECT id, username, display_name, email, created_at FROM users WHERE id = ?').bind(userId).first<any>();
  return c.json({
    success: true,
    user: {
      id: updated.id,
      username: updated.username,
      displayName: updated.display_name,
      email: updated.email,
      createdAt: updated.created_at
    }
  });
});

// ==================== FOLDERS ====================
app.get('/folders', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const res = await c.env.DB.prepare('SELECT * FROM folders WHERE user_id = ? ORDER BY order_index ASC, id ASC').bind(userId).all();
  return c.json({ folders: res.results || [] });
});

app.post('/folders', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const { name, icon = 'folder', orderIndex = 0 } = await c.req.json();
  if (!name?.trim()) {
    return c.json({ error: 'Folder name is required' }, 400);
  }
  const insertRes = await c.env.DB.prepare(
    'INSERT INTO folders (user_id, name, icon, order_index) VALUES (?, ?, ?, ?)'
  ).bind(userId, name.trim(), icon, orderIndex).run();

  const folder = await c.env.DB.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').bind(insertRes.meta.last_row_id, userId).first();
  return c.json(folder, 201);
});

app.delete('/folders/:id', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const id = Number(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM folders WHERE id = ? AND user_id = ?').bind(id, userId).run();
  return c.json({ success: true });
});

// ==================== FEEDS ====================
app.get('/feeds', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const res = await c.env.DB.prepare(`
    SELECT f.*, 
      (SELECT COUNT(*) FROM articles a WHERE a.feed_id = f.id AND a.is_read = 0) as unread_count
    FROM feeds f
    WHERE f.user_id = ?
    ORDER BY f.title ASC
  `).bind(userId).all();
  return c.json({ feeds: res.results || [] });
});

app.post('/feeds', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const { url, folderId = null, title } = await c.req.json();
  if (!url?.trim()) {
    return c.json({ error: 'Feed URL is required' }, 400);
  }

  try {
    const parsed = await fetchAndParseFeed(url.trim());
    const feedTitle = title?.trim() || parsed.title || url;

    // Check existing for this user
    const existing = await c.env.DB.prepare('SELECT id FROM feeds WHERE user_id = ? AND url = ?').bind(userId, url.trim()).first<any>();
    if (existing) {
      return c.json({ error: 'این فید قبلاً اضافه شده است', id: existing.id }, 409);
    }

    const insertRes = await c.env.DB.prepare(`
      INSERT INTO feeds (user_id, folder_id, title, url, site_url, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(userId, folderId, feedTitle, url.trim(), parsed.siteUrl, parsed.description).run();

    const feedId = Number(insertRes.meta.last_row_id);
    const feed = await c.env.DB.prepare('SELECT * FROM feeds WHERE id = ? AND user_id = ?').bind(feedId, userId).first<any>();
    if (feed) {
      await syncFeedInD1(c.env.DB, feed.id);
    }

    return c.json(feed, 201);
  } catch (err: any) {
    return c.json({ error: 'Failed to add feed: ' + (err.message || String(err)) }, 400);
  }
});

app.put('/feeds/:id', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const id = Number(c.req.param('id'));
  const { folderId, title } = await c.req.json();

  if (folderId !== undefined && title !== undefined) {
    await c.env.DB.prepare('UPDATE feeds SET folder_id = ?, title = ? WHERE id = ? AND user_id = ?').bind(folderId, title, id, userId).run();
  } else if (folderId !== undefined) {
    await c.env.DB.prepare('UPDATE feeds SET folder_id = ? WHERE id = ? AND user_id = ?').bind(folderId, id, userId).run();
  } else if (title !== undefined) {
    await c.env.DB.prepare('UPDATE feeds SET title = ? WHERE id = ? AND user_id = ?').bind(title, id, userId).run();
  }

  const feed = await c.env.DB.prepare('SELECT * FROM feeds WHERE id = ? AND user_id = ?').bind(id, userId).first();
  return c.json(feed);
});

app.delete('/feeds/:id', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const id = Number(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM feeds WHERE id = ? AND user_id = ?').bind(id, userId).run();
  return c.json({ success: true });
});

app.post('/feeds/sync', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const result = await syncAllFeedsInD1(c.env.DB, userId);
  return c.json({ success: true, ...result });
});

app.post('/feeds/:id/sync', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const id = Number(c.req.param('id'));
  const feed = await c.env.DB.prepare('SELECT id FROM feeds WHERE id = ? AND user_id = ?').bind(id, userId).first();
  if (!feed) {
    return c.json({ error: 'فید یافت نشد' }, 404);
  }
  const result = await syncFeedInD1(c.env.DB, id);
  return c.json({ success: true, ...result });
});

// ==================== ARTICLES ====================
app.get('/articles', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const { folderId, feedId, isRead, isStarred, sort = 'smart', search, limit = '100', offset = '0' } = c.req.query();

  let query = `
    SELECT a.*, f.title as feed_title, f.folder_id,
      (SELECT COUNT(*) FROM highlights h WHERE h.article_id = a.id) as highlight_count
    FROM articles a
    JOIN feeds f ON a.feed_id = f.id
    WHERE f.user_id = ?
  `;
  const params: any[] = [userId];

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

  // Global counts for badges for this user
  const [unreadRes, starRes, hlRes] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE f.user_id = ? AND a.is_read = 0').bind(userId).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE f.user_id = ? AND a.is_starred = 1').bind(userId).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM highlights h JOIN articles a ON h.article_id = a.id JOIN feeds f ON a.feed_id = f.id WHERE f.user_id = ?').bind(userId).first<{ c: number }>()
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
  const user = c.get('user');
  const userId = user?.id || 1;
  const id = Number(c.req.param('id'));
  const article = await c.env.DB.prepare(`
    SELECT a.*, f.title as feed_title, f.site_url, f.folder_id
    FROM articles a
    JOIN feeds f ON a.feed_id = f.id
    WHERE a.id = ? AND f.user_id = ?
  `).bind(id, userId).first<any>();

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
  const user = c.get('user');
  const userId = user?.id || 1;
  const id = Number(c.req.param('id'));
  const article = await c.env.DB.prepare(`
    SELECT a.id FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE a.id = ? AND f.user_id = ?
  `).bind(id, userId).first();
  if (!article) {
    return c.json({ error: 'Article not found' }, 404);
  }

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
  const user = c.get('user');
  const userId = user?.id || 1;
  const id = Number(c.req.param('id'));
  const article = await c.env.DB.prepare(`
    SELECT a.id FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE a.id = ? AND f.user_id = ?
  `).bind(id, userId).first();
  if (!article) {
    return c.json({ error: 'Article not found' }, 404);
  }

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
  const user = c.get('user');
  const userId = user?.id || 1;
  const id = Number(c.req.param('id'));
  const article = await c.env.DB.prepare(`
    SELECT a.* FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE a.id = ? AND f.user_id = ?
  `).bind(id, userId).first<any>();
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
  const user = c.get('user');
  const userId = user?.id || 1;
  const { feedId, folderId } = await c.req.json().catch(() => ({ feedId: undefined, folderId: undefined }));

  if (feedId) {
    await c.env.DB.prepare(`
      UPDATE articles SET is_read = 1 
      WHERE feed_id = ? AND feed_id IN (SELECT id FROM feeds WHERE user_id = ?)
    `).bind(Number(feedId), userId).run();
  } else if (folderId) {
    await c.env.DB.prepare(`
      UPDATE articles SET is_read = 1
      WHERE feed_id IN (SELECT id FROM feeds WHERE folder_id = ? AND user_id = ?)
    `).bind(Number(folderId), userId).run();
  } else {
    await c.env.DB.prepare(`
      UPDATE articles SET is_read = 1
      WHERE feed_id IN (SELECT id FROM feeds WHERE user_id = ?)
    `).bind(userId).run();
  }

  return c.json({ success: true });
});

app.post('/articles/:id/summary', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const id = Number(c.req.param('id'));
  try {
    const summary = await generateArticleSummaryInD1(c.env.DB, c.env, id, userId);
    return c.json({ summary });
  } catch (err: any) {
    if (err.message && err.message.includes('یافت نشد')) {
      return c.json({ error: err.message }, 404);
    }
    return c.json({ error: err.message || 'خطا در خلاصه‌سازی' }, 500);
  }
});

// ==================== HIGHLIGHTS ====================
app.get('/highlights', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const { articleId } = c.req.query();
  let query = `
    SELECT h.*, a.title as article_title, a.link as article_link, f.title as feed_title
    FROM highlights h
    JOIN articles a ON h.article_id = a.id
    JOIN feeds f ON a.feed_id = f.id
    WHERE f.user_id = ?
  `;
  const params: any[] = [userId];
  if (articleId) {
    query += ' AND h.article_id = ?';
    params.push(Number(articleId));
  }
  query += ' ORDER BY h.created_at DESC';

  const res = await c.env.DB.prepare(query).bind(...params).all<HighlightRow>();
  return c.json({ highlights: res.results || [] });
});

app.post('/highlights', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const { articleId, text, note = null, color = 'yellow' } = await c.req.json();
  if (!articleId || !text?.trim()) {
    return c.json({ error: 'articleId and text are required' }, 400);
  }

  const article = await c.env.DB.prepare(`
    SELECT a.id FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE a.id = ? AND f.user_id = ?
  `).bind(articleId, userId).first();
  if (!article) {
    return c.json({ error: 'Article not found' }, 404);
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
  const user = c.get('user');
  const userId = user?.id || 1;
  const id = Number(c.req.param('id'));
  const row = await c.env.DB.prepare(`
    SELECT h.* FROM highlights h 
    JOIN articles a ON h.article_id = a.id 
    JOIN feeds f ON a.feed_id = f.id 
    WHERE h.id = ? AND f.user_id = ?
  `).bind(id, userId).first<any>();
  if (row) {
    await c.env.DB.prepare('DELETE FROM highlights WHERE id = ?').bind(id).run();
    await onHighlightDeleted(c.env.DB, row.text, row.article_id);
  }
  return c.json({ success: true });
});

// ==================== BRIEFING ====================
app.get('/briefing/today', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  try {
    const data = await generateTodayBriefingInD1(c.env.DB, c.env, userId);
    return c.json(data);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/briefing/generate', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const todayStr = new Date().toISOString().split('T')[0];
  await c.env.DB.prepare('DELETE FROM briefings WHERE date = ? AND user_id = ?').bind(todayStr, userId).run();
  const data = await generateTodayBriefingInD1(c.env.DB, c.env, userId);
  return c.json(data);
});

// ==================== TASTE PROFILE ====================
app.get('/profile/taste', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const profile = await getUserTasteProfile(c.env.DB, userId);
  return c.json({ profile });
});

app.get('/taste-profile', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const profile = await getUserTasteProfile(c.env.DB, userId);
  const sortedTopics = Object.entries(profile.topics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([topic, weight]) => ({ topic, weight }));

  return c.json({
    profile,
    topics: sortedTopics,
    readCount: profile.readCount,
    starredCount: profile.starredCount,
    highlightCount: profile.highlightCount,
    lastUpdated: profile.lastUpdated
  });
});

// ==================== DIRECTORY ====================
app.get('/directory', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const feedsRes = await c.env.DB.prepare('SELECT url FROM feeds WHERE user_id = ?').bind(userId).all<{ url: string }>();
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
    const user = c.get('user');
    const userId = user?.id || 1;
    const { directoryId, folderId } = await c.req.json();
    const item = CURATED_DIRECTORY.find(d => d.id === directoryId);
    if (!item) {
      return c.json({ error: 'منبع در دایرکتوری یافت نشد' }, 404);
    }

    const targetUrl = item.url.trim();
    const altUrl = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl + '/';
    const existing = await c.env.DB.prepare('SELECT id FROM feeds WHERE user_id = ? AND (url = ? OR url = ?)').bind(userId, targetUrl, altUrl).first<any>();
    if (existing) {
      return c.json({ id: existing.id, message: 'قبلاً سابسکرایب شده است', alreadySubscribed: true });
    }

    // Determine target folder: use provided folderId, find by category name, or auto-create category folder
    let targetFolderId = folderId ? Number(folderId) : null;
    if (!targetFolderId && item.category) {
      const folder = await c.env.DB.prepare('SELECT id FROM folders WHERE user_id = ? AND name = ?').bind(userId, item.category).first<any>();
      if (folder) {
        targetFolderId = folder.id;
      } else {
        const maxOrderRes = await c.env.DB.prepare('SELECT MAX(order_index) as m FROM folders WHERE user_id = ?').bind(userId).first<any>();
        const nextOrder = (maxOrderRes?.m ?? 0) + 1;
        await c.env.DB.prepare('INSERT INTO folders (user_id, name, icon, order_index) VALUES (?, ?, ?, ?)')
          .bind(userId, item.category, item.icon || 'folder', nextOrder)
          .run();
        const newFolder = await c.env.DB.prepare('SELECT id FROM folders WHERE user_id = ? AND name = ?').bind(userId, item.category).first<any>();
        if (newFolder) targetFolderId = newFolder.id;
      }
    }

    let domain = '';
    try {
      domain = new URL(item.siteUrl).hostname;
    } catch {}
    const iconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';

    await c.env.DB.prepare(`
      INSERT INTO feeds (user_id, folder_id, title, url, site_url, description, icon_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      targetFolderId || null,
      item.title,
      targetUrl,
      item.siteUrl,
      item.description,
      iconUrl
    ).run();

    const createdFeed = await c.env.DB.prepare('SELECT * FROM feeds WHERE url = ? AND user_id = ? OR url = ? AND user_id = ?').bind(targetUrl, userId, altUrl, userId).first<any>();

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
  const user = c.get('user');
  const userId = user?.id || 1;
  const key = await getGeminiApiKey(c.env.DB, c.env, userId);
  return c.json({
    hasGeminiKey: Boolean(key),
    maskedApiKey: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : null,
    geminiApiKeySet: Boolean(key)
  });
});

app.post('/settings', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const { geminiApiKey } = await c.req.json();
  if (typeof geminiApiKey === 'string') {
    const keyName = userId === 1 ? 'gemini_api_key' : `gemini_api_key_${userId}`;
    await c.env.DB.prepare('INSERT INTO user_profile (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .bind(keyName, geminiApiKey.trim())
      .run();
  }
  return c.json({ success: true });
});

// ==================== TELEGRAM ====================
app.get('/telegram/status', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const botToken = await getTelegramBotToken(c.env.DB, c.env, userId);
  const subsRes = await c.env.DB.prepare('SELECT * FROM telegram_subscriptions WHERE user_id = ? ORDER BY id DESC').bind(userId).all<any>();
  const foldersRes = await c.env.DB.prepare('SELECT * FROM folders WHERE user_id = ? ORDER BY order_index ASC').bind(userId).all<any>();

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
  const user = c.get('user');
  const userId = user?.id || 1;
  const { botToken } = await c.req.json();
  const keyName = userId === 1 ? 'telegram_bot_token' : `telegram_bot_token_${userId}`;
  if (botToken) {
    await c.env.DB.prepare("INSERT INTO user_profile (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .bind(keyName, botToken.trim())
      .run();
  } else {
    await c.env.DB.prepare("DELETE FROM user_profile WHERE key = ?").bind(keyName).run();
  }
  return c.json({ success: true });
});

app.post('/telegram/subscriptions', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const { chatId, username, firstName, botToken, scheduleTimes, timezone, folderIds, isActive } = await c.req.json();
  if (!chatId?.trim()) {
    return c.json({ error: 'شناسه چت الزامی است.' }, 400);
  }
  const scheduleJson = JSON.stringify(Array.isArray(scheduleTimes) && scheduleTimes.length > 0 ? scheduleTimes : ['09:00', '21:00']);
  const foldersJson = folderIds === 'all' || !folderIds ? 'all' : JSON.stringify(folderIds);
  const tz = timezone || 'Asia/Tehran';
  const active = isActive === false ? 0 : 1;

  await c.env.DB.prepare(`
    INSERT INTO telegram_subscriptions (user_id, chat_id, username, first_name, bot_token, schedule_times, timezone, folder_ids, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, chat_id) DO UPDATE SET
      username = excluded.username,
      first_name = excluded.first_name,
      bot_token = excluded.bot_token,
      schedule_times = excluded.schedule_times,
      timezone = excluded.timezone,
      folder_ids = excluded.folder_ids,
      is_active = excluded.is_active,
      updated_at = CURRENT_TIMESTAMP
  `).bind(userId, chatId.trim(), username || null, firstName || null, botToken?.trim() || null, scheduleJson, tz, foldersJson, active).run();

  const sub = await c.env.DB.prepare('SELECT * FROM telegram_subscriptions WHERE chat_id = ? AND user_id = ?').bind(chatId.trim(), userId).first<any>();
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
  const user = c.get('user');
  const userId = user?.id || 1;
  const id = Number(c.req.param('id'));
  const { chatId, username, firstName, scheduleTimes, timezone, folderIds, isActive } = await c.req.json();
  const existing = await c.env.DB.prepare('SELECT * FROM telegram_subscriptions WHERE id = ? AND user_id = ?').bind(id, userId).first<any>();
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
    WHERE id = ? AND user_id = ?
  `).bind(targetChatId, targetUsername, targetFirstName, scheduleJson, tz, foldersJson, active, id, userId).run();

  const updated = await c.env.DB.prepare('SELECT * FROM telegram_subscriptions WHERE id = ? AND user_id = ?').bind(id, userId).first<any>();
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
  const user = c.get('user');
  const userId = user?.id || 1;
  const id = Number(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM telegram_subscriptions WHERE id = ? AND user_id = ?').bind(id, userId).run();
  return c.json({ success: true });
});

app.all('/telegram/detect-chat', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const body = c.req.method === 'POST' ? await c.req.json().catch(() => ({})) : {};
  const query = c.req.query();
  const botToken = (body.botToken || query.botToken) as string | undefined;
  const token = botToken || await getTelegramBotToken(c.env.DB, c.env, userId);
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
  const user = c.get('user');
  const userId = user?.id || 1;
  const { chatId, botToken } = await c.req.json();
  if (!chatId || !String(chatId).trim()) {
    return c.json({ error: 'شناسه چت الزامی است' }, 400);
  }
  const token = botToken || await getTelegramBotToken(c.env.DB, c.env, userId);
  if (!token) return c.json({ error: 'توکن ربات تنظیم نشده است' }, 400);
  const testMsg = `🔔 <b>پیام تست اتصال لنز (Lenz) به تلگرام</b>\n\nحساب شما با موفقیت متصل شد. ✨`;
  const res = await sendTelegramMessage(token, String(chatId).trim(), testMsg, c.env);
  if (!res.ok) {
    return c.json({ success: false, error: res.error || 'ارسال پیام تست با خطا مواجه شد' }, 400);
  }
  return c.json({ success: true, messageId: res.messageId });
});

app.post('/telegram/digest/send', async (c) => {
  const user = c.get('user');
  const userId = user?.id || 1;
  const { chatId, subscriptionId, folderIds, botToken } = await c.req.json();
  const token = botToken || await getTelegramBotToken(c.env.DB, c.env, userId);
  if (!token) return c.json({ error: 'توکن ربات تنظیم نشده است' }, 400);

  let targetChat = chatId;
  let targetFolderIds = folderIds || 'all';

  if (subscriptionId) {
    const sub = await c.env.DB.prepare('SELECT * FROM telegram_subscriptions WHERE id = ? AND user_id = ?').bind(Number(subscriptionId), userId).first<any>();
    if (sub) {
      targetChat = sub.chat_id;
      if (sub.folder_ids && sub.folder_ids !== 'all') {
        try { targetFolderIds = JSON.parse(sub.folder_ids); } catch { targetFolderIds = 'all'; }
      }
    }
  }

  if (!targetChat) {
    const firstActive = await c.env.DB.prepare('SELECT chat_id FROM telegram_subscriptions WHERE is_active = 1 AND user_id = ? LIMIT 1').bind(userId).first<any>();
    if (firstActive) targetChat = firstActive.chat_id;
  }
  if (!targetChat) return c.json({ error: 'شناسه چت یافت نشد' }, 400);

  const digest = await generateGroupNewsDigestInD1(c.env.DB, targetFolderIds, { userId });
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
