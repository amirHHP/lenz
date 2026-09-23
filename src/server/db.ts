import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.LENZ_DB_PATH || path.join(process.cwd(), 'data', 'lenz.db');

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT 'folder',
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      site_url TEXT,
      description TEXT,
      icon_url TEXT,
      last_fetched_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feed_id INTEGER NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
      guid TEXT NOT NULL,
      title TEXT NOT NULL,
      link TEXT NOT NULL,
      author TEXT,
      published_at DATETIME NOT NULL,
      summary TEXT,
      full_content TEXT,
      is_full_extracted INTEGER DEFAULT 0,
      is_read INTEGER DEFAULT 0,
      is_starred INTEGER DEFAULT 0,
      reading_time_minutes INTEGER DEFAULT 2,
      importance_score REAL DEFAULT 50.0,
      ai_category TEXT,
      ai_summary TEXT,
      keywords TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(feed_id, guid)
    );

    CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
    CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read);
    CREATE INDEX IF NOT EXISTS idx_articles_is_starred ON articles(is_starred);
    CREATE INDEX IF NOT EXISTS idx_articles_importance ON articles(importance_score DESC);

    CREATE TABLE IF NOT EXISTS highlights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      note TEXT,
      color TEXT DEFAULT 'yellow',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_highlights_article_id ON highlights(article_id);

    CREATE TABLE IF NOT EXISTS user_profile (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS briefings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      content_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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
  `);

  // Migration: ensure is_full_extracted column exists on existing articles table
  try {
    db.exec('ALTER TABLE articles ADD COLUMN is_full_extracted INTEGER DEFAULT 0');
  } catch {
    // Column already exists
  }

  // Migration: ensure last_sent_slot column exists on telegram_subscriptions
  try {
    db.exec('ALTER TABLE telegram_subscriptions ADD COLUMN last_sent_slot TEXT');
  } catch {
    // Column already exists
  }

  // Seed or ensure default folders exist for all curated categories
  const defaultFolders = [
    { name: 'فناوری و استارتاپ', icon: 'cpu', order: 0 },
    { name: 'هوش مصنوعی و داده', icon: 'sparkles', order: 1 },
    { name: 'برنامه‌نویسی و مهندسی نرم‌افزار', icon: 'code', order: 2 },
    { name: 'سیاست و اخبار عمومی', icon: 'globe', order: 3 },
    { name: 'اقتصاد و بازارهای مالی', icon: 'trending-up', order: 4 },
    { name: 'دانش و پژوهش', icon: 'book-open', order: 5 },
    { name: 'طراحی و تجربه کاربری', icon: 'palette', order: 6 },
    { name: 'امنیت سایبری و شبکه', icon: 'shield', order: 7 },
    { name: 'بازی و سرگرمی دیجیتال', icon: 'gamepad-2', order: 8 },
    { name: 'سبک زندگی، فرهنگ و یادگیری', icon: 'sun', order: 9 }
  ];

  const insertFolder = db.prepare('INSERT OR IGNORE INTO folders (name, icon, order_index) VALUES (?, ?, ?)');
  for (const f of defaultFolders) {
    insertFolder.run(f.name, f.icon, f.order);
  }

  // Initialize taste profile if empty
  const tasteProfile = db.prepare('SELECT value FROM user_profile WHERE key = ?').get('taste_profile');
  if (!tasteProfile) {
    db.prepare('INSERT INTO user_profile (key, value) VALUES (?, ?)').run(
      'taste_profile',
      JSON.stringify({
        topics: {
          'هوش مصنوعی': 10,
          'ai': 10,
          'فناوری': 8,
          'technology': 8,
          'نرم‌افزار': 7,
          'توسعه': 6,
          'استارتاپ': 5,
          'علمی': 5
        },
        readCount: 0,
        starredCount: 0,
        highlightCount: 0,
        lastUpdated: new Date().toISOString()
      })
    );
  }
}
