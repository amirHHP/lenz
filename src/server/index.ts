import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { db, initDatabase } from './db.js';
import { discoverFeedUrl, syncFeed, syncAllFeeds, getFaviconUrl } from './rss.js';
import { CURATED_DIRECTORY } from './directory.js';
import { extractFullArticle } from './extractor.js';
import { 
  calculateImportanceScore, 
  getUserTasteProfile, 
  onArticleStarred, 
  onArticleUnstarred,
  onHighlightCreated, 
  onHighlightDeleted,
  onArticleRead, 
  onArticleUnread,
  recalculateUnreadScores 
} from './ranking.js';
import { generateTodayBriefing, generateArticleSummary, getGeminiApiKey } from './ai.js';
import { 
  getTelegramBotToken, 
  setTelegramBotToken, 
  getTelegramBotInfo, 
  sendTelegramMessage, 
  generateGroupNewsDigest, 
  sendDigestToSubscription, 
  checkAndRunScheduledDigests, 
  handleTelegramWebhookUpdate,
  detectLatestTelegramChat,
  pollTelegramUpdates,
  setTelegramWebhook
} from './telegram.js';
import { 
  authMiddleware, 
  requireAuth, 
  registerUser, 
  loginUser, 
  deleteSession, 
  hashPassword, 
  verifyPassword 
} from './auth.js';

dotenv.config();

// Initialize DB schema
initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(authMiddleware);

// ----------------------------------------------------
// Authentication Routes
// ----------------------------------------------------
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { username, password, displayName, email } = req.body;
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'نام کاربری باید حداقل ۳ کاراکتر باشد' });
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: 'رمز عبور باید حداقل ۴ کاراکتر باشد' });
    }
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2) {
      return res.status(400).json({ error: 'نام نمایشی باید حداقل ۲ کاراکتر باشد' });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      return res.status(400).json({ error: 'نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد و خط تیره باشد' });
    }

    const result = registerUser(username, password, displayName, email);
    res.status(201).json(result);
  } catch (err: any) {
    if (err.message && err.message.includes('قبلاً ثبت شده است')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'خطا در ثبت‌نام' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است' });
    }

    const result = loginUser(username, password);
    if (!result) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'خطا در ورود' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        deleteSession(token);
      }
    }
    res.json({ success: true, message: 'خروج موفقیت‌آمیز بود' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'خطا در خروج' });
  }
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  if (req.isAuthenticated && req.user) {
    res.json({
      authenticated: true,
      user: req.user
    });
  } else {
    res.json({
      authenticated: false,
      user: null
    });
  }
});

app.put('/api/auth/profile', (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated) {
      return res.status(401).json({ error: 'برای ویرایش پروفایل ابتدا وارد شوید' });
    }
    const { displayName, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (displayName && typeof displayName === 'string' && displayName.trim().length >= 2) {
      db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(displayName.trim(), userId);
    }

    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 4) {
        return res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد' });
      }
      if (!currentPassword) {
        return res.status(400).json({ error: 'وارد کردن رمز عبور فعلی الزامی است' });
      }
      const userRow = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;
      if (!userRow || !verifyPassword(currentPassword, userRow.password_hash)) {
        return res.status(400).json({ error: 'رمز عبور فعلی اشتباه است' });
      }
      const newHash = hashPassword(newPassword);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
    }

    const updated = db.prepare('SELECT id, username, display_name, email, created_at FROM users WHERE id = ?').get(userId) as any;
    res.json({
      success: true,
      user: {
        id: updated.id,
        username: updated.username,
        displayName: updated.display_name,
        email: updated.email,
        createdAt: updated.created_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'خطا در به‌روزرسانی مشخصات' });
  }
});

// ----------------------------------------------------
// Directory Routes
// ----------------------------------------------------
app.get('/api/directory', (req: Request, res: Response) => {
  const userId = req.user.id;
  const subscribedList = (db.prepare('SELECT url FROM feeds WHERE user_id = ?').all(userId) as { url: string }[]);
  const subscribedSet = new Set<string>();
  for (const f of subscribedList) {
    if (f && f.url) {
      const u = f.url.trim();
      subscribedSet.add(u);
      subscribedSet.add(u.endsWith('/') ? u.slice(0, -1) : u + '/');
    }
  }
  const directoryWithSubStatus = CURATED_DIRECTORY.map(item => ({
    ...item,
    isSubscribed: subscribedSet.has(item.url.trim())
  }));
  res.json({ directory: directoryWithSubStatus });
});

app.post('/api/directory/subscribe', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { directoryId, folderId } = req.body;
    const item = CURATED_DIRECTORY.find(d => d.id === directoryId);
    if (!item) {
      return res.status(404).json({ error: 'منبع در دایرکتوری یافت نشد' });
    }

    const targetUrl = item.url.trim();
    const altUrl = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl + '/';
    const existing = db.prepare('SELECT id FROM feeds WHERE user_id = ? AND (url = ? OR url = ?)').get(userId, targetUrl, altUrl) as any;
    if (existing) {
      return res.json({ id: existing.id, message: 'قبلاً سابسکرایب شده است', alreadySubscribed: true });
    }

    // Determine target folder: use provided folderId, find by category name, or auto-create category folder for this user
    let targetFolderId = folderId ? Number(folderId) : null;
    if (!targetFolderId && item.category) {
      const folder = db.prepare('SELECT id FROM folders WHERE user_id = ? AND name = ?').get(userId, item.category) as any;
      if (folder) {
        targetFolderId = folder.id;
      } else {
        const maxOrder = db.prepare('SELECT MAX(order_index) as m FROM folders WHERE user_id = ?').get(userId) as any;
        const nextOrder = (maxOrder?.m ?? 0) + 1;
        const insertFolder = db.prepare('INSERT INTO folders (user_id, name, icon, order_index) VALUES (?, ?, ?, ?)');
        const fInfo = insertFolder.run(userId, item.category, item.icon || 'folder', nextOrder);
        targetFolderId = Number(fInfo.lastInsertRowid);
      }
    }

    const insert = db.prepare(`
      INSERT INTO feeds (user_id, folder_id, title, url, site_url, description, icon_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = insert.run(
      userId,
      targetFolderId || null,
      item.title,
      targetUrl,
      item.siteUrl,
      item.description,
      getFaviconUrl(item.siteUrl)
    );

    const feedId = Number(info.lastInsertRowid);

    // Initial sync so articles are immediately available in the UI
    if (process.env.NODE_ENV !== 'test') {
      try {
        await Promise.race([
          syncFeed(feedId),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
        ]);
      } catch (err) {
        console.warn('Initial sync notice for directory feed:', err);
      }
    }

    res.json({ id: feedId, success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در سابسکرایب' });
  }
});

// ----------------------------------------------------
// Folders Routes
// ----------------------------------------------------
app.get('/api/folders', (req: Request, res: Response) => {
  const userId = req.user.id;
  const folders = db.prepare(`
    SELECT f.*, 
      (SELECT COUNT(*) FROM feeds WHERE folder_id = f.id AND user_id = ?) as feed_count,
      (SELECT COUNT(*) FROM articles a JOIN feeds fd ON a.feed_id = fd.id WHERE fd.folder_id = f.id AND fd.user_id = ? AND a.is_read = 0) as unread_count
    FROM folders f 
    WHERE f.user_id = ?
    ORDER BY f.order_index ASC, f.id ASC
  `).all(userId, userId, userId);
  res.json({ folders });
});

app.post('/api/folders', (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { name, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'نام پوشه الزامی است' });
    }
    const info = db.prepare('INSERT INTO folders (user_id, name, icon) VALUES (?, ?, ?)').run(userId, name.trim(), icon || 'folder');
    res.json({ id: Number(info.lastInsertRowid), name: name.trim(), icon: icon || 'folder' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/folders/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, icon } = req.body;
    db.prepare('UPDATE folders SET name = COALESCE(?, name), icon = COALESCE(?, icon) WHERE id = ? AND user_id = ?').run(name, icon, id, userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/folders/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    db.prepare('DELETE FROM folders WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Feeds Routes
// ----------------------------------------------------
app.get('/api/feeds', (req: Request, res: Response) => {
  const userId = req.user.id;
  const feeds = db.prepare(`
    SELECT f.*, 
      (SELECT COUNT(*) FROM articles WHERE feed_id = f.id AND is_read = 0) as unread_count,
      (SELECT COUNT(*) FROM articles WHERE feed_id = f.id) as total_count
    FROM feeds f
    WHERE f.user_id = ?
    ORDER BY f.id DESC
  `).all(userId);
  res.json({ feeds });
});

app.post('/api/feeds', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { url, folderId } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'آدرس فید یا وب‌سایت الزامی است' });
    }

    // Auto-discover RSS feed URL if website URL provided
    const resolvedUrl = await discoverFeedUrl(url);

    const existing = db.prepare('SELECT id FROM feeds WHERE user_id = ? AND url = ?').get(userId, resolvedUrl) as any;
    if (existing) {
      return res.status(409).json({ error: 'این فید قبلاً اضافه شده است', id: existing.id });
    }

    const info = db.prepare(`
      INSERT INTO feeds (user_id, folder_id, title, url, site_url, icon_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, folderId || null, resolvedUrl, resolvedUrl, getFaviconUrl(resolvedUrl));

    const feedId = Number(info.lastInsertRowid);

    // Sync in background and wait briefly
    try {
      await syncFeed(feedId);
    } catch (e: any) {
      console.warn('Initial sync warning:', e);
      if (process.env.NODE_ENV !== 'test') {
        const artCount = db.prepare('SELECT COUNT(*) as count FROM articles WHERE feed_id = ?').get(feedId) as any;
        if (!artCount || artCount.count === 0) {
          db.prepare('DELETE FROM feeds WHERE id = ?').run(feedId);
          return res.status(400).json({ error: 'آدرس وارد شده فید معتبری ندارد یا در دسترس نیست' });
        }
      }
    }

    const createdFeed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(feedId);
    res.json({ feed: createdFeed });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'خطا در ثبت فید' });
  }
});

// Update feed folder or title
app.put('/api/feeds/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { folderId, title } = req.body;
    db.prepare(`
      UPDATE feeds 
      SET folder_id = CASE WHEN ? = 1 THEN ? ELSE folder_id END,
          title = COALESCE(?, title)
      WHERE id = ? AND user_id = ?
    `).run(
      folderId !== undefined ? 1 : 0,
      folderId !== undefined ? (folderId ? Number(folderId) : null) : null,
      title || null,
      id,
      userId
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/feeds/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    db.prepare('DELETE FROM feeds WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feeds/sync', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const result = await syncAllFeeds(userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feeds/:id/sync', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const feed = db.prepare('SELECT id FROM feeds WHERE id = ? AND user_id = ?').get(id, userId);
    if (!feed) {
      return res.status(404).json({ error: 'فید یافت نشد' });
    }
    const result = await syncFeed(Number(id));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Articles Routes (with Smart Importance Sorting)
// ----------------------------------------------------
app.get('/api/articles', (req: Request, res: Response) => {
  const userId = req.user.id;
  const { 
    feedId, 
    folderId, 
    isRead, 
    isStarred, 
    hasHighlights,
    search, 
    sort = 'smart',
    limit = 50,
    offset = 0
  } = req.query;

  let query = `
    SELECT a.id, a.feed_id, a.title, a.link, a.author, a.published_at, a.summary,
           a.is_read, a.is_starred, a.reading_time_minutes, a.importance_score, 
           a.ai_category, a.ai_summary,
           f.title as feed_title, f.icon_url as feed_icon_url,
           (SELECT COUNT(*) FROM highlights WHERE article_id = a.id) as highlight_count
    FROM articles a
    JOIN feeds f ON a.feed_id = f.id
    WHERE f.user_id = ?
  `;
  const params: any[] = [userId];

  if (feedId) {
    query += ' AND a.feed_id = ?';
    params.push(feedId);
  }

  if (folderId) {
    query += ' AND f.folder_id = ?';
    params.push(folderId);
  }

  if (isRead !== undefined) {
    query += ' AND a.is_read = ?';
    params.push(isRead === 'true' || isRead === '1' ? 1 : 0);
  }

  if (isStarred === 'true' || isStarred === '1') {
    query += ' AND a.is_starred = 1';
  }

  if (hasHighlights === 'true' || hasHighlights === '1') {
    query += ' AND (SELECT COUNT(*) FROM highlights WHERE article_id = a.id) > 0';
  }

  if (search && typeof search === 'string' && search.trim()) {
    query += ' AND (a.title LIKE ? OR a.summary LIKE ?)';
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  // Sorting
  if (sort === 'smart') {
    // Smart Importance: unread stories first, then AI & taste importance score, then freshness
    query += ' ORDER BY a.is_read ASC, a.importance_score DESC, a.published_at DESC';
  } else if (sort === 'oldest') {
    query += ' ORDER BY a.published_at ASC';
  } else {
    // newest default
    query += ' ORDER BY a.published_at DESC';
  }

  query += ' LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const articles = db.prepare(query).all(...params);

  // Overall counts for badges for this user
  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE f.user_id = ? AND a.is_read = 0) as unread_total,
      (SELECT COUNT(*) FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE f.user_id = ? AND a.is_starred = 1) as starred_total,
      (SELECT COUNT(*) FROM highlights h JOIN articles a ON h.article_id = a.id JOIN feeds f ON a.feed_id = f.id WHERE f.user_id = ?) as highlights_total
  `).get(userId, userId, userId);

  res.json({ articles, stats });
});

app.get('/api/articles/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const article = db.prepare(`
      SELECT a.*, f.title as feed_title, f.icon_url as feed_icon_url, f.site_url as feed_site_url
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
      WHERE a.id = ? AND f.user_id = ?
    `).get(id, userId) as any;

    if (!article) {
      return res.status(404).json({ error: 'مقاله پیدا نشد' });
    }

    // Fetch highlights for this article
    const highlights = db.prepare('SELECT * FROM highlights WHERE article_id = ? ORDER BY id ASC').all(id);

    // If full_content has not yet been extracted, trigger Readability extraction to guarantee full article text
    if (!article.is_full_extracted && article.link && article.link.startsWith('http')) {
      try {
        const extracted = await extractFullArticle(article.link);
        if (extracted && extracted.content && extracted.content.length > (article.full_content || '').length) {
          article.full_content = extracted.content;
          const words = (extracted.textContent || '').trim().split(/\s+/).length;
          const readingTime = Math.max(1, Math.ceil(words / 200));
          article.reading_time_minutes = readingTime;
          article.is_full_extracted = 1;
          db.prepare('UPDATE articles SET full_content = ?, reading_time_minutes = ?, is_full_extracted = 1 WHERE id = ?')
            .run(extracted.content, readingTime, id);
        } else {
          article.is_full_extracted = 1;
          db.prepare('UPDATE articles SET is_full_extracted = 1 WHERE id = ?').run(id);
        }
      } catch (err) {
        article.is_full_extracted = 1;
        db.prepare('UPDATE articles SET is_full_extracted = 1 WHERE id = ?').run(id);
      }
    }

    res.json({ article, highlights });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Force extract full readable article
app.post('/api/articles/:id/extract', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const article = db.prepare(`
      SELECT a.* FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE a.id = ? AND f.user_id = ?
    `).get(id, userId) as any;
    if (!article || !article.link) {
      return res.status(404).json({ error: 'مقاله یا لینک یافت نشد' });
    }

    const extracted = await extractFullArticle(article.link);
    if (!extracted || !extracted.content) {
      return res.status(422).json({ error: 'امکان استخراج متن کامل از این وب‌سایت وجود ندارد' });
    }

    const words = (extracted.textContent || '').trim().split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    db.prepare('UPDATE articles SET full_content = ?, reading_time_minutes = ?, is_full_extracted = 1 WHERE id = ?')
      .run(extracted.content, readingTime, id);

    res.json({ success: true, fullContent: extracted.content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle read / unread
app.post('/api/articles/:id/read', (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { isRead } = req.body;
    const articleId = Number(id);
    const newStatus = isRead ? 1 : 0;

    const art = db.prepare('SELECT a.id FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE a.id = ? AND f.user_id = ?').get(articleId, userId);
    if (!art) {
      return res.status(404).json({ error: 'مقاله پیدا نشد' });
    }

    db.prepare('UPDATE articles SET is_read = ? WHERE id = ?').run(newStatus, articleId);

    if (newStatus === 1) {
      onArticleRead(articleId);
    } else {
      onArticleUnread(articleId);
    }

    res.json({ success: true, isRead: newStatus === 1 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle star / favorite
app.post('/api/articles/:id/star', (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { isStarred } = req.body;
    const articleId = Number(id);
    const newStatus = isStarred ? 1 : 0;

    const art = db.prepare('SELECT a.id FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE a.id = ? AND f.user_id = ?').get(articleId, userId);
    if (!art) {
      return res.status(404).json({ error: 'مقاله پیدا نشد' });
    }

    db.prepare('UPDATE articles SET is_starred = ? WHERE id = ?').run(newStatus, articleId);

    if (newStatus === 1) {
      onArticleStarred(articleId);
    } else {
      onArticleUnstarred(articleId);
    }

    res.json({ success: true, isStarred: newStatus === 1 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all as read
app.post('/api/articles/mark-all-read', (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { feedId, folderId } = req.body;
    if (feedId) {
      db.prepare('UPDATE articles SET is_read = 1 WHERE feed_id = ? AND feed_id IN (SELECT id FROM feeds WHERE user_id = ?)').run(feedId, userId);
    } else if (folderId) {
      db.prepare(`
        UPDATE articles SET is_read = 1 
        WHERE feed_id IN (SELECT id FROM feeds WHERE folder_id = ? AND user_id = ?)
      `).run(folderId, userId);
    } else {
      db.prepare('UPDATE articles SET is_read = 1 WHERE feed_id IN (SELECT id FROM feeds WHERE user_id = ?)').run(userId);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate AI summary for an article
app.post('/api/articles/:id/summary', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const summary = await generateArticleSummary(Number(id), req.user.id);
    res.json({ summary });
  } catch (err: any) {
    if (err.message && err.message.includes('یافت نشد')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Highlights Routes
// ----------------------------------------------------
app.get('/api/highlights', (req: Request, res: Response) => {
  const userId = req.user.id;
  const highlights = db.prepare(`
    SELECT h.*, a.title as article_title, a.link as article_link, f.title as feed_title
    FROM highlights h
    JOIN articles a ON h.article_id = a.id
    JOIN feeds f ON a.feed_id = f.id
    WHERE f.user_id = ?
    ORDER BY h.id DESC
  `).all(userId);
  res.json({ highlights });
});

app.post('/api/highlights', (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { articleId, text, note, color = 'yellow' } = req.body;
    if (!articleId || !text || !text.trim()) {
      return res.status(400).json({ error: 'متن هایلایت الزامی است' });
    }

    const art = db.prepare('SELECT a.id FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE a.id = ? AND f.user_id = ?').get(articleId, userId);
    if (!art) {
      return res.status(404).json({ error: 'مقاله پیدا نشد' });
    }

    const info = db.prepare(`
      INSERT INTO highlights (article_id, text, note, color)
      VALUES (?, ?, ?, ?)
    `).run(articleId, text.trim(), note || null, color);

    const highlightId = Number(info.lastInsertRowid);
    onHighlightCreated(articleId, text.trim());

    res.json({ id: highlightId, articleId, text: text.trim(), note, color });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/highlights/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const hl = db.prepare(`
      SELECT h.* FROM highlights h
      JOIN articles a ON h.article_id = a.id
      JOIN feeds f ON a.feed_id = f.id
      WHERE h.id = ? AND f.user_id = ?
    `).get(id, userId) as any;

    if (hl) {
      db.prepare('DELETE FROM highlights WHERE id = ?').run(id);
      onHighlightDeleted(hl.article_id, hl.text);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Today's AI Briefing («امروز چه خبر»)
// ----------------------------------------------------
app.get('/api/briefing/today', async (req: Request, res: Response) => {
  try {
    const briefing = await generateTodayBriefing(req.user.id);
    res.json({ briefing });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/briefing/generate', async (req: Request, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    db.prepare('DELETE FROM briefings WHERE date = ? AND user_id = ?').run(todayStr, req.user.id);
    const briefing = await generateTodayBriefing(req.user.id);
    res.json({ briefing });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// User Taste Profile & Settings
// ----------------------------------------------------
app.get('/api/profile/taste', (req: Request, res: Response) => {
  const profile = getUserTasteProfile(req.user.id);
  res.json({ profile });
});

app.get('/api/settings', (req: Request, res: Response) => {
  const apiKey = getGeminiApiKey(req.user.id);
  res.json({
    hasGeminiKey: !!apiKey,
    maskedApiKey: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : null
  });
});

app.post('/api/settings', (req: Request, res: Response) => {
  try {
    const { geminiApiKey } = req.body;
    if (geminiApiKey !== undefined) {
      const keyName = req.user.id === 1 ? 'gemini_api_key' : `gemini_api_key_${req.user.id}`;
      db.prepare(`
        INSERT INTO user_profile (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(keyName, geminiApiKey.trim());
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Telegram Integration & Scheduled Group News Digest
// ----------------------------------------------------
app.get('/api/telegram/status', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const botToken = getTelegramBotToken(userId);
    let botInfo = null;
    if (botToken) {
      botInfo = await getTelegramBotInfo(botToken);
    }
    const subscriptions = db.prepare('SELECT * FROM telegram_subscriptions WHERE user_id = ? ORDER BY id DESC').all(userId) as any[];
    const folders = db.prepare(`
      SELECT f.id, f.name, f.icon, 
        (SELECT COUNT(*) FROM feeds WHERE folder_id = f.id AND user_id = ?) as feed_count,
        (SELECT COUNT(*) FROM articles a JOIN feeds fd ON a.feed_id = fd.id WHERE fd.folder_id = f.id AND fd.user_id = ?) as article_count,
        (SELECT COUNT(*) FROM articles a JOIN feeds fd ON a.feed_id = fd.id WHERE fd.folder_id = f.id AND fd.user_id = ? AND a.is_read = 0) as unread_count
      FROM folders f
      WHERE f.user_id = ?
      ORDER BY f.order_index ASC, f.id ASC
    `).all(userId, userId, userId, userId);

    res.json({
      botTokenConfigured: Boolean(botToken),
      maskedBotToken: botToken ? `${botToken.slice(0, 6)}...${botToken.slice(-4)}` : null,
      botInfo,
      subscriptions: subscriptions.map(s => {
        let scheduleTimes: string[] = ['09:00', '21:00'];
        try {
          scheduleTimes = typeof s.schedule_times === 'string' ? JSON.parse(s.schedule_times) : s.schedule_times;
        } catch {
          scheduleTimes = [s.schedule_times];
        }
        let folderIds: number[] | 'all' = 'all';
        try {
          folderIds = s.folder_ids !== 'all' ? JSON.parse(s.folder_ids) : 'all';
        } catch {
          folderIds = 'all';
        }
        return {
          ...s,
          schedule_times: scheduleTimes,
          folder_ids: folderIds
        };
      }),
      folders
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/telegram/bot-token', async (req: Request, res: Response) => {
  try {
    const { botToken } = req.body;
    setTelegramBotToken(botToken || null, req.user.id);
    const info = botToken ? await getTelegramBotInfo(botToken.trim()) : null;
    res.json({ success: true, botInfo: info });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/telegram/subscriptions', (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { chatId, username, firstName, botToken, scheduleTimes, timezone, folderIds, isActive } = req.body;
    if (!chatId || !String(chatId).trim()) {
      return res.status(400).json({ error: 'شناسه چت (Chat ID) الزامی است.' });
    }
    const cleanChatId = String(chatId).trim();
    const scheduleJson = JSON.stringify(Array.isArray(scheduleTimes) && scheduleTimes.length > 0 ? scheduleTimes : ['09:00', '21:00']);
    const foldersJson = folderIds === 'all' || !folderIds ? 'all' : JSON.stringify(folderIds);
    const tz = timezone || 'Asia/Tehran';
    const active = isActive === false || isActive === 0 ? 0 : 1;

    db.prepare(`
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
    `).run(userId, cleanChatId, username || null, firstName || null, botToken?.trim() || null, scheduleJson, tz, foldersJson, active);

    const sub = db.prepare('SELECT * FROM telegram_subscriptions WHERE chat_id = ? AND user_id = ?').get(cleanChatId, userId) as any;
    res.json({
      success: true,
      subscription: {
        ...sub,
        schedule_times: JSON.parse(sub.schedule_times),
        folder_ids: sub.folder_ids !== 'all' ? JSON.parse(sub.folder_ids) : 'all'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/telegram/subscriptions/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { chatId, username, firstName, scheduleTimes, timezone, folderIds, isActive } = req.body;
    const existing = db.prepare('SELECT * FROM telegram_subscriptions WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'اشتراک تلگرام یافت نشد.' });
    }
    const targetChatId = chatId && String(chatId).trim() ? String(chatId).trim() : existing.chat_id;
    const targetUsername = username !== undefined ? (username || null) : existing.username;
    const targetFirstName = firstName !== undefined ? (firstName || null) : existing.first_name;
    const scheduleJson = scheduleTimes ? JSON.stringify(scheduleTimes) : existing.schedule_times;
    const foldersJson = folderIds !== undefined ? (folderIds === 'all' ? 'all' : JSON.stringify(folderIds)) : existing.folder_ids;
    const tz = timezone !== undefined ? timezone : existing.timezone;
    const active = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;

    db.prepare(`
      UPDATE telegram_subscriptions
      SET chat_id = ?, username = ?, first_name = ?, schedule_times = ?, timezone = ?, folder_ids = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(targetChatId, targetUsername, targetFirstName, scheduleJson, tz, foldersJson, active, id, userId);

    const updated = db.prepare('SELECT * FROM telegram_subscriptions WHERE id = ? AND user_id = ?').get(id, userId) as any;
    res.json({
      success: true,
      subscription: {
        ...updated,
        schedule_times: JSON.parse(updated.schedule_times),
        folder_ids: updated.folder_ids !== 'all' ? JSON.parse(updated.folder_ids) : 'all'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/telegram/subscriptions/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    db.prepare('DELETE FROM telegram_subscriptions WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/telegram/test', async (req: Request, res: Response) => {
  try {
    const { chatId, botToken } = req.body;
    if (!chatId || !String(chatId).trim()) {
      return res.status(400).json({ error: 'شناسه چت (Chat ID) الزامی است.' });
    }
    const testMsg = `🔔 <b>پیام تست اتصال لنز (Lenz) به تلگرام</b>\n\n` +
      `✅ تبریک! حساب شما با موفقیت به فیدخوان هوشمند لنز متصل شد.\n` +
      `خلاصه اخبار گروه‌هایی که عضوش هستید طبق زمان‌بندی انتخابی به همین چت ارسال خواهد شد. ✨`;

    const result = await sendTelegramMessage(String(chatId).trim(), testMsg, botToken?.trim());
    if (!result.ok) {
      return res.status(400).json({ error: result.error || 'ارسال پیام تست با خطا مواجه شد.' });
    }
    res.json({ success: true, message: 'پیام تست با موفقیت در تلگرام ارسال شد.', messageId: result.messageId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/telegram/digest/send', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { subscriptionId, chatId, folderIds, botToken } = req.body;
    if (subscriptionId) {
      const resSub = await sendDigestToSubscription(Number(subscriptionId));
      if (!resSub.success) {
        return res.status(400).json({ error: resSub.error || 'ارسال خلاصه با خطا مواجه شد.' });
      }
      return res.json({ success: true, messageCount: resSub.messageCount });
    }

    let targetChatId = chatId;
    if (!targetChatId) {
      const firstActive = db.prepare('SELECT chat_id FROM telegram_subscriptions WHERE is_active = 1 AND user_id = ? LIMIT 1').get(userId) as any;
      if (firstActive) {
        targetChatId = firstActive.chat_id;
      }
    }

    if (!targetChatId) {
      return res.status(400).json({ error: 'هیچ شناسه چت فعالی یافت نشد. لطفاً ابتدا حساب تلگرام خود را متصل کنید.' });
    }

    const digest = await generateGroupNewsDigest(folderIds || 'all', { userId });
    const token = botToken || getTelegramBotToken(userId);
    for (const chunk of digest.textChunks) {
      const sendRes = await sendTelegramMessage(String(targetChatId).trim(), chunk, token);
      if (!sendRes.ok) {
        return res.status(400).json({ error: sendRes.error });
      }
    }

    res.json({
      success: true,
      messageCount: digest.textChunks.length,
      groupCount: digest.groupCount,
      articleCount: digest.articleCount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
  try {
    const update = req.body;
    const result = await handleTelegramWebhookUpdate(update);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.all('/api/telegram/detect-chat', async (req: Request, res: Response) => {
  try {
    const botToken = (req.body?.botToken || req.query?.botToken) as string | undefined;
    const result = await detectLatestTelegramChat(botToken);
    if (!result.ok) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/telegram/webhook/set', async (req: Request, res: Response) => {
  try {
    const { webhookUrl, botToken } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ error: 'آدرس وبهوک الزامی است.' });
    }
    const result = await setTelegramWebhook(webhookUrl, botToken);
    if (!result.ok) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend in production build if exists
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.use((req: Request, res: Response, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      res.status(404).send('Lenz API server running. Vite client is active on port 3000 in dev mode.');
    }
  });
});

// Background periodic sync every 30 minutes, Telegram scheduler every 60s, & Telegram poller every 12s
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    syncAllFeeds().catch(err => console.error('Periodic sync error:', err));
  }, 30 * 60 * 1000);

  setInterval(() => {
    checkAndRunScheduledDigests().catch(err => console.error('Telegram digest scheduler error:', err));
  }, 60 * 1000);

  setInterval(() => {
    pollTelegramUpdates().catch(() => {});
  }, 12 * 1000);
}

export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Lenz Server is running at http://localhost:${PORT}`);
  });
}
