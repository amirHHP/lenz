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
  onHighlightCreated, 
  onArticleRead, 
  recalculateUnreadScores 
} from './ranking.js';
import { generateTodayBriefing, generateArticleSummary, getGeminiApiKey } from './ai.js';

dotenv.config();

// Initialize DB schema
initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ----------------------------------------------------
// Directory Routes
// ----------------------------------------------------
app.get('/api/directory', (req: Request, res: Response) => {
  const subscribedUrls = (db.prepare('SELECT url FROM feeds').all() as { url: string }[]).map(f => f.url);
  const directoryWithSubStatus = CURATED_DIRECTORY.map(item => ({
    ...item,
    isSubscribed: subscribedUrls.includes(item.url)
  }));
  res.json({ directory: directoryWithSubStatus });
});

app.post('/api/directory/subscribe', async (req: Request, res: Response) => {
  try {
    const { directoryId, folderId } = req.body;
    const item = CURATED_DIRECTORY.find(d => d.id === directoryId);
    if (!item) {
      return res.status(404).json({ error: 'منبع در دایرکتوری یافت نشد' });
    }

    const existing = db.prepare('SELECT id FROM feeds WHERE url = ?').get(item.url) as any;
    if (existing) {
      return res.json({ id: existing.id, message: 'قبلاً سابسکرایب شده است' });
    }

    // Determine target folder
    let targetFolderId = folderId;
    if (!targetFolderId) {
      const folder = db.prepare('SELECT id FROM folders WHERE name = ?').get(item.category) as any;
      if (folder) targetFolderId = folder.id;
    }

    const insert = db.prepare(`
      INSERT INTO feeds (folder_id, title, url, site_url, description, icon_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = insert.run(
      targetFolderId || null,
      item.title,
      item.url,
      item.siteUrl,
      item.description,
      getFaviconUrl(item.siteUrl)
    );

    const feedId = Number(info.lastInsertRowid);
    // Background sync (skip in test mode to avoid unmocked external network calls)
    if (process.env.NODE_ENV !== 'test') {
      syncFeed(feedId).catch(err => console.error('Initial sync error:', err));
    }

    res.json({ id: feedId, success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Folders Routes
// ----------------------------------------------------
app.get('/api/folders', (req: Request, res: Response) => {
  const folders = db.prepare(`
    SELECT f.*, 
      (SELECT COUNT(*) FROM feeds WHERE folder_id = f.id) as feed_count,
      (SELECT COUNT(*) FROM articles a JOIN feeds fd ON a.feed_id = fd.id WHERE fd.folder_id = f.id AND a.is_read = 0) as unread_count
    FROM folders f 
    ORDER BY f.order_index ASC, f.id ASC
  `).all();
  res.json({ folders });
});

app.post('/api/folders', (req: Request, res: Response) => {
  try {
    const { name, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'نام پوشه الزامی است' });
    }
    const info = db.prepare('INSERT INTO folders (name, icon) VALUES (?, ?)').run(name.trim(), icon || 'folder');
    res.json({ id: Number(info.lastInsertRowid), name: name.trim(), icon: icon || 'folder' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/folders/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, icon } = req.body;
    db.prepare('UPDATE folders SET name = COALESCE(?, name), icon = COALESCE(?, icon) WHERE id = ?').run(name, icon, id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/folders/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM folders WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Feeds Routes
// ----------------------------------------------------
app.get('/api/feeds', (req: Request, res: Response) => {
  const feeds = db.prepare(`
    SELECT f.*, 
      (SELECT COUNT(*) FROM articles WHERE feed_id = f.id AND is_read = 0) as unread_count,
      (SELECT COUNT(*) FROM articles WHERE feed_id = f.id) as total_count
    FROM feeds f
    ORDER BY f.id DESC
  `).all();
  res.json({ feeds });
});

app.post('/api/feeds', async (req: Request, res: Response) => {
  try {
    const { url, folderId } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'آدرس فید یا وب‌سایت الزامی است' });
    }

    // Auto-discover RSS feed URL if website URL provided
    const resolvedUrl = await discoverFeedUrl(url);

    const existing = db.prepare('SELECT id FROM feeds WHERE url = ?').get(resolvedUrl) as any;
    if (existing) {
      return res.status(409).json({ error: 'این فید قبلاً اضافه شده است', id: existing.id });
    }

    const info = db.prepare(`
      INSERT INTO feeds (folder_id, title, url, site_url, icon_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(folderId || null, resolvedUrl, resolvedUrl, resolvedUrl, getFaviconUrl(resolvedUrl));

    const feedId = Number(info.lastInsertRowid);

    // Sync in background and wait briefly
    try {
      await syncFeed(feedId);
    } catch (e) {
      console.warn('Initial sync warning:', e);
    }

    const createdFeed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(feedId);
    res.json({ feed: createdFeed });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'خطا در ثبت فید' });
  }
});

app.delete('/api/feeds/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM feeds WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feeds/sync', async (req: Request, res: Response) => {
  try {
    const result = await syncAllFeeds();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feeds/:id/sync', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
    WHERE 1=1
  `;
  const params: any[] = [];

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
    // Smart Importance: combines AI & taste score first, then freshness
    query += ' ORDER BY a.importance_score DESC, a.published_at DESC';
  } else if (sort === 'oldest') {
    query += ' ORDER BY a.published_at ASC';
  } else {
    // newest default
    query += ' ORDER BY a.published_at DESC';
  }

  query += ' LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const articles = db.prepare(query).all(...params);

  // Overall counts for badges
  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM articles WHERE is_read = 0) as unread_total,
      (SELECT COUNT(*) FROM articles WHERE is_starred = 1) as starred_total,
      (SELECT COUNT(*) FROM highlights) as highlights_total
  `).get();

  res.json({ articles, stats });
});

app.get('/api/articles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const article = db.prepare(`
      SELECT a.*, f.title as feed_title, f.icon_url as feed_icon_url, f.site_url as feed_site_url
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
      WHERE a.id = ?
    `).get(id) as any;

    if (!article) {
      return res.status(404).json({ error: 'مقاله پیدا نشد' });
    }

    // Fetch highlights for this article
    const highlights = db.prepare('SELECT * FROM highlights WHERE article_id = ? ORDER BY id ASC').all(id);

    // If full_content is empty or too short (< 250 chars) and has a valid web link,
    // trigger Readability extraction to guarantee full article text!
    if ((!article.full_content || article.full_content.length < 250) && article.link && article.link.startsWith('http')) {
      try {
        const extracted = await extractFullArticle(article.link);
        if (extracted && extracted.content && extracted.content.length > (article.full_content || '').length) {
          article.full_content = extracted.content;
          db.prepare('UPDATE articles SET full_content = ? WHERE id = ?').run(extracted.content, id);
        }
      } catch (err) {
        // use existing content
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
    const { id } = req.params;
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as any;
    if (!article || !article.link) {
      return res.status(404).json({ error: 'مقاله یا لینک یافت نشد' });
    }

    const extracted = await extractFullArticle(article.link);
    if (!extracted || !extracted.content) {
      return res.status(422).json({ error: 'امکان استخراج متن کامل از این وب‌سایت وجود ندارد' });
    }

    db.prepare('UPDATE articles SET full_content = ? WHERE id = ?').run(extracted.content, id);
    res.json({ success: true, fullContent: extracted.content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle read / unread
app.post('/api/articles/:id/read', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isRead } = req.body;
    const articleId = Number(id);
    const newStatus = isRead ? 1 : 0;

    db.prepare('UPDATE articles SET is_read = ? WHERE id = ?').run(newStatus, articleId);

    if (newStatus === 1) {
      onArticleRead(articleId);
    }

    res.json({ success: true, isRead: newStatus === 1 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle star / favorite
app.post('/api/articles/:id/star', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isStarred } = req.body;
    const articleId = Number(id);
    const newStatus = isStarred ? 1 : 0;

    db.prepare('UPDATE articles SET is_starred = ? WHERE id = ?').run(newStatus, articleId);

    if (newStatus === 1) {
      onArticleStarred(articleId);
    }

    res.json({ success: true, isStarred: newStatus === 1 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all as read
app.post('/api/articles/mark-all-read', (req: Request, res: Response) => {
  try {
    const { feedId, folderId } = req.body;
    if (feedId) {
      db.prepare('UPDATE articles SET is_read = 1 WHERE feed_id = ?').run(feedId);
    } else if (folderId) {
      db.prepare(`
        UPDATE articles SET is_read = 1 
        WHERE feed_id IN (SELECT id FROM feeds WHERE folder_id = ?)
      `).run(folderId);
    } else {
      db.prepare('UPDATE articles SET is_read = 1').run();
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
    const summary = await generateArticleSummary(Number(id));
    res.json({ summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Highlights Routes
// ----------------------------------------------------
app.get('/api/highlights', (req: Request, res: Response) => {
  const highlights = db.prepare(`
    SELECT h.*, a.title as article_title, a.link as article_link, f.title as feed_title
    FROM highlights h
    JOIN articles a ON h.article_id = a.id
    JOIN feeds f ON a.feed_id = f.id
    ORDER BY h.id DESC
  `).all();
  res.json({ highlights });
});

app.post('/api/highlights', (req: Request, res: Response) => {
  try {
    const { articleId, text, note, color = 'yellow' } = req.body;
    if (!articleId || !text || !text.trim()) {
      return res.status(400).json({ error: 'متن هایلایت الزامی است' });
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
    const { id } = req.params;
    db.prepare('DELETE FROM highlights WHERE id = ?').run(id);
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
    const briefing = await generateTodayBriefing();
    res.json({ briefing });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/briefing/generate', async (req: Request, res: Response) => {
  try {
    // Clear today's cached briefing to force regenerate
    const todayStr = new Date().toISOString().split('T')[0];
    db.prepare('DELETE FROM briefings WHERE date = ?').run(todayStr);
    const briefing = await generateTodayBriefing();
    res.json({ briefing });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// User Taste Profile & Settings
// ----------------------------------------------------
app.get('/api/profile/taste', (req: Request, res: Response) => {
  const profile = getUserTasteProfile();
  res.json({ profile });
});

app.get('/api/settings', (req: Request, res: Response) => {
  const apiKey = getGeminiApiKey();
  res.json({
    hasGeminiKey: !!apiKey,
    maskedApiKey: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : null
  });
});

app.post('/api/settings', (req: Request, res: Response) => {
  try {
    const { geminiApiKey } = req.body;
    if (geminiApiKey !== undefined) {
      db.prepare(`
        INSERT INTO user_profile (key, value) VALUES ('gemini_api_key', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(geminiApiKey.trim());
    }
    res.json({ success: true });
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

// Background periodic sync every 30 minutes
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    syncAllFeeds().catch(err => console.error('Periodic sync error:', err));
  }, 30 * 60 * 1000);
}

export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Lenz Server is running at http://localhost:${PORT}`);
  });
}
