import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/index.js';
import { db, initDatabase } from '../server/db.js';

describe('Lenz REST API Integration Tests', () => {
  beforeAll(() => {
    initDatabase();
  });

  it('GET /api/folders returns folder list', async () => {
    const res = await request(app).get('/api/folders');
    expect(res.status).toBe(200);
    expect(res.body.folders).toBeDefined();
    expect(Array.isArray(res.body.folders)).toBe(true);
    expect(res.body.folders.length).toBeGreaterThan(0);
  });

  it('POST /api/folders creates a new folder', async () => {
    const res = await request(app)
      .post('/api/folders')
      .send({ name: 'پوشه تستی ویژه ' + Math.random(), icon: 'folder' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
  });

  it('GET /api/directory returns curated catalog with at least 10 categories and at least 20 websites in each category', async () => {
    const res = await request(app).get('/api/directory');
    expect(res.status).toBe(200);
    expect(res.body.directory).toBeDefined();
    expect(res.body.directory.length).toBeGreaterThanOrEqual(200);

    const categories = Array.from(new Set(res.body.directory.map((d: any) => d.category)));
    expect(categories.length).toBeGreaterThanOrEqual(10);

    // Each category must have at least 20 websites
    for (const cat of categories) {
      const itemsInCat = res.body.directory.filter((d: any) => d.category === cat);
      expect(itemsInCat.length).toBeGreaterThanOrEqual(20);
    }

    // Every website must have unique ID, unique URL, and required fields
    const idSet = new Set<string>();
    const urlSet = new Set<string>();
    for (const item of res.body.directory) {
      expect(item.id).toBeDefined();
      expect(item.id.length).toBeGreaterThan(0);
      expect(idSet.has(item.id)).toBe(false);
      idSet.add(item.id);

      expect(item.url).toBeDefined();
      expect(urlSet.has(item.url)).toBe(false);
      urlSet.add(item.url);

      expect(item.title).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.url).toMatch(/^https?:\/\//);
      expect(item.siteUrl).toMatch(/^https?:\/\//);
      expect(item.category).toBeTruthy();
      expect(item.icon).toBeTruthy();
    }
  });

  it('POST /api/directory/subscribe subscribes to a curated feed and assigns category folder', async () => {
    const res = await request(app)
      .post('/api/directory/subscribe')
      .send({ directoryId: 'hn' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();

    // Verify feed is in DB
    const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(res.body.id) as any;
    expect(feed).toBeDefined();
    expect(feed.url).toBe('https://news.ycombinator.com/rss');
    expect(feed.folder_id).toBeDefined();

    // Verify re-subscription returns alreadySubscribed
    const res2 = await request(app)
      .post('/api/directory/subscribe')
      .send({ directoryId: 'hn' });
    expect(res2.status).toBe(200);
    expect(res2.body.id).toBe(res.body.id);
    expect(res2.body.alreadySubscribed).toBe(true);
  });

  it('POST /api/directory/subscribe returns 404 for unknown directoryId', async () => {
    const res = await request(app)
      .post('/api/directory/subscribe')
      .send({ directoryId: 'nonexistent-item-xyz' });
    expect(res.status).toBe(404);
  });

  it('GET /api/feeds returns subscribed feeds with unread counts', async () => {
    const res = await request(app).get('/api/feeds');
    expect(res.status).toBe(200);
    expect(res.body.feeds).toBeDefined();
    expect(res.body.feeds.length).toBeGreaterThan(0);
  });

  it('Articles: create mock article, read, star, and test smart sorting', async () => {
    const feed = db.prepare('SELECT id FROM feeds LIMIT 1').get() as { id: number };
    expect(feed).toBeDefined();

    // Insert 2 articles with different importance
    const now = new Date().toISOString();
    const older = new Date(Date.now() - 36 * 3600 * 1000).toISOString();

    const insert = db.prepare(`
      INSERT INTO articles (feed_id, guid, title, link, published_at, summary, importance_score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const artHigh = insert.run(feed.id, 'guid-high-' + Math.random(), 'خبر با اهمیت خیلی بالا', 'https://test.com/high', now, 'خلاصه', 98.5);
    const artLow = insert.run(feed.id, 'guid-low-' + Math.random(), 'خبر کم اهمیت قدیمی', 'https://test.com/low', older, 'خلاصه', 25.0);

    const highId = Number(artHigh.lastInsertRowid);
    const lowId = Number(artLow.lastInsertRowid);

    // Test Smart Sorting
    const sortRes = await request(app).get(`/api/articles?feedId=${feed.id}&sort=smart&limit=100`);
    if (sortRes.status !== 200) {
      console.error('sortRes failed:', sortRes.status, sortRes.text, sortRes.headers);
    }
    expect(sortRes.status).toBe(200);
    const arts = sortRes.body.articles;
    expect(arts.length).toBeGreaterThan(1);
    // Highest score article should come before low score article
    const highIdx = arts.findIndex((a: any) => a.id === highId);
    const lowIdx = arts.findIndex((a: any) => a.id === lowId);
    expect(highIdx).toBeLessThan(lowIdx);

    // Toggle Read
    const readRes = await request(app).post(`/api/articles/${highId}/read`).send({ isRead: true });
    expect(readRes.status).toBe(200);
    expect(readRes.body.isRead).toBe(true);

    // Toggle Star
    const starRes = await request(app).post(`/api/articles/${highId}/star`).send({ isStarred: true });
    expect(starRes.status).toBe(200);
    expect(starRes.body.isStarred).toBe(true);

    // Create Highlight
    const hlRes = await request(app)
      .post('/api/highlights')
      .send({ articleId: highId, text: 'بخش هایلایت‌شده تستی', color: 'yellow', note: 'نکته مهم' });
    expect(hlRes.status).toBe(200);
    expect(hlRes.body.id).toBeDefined();

    // Get Highlights
    const getHlRes = await request(app).get('/api/highlights');
    expect(getHlRes.status).toBe(200);
    expect(getHlRes.body.highlights.some((h: any) => h.id === hlRes.body.id)).toBe(true);

    // Get Article Details
    const detailRes = await request(app).get(`/api/articles/${highId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.article.id).toBe(highId);
    expect(detailRes.body.highlights.length).toBeGreaterThan(0);

    // Toggle Star OFF (Unstar)
    const unstarRes = await request(app).post(`/api/articles/${highId}/star`).send({ isStarred: false });
    expect(unstarRes.status).toBe(200);
    expect(unstarRes.body.isStarred).toBe(false);

    // Toggle Read OFF (Unread)
    const unreadRes = await request(app).post(`/api/articles/${highId}/read`).send({ isRead: false });
    expect(unreadRes.status).toBe(200);
    expect(unreadRes.body.isRead).toBe(false);

    // Delete Highlight
    const delHlRes = await request(app).delete(`/api/highlights/${hlRes.body.id}`);
    expect(delHlRes.status).toBe(200);
    expect(delHlRes.body.success).toBe(true);
  });

  it('PUT /api/feeds/:id updates feed folder assignment and title', async () => {
    const feed = db.prepare('SELECT id FROM feeds LIMIT 1').get() as { id: number };
    const folder = db.prepare('SELECT id FROM folders LIMIT 1').get() as { id: number };
    expect(feed).toBeDefined();
    expect(folder).toBeDefined();

    const res = await request(app)
      .put(`/api/feeds/${feed.id}`)
      .send({ folderId: folder.id, title: 'عنوان جدید فید' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = db.prepare('SELECT * FROM feeds WHERE id = ?').get(feed.id) as any;
    expect(updated.folder_id).toBe(folder.id);
    expect(updated.title).toBe('عنوان جدید فید');
  });

  it('GET /api/briefing/today returns today summary', async () => {
    const res = await request(app).get('/api/briefing/today');
    expect(res.status).toBe(200);
    expect(res.body.briefing).toBeDefined();
    expect(res.body.briefing.executiveSummary).toBeDefined();
  });

  it('GET /api/profile/taste returns learned preferences', async () => {
    const res = await request(app).get('/api/profile/taste');
    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
    expect(res.body.profile.readCount).toBeGreaterThanOrEqual(1);
    expect(res.body.profile.starredCount).toBeGreaterThanOrEqual(1);
  });
});
