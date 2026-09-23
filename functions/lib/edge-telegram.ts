import { Env } from './types.js';

export function escapeTelegramHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function cleanSummary(summary: string | null | undefined, maxLen = 140): string {
  if (!summary) return '';
  const stripped = summary
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!stripped) return '';
  const truncated = stripped.length > maxLen ? stripped.slice(0, maxLen).trim() + '...' : stripped;
  return escapeTelegramHtml(truncated);
}

export function chunkTelegramMessage(text: string, maxLen = 3900): string[] {
  if (!text) return [''];
  if (text.length <= maxLen) return [text];

  const rawLines = text.split('\n');
  const lines: string[] = [];
  for (const rawLine of rawLines) {
    if (rawLine.length <= maxLen) {
      lines.push(rawLine);
    } else {
      let rem = rawLine;
      while (rem.length > maxLen) {
        let cutIndex = rem.lastIndexOf(' ', maxLen);
        if (cutIndex <= 0) cutIndex = maxLen;
        lines.push(rem.slice(0, cutIndex));
        rem = rem.slice(cutIndex).trimStart();
      }
      if (rem.length > 0) lines.push(rem);
    }
  }

  const chunks: string[] = [];
  let current = '';

  for (const line of lines) {
    if (current.length + line.length + 1 > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

export async function getTelegramBotToken(db: D1Database, env: Env): Promise<string | null> {
  if (env.TELEGRAM_BOT_TOKEN) return env.TELEGRAM_BOT_TOKEN;
  try {
    const row = await db.prepare("SELECT value FROM user_profile WHERE key = 'telegram_bot_token'").first<{ value: string }>();
    if (row && row.value?.trim()) return row.value.trim();
  } catch {
    // ignore
  }
  return null;
}

export function getTelegramApiRoot(env?: Env): string {
  return (env?.TELEGRAM_API_ROOT || 'https://api.telegram.org').replace(/\/+$/, '');
}

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  htmlText: string,
  env?: Env
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const url = `${getTelegramApiRoot(env)}/bot${token}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const data = await res.json() as any;
    if (data.ok && data.result) {
      return { ok: true, messageId: data.result.message_id };
    }
    return { ok: false, error: data.description || 'Error sending Telegram message' };
  } catch (err: any) {
    return { ok: false, error: err.message || String(err) };
  }
}

export async function generateGroupNewsDigestInD1(
  db: D1Database,
  folderIds: number[] | 'all' = 'all'
): Promise<{ textChunks: string[]; groupCount: number; articleCount: number }> {
  let targetFolders: any[] = [];
  if (folderIds === 'all') {
    const foldersRes = await db.prepare('SELECT * FROM folders ORDER BY order_index ASC, id ASC').all();
    targetFolders = foldersRes.results || [];
  } else if (Array.isArray(folderIds) && folderIds.length > 0) {
    const placeholders = folderIds.map(() => '?').join(',');
    const foldersRes = await db.prepare(`SELECT * FROM folders WHERE id IN (${placeholders}) ORDER BY order_index ASC, id ASC`).bind(...folderIds).all();
    targetFolders = foldersRes.results || [];
  }

  const groupSections: string[] = [];
  let totalArticles = 0;

  for (const folder of targetFolders) {
    // Query with freshness first (last 3 days)
    let articlesRes = await db.prepare(`
      SELECT a.id, a.title, a.link, a.summary, a.ai_summary, a.importance_score, f.title as feed_title
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
      WHERE f.folder_id = ? AND datetime(a.published_at) >= datetime('now', '-3 days')
      ORDER BY a.is_read ASC, a.importance_score DESC, a.published_at DESC
      LIMIT 4
    `).bind(folder.id).all<any>();

    let articles = articlesRes.results || [];
    if (articles.length === 0) {
      articlesRes = await db.prepare(`
        SELECT a.id, a.title, a.link, a.summary, a.ai_summary, a.importance_score, f.title as feed_title
        FROM articles a
        JOIN feeds f ON a.feed_id = f.id
        WHERE f.folder_id = ?
        ORDER BY a.is_read ASC, a.importance_score DESC, a.published_at DESC
        LIMIT 4
      `).bind(folder.id).all<any>();
      articles = articlesRes.results || [];
    }

    if (articles.length === 0) continue;

    totalArticles += articles.length;
    const articleLines = articles.map(art => {
      const title = escapeTelegramHtml(art.title);
      const source = escapeTelegramHtml(art.feed_title);
      const score = Math.round(art.importance_score || 50);
      const safeLink = art.link ? art.link.replace(/"/g, '%22') : '#';
      const sum = art.ai_summary
        ? escapeTelegramHtml(art.ai_summary.slice(0, 180))
        : cleanSummary(art.summary, 130);

      let line = `• <a href="${safeLink}"><b>${title}</b></a>\n  📌 <i>${source}</i> | اهمیت: ${score}٪`;
      if (sum) line += `\n  💬 <i>${sum}</i>`;
      return line;
    }).join('\n\n');

    groupSections.push(`📂 <b>گروه: ${escapeTelegramHtml(folder.name)}</b> (${articles.length} خبر)\n${articleLines}`);
  }

  // Include feeds without a folder if 'all'
  if (folderIds === 'all') {
    let unassignedRes = await db.prepare(`
      SELECT a.id, a.title, a.link, a.summary, a.ai_summary, a.importance_score, f.title as feed_title
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
      WHERE f.folder_id IS NULL AND datetime(a.published_at) >= datetime('now', '-3 days')
      ORDER BY a.is_read ASC, a.importance_score DESC, a.published_at DESC
      LIMIT 4
    `).all<any>();

    let unassignedArticles = unassignedRes.results || [];
    if (unassignedArticles.length === 0) {
      unassignedRes = await db.prepare(`
        SELECT a.id, a.title, a.link, a.summary, a.ai_summary, a.importance_score, f.title as feed_title
        FROM articles a
        JOIN feeds f ON a.feed_id = f.id
        WHERE f.folder_id IS NULL
        ORDER BY a.is_read ASC, a.importance_score DESC, a.published_at DESC
        LIMIT 4
      `).all<any>();
      unassignedArticles = unassignedRes.results || [];
    }

    if (unassignedArticles.length > 0) {
      totalArticles += unassignedArticles.length;
      const articleLines = unassignedArticles.map(art => {
        const title = escapeTelegramHtml(art.title);
        const source = escapeTelegramHtml(art.feed_title);
        const score = Math.round(art.importance_score || 50);
        const safeLink = art.link ? art.link.replace(/"/g, '%22') : '#';
        const sum = art.ai_summary
          ? escapeTelegramHtml(art.ai_summary.slice(0, 180))
          : cleanSummary(art.summary, 130);

        let line = `• <a href="${safeLink}"><b>${title}</b></a>\n  📌 <i>${source}</i> | اهمیت: ${score}٪`;
        if (sum) line += `\n  💬 <i>${sum}</i>`;
        return line;
      }).join('\n\n');

      groupSections.push(`🌐 <b>سایر منابع و فیدها</b> (${unassignedArticles.length} خبر)\n${articleLines}`);
    }
  }

  let fullMessage = '';
  if (totalArticles === 0) {
    fullMessage = `📰 <b>خلاصه اخبار لنز (Lenz)</b>\n\nدر حال حاضر خبر جدیدی در گروه‌های انتخابی شما ثبت نشده است.`;
  } else {
    const header = `📰 <b>خلاصه هوشمند اخبار لنز (Lenz)</b>\n📊 شامل <b>${totalArticles} خبر</b> از <b>${groupSections.length} گروه</b> منتخب\n───────────────────\n\n`;
    const footer = `\n───────────────────\n⚡️ <i>تهیه شده توسط فیدخوان هوشمند لنز</i>`;
    fullMessage = header + groupSections.join('\n\n─────────────\n\n') + footer;
  }

  return {
    textChunks: chunkTelegramMessage(fullMessage),
    groupCount: groupSections.length,
    articleCount: totalArticles
  };
}

export async function detectLatestTelegramChatInD1(
  token: string,
  env?: Env
): Promise<{ ok: boolean; chatId?: string; username?: string; firstName?: string; error?: string }> {
  const url = `${getTelegramApiRoot(env)}/bot${token}/getUpdates?limit=10&timeout=0`;
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
          firstName: msg.from?.first_name || msg.chat?.title || undefined
        };
      }
    }
    return { ok: false, error: 'پیامی در ربات تلگرام یافت نشد. لطفاً در تلگرام دکمه Start را بزنید.' };
  } catch (err: any) {
    return { ok: false, error: err.message || String(err) };
  }
}

export async function handleTelegramWebhookUpdateInD1(
  db: D1Database,
  env: Env,
  update: any
): Promise<{ handled: boolean; replySent: boolean; error?: string }> {
  if (!update?.message?.text) return { handled: false, replySent: false };

  const message = update.message;
  const chatId = String(message.chat.id);
  const text = message.text.trim();
  const username = message.from?.username || null;
  const firstName = message.from?.first_name || null;
  const token = await getTelegramBotToken(db, env);
  if (!token) return { handled: false, replySent: false, error: 'No bot token' };

  if (text.startsWith('/start')) {
    await db.prepare(`
      INSERT INTO telegram_subscriptions (chat_id, username, first_name, schedule_times, timezone, folder_ids, is_active)
      VALUES (?, ?, ?, '["09:00","21:00"]', 'Asia/Tehran', 'all', 1)
      ON CONFLICT(chat_id) DO UPDATE SET username = excluded.username, first_name = excluded.first_name, is_active = 1, updated_at = CURRENT_TIMESTAMP
    `).bind(chatId, username, firstName).run();

    const welcomeMsg = `سلام ${firstName ? escapeTelegramHtml(firstName) : 'کاربر گرامی'}! 👋\n` +
      `به ربات فیدخوان هوشمند <b>لنز (Lenz)</b> خوش آمدید.\n\n` +
      `✅ حساب تلگرام شما با موفقیت متصل شد.\n` +
      `شناسه چت: <code>${chatId}</code>\n\n` +
      `⏰ زمان‌بندی پیش‌فرض: <b>۲ بار در روز (ساعت‌های ۰۹:۰۰ و ۲۱:۰۰)</b>\n` +
      `برای دریافت فوری خلاصه، دستور /digest را ارسال فرمایید.`;

    const res = await sendTelegramMessage(token, chatId, welcomeMsg, env);
    return { handled: true, replySent: res.ok, error: res.error };
  }

  if (text.startsWith('/digest') || text.startsWith('/summary')) {
    const sub = await db.prepare('SELECT * FROM telegram_subscriptions WHERE chat_id = ?').bind(chatId).first<any>();
    let folderIds: number[] | 'all' = 'all';
    if (sub && sub.folder_ids && sub.folder_ids !== 'all') {
      try { folderIds = JSON.parse(sub.folder_ids); } catch { folderIds = 'all'; }
    }
    const digest = await generateGroupNewsDigestInD1(db, folderIds);
    for (const chunk of digest.textChunks) {
      await sendTelegramMessage(token, chatId, chunk, env);
    }
    return { handled: true, replySent: true };
  }

  return { handled: false, replySent: false };
}
