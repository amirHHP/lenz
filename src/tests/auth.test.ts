import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/index.js';
import { db, initDatabase } from '../server/db.js';

describe('Authentication & Multi-User Isolation Tests', () => {
  beforeAll(() => {
    initDatabase();
  });

  const uniqueSuffix = Date.now() + '_' + Math.floor(Math.random() * 1000);
  const userA = {
    username: `user_a_${uniqueSuffix}`,
    password: 'password123',
    displayName: 'کاربر الف'
  };

  const userB = {
    username: `user_b_${uniqueSuffix}`,
    password: 'password456',
    displayName: 'کاربر ب'
  };

  let tokenA = '';
  let tokenB = '';
  let userIdA = 0;
  let userIdB = 0;
  let feedIdA = 0;
  let feedIdB = 0;

  it('POST /api/auth/register fails on short username or password', async () => {
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ab', password: '123', displayName: 'تست' });
    expect(res1.status).toBe(400);

    const res2 = await request(app)
      .post('/api/auth/register')
      .send({ username: 'valid_user', password: '12', displayName: 'تست' });
    expect(res2.status).toBe(400);

    const res3 = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user with spaces!', password: 'password123', displayName: 'تست' });
    expect(res3.status).toBe(400);
  });

  it('POST /api/auth/register successfully registers User A and seeds default folders', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(userA);

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe(userA.username.toLowerCase());
    expect(res.body.user.displayName).toBe(userA.displayName);
    expect(res.body.token).toBeDefined();

    tokenA = res.body.token;
    userIdA = res.body.user.id;

    // Verify user A has 10 default folders in DB
    const foldersA = db.prepare('SELECT * FROM folders WHERE user_id = ?').all(userIdA);
    expect(foldersA.length).toBe(10);
  });

  it('POST /api/auth/register returns 409 for duplicate username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(userA);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('قبلاً ثبت شده است');
  });

  it('POST /api/auth/register successfully registers User B', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(userB);

    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe(userB.username.toLowerCase());
    tokenB = res.body.token;
    userIdB = res.body.user.id;

    expect(userIdB).not.toBe(userIdA);
  });

  it('POST /api/auth/login succeeds with correct password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: userA.username, password: userA.password });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(userIdA);
    expect(res.body.token).toBeDefined();
  });

  it('POST /api/auth/login fails with wrong password or wrong username', async () => {
    const res1 = await request(app)
      .post('/api/auth/login')
      .send({ username: userA.username, password: 'wrongpassword' });
    expect(res1.status).toBe(401);

    const res2 = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nonexistent_user_xyz', password: 'password' });
    expect(res2.status).toBe(401);
  });

  it('GET /api/auth/me returns user info when authenticated', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.user.id).toBe(userIdA);
    expect(res.body.user.username).toBe(userA.username.toLowerCase());
  });

  it('GET /api/auth/me returns authenticated: false when unauthenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(false);
    expect(res.body.user).toBeNull();
  });

  it('GET /api/auth/me returns 401 when invalid Bearer token is provided', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-dummy-token-12345');
    expect(res.status).toBe(401);
  });

  it('PUT /api/auth/profile updates display name and changes password', async () => {
    // 1. Update display name
    const updateRes = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ displayName: 'کاربر الف - ویرایش‌شده' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.user.displayName).toBe('کاربر الف - ویرایش‌شده');

    // 2. Change password with wrong current password fails
    const failPwd = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ currentPassword: 'wrongCurrentPassword', newPassword: 'newpassword789' });
    expect(failPwd.status).toBe(400);

    // 3. Change password with correct current password succeeds
    const successPwd = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ currentPassword: userA.password, newPassword: 'newpassword789' });
    expect(successPwd.status).toBe(200);

    // 4. Verify login with new password succeeds
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: userA.username, password: 'newpassword789' });
    expect(loginRes.status).toBe(200);
  });

  it('Multi-User Isolation: User A and User B have separate folders, feeds, and articles', async () => {
    // 1. User A creates custom folder
    const folderResA = await request(app)
      .post('/api/folders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'پوشه اختصاصی کاربر الف', icon: 'folder' });
    expect(folderResA.status).toBe(200);
    const folderIdA = folderResA.body.id;

    // 2. User B creates custom folder
    const folderResB = await request(app)
      .post('/api/folders')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'پوشه اختصاصی کاربر ب', icon: 'star' });
    expect(folderResB.status).toBe(200);
    const folderIdB = folderResB.body.id;

    // 3. User A gets folders -> should see their folder, NOT User B's folder
    const listFoldersA = await request(app)
      .get('/api/folders')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(listFoldersA.body.folders.some((f: any) => f.id === folderIdA)).toBe(true);
    expect(listFoldersA.body.folders.some((f: any) => f.id === folderIdB)).toBe(false);

    // 4. User B gets folders -> should see their folder, NOT User A's folder
    const listFoldersB = await request(app)
      .get('/api/folders')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(listFoldersB.body.folders.some((f: any) => f.id === folderIdB)).toBe(true);
    expect(listFoldersB.body.folders.some((f: any) => f.id === folderIdA)).toBe(false);

    // 5. User A subscribes to a feed
    const subResA = await request(app)
      .post('/api/directory/subscribe')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ directoryId: 'hn', folderId: folderIdA });
    expect(subResA.status).toBe(200);
    feedIdA = subResA.body.id;

    // 6. User B gets feeds -> User B should NOT see User A's feed
    const listFeedsB = await request(app)
      .get('/api/feeds')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(listFeedsB.body.feeds.some((f: any) => f.id === feedIdA)).toBe(false);

    // 7. User B can also subscribe to Hacker News independently!
    const subResB = await request(app)
      .post('/api/directory/subscribe')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ directoryId: 'hn', folderId: folderIdB });
    expect(subResB.status).toBe(200);
    feedIdB = subResB.body.id;
    expect(feedIdB).not.toBe(feedIdA);

    // 8. User A inserts an article into feed A, stars and highlights it
    const now = new Date().toISOString();
    const artInsert = db.prepare(`
      INSERT INTO articles (feed_id, guid, title, link, published_at, summary, importance_score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(feedIdA, 'guid-iso-' + uniqueSuffix, 'خبر اختصاصی کاربر الف', 'https://test.com/artA', now, 'خلاصه', 90);
    const artIdA = Number(artInsert.lastInsertRowid);

    // User A stars article
    await request(app)
      .post(`/api/articles/${artIdA}/star`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ isStarred: true });

    // User A gets starred articles
    const starredA = await request(app)
      .get('/api/articles?isStarred=true')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(starredA.body.articles.some((a: any) => a.id === artIdA)).toBe(true);

    // User B gets starred articles -> should NOT see User A's starred article
    const starredB = await request(app)
      .get('/api/articles?isStarred=true')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(starredB.body.articles.some((a: any) => a.id === artIdA)).toBe(false);

    // User B attempting to read or star User A's article returns 404
    const forbiddenStar = await request(app)
      .post(`/api/articles/${artIdA}/star`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ isStarred: true });
    expect(forbiddenStar.status).toBe(404);

    // User B attempting to fetch User A's article directly returns 404
    const forbiddenDetail = await request(app)
      .get(`/api/articles/${artIdA}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(forbiddenDetail.status).toBe(404);

    // User B attempting to request AI summary for User A's article returns 404
    const forbiddenSummary = await request(app)
      .post(`/api/articles/${artIdA}/summary`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(forbiddenSummary.status).toBe(404);

    // User A requesting AI summary for User A's article succeeds
    const allowedSummary = await request(app)
      .post(`/api/articles/${artIdA}/summary`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(allowedSummary.status).toBe(200);
    expect(allowedSummary.body.summary).toBeDefined();

    // User B attempting to update User A's feed does not affect User A's feed
    await request(app)
      .put(`/api/feeds/${feedIdA}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ title: 'تغییر غیرمجاز' });
    const checkFeedA = db.prepare('SELECT title FROM feeds WHERE id = ?').get(feedIdA) as any;
    expect(checkFeedA.title).not.toBe('تغییر غیرمجاز');

    // User B attempting to delete User A's feed does not delete it
    await request(app)
      .delete(`/api/feeds/${feedIdA}`)
      .set('Authorization', `Bearer ${tokenB}`);
    const checkFeedAExists = db.prepare('SELECT id FROM feeds WHERE id = ?').get(feedIdA);
    expect(checkFeedAExists).toBeDefined();

    // User B marks all as read -> User A's article remains read/unread state intact
    // First ensure user A article is unread
    db.prepare('UPDATE articles SET is_read = 0 WHERE id = ?').run(artIdA);
    // User B marks all read
    await request(app)
      .post('/api/articles/mark-all-read')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({});
    // User A's article should still be unread (0)
    const checkArtA = db.prepare('SELECT is_read FROM articles WHERE id = ?').get(artIdA) as any;
    expect(checkArtA.is_read).toBe(0);

    // User taste profiles are isolated
    const tasteA = await request(app)
      .get('/api/profile/taste')
      .set('Authorization', `Bearer ${tokenA}`);
    const tasteB = await request(app)
      .get('/api/profile/taste')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(tasteA.body.profile).toBeDefined();
    expect(tasteB.body.profile).toBeDefined();
  });

  it('Multi-User Isolation: User A and User B can generate daily briefings independently on the same date', async () => {
    // 1. User A generates briefing for today
    const briefResA = await request(app)
      .post('/api/briefing/generate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({});
    expect(briefResA.status).toBe(200);
    expect(briefResA.body.briefing).toBeDefined();

    // 2. Insert article for User B so User B has articles to synthesize a briefing
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO articles (feed_id, guid, title, link, published_at, summary, importance_score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(feedIdB, 'guid-iso-b-' + uniqueSuffix, 'خبر اختصاصی کاربر ب برای بریفینگ', 'https://test.com/artB2', now, 'خلاصه خبر ب', 85);

    // 3. User B generates briefing for today
    const briefResB = await request(app)
      .post('/api/briefing/generate')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({});
    expect(briefResB.status).toBe(200);
    expect(briefResB.body.briefing).toBeDefined();

    // 4. Confirm both briefings are stored concurrently in DB for the same date with separate user_id
    const todayStr = new Date().toISOString().split('T')[0];
    const userABriefing = db.prepare('SELECT * FROM briefings WHERE date = ? AND user_id = ?').get(todayStr, userIdA) as any;
    const userBBriefing = db.prepare('SELECT * FROM briefings WHERE date = ? AND user_id = ?').get(todayStr, userIdB) as any;
    expect(userABriefing).toBeDefined();
    expect(userBBriefing).toBeDefined();
    expect(userABriefing.id).not.toBe(userBBriefing.id);
  });

  it('Multi-User Isolation: User A and User B can configure telegram subscriptions for the same chat ID', async () => {
    const sharedChatId = '1122334455';

    // 1. User A creates subscription
    const subResA = await request(app)
      .post('/api/telegram/subscriptions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ chatId: sharedChatId, username: 'usera_tg' });
    expect(subResA.status).toBe(200);
    const subIdA = subResA.body.subscription.id;

    // 2. User B creates subscription with the exact same chat ID
    const subResB = await request(app)
      .post('/api/telegram/subscriptions')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ chatId: sharedChatId, username: 'userb_tg' });
    expect(subResB.status).toBe(200);
    const subIdB = subResB.body.subscription.id;
    expect(subIdB).not.toBe(subIdA);

    // 3. User A status only shows User A subscription
    const listA = await request(app)
      .get('/api/telegram/status')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(listA.status).toBe(200);
    expect(listA.body.subscriptions.some((s: any) => s.id === subIdA)).toBe(true);
    expect(listA.body.subscriptions.some((s: any) => s.id === subIdB)).toBe(false);

    // 4. User B cannot update User A's subscription
    const updateForbidden = await request(app)
      .put(`/api/telegram/subscriptions/${subIdA}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ username: 'hacked_name' });
    expect(updateForbidden.status).toBe(404);

    // 5. User B cannot delete User A's subscription
    await request(app)
      .delete(`/api/telegram/subscriptions/${subIdA}`)
      .set('Authorization', `Bearer ${tokenB}`);
    const checkSubAExists = db.prepare('SELECT id FROM telegram_subscriptions WHERE id = ?').get(subIdA);
    expect(checkSubAExists).toBeDefined();
  });

  it('Multi-User Isolation: User API keys and settings are isolated', async () => {
    // 1. User A sets a Gemini API key
    const saveKeyRes = await request(app)
      .post('/api/settings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ geminiApiKey: 'AIzaSyUserATestKey123' });
    expect(saveKeyRes.status).toBe(200);

    // 2. User A gets settings -> hasGeminiKey is true
    const settingsA = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(settingsA.body.hasGeminiKey).toBe(true);
    expect(settingsA.body.maskedApiKey).toContain('...y123');

    // 3. User B gets settings -> hasGeminiKey is false (User A's key is not shared)
    const settingsB = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(settingsB.body.hasGeminiKey).toBe(false);
  });

  it('POST /api/auth/login is case-insensitive for username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: userB.username.toUpperCase(), password: userB.password });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(userIdB);
  });

  it('POST /api/auth/logout invalidates token', async () => {
    // User A logs out
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(logoutRes.status).toBe(200);

    // Now request with tokenA should be rejected with 401
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(meRes.status).toBe(401);
  });
});
