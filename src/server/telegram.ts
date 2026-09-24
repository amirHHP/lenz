import { db } from './db.js';

export interface TelegramSubscription {
  id: number;
  chat_id: string;
  username: string | null;
  first_name: string | null;
  bot_token: string | null;
  schedule_times: string[]; // e.g. ["09:00", "21:00"]
  timezone: string; // e.g. "Asia/Tehran"
  folder_ids: number[] | 'all'; // e.g. [1, 2] or 'all'
  is_active: number;
  last_sent_at: string | null;
  last_sent_slot: string | null;
  created_at: string;
  updated_at: string;
}

export interface TelegramDigestResult {
  textChunks: string[];
  groupCount: number;
  articleCount: number;
  groups: Array<{ id?: number; name: string; articleCount: number }>;
}

/**
 * Retrieves the configured Telegram bot token from environment or database.
 */
export function getTelegramBotToken(userId: number = 1): string | null {
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim().length > 0) {
    return process.env.TELEGRAM_BOT_TOKEN.trim();
  }
  try {
    const keyName = userId === 1 ? 'telegram_bot_token' : `telegram_bot_token_${userId}`;
    const row = db.prepare('SELECT value FROM user_profile WHERE key = ?').get(keyName) as { value: string } | undefined;
    if (row && row.value && row.value.trim().length > 0) {
      return row.value.trim();
    }
    const fallback = db.prepare("SELECT value FROM user_profile WHERE key = 'telegram_bot_token'").get() as { value: string } | undefined;
    if (fallback && fallback.value && fallback.value.trim().length > 0) {
      return fallback.value.trim();
    }
  } catch {
    // Database might not be initialized yet
  }
  return null;
}

/**
 * Saves or updates the Telegram bot token in the user profile table.
 */
export function setTelegramBotToken(token: string | null, userId: number = 1): void {
  const clean = token?.trim() || '';
  const keyName = userId === 1 ? 'telegram_bot_token' : `telegram_bot_token_${userId}`;
  if (!clean) {
    db.prepare('DELETE FROM user_profile WHERE key = ?').run(keyName);
  } else {
    db.prepare(`
      INSERT INTO user_profile (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(keyName, clean);
  }
}

/**
 * Returns the Telegram API base URL (supports reverse proxies via TELEGRAM_API_ROOT).
 */
export function getTelegramApiRoot(): string {
  return (process.env.TELEGRAM_API_ROOT || 'https://api.telegram.org').replace(/\/+$/, '');
}

/**
 * Escapes characters for Telegram HTML parse mode.
 */
export function escapeTelegramHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Cleans an article summary for Telegram HTML presentation.
 */
export function cleanSummary(summary: string | null | undefined, maxLen = 140): string {
  if (!summary) return '';
  const stripped = summary
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/\s+/g, ' ')
    .trim();
  if (!stripped) return '';
  const truncated = stripped.length > maxLen ? stripped.slice(0, maxLen).trim() + '...' : stripped;
  return escapeTelegramHtml(truncated);
}

/**
 * Chunks a long HTML message to avoid exceeding Telegram's 4096 character limit.
 */
export function chunkTelegramMessage(text: string, maxLen = 3900): string[] {
  if (!text) {
    return [''];
  }
  if (text.length <= maxLen) {
    return [text];
  }

  const rawLines = text.split('\n');
  const lines: string[] = [];
  for (const rawLine of rawLines) {
    if (rawLine.length <= maxLen) {
      lines.push(rawLine);
    } else {
      let rem = rawLine;
      while (rem.length > maxLen) {
        let cutIndex = rem.lastIndexOf(' ', maxLen);
        if (cutIndex <= 0) {
          cutIndex = maxLen;
        }
        lines.push(rem.slice(0, cutIndex));
        rem = rem.slice(cutIndex).trimStart();
      }
      if (rem.length > 0) {
        lines.push(rem);
      }
    }
  }

  const chunks: string[] = [];
  let current = '';

  for (const line of lines) {
    if (current.length + line.length + 1 > maxLen) {
      if (current.trim()) {
        chunks.push(current.trim());
      }
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

/**
 * Fetches information about the configured bot via getMe.
 */
export async function getTelegramBotInfo(botToken?: string): Promise<{
  ok: boolean;
  username?: string;
  firstName?: string;
  error?: string;
}> {
  const token = botToken || getTelegramBotToken();
  if (!token) {
    return { ok: false, error: 'توکن ربات تلگرام مشخص نشده است.' };
  }

  const url = `${getTelegramApiRoot()}/bot${token}/getMe`;
  try {
    const res = await fetch(url);
    const data = await res.json() as any;
    if (data.ok && data.result) {
      return {
        ok: true,
        username: data.result.username,
        firstName: data.result.first_name
      };
    }
    return {
      ok: false,
      error: data.description || 'توکن ربات تلگرام نامعتبر است.'
    };
  } catch (err: any) {
    return {
      ok: false,
      error: 'خطا در برقراری ارتباط با تلگرام: ' + (err.message || String(err))
    };
  }
}

/**
 * Sends an HTML message to a Telegram chat.
 */
export async function sendTelegramMessage(
  chatId: string,
  htmlText: string,
  botToken?: string,
  options?: { disableWebPagePreview?: boolean }
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const token = botToken || getTelegramBotToken();
  if (!token) {
    return { ok: false, error: 'توکن ربات تلگرام تنظیم نشده است.' };
  }

  const url = `${getTelegramApiRoot()}/bot${token}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: 'HTML',
        disable_web_page_preview: options?.disableWebPagePreview ?? true
      })
    });

    const data = await res.json() as any;
    if (data.ok && data.result) {
      return { ok: true, messageId: data.result.message_id };
    }

    let errorMsg = data.description || 'خطا در ارسال پیام به تلگرام';
    if (res.status === 401 || (data.description && data.description.includes('Unauthorized'))) {
      errorMsg = 'توکن ربات تلگرام نامعتبر است (Unauthorized).';
    } else if (data.description && data.description.includes('chat not found')) {
      errorMsg = 'شناسه چت یافت نشد. لطفاً ابتدا در ربات تلگرام دکمه Start را بزنید.';
    } else if (data.description && data.description.includes('blocked by the user')) {
      errorMsg = 'ربات توسط کاربر مسدود شده است (Bot was blocked by the user).';
    }

    return { ok: false, error: errorMsg };
  } catch (err: any) {
    return {
      ok: false,
      error: 'خطا در ارتباط با سرور تلگرام: ' + (err.message || String(err))
    };
  }
}

/**
 * Returns formatted current time and date in the target timezone.
 */
export function getCurrentTimeInTimezone(timezone = 'Asia/Tehran', date = new Date()): {
  timeStr: string; // "09:00"
  dateStr: string; // "2026-09-23"
  displayFull: string; // e.g. "چهارشنبه ۱ مهر ۱۴۰۵ | ساعت ۰۹:۰۰"
} {
  try {
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const displayFormatter = new Intl.DateTimeFormat('fa-IR', {
      timeZone: timezone,
      dateStyle: 'full',
      timeStyle: 'short'
    });

    return {
      timeStr: timeFormatter.format(date),
      dateStr: dateFormatter.format(date),
      displayFull: displayFormatter.format(date)
    };
  } catch {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return {
      timeStr: `${hh}:${mm}`,
      dateStr: date.toISOString().split('T')[0],
      displayFull: `${hh}:${mm} - ${date.toISOString().split('T')[0]}`
    };
  }
}

/**
 * Helper to parse sent slots from database (supports comma-separated, JSON array, or legacy single slot string).
 */
export function parseSentSlots(raw: string | null | undefined): string[] {
  if (!raw || !raw.trim()) return [];
  const clean = raw.trim();
  if (clean.startsWith('[')) {
    try {
      return JSON.parse(clean);
    } catch {
      return [clean];
    }
  }
  if (clean.includes(',')) {
    return clean.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [clean];
}

/**
 * Helper to append a newly delivered slot key to today's sent slots.
 */
export function addSentSlot(currentRaw: string | null | undefined, newSlotKey: string, dateStr: string): string {
  const existing = parseSentSlots(currentRaw);
  if (!existing.includes(newSlotKey)) {
    existing.push(newSlotKey);
  }
  const filtered = existing.filter(s => s.startsWith(dateStr));
  return JSON.stringify(filtered.length > 0 ? filtered : [newSlotKey]);
}

/**
 * Determines whether a subscription is due for scheduled delivery.
 */
export function isSubscriptionDueToSend(
  sub: {
    is_active: number;
    schedule_times: string[] | string;
    timezone?: string;
    last_sent_slot?: string | null;
  },
  now = new Date()
): { isDue: boolean; slotKey?: string; matchingSlot?: string } {
  if (sub.is_active !== 1) {
    return { isDue: false };
  }

  let times: string[] = [];
  if (Array.isArray(sub.schedule_times)) {
    times = sub.schedule_times;
  } else if (typeof sub.schedule_times === 'string') {
    try {
      times = JSON.parse(sub.schedule_times);
    } catch {
      times = [];
    }
  }

  if (!times || times.length === 0) {
    return { isDue: false };
  }

  const tz = sub.timezone || 'Asia/Tehran';
  const { timeStr, dateStr } = getCurrentTimeInTimezone(tz, now);
  const [curH, curM] = timeStr.split(':').map(Number);
  const currentTotalMinutes = curH * 60 + curM;

  const sentSlots = parseSentSlots(sub.last_sent_slot);

  for (const slot of times) {
    const [slotH, slotM] = slot.split(':').map(Number);
    if (isNaN(slotH) || isNaN(slotM) || slotH < 0 || slotH > 23 || slotM < 0 || slotM > 59) continue;
    const normalizedSlot = `${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;
    const slotTotalMinutes = slotH * 60 + slotM;

    // Allow delivery within a 5-minute tolerance window after the slot (with midnight wrap-around)
    const diff = (currentTotalMinutes - slotTotalMinutes + 1440) % 1440;
    if (diff >= 0 && diff <= 5) {
      const slotKey = `${dateStr}_${normalizedSlot}`;
      if (sentSlots.includes(slotKey)) {
        // Already delivered for this slot today -> CONTINUE to check other slots!
        continue;
      }
      return { isDue: true, slotKey, matchingSlot: normalizedSlot };
    }
  }

  return { isDue: false };
}

/**
 * Generates a clean, group-by-group news digest formatted for Telegram.
 */
export async function generateGroupNewsDigest(
  folderIds: number[] | 'all' = 'all',
  options?: { maxArticlesPerGroup?: number; now?: Date; userId?: number }
): Promise<TelegramDigestResult> {
  const maxArticles = options?.maxArticlesPerGroup || 4;
  const now = options?.now || new Date();
  const userId = options?.userId || 1;
  const { displayFull } = getCurrentTimeInTimezone('Asia/Tehran', now);

  let targetFolders: any[] = [];
  if (folderIds === 'all') {
    targetFolders = db.prepare('SELECT * FROM folders WHERE user_id = ? ORDER BY order_index ASC, id ASC').all(userId);
  } else if (Array.isArray(folderIds) && folderIds.length > 0) {
    const placeholders = folderIds.map(() => '?').join(',');
    targetFolders = db.prepare(`SELECT * FROM folders WHERE id IN (${placeholders}) AND user_id = ? ORDER BY order_index ASC, id ASC`).all(...folderIds, userId);
  }

  const groupSections: string[] = [];
  const groupsSummary: Array<{ id?: number; name: string; articleCount: number }> = [];
  let totalArticles = 0;

  for (const folder of targetFolders) {
    // Select top articles for this folder/group with freshness priority (last 3 days)
    let articles = db.prepare(`
      SELECT a.id, a.title, a.link, a.summary, a.ai_summary, a.importance_score, a.published_at, a.is_read, f.title as feed_title
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
      WHERE f.folder_id = ? AND datetime(a.published_at) >= datetime('now', '-3 days')
      ORDER BY a.is_read ASC, a.importance_score DESC, a.published_at DESC
      LIMIT ?
    `).all(folder.id, maxArticles) as any[];

    // Fallback to most recent articles if none found in last 3 days
    if (articles.length === 0) {
      articles = db.prepare(`
        SELECT a.id, a.title, a.link, a.summary, a.ai_summary, a.importance_score, a.published_at, a.is_read, f.title as feed_title
        FROM articles a
        JOIN feeds f ON a.feed_id = f.id
        WHERE f.folder_id = ?
        ORDER BY a.is_read ASC, a.importance_score DESC, a.published_at DESC
        LIMIT ?
      `).all(folder.id, maxArticles) as any[];
    }

    if (articles.length === 0) {
      continue;
    }

    totalArticles += articles.length;
    groupsSummary.push({ id: folder.id, name: folder.name, articleCount: articles.length });

    const articleLines = articles.map(art => {
      const title = escapeTelegramHtml(art.title);
      const source = escapeTelegramHtml(art.feed_title);
      const score = Math.round(art.importance_score || 50);
      const safeLink = art.link ? art.link.replace(/"/g, '%22') : '#';
      const sum = art.ai_summary
        ? escapeTelegramHtml(art.ai_summary.slice(0, 180))
        : cleanSummary(art.summary, 130);

      let line = `• <a href="${safeLink}"><b>${title}</b></a>\n  📌 <i>${source}</i> | اهمیت: ${score}٪`;
      if (sum) {
        line += `\n  💬 <i>${sum}</i>`;
      }
      return line;
    }).join('\n\n');

    const folderSection = `📂 <b>گروه: ${escapeTelegramHtml(folder.name)}</b> (${articles.length} خبر)\n${articleLines}`;
    groupSections.push(folderSection);
  }

  // Also include feeds without a folder if user selected 'all'
  if (folderIds === 'all') {
    let unassignedArticles = db.prepare(`
      SELECT a.id, a.title, a.link, a.summary, a.ai_summary, a.importance_score, a.published_at, a.is_read, f.title as feed_title
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
      WHERE f.folder_id IS NULL AND datetime(a.published_at) >= datetime('now', '-3 days')
      ORDER BY a.is_read ASC, a.importance_score DESC, a.published_at DESC
      LIMIT ?
    `).all(maxArticles) as any[];

    if (unassignedArticles.length === 0) {
      unassignedArticles = db.prepare(`
        SELECT a.id, a.title, a.link, a.summary, a.ai_summary, a.importance_score, a.published_at, a.is_read, f.title as feed_title
        FROM articles a
        JOIN feeds f ON a.feed_id = f.id
        WHERE f.folder_id IS NULL
        ORDER BY a.is_read ASC, a.importance_score DESC, a.published_at DESC
        LIMIT ?
      `).all(maxArticles) as any[];
    }

    if (unassignedArticles.length > 0) {
      totalArticles += unassignedArticles.length;
      groupsSummary.push({ name: 'سایر منابع و فیدها', articleCount: unassignedArticles.length });

      const articleLines = unassignedArticles.map(art => {
        const title = escapeTelegramHtml(art.title);
        const source = escapeTelegramHtml(art.feed_title);
        const score = Math.round(art.importance_score || 50);
        const safeLink = art.link ? art.link.replace(/"/g, '%22') : '#';
        const sum = art.ai_summary
          ? escapeTelegramHtml(art.ai_summary.slice(0, 180))
          : cleanSummary(art.summary, 130);

        let line = `• <a href="${safeLink}"><b>${title}</b></a>\n  📌 <i>${source}</i> | اهمیت: ${score}٪`;
        if (sum) {
          line += `\n  💬 <i>${sum}</i>`;
        }
        return line;
      }).join('\n\n');

      groupSections.push(`🌐 <b>سایر منابع و فیدها</b> (${unassignedArticles.length} خبر)\n${articleLines}`);
    }
  }

  let fullMessage = '';

  if (totalArticles === 0) {
    fullMessage = `📰 <b>خلاصه اخبار فیدخوان لنز (Lenz)</b>\n📅 <i>${displayFull}</i>\n\nدر حال حاضر خبر جدیدی در گروه‌های انتخابی شما ثبت نشده است.\nاز طریق فیدخوان لنز می‌توانید فیدهای جدید اضافه کرده یا آن‌ها را به‌روزرسانی نمایید.`;
  } else {
    const header = `📰 <b>خلاصه هوشمند اخبار لنز (Lenz)</b>\n📅 <i>${displayFull}</i>\n📊 شامل <b>${totalArticles} خبر</b> از <b>${groupSections.length} گروه</b> منتخب شما\n───────────────────\n\n`;
    const footer = `\n───────────────────\n⚡️ <i>تهیه شده توسط فیدخوان هوشمند لنز — آرامش در مطالعه اخبار</i>`;
    fullMessage = header + groupSections.join('\n\n─────────────\n\n') + footer;
  }

  const textChunks = chunkTelegramMessage(fullMessage);
  return {
    textChunks,
    groupCount: groupSections.length,
    articleCount: totalArticles,
    groups: groupsSummary
  };
}

/**
 * Sends news digest to a specific telegram subscription by ID.
 */
export async function sendDigestToSubscription(
  subscriptionId: number,
  overrideSlotKey?: string
): Promise<{ success: boolean; messageCount: number; error?: string }> {
  const row = db.prepare('SELECT * FROM telegram_subscriptions WHERE id = ?').get(subscriptionId) as any;
  if (!row) {
    return { success: false, messageCount: 0, error: 'اشتراک تلگرام یافت نشد.' };
  }

  let folderIds: number[] | 'all' = 'all';
  if (row.folder_ids && row.folder_ids !== 'all') {
    try {
      folderIds = JSON.parse(row.folder_ids);
    } catch {
      folderIds = 'all';
    }
  }

  const subUserId = row.user_id || 1;
  const digest = await generateGroupNewsDigest(folderIds, { userId: subUserId });
  const botToken = row.bot_token || getTelegramBotToken(subUserId);

  if (!botToken) {
    return { success: false, messageCount: 0, error: 'توکن ربات تلگرام تنظیم نشده است.' };
  }

  for (const chunk of digest.textChunks) {
    const res = await sendTelegramMessage(row.chat_id, chunk, botToken);
    if (!res.ok) {
      return { success: false, messageCount: 0, error: res.error };
    }
  }

  // Update last_sent_at and last_sent_slot (appended to today's sent slots)
  const nowIso = new Date().toISOString();
  const tz = row.timezone || 'Asia/Tehran';
  const { dateStr } = getCurrentTimeInTimezone(tz);
  const updatedSlot = overrideSlotKey
    ? addSentSlot(row.last_sent_slot, overrideSlotKey, dateStr)
    : row.last_sent_slot;

  db.prepare(`
    UPDATE telegram_subscriptions 
    SET last_sent_at = ?, last_sent_slot = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(nowIso, updatedSlot, subscriptionId);

  return { success: true, messageCount: digest.textChunks.length };
}

/**
 * Checks all active subscriptions and sends scheduled digests if due.
 */
export async function checkAndRunScheduledDigests(now = new Date()): Promise<{
  checkedCount: number;
  sentCount: number;
  failedCount: number;
  errors: string[];
}> {
  const subs = db.prepare('SELECT * FROM telegram_subscriptions WHERE is_active = 1').all() as any[];
  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const sub of subs) {
    const check = isSubscriptionDueToSend(sub, now);
    if (check.isDue && check.slotKey) {
      try {
        const res = await sendDigestToSubscription(sub.id, check.slotKey);
        if (res.success) {
          sentCount++;
        } else {
          failedCount++;
          errors.push(`خطا در ارسال به چت ${sub.chat_id}: ${res.error}`);
        }
      } catch (err: any) {
        failedCount++;
        errors.push(`خطا در پردازش اشتراک ${sub.id}: ${err.message}`);
      }
    }
  }

  return {
    checkedCount: subs.length,
    sentCount,
    failedCount,
    errors
  };
}

/**
 * Handles incoming updates from Telegram Webhook (e.g. /start, /digest, /folders, /status).
 */
export async function handleTelegramWebhookUpdate(update: any): Promise<{
  handled: boolean;
  replySent: boolean;
  replyText?: string;
  error?: string;
}> {
  if (!update || !update.message || !update.message.text) {
    return { handled: false, replySent: false };
  }

  const message = update.message;
  const chatId = String(message.chat.id);
  const text = message.text.trim();
  const username = message.from?.username || null;
  const firstName = message.from?.first_name || null;

  if (text.startsWith('/start')) {
    // Register or reactivate subscriber for the corresponding user (or user 1 by default)
    const existing = db.prepare('SELECT user_id FROM telegram_subscriptions WHERE chat_id = ? LIMIT 1').get(chatId) as any;
    const targetUserId = existing?.user_id || 1;

    db.prepare(`
      INSERT INTO telegram_subscriptions (user_id, chat_id, username, first_name, schedule_times, timezone, folder_ids, is_active)
      VALUES (?, ?, ?, ?, '["09:00","21:00"]', 'Asia/Tehran', 'all', 1)
      ON CONFLICT(user_id, chat_id) DO UPDATE SET 
        username = excluded.username,
        first_name = excluded.first_name,
        is_active = 1,
        updated_at = CURRENT_TIMESTAMP
    `).run(targetUserId, chatId, username, firstName);

    const welcomeMsg = `سلام ${firstName ? escapeTelegramHtml(firstName) : 'کاربر گرامی'}! 👋\n` +
      `به دستیار تلگرام فیدخوان هوشمند <b>لنز (Lenz)</b> خوش آمدید.\n\n` +
      `✅ حساب تلگرام شما با موفقیت متصل شد.\n` +
      `شناسه چت شما: <code>${chatId}</code>\n\n` +
      `⏰ زمان‌بندی پیش‌فرض: <b>۲ بار در روز (ساعت‌های ۰۹:۰۰ و ۲۱:۰۰)</b>\n` +
      `می‌توانید ساعت‌ها و گروه‌های خبری دلخواه خود را در پنل وب لنز نیز شخصی‌سازی کنید.\n\n` +
      `📌 <b>دستورات سریع:</b>\n` +
      `• /digest - دریافت فوری خلاصه اخبار گروه‌ها\n` +
      `• /folders - مشاهده گروه‌ها و دسته‌های خبری\n` +
      `• /status - وضعیت اشتراک و زمان‌بندی شما\n` +
      `• /help - راهنمای دستورات`;

    const res = await sendTelegramMessage(chatId, welcomeMsg);
    return { handled: true, replySent: res.ok, replyText: welcomeMsg, error: res.error };
  }

  if (text.startsWith('/digest') || text.startsWith('/summary')) {
    const sub = db.prepare('SELECT * FROM telegram_subscriptions WHERE chat_id = ?').get(chatId) as any;
    const subUserId = sub?.user_id || 1;
    const botToken = sub?.bot_token || getTelegramBotToken(subUserId);
    let folderIds: number[] | 'all' = 'all';
    if (sub && sub.folder_ids && sub.folder_ids !== 'all') {
      try {
        folderIds = JSON.parse(sub.folder_ids);
      } catch {
        folderIds = 'all';
      }
    }

    const digest = await generateGroupNewsDigest(folderIds, { userId: subUserId });
    for (const chunk of digest.textChunks) {
      await sendTelegramMessage(chatId, chunk, botToken);
    }
    return { handled: true, replySent: true, replyText: 'خلاصه اخبار ارسال شد' };
  }

  if (text.startsWith('/folders') || text.startsWith('/groups')) {
    const sub = db.prepare('SELECT * FROM telegram_subscriptions WHERE chat_id = ?').get(chatId) as any;
    const subUserId = sub?.user_id || 1;
    const botToken = sub?.bot_token || getTelegramBotToken(subUserId);
    const folders = db.prepare(`
      SELECT f.name, 
        (SELECT COUNT(*) FROM feeds WHERE folder_id = f.id AND user_id = ?) as feed_count,
        (SELECT COUNT(*) FROM articles a JOIN feeds fd ON a.feed_id = fd.id WHERE fd.folder_id = f.id AND fd.user_id = ? AND a.is_read = 0) as unread_count
      FROM folders f
      WHERE f.user_id = ?
      ORDER BY f.order_index ASC
    `).all(subUserId, subUserId, subUserId) as any[];

    let reply = `📂 <b>گروه‌ها و دسته‌های خبری لنز:</b>\n\n`;
    for (const f of folders) {
      reply += `• <b>${escapeTelegramHtml(f.name)}</b>: ${f.feed_count} منبع (${f.unread_count} خبر خوانده‌نشده)\n`;
    }
    reply += `\nبرای دریافت فوری خلاصه هر زمان دستور /digest را بفرستید.`;

    const res = await sendTelegramMessage(chatId, reply, botToken);
    return { handled: true, replySent: res.ok, replyText: reply, error: res.error };
  }

  if (text.startsWith('/status')) {
    const sub = db.prepare('SELECT * FROM telegram_subscriptions WHERE chat_id = ?').get(chatId) as any;
    const subUserId = sub?.user_id || 1;
    const botToken = sub?.bot_token || getTelegramBotToken(subUserId);
    if (!sub) {
      const notFoundMsg = `شما هنوز عضو نشده‌اید. برای اتصال دستور /start را ارسال کنید.`;
      await sendTelegramMessage(chatId, notFoundMsg, botToken);
      return { handled: true, replySent: true, replyText: notFoundMsg };
    }

    let times: string[] = [];
    try {
      times = JSON.parse(sub.schedule_times);
    } catch {
      times = [sub.schedule_times];
    }

    const statusMsg = `📊 <b>وضعیت اتصال شما به لنز:</b>\n\n` +
      `• وضعیت: ${sub.is_active === 1 ? '✅ فعال' : '⏸ غیرفعال'}\n` +
      `• دفعات ارسال: <b>${times.length} بار در روز</b>\n` +
      `• ساعت‌های ارسال: <code>${times.join(' ، ')}</code>\n` +
      `• منطقه زمانی: <code>${sub.timezone || 'Asia/Tehran'}</code>\n` +
      `• گروه‌های انتخابی: ${sub.folder_ids === 'all' ? 'همه گروه‌ها' : 'گروه‌های مشخص‌شده'}\n` +
      `• آخرین ارسال: ${sub.last_sent_at ? sub.last_sent_at : 'هنوز ارسالی انجام نشده'}`;

    const res = await sendTelegramMessage(chatId, statusMsg, botToken);
    return { handled: true, replySent: res.ok, replyText: statusMsg, error: res.error };
  }

  if (text.startsWith('/help')) {
    const helpMsg = `📖 <b>راهنمای ربات فیدخوان لنز:</b>\n\n` +
      `• /start - شروع مجدد و ثبت‌نام در دریافت خلاصه\n` +
      `• /digest - دریافت فوری خلاصه اخبار امروز\n` +
      `• /folders - نمایش لیست دسته‌ها و منابع فعال\n` +
      `• /status - مشاهده تنظیمات زمان‌بندی و وضعیت اشتراک\n` +
      `• /help - نمایش این پیام راهنما`;

    const res = await sendTelegramMessage(chatId, helpMsg);
    return { handled: true, replySent: res.ok, replyText: helpMsg, error: res.error };
  }

  return { handled: false, replySent: false };
}

/**
 * Detects the latest Telegram user or chat that interacted with the bot.
 * Allows effortless 1-click connection without manually finding Chat ID.
 */
export async function detectLatestTelegramChat(botToken?: string): Promise<{
  ok: boolean;
  chatId?: string;
  username?: string;
  firstName?: string;
  messageText?: string;
  error?: string;
}> {
  const token = botToken || getTelegramBotToken();
  if (!token) {
    return { ok: false, error: 'توکن ربات تلگرام تنظیم نشده است.' };
  }

  const url = `${getTelegramApiRoot()}/bot${token}/getUpdates?limit=10&timeout=0`;
  try {
    const res = await fetch(url);
    const data = await res.json() as any;
    if (!data.ok) {
      return { ok: false, error: data.description || 'خطا در دریافت پیام‌ها از تلگرام' };
    }

    const updates = (data.result || []).reverse();
    for (const update of updates) {
      const msg = update.message || update.channel_post || update.edited_message;
      if (msg && msg.chat && msg.chat.id) {
        return {
          ok: true,
          chatId: String(msg.chat.id),
          username: msg.from?.username || msg.chat?.username || undefined,
          firstName: msg.from?.first_name || msg.chat?.title || undefined,
          messageText: msg.text || undefined
        };
      }
    }

    return {
      ok: false,
      error: 'پیامی از تلگرام دریافت نشد. لطفاً در تلگرام دکمه Start ربات را بزنید و سپس مجدداً این دکمه را کلیک کنید.'
    };
  } catch (err: any) {
    return {
      ok: false,
      error: 'خطا در برقراری ارتباط با تلگرام: ' + (err.message || String(err))
    };
  }
}

let lastPolledUpdateOffset = 0;

/**
 * Polls Telegram Bot API for incoming updates when running without webhooks (e.g. localhost/dev).
 */
export async function pollTelegramUpdates(botToken?: string): Promise<{ handledCount: number; error?: string }> {
  const token = botToken || getTelegramBotToken();
  if (!token) {
    return { handledCount: 0 };
  }

  const url = `${getTelegramApiRoot()}/bot${token}/getUpdates?offset=${lastPolledUpdateOffset}&timeout=0`;
  try {
    const res = await fetch(url);
    const data = await res.json() as any;
    if (!data.ok) {
      // 409 Conflict occurs when a webhook is active, which is normal and handled
      return { handledCount: 0, error: data.description };
    }

    const updates = data.result || [];
    let count = 0;
    for (const update of updates) {
      if (typeof update.update_id === 'number' && update.update_id >= lastPolledUpdateOffset) {
        lastPolledUpdateOffset = update.update_id + 1;
      }
      await handleTelegramWebhookUpdate(update);
      count++;
    }

    return { handledCount: count };
  } catch (err: any) {
    return { handledCount: 0, error: err.message || String(err) };
  }
}

/**
 * Sets public webhook URL for Telegram Bot.
 */
export async function setTelegramWebhook(webhookUrl: string, botToken?: string): Promise<{ ok: boolean; error?: string }> {
  const token = botToken || getTelegramBotToken();
  if (!token) {
    return { ok: false, error: 'توکن ربات تلگرام مشخص نشده است.' };
  }

  const url = `${getTelegramApiRoot()}/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
  try {
    const res = await fetch(url);
    const data = await res.json() as any;
    return { ok: Boolean(data.ok), error: data.description };
  } catch (err: any) {
    return { ok: false, error: err.message || String(err) };
  }
}

