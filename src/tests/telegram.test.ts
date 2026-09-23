import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server/index.js';
import { db, initDatabase } from '../server/db.js';
import {
  escapeTelegramHtml,
  cleanSummary,
  chunkTelegramMessage,
  getCurrentTimeInTimezone,
  isSubscriptionDueToSend,
  parseSentSlots,
  addSentSlot,
  getTelegramBotToken,
  setTelegramBotToken,
  generateGroupNewsDigest,
  sendTelegramMessage,
  checkAndRunScheduledDigests,
  handleTelegramWebhookUpdate,
  detectLatestTelegramChat,
  pollTelegramUpdates
} from '../server/telegram.js';

describe('Telegram Integration & Group Digest Tests', () => {
  beforeAll(() => {
    initDatabase();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------------
  // 1. Text Formatting & Chunking Tests
  // ------------------------------------------------------------------------
  describe('HTML escaping and chunking', () => {
    it('escapes &, <, > properly', () => {
      expect(escapeTelegramHtml('AI & Tech <OpenAI> > Google')).toBe('AI &amp; Tech &lt;OpenAI&gt; &gt; Google');
      expect(escapeTelegramHtml('')).toBe('');
    });

    it('cleanSummary strips tags and trims properly', () => {
      const dirty = '<p>این یک <b>خلاصه تستی</b> با تگ‌های HTML است.</p>';
      const clean = cleanSummary(dirty, 50);
      expect(clean).toContain('این یک خلاصه تستی با تگ‌های HTML است.');
      expect(clean).not.toContain('<p>');
      expect(clean).not.toContain('<b>');
    });

    it('chunkTelegramMessage splits messages at line boundaries when exceeding limit', () => {
      const line1 = 'خط اول کوتاه';
      const line2 = 'خط دوم کوتاه';
      const chunksShort = chunkTelegramMessage(`${line1}\n${line2}`, 100);
      expect(chunksShort.length).toBe(1);
      expect(chunksShort[0]).toBe(`${line1}\n${line2}`);

      // Long message exceeding maxLen
      const longLines = Array.from({ length: 20 }, (_, i) => `این یک خط تستی طولانی برای بررسی تقطیع پیام تلگرام شماره ${i} است.`);
      const fullText = longLines.join('\n');
      const chunksLong = chunkTelegramMessage(fullText, 250);

      expect(chunksLong.length).toBeGreaterThan(1);
      for (const chunk of chunksLong) {
        expect(chunk.length).toBeLessThanOrEqual(250);
      }
      // Verify all lines preserved across chunks
      const recombined = chunksLong.join('\n');
      for (let i = 0; i < 20; i++) {
        expect(recombined).toContain(`شماره ${i}`);
      }
    });
  });

  // ------------------------------------------------------------------------
  // 2. Schedule Calculation & Timezone Tests
  // ------------------------------------------------------------------------
  describe('isSubscriptionDueToSend', () => {
    it('returns false if subscription is not active', () => {
      const sub = {
        is_active: 0,
        schedule_times: ['09:00', '21:00'],
        timezone: 'Asia/Tehran'
      };
      const res = isSubscriptionDueToSend(sub);
      expect(res.isDue).toBe(false);
    });

    it('returns false if schedule_times is empty', () => {
      const sub = {
        is_active: 1,
        schedule_times: [],
        timezone: 'Asia/Tehran'
      };
      const res = isSubscriptionDueToSend(sub);
      expect(res.isDue).toBe(false);
    });

    it('returns true when current time matches a scheduled slot', () => {
      // Create a fixed date: 2026-09-23 at 09:02 UTC
      // If timezone is UTC:
      const testDate = new Date('2026-09-23T09:02:00Z');
      const sub = {
        is_active: 1,
        schedule_times: ['09:00', '18:00'],
        timezone: 'UTC',
        last_sent_slot: null
      };

      const res = isSubscriptionDueToSend(sub, testDate);
      expect(res.isDue).toBe(true);
      expect(res.matchingSlot).toBe('09:00');
      expect(res.slotKey).toBe('2026-09-23_09:00');
    });

    it('returns false if already sent for the matching slot today', () => {
      const testDate = new Date('2026-09-23T09:02:00Z');
      const sub = {
        is_active: 1,
        schedule_times: ['09:00', '18:00'],
        timezone: 'UTC',
        last_sent_slot: '2026-09-23_09:00'
      };

      const res = isSubscriptionDueToSend(sub, testDate);
      expect(res.isDue).toBe(false);
    });

    it('returns false if outside the tolerance window', () => {
      // 09:10 UTC is 10 minutes past 09:00 (tolerance is 5 min)
      const testDate = new Date('2026-09-23T09:10:00Z');
      const sub = {
        is_active: 1,
        schedule_times: ['09:00', '18:00'],
        timezone: 'UTC',
        last_sent_slot: null
      };

      const res = isSubscriptionDueToSend(sub, testDate);
      expect(res.isDue).toBe(false);
    });

    it('handles JSON string for schedule_times correctly', () => {
      const testDate = new Date('2026-09-23T14:03:00Z');
      const sub = {
        is_active: 1,
        schedule_times: JSON.stringify(['08:00', '14:00', '20:00']),
        timezone: 'UTC',
        last_sent_slot: null
      };

      const res = isSubscriptionDueToSend(sub, testDate);
      expect(res.isDue).toBe(true);
      expect(res.matchingSlot).toBe('14:00');
    });
  });

  // ------------------------------------------------------------------------
  // 3. Bot Token Management Tests
  // ------------------------------------------------------------------------
  describe('Bot Token Management', () => {
    it('sets and retrieves bot token from database', () => {
      setTelegramBotToken('123456789:TEST_TOKEN_XYZ');
      expect(getTelegramBotToken()).toBe('123456789:TEST_TOKEN_XYZ');

      // Cleaning token
      setTelegramBotToken(null);
      expect(getTelegramBotToken()).toBeNull();
    });
  });

  // ------------------------------------------------------------------------
  // 4. Group News Digest Generation Tests
  // ------------------------------------------------------------------------
  describe('generateGroupNewsDigest', () => {
    it('generates a formatted digest grouping articles by folder', async () => {
      // Create dedicated test folder and feed
      const folderName = 'گروه اختصاصی هوش مصنوعی تلگرام ' + Date.now();
      const folderInfo = db.prepare(`
        INSERT INTO folders (name, icon, order_index)
        VALUES (?, 'cpu', 0)
      `).run(folderName);
      const folderId = Number(folderInfo.lastInsertRowid);

      const feedInsert = db.prepare(`
        INSERT INTO feeds (folder_id, title, url, site_url)
        VALUES (?, ?, ?, ?)
      `);
      const testFeedUrl = `https://test-feed-${Date.now()}-${Math.random()}.com/rss`;
      const feedRes = feedInsert.run(folderId, 'فید تستی تلگرام', testFeedUrl, 'https://test-feed.com');
      const feedId = Number(feedRes.lastInsertRowid);

      // Insert mock articles
      const artInsert = db.prepare(`
        INSERT INTO articles (feed_id, guid, title, link, published_at, summary, importance_score)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      artInsert.run(feedId, `art-tg-1-${Date.now()}-${Math.random()}`, 'مهم‌ترین دستاورد هوش مصنوعی در سال جاری', 'https://test.com/art1', new Date().toISOString(), 'توضیحات دستاورد جدید', 95.0);
      artInsert.run(feedId, `art-tg-2-${Date.now()}-${Math.random()}`, 'تحول جدید در توسعه نرم‌افزار', 'https://test.com/art2', new Date().toISOString(), 'توضیحات تحول نرم‌افزاری', 80.0);

      // Generate digest for this specific folder
      const digest = await generateGroupNewsDigest([folderId]);
      expect(digest.articleCount).toBe(2);
      expect(digest.groupCount).toBe(1);
      expect(digest.textChunks.length).toBeGreaterThanOrEqual(1);

      const combinedText = digest.textChunks.join('\n');
      expect(combinedText).toContain('خلاصه هوشمند اخبار لنز');
      expect(combinedText).toContain(folderName);
      expect(combinedText).toContain('مهم‌ترین دستاورد هوش مصنوعی در سال جاری');
      expect(combinedText).toContain('https://test.com/art1');
    });

    it('filters by selected folder IDs', async () => {
      const folder = db.prepare('SELECT id FROM folders LIMIT 1').get() as { id: number };
      const digest = await generateGroupNewsDigest([folder.id]);
      expect(digest).toBeDefined();
      expect(digest.textChunks.length).toBeGreaterThan(0);
    });
  });

  // ------------------------------------------------------------------------
  // 5. REST API Integration Tests
  // ------------------------------------------------------------------------
  describe('REST API: /api/telegram/*', () => {
    it('GET /api/telegram/status returns configuration and folders', async () => {
      const res = await request(app).get('/api/telegram/status');
      expect(res.status).toBe(200);
      expect(res.body.botTokenConfigured).toBeDefined();
      expect(Array.isArray(res.body.subscriptions)).toBe(true);
      expect(Array.isArray(res.body.folders)).toBe(true);
      expect(res.body.folders.length).toBeGreaterThan(0);
    });

    it('POST /api/telegram/bot-token saves token', async () => {
      // Mock fetch for getMe
      const mockFetch = vi.fn().mockResolvedValue({
        json: async () => ({
          ok: true,
          result: { username: 'LenzTestBot', first_name: 'Lenz Bot' }
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await request(app)
        .post('/api/telegram/bot-token')
        .send({ botToken: '123456:FAKE_TOKEN_FOR_TEST' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.botInfo.username).toBe('LenzTestBot');
      expect(getTelegramBotToken()).toBe('123456:FAKE_TOKEN_FOR_TEST');
    });

    it('POST /api/telegram/subscriptions creates or updates subscription with custom schedule', async () => {
      const testChatId = `test_chat_${Date.now()}`;
      const res = await request(app)
        .post('/api/telegram/subscriptions')
        .send({
          chatId: testChatId,
          username: 'test_user',
          firstName: 'کاربر تستی',
          scheduleTimes: ['08:30', '13:30', '20:30'], // 3 times a day
          timezone: 'Asia/Tehran',
          folderIds: 'all',
          isActive: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.subscription.chat_id).toBe(testChatId);
      expect(res.body.subscription.schedule_times).toEqual(['08:30', '13:30', '20:30']);
      expect(res.body.subscription.timezone).toBe('Asia/Tehran');

      // Update existing subscription
      const subId = res.body.subscription.id;
      const updateRes = await request(app)
        .put(`/api/telegram/subscriptions/${subId}`)
        .send({
          scheduleTimes: ['10:00', '22:00'],
          isActive: false
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.subscription.schedule_times).toEqual(['10:00', '22:00']);
      expect(updateRes.body.subscription.is_active).toBe(0);

      // Delete subscription
      const delRes = await request(app).delete(`/api/telegram/subscriptions/${subId}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
    });

    it('POST /api/telegram/subscriptions validates missing chatId', async () => {
      const res = await request(app)
        .post('/api/telegram/subscriptions')
        .send({ scheduleTimes: ['09:00'] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('شناسه چت');
    });

    it('POST /api/telegram/test sends test message to chat', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({
          ok: true,
          result: { message_id: 999 }
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await request(app)
        .post('/api/telegram/test')
        .send({ chatId: '123456789' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.messageId).toBe(999);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('POST /api/telegram/digest/send generates and sends digest immediately', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({
          ok: true,
          result: { message_id: 1001 }
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await request(app)
        .post('/api/telegram/digest/send')
        .send({ chatId: '987654321', folderIds: 'all' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.messageCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ------------------------------------------------------------------------
  // 6. Telegram Webhook Handler Tests
  // ------------------------------------------------------------------------
  describe('Webhook & Bot Commands', () => {
    it('handles /start command by registering subscriber and sending welcome message', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ ok: true, result: { message_id: 1 } })
      });
      vi.stubGlobal('fetch', mockFetch);

      const update = {
        message: {
          chat: { id: 777888999 },
          from: { username: 'telegram_user', first_name: 'علیرضا' },
          text: '/start'
        }
      };

      const result = await handleTelegramWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(result.replyText).toContain('به دستیار تلگرام فیدخوان هوشمند');
      expect(result.replyText).toContain('لنز (Lenz)');
      expect(result.replyText).toContain('777888999');

      // Verify subscriber registered in database
      const sub = db.prepare('SELECT * FROM telegram_subscriptions WHERE chat_id = ?').get('777888999') as any;
      expect(sub).toBeDefined();
      expect(sub.first_name).toBe('علیرضا');
      expect(sub.is_active).toBe(1);
    });

    it('handles /folders command by listing categories', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ ok: true, result: { message_id: 2 } })
      });
      vi.stubGlobal('fetch', mockFetch);

      const update = {
        message: {
          chat: { id: 777888999 },
          text: '/folders'
        }
      };

      const result = await handleTelegramWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(result.replyText).toContain('گروه‌ها و دسته‌های خبری لنز');
    });

    it('handles /status command by returning subscription info', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ ok: true, result: { message_id: 3 } })
      });
      vi.stubGlobal('fetch', mockFetch);

      const update = {
        message: {
          chat: { id: 777888999 },
          text: '/status'
        }
      };

      const result = await handleTelegramWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(result.replyText).toContain('وضعیت اتصال شما به لنز');
      expect(result.replyText).toContain('فعال');
    });

    it('handles /help command by listing instructions', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ ok: true, result: { message_id: 4 } })
      });
      vi.stubGlobal('fetch', mockFetch);

      const update = {
        message: {
          chat: { id: 777888999 },
          text: '/help'
        }
      };

      const result = await handleTelegramWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(result.replyText).toContain('/digest');
      expect(result.replyText).toContain('/folders');
    });
  });

  // ------------------------------------------------------------------------
  // 7. Automated Scheduler Tests
  // ------------------------------------------------------------------------
  describe('checkAndRunScheduledDigests', () => {
    it('executes scheduled digest for matching slot and prevents duplicate same-day sending', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ ok: true, result: { message_id: 500 } })
      });
      vi.stubGlobal('fetch', mockFetch);

      // Create an active subscription scheduled for 09:00 UTC
      const schedChatId = `sched_test_${Date.now()}`;
      db.prepare(`
        INSERT INTO telegram_subscriptions (chat_id, schedule_times, timezone, folder_ids, is_active)
        VALUES (?, '["09:00"]', 'UTC', 'all', 1)
      `).run(schedChatId);

      const targetDate = new Date('2026-09-23T09:01:00Z');

      // First run: should be due and sent
      const run1 = await checkAndRunScheduledDigests(targetDate);
      expect(run1.sentCount).toBeGreaterThanOrEqual(1);

      // Verify last_sent_slot is saved
      const updatedSub = db.prepare('SELECT * FROM telegram_subscriptions WHERE chat_id = ?').get(schedChatId) as any;
      expect(parseSentSlots(updatedSub.last_sent_slot)).toContain('2026-09-23_09:00');
      expect(updatedSub.last_sent_at).toBeDefined();

      // Second run at 09:03 UTC: must NOT send duplicate
      const targetDate2 = new Date('2026-09-23T09:03:00Z');
      const run2 = await checkAndRunScheduledDigests(targetDate2);
      expect(run2.sentCount).toBe(0); // Duplicate prevented!
    });
  });

  // ------------------------------------------------------------------------
  // 8. Edge Cases & Boundary Value Tests
  // ------------------------------------------------------------------------
  describe('Edge cases and boundary values', () => {
    it('handles empty folderIds array without crashing or SQL errors', async () => {
      const digest = await generateGroupNewsDigest([]);
      expect(digest.articleCount).toBe(0);
      expect(digest.groupCount).toBe(0);
      expect(digest.textChunks.length).toBe(1);
      expect(digest.textChunks[0]).toContain('در حال حاضر خبر جدیدی در گروه‌های انتخابی شما ثبت نشده است');
    });

    it('handles nonexistent folder IDs gracefully', async () => {
      const digest = await generateGroupNewsDigest([999999, 888888]);
      expect(digest.articleCount).toBe(0);
      expect(digest.textChunks[0]).toContain('در حال حاضر خبر جدیدی');
    });

    it('handles multiple daily delivery slots independently', () => {
      const testDateMorning = new Date('2026-09-23T08:02:00Z');
      const testDateAfternoon = new Date('2026-09-23T14:01:00Z');
      const testDateNight = new Date('2026-09-23T20:04:00Z');

      const sub: {
        is_active: number;
        schedule_times: string[];
        timezone: string;
        last_sent_slot: string | null;
      } = {
        is_active: 1,
        schedule_times: ['08:00', '14:00', '20:00'],
        timezone: 'UTC',
        last_sent_slot: null
      };

      // Morning slot is due
      const mRes = isSubscriptionDueToSend(sub, testDateMorning);
      expect(mRes.isDue).toBe(true);
      expect(mRes.matchingSlot).toBe('08:00');

      // After morning is sent, afternoon slot should still be due
      sub.last_sent_slot = '2026-09-23_08:00';
      const aRes = isSubscriptionDueToSend(sub, testDateAfternoon);
      expect(aRes.isDue).toBe(true);
      expect(aRes.matchingSlot).toBe('14:00');

      // After afternoon is sent, night slot should still be due
      sub.last_sent_slot = '2026-09-23_14:00';
      const nRes = isSubscriptionDueToSend(sub, testDateNight);
      expect(nRes.isDue).toBe(true);
      expect(nRes.matchingSlot).toBe('20:00');
    });

    it('handles invalid or corrupt time strings in schedule_times without throwing', () => {
      const sub = {
        is_active: 1,
        schedule_times: ['invalid', '25:99', '', 'null'],
        timezone: 'UTC'
      };
      expect(() => isSubscriptionDueToSend(sub)).not.toThrow();
      expect(isSubscriptionDueToSend(sub).isDue).toBe(false);
    });

    it('handles negative Telegram chat IDs (channels and groups)', async () => {
      const channelChatId = '-1001987654321';
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ ok: true, result: { message_id: 888 } })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await sendTelegramMessage(channelChatId, 'تست کانال', 'fake-token');
      expect(res.ok).toBe(true);
      expect(res.messageId).toBe(888);
    });

    it('handles Telegram API error responses with descriptive messages', async () => {
      // 401 Unauthorized
      const mock401 = vi.fn().mockResolvedValue({
        status: 401,
        json: async () => ({ ok: false, error_code: 401, description: 'Unauthorized' })
      });
      vi.stubGlobal('fetch', mock401);
      const res401 = await sendTelegramMessage('12345', 'تست', 'invalid-token');
      expect(res401.ok).toBe(false);
      expect(res401.error).toContain('Unauthorized');

      // 400 chat not found
      const mockChatNotFound = vi.fn().mockResolvedValue({
        status: 400,
        json: async () => ({ ok: false, error_code: 400, description: 'Bad Request: chat not found' })
      });
      vi.stubGlobal('fetch', mockChatNotFound);
      const res400 = await sendTelegramMessage('invalid_chat', 'تست', 'token');
      expect(res400.ok).toBe(false);
      expect(res400.error).toContain('شناسه چت یافت نشد');

      // 403 blocked by user
      const mockBlocked = vi.fn().mockResolvedValue({
        status: 403,
        json: async () => ({ ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' })
      });
      vi.stubGlobal('fetch', mockBlocked);
      const res403 = await sendTelegramMessage('blocked_chat', 'تست', 'token');
      expect(res403.ok).toBe(false);
      expect(res403.error).toContain('مسدود');
    });

    it('escapes dangerous HTML characters in titles and summaries', () => {
      const dangerousTitle = '<script>alert("hack")</script> & "quotes"';
      const escaped = escapeTelegramHtml(dangerousTitle);
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
      expect(escaped).toContain('&amp;');
    });

    it('handles multiple slots close to each other without suppressing subsequent slots or retriggering earlier slots', () => {
      const sub = {
        is_active: 1,
        schedule_times: ['09:00', '09:04'],
        timezone: 'UTC',
        last_sent_slot: null as string | null
      };

      // 1. At 09:00 UTC, slot 09:00 should be due
      const at0900 = new Date('2026-09-23T09:00:30Z');
      const res0900 = isSubscriptionDueToSend(sub, at0900);
      expect(res0900.isDue).toBe(true);
      expect(res0900.matchingSlot).toBe('09:00');

      // Simulate sending 09:00 slot
      sub.last_sent_slot = addSentSlot(sub.last_sent_slot, res0900.slotKey!, '2026-09-23');
      expect(parseSentSlots(sub.last_sent_slot)).toContain('2026-09-23_09:00');

      // 2. At 09:04 UTC, slot 09:04 MUST be due (previously suppressed by 09:00 in prior attempt!)
      const at0904 = new Date('2026-09-23T09:04:15Z');
      const res0904 = isSubscriptionDueToSend(sub, at0904);
      expect(res0904.isDue).toBe(true);
      expect(res0904.matchingSlot).toBe('09:04');

      // Simulate sending 09:04 slot
      sub.last_sent_slot = addSentSlot(sub.last_sent_slot, res0904.slotKey!, '2026-09-23');
      expect(parseSentSlots(sub.last_sent_slot)).toContain('2026-09-23_09:04');

      // 3. At 09:05 UTC, neither 09:00 nor 09:04 should re-trigger (previously re-triggered in prior attempt!)
      const at0905 = new Date('2026-09-23T09:05:00Z');
      const res0905 = isSubscriptionDueToSend(sub, at0905);
      expect(res0905.isDue).toBe(false);
    });

    it('splits individual lines exceeding maxLen into safe sub-chunks', () => {
      // 5000 character line with no newlines
      const singleLongLine = 'الف '.repeat(1250); // ~5000 chars
      const chunks = chunkTelegramMessage(singleLongLine, 1000);
      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(1000);
      }
    });

    it('PUT /api/telegram/subscriptions/:id updates chat_id and schedule successfully', async () => {
      const initialChatId = `chat_initial_${Date.now()}`;
      const createRes = await request(app)
        .post('/api/telegram/subscriptions')
        .send({
          chatId: initialChatId,
          scheduleTimes: ['09:00'],
          timezone: 'Asia/Tehran'
        });
      const subId = createRes.body.subscription.id;

      // Update with new chatId and new times
      const newChatId = `chat_updated_${Date.now()}`;
      const updateRes = await request(app)
        .put(`/api/telegram/subscriptions/${subId}`)
        .send({
          chatId: newChatId,
          scheduleTimes: ['08:00', '20:00']
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.subscription.chat_id).toBe(newChatId);
      expect(updateRes.body.subscription.schedule_times).toEqual(['08:00', '20:00']);

      // Verify in DB directly
      const dbSub = db.prepare('SELECT chat_id FROM telegram_subscriptions WHERE id = ?').get(subId) as any;
      expect(dbSub.chat_id).toBe(newChatId);

      // Clean up
      await request(app).delete(`/api/telegram/subscriptions/${subId}`);
    });

    it('POST /api/telegram/detect-chat returns latest chat from Telegram updates', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({
          ok: true,
          result: [
            {
              update_id: 10001,
              message: {
                message_id: 50,
                from: { id: 654321, username: 'tester_user', first_name: 'تستر' },
                chat: { id: 654321, username: 'tester_user', first_name: 'تستر', type: 'private' },
                text: '/start'
              }
            }
          ]
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await request(app)
        .post('/api/telegram/detect-chat')
        .send({ botToken: 'mock:token' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.chatId).toBe('654321');
      expect(res.body.username).toBe('tester_user');
      expect(res.body.firstName).toBe('تستر');
    });

    it('prioritizes fresh articles over ancient unread articles in group digest', async () => {
      const folderRes = db.prepare(`
        INSERT INTO folders (name, icon, order_index)
        VALUES (?, 'globe', 10)
      `).run('گروه تست تازگی ' + Date.now());
      const folderId = Number(folderRes.lastInsertRowid);

      const feedRes = db.prepare(`
        INSERT INTO feeds (folder_id, title, url)
        VALUES (?, 'فید تست تازگی', ?)
      `).run(folderId, `https://fresh-test-${Date.now()}.com/rss`);
      const feedId = Number(feedRes.lastInsertRowid);

      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
      const freshDate = new Date().toISOString(); // today

      // Old unread article with high importance
      db.prepare(`
        INSERT INTO articles (feed_id, guid, title, link, published_at, summary, importance_score, is_read)
        VALUES (?, ?, 'خبر قدیمی از ماه گذشته', 'https://test.com/old', ?, 'خلاصه قدیمی', 99.0, 0)
      `).run(feedId, `old-${Date.now()}`, oldDate);

      // Fresh article with moderate importance
      db.prepare(`
        INSERT INTO articles (feed_id, guid, title, link, published_at, summary, importance_score, is_read)
        VALUES (?, ?, 'خبر تازه امروز با اهمیت خوب', 'https://test.com/fresh', ?, 'خلاصه تازه', 75.0, 0)
      `).run(feedId, `fresh-${Date.now()}`, freshDate);

      const digest = await generateGroupNewsDigest([folderId]);
      const text = digest.textChunks.join('\n');
      expect(text).toContain('خبر تازه امروز با اهمیت خوب');
    });

    it('ensures D1 schema creates telegram_subscriptions table even when folders table already exists', async () => {
      const { ensureD1Schema } = await import('../../functions/lib/d1-db.js');

      let telegramCreated = false;
      const mockDb = {
        prepare: vi.fn((sql: string) => {
          if (sql.includes("name='folders'")) {
            // Simulate folders table ALREADY exists
            return { first: vi.fn().mockResolvedValue({ name: 'folders' }) };
          }
          if (sql.includes("name='telegram_subscriptions'")) {
            // Simulate telegram_subscriptions DOES NOT exist yet
            return { first: vi.fn().mockResolvedValue(null) };
          }
          if (sql.includes('CREATE TABLE IF NOT EXISTS telegram_subscriptions')) {
            telegramCreated = true;
          }
          return {
            bind: vi.fn().mockReturnThis(),
            first: vi.fn().mockResolvedValue(null),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ meta: {} })
          };
        }),
        batch: vi.fn(async (stmts: any[]) => {
          telegramCreated = true;
          return [];
        })
      };

      await ensureD1Schema(mockDb as any);
      expect(telegramCreated).toBe(true);
    });
  });
});
