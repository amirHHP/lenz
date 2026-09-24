-- Lenz Cloudflare D1 User Accounts & Multi-User Schema

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- Migrate folders to composite UNIQUE(user_id, name)
CREATE TABLE IF NOT EXISTS folders_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'folder',
  order_index INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);
INSERT OR IGNORE INTO folders_new (id, user_id, name, icon, order_index, created_at)
SELECT id, 1, name, icon, order_index, created_at FROM folders;
DROP TABLE folders;
ALTER TABLE folders_new RENAME TO folders;
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);

-- Migrate feeds to composite UNIQUE(user_id, url)
CREATE TABLE IF NOT EXISTS feeds_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
  folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  site_url TEXT,
  description TEXT,
  icon_url TEXT,
  last_fetched_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, url)
);
INSERT OR IGNORE INTO feeds_new (id, user_id, folder_id, title, url, site_url, description, icon_url, last_fetched_at, created_at)
SELECT id, 1, folder_id, title, url, site_url, description, icon_url, last_fetched_at, created_at FROM feeds;
DROP TABLE feeds;
ALTER TABLE feeds_new RENAME TO feeds;
CREATE INDEX IF NOT EXISTS idx_feeds_user_id ON feeds(user_id);

-- Migrate briefings to composite UNIQUE(user_id, date)
CREATE TABLE IF NOT EXISTS briefings_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  content_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);
INSERT OR IGNORE INTO briefings_new (id, user_id, date, title, content_json, created_at)
SELECT id, 1, date, title, content_json, created_at FROM briefings;
DROP TABLE briefings;
ALTER TABLE briefings_new RENAME TO briefings;
CREATE INDEX IF NOT EXISTS idx_briefings_user_id ON briefings(user_id);
CREATE INDEX IF NOT EXISTS idx_briefings_date ON briefings(date);

-- Migrate telegram_subscriptions to composite UNIQUE(user_id, chat_id)
CREATE TABLE IF NOT EXISTS telegram_subscriptions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, chat_id)
);
INSERT OR IGNORE INTO telegram_subscriptions_new (id, user_id, chat_id, username, first_name, bot_token, schedule_times, timezone, folder_ids, is_active, last_sent_at, last_sent_slot, created_at, updated_at)
SELECT id, 1, chat_id, username, first_name, bot_token, schedule_times, timezone, folder_ids, is_active, last_sent_at, last_sent_slot, created_at, updated_at FROM telegram_subscriptions;
DROP TABLE telegram_subscriptions;
ALTER TABLE telegram_subscriptions_new RENAME TO telegram_subscriptions;
CREATE INDEX IF NOT EXISTS idx_telegram_active ON telegram_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_telegram_chat_id ON telegram_subscriptions(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_user_id ON telegram_subscriptions(user_id);

-- Seed default admin account
INSERT OR IGNORE INTO users (id, username, password_hash, display_name)
VALUES (1, 'admin', 'a1b2c3d4e5f60718:1e0f48709b7135e2cae4d2acde0b81b43e887848dcc5dda72655afb549b19319', 'مدیر سیستم');
