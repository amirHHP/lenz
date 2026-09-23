-- Lenz Cloudflare D1 Telegram Subscriptions Schema

CREATE TABLE IF NOT EXISTS telegram_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT,
  bot_token TEXT,
  schedule_times TEXT NOT NULL DEFAULT '["09:00","21:00"]',
  timezone TEXT DEFAULT 'Asia/Tehran',
  folder_ids TEXT DEFAULT 'all',
  is_active INTEGER DEFAULT 1,
  last_sent_at DATETIME,
  last_sent_slot TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telegram_active ON telegram_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_telegram_chat_id ON telegram_subscriptions(chat_id);
