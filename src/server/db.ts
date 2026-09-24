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
  // 1. Users and Sessions tables
  db.exec(`
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
  `);

  // Ensure default user 1 exists ('admin' / 'admin123')
  const defaultUser = db.prepare('SELECT id FROM users WHERE id = 1').get();
  if (!defaultUser) {
    db.prepare(`
      INSERT OR IGNORE INTO users (id, username, password_hash, display_name)
      VALUES (1, 'admin', 'a1b2c3d4e5f60718:1e0f48709b7135e2cae4d2acde0b81b43e887848dcc5dda72655afb549b19319', 'مدیر سیستم')
    `).run();
  }

  // 2. Folders table & migration to per-user UNIQUE(user_id, name)
  const foldersCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='folders'").get();
  if (!foldersCheck) {
    db.exec(`
      CREATE TABLE folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        icon TEXT DEFAULT 'folder',
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      );
      CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
    `);
  } else {
    const folderCols = db.prepare("PRAGMA table_info(folders)").all() as any[];
    const hasFolderUserId = folderCols.some(c => c.name === 'user_id');
    const folderSql = ((db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='folders'").get() as any)?.sql || '').toLowerCase();
    const hasGlobalFolderUnique = folderSql.includes('name text not null unique') || folderSql.includes('unique (name)') || folderSql.includes('unique(name)');

    if (!hasFolderUserId || hasGlobalFolderUnique) {
      db.pragma('foreign_keys = OFF');
      db.exec(`
        CREATE TABLE folders_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          icon TEXT DEFAULT 'folder',
          order_index INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, name)
        );
        INSERT OR IGNORE INTO folders_new (id, user_id, name, icon, order_index, created_at)
        SELECT id, ${hasFolderUserId ? 'COALESCE(user_id, 1)' : '1'}, name, icon, order_index, created_at FROM folders;
        DROP TABLE folders;
        ALTER TABLE folders_new RENAME TO folders;
        CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
      `);
      db.pragma('foreign_keys = ON');
    }
  }

  // 3. Feeds table & migration to per-user UNIQUE(user_id, url)
  const feedsCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='feeds'").get();
  if (!feedsCheck) {
    db.exec(`
      CREATE TABLE feeds (
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
      CREATE INDEX IF NOT EXISTS idx_feeds_user_id ON feeds(user_id);
    `);
  } else {
    const feedCols = db.prepare("PRAGMA table_info(feeds)").all() as any[];
    const hasFeedUserId = feedCols.some(c => c.name === 'user_id');
    const feedSql = ((db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='feeds'").get() as any)?.sql || '').toLowerCase();
    const hasGlobalFeedUnique = feedSql.includes('url text not null unique') || feedSql.includes('unique (url)') || feedSql.includes('unique(url)');

    if (!hasFeedUserId || hasGlobalFeedUnique) {
      db.pragma('foreign_keys = OFF');
      db.exec(`
        CREATE TABLE feeds_new (
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
        SELECT id, ${hasFeedUserId ? 'COALESCE(user_id, 1)' : '1'}, folder_id, title, url, site_url, description, icon_url, last_fetched_at, created_at FROM feeds;
        DROP TABLE feeds;
        ALTER TABLE feeds_new RENAME TO feeds;
        CREATE INDEX IF NOT EXISTS idx_feeds_user_id ON feeds(user_id);
      `);
      db.pragma('foreign_keys = ON');
    }
  }

  // 4. Articles, highlights, user_profile, briefings, telegram_subscriptions
  db.exec(`
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
  `);

  // 5. Briefings table & migration to per-user UNIQUE(user_id, date)
  const briefingsCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='briefings'").get();
  if (!briefingsCheck) {
    db.exec(`
      CREATE TABLE briefings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        content_json TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      );
      CREATE INDEX IF NOT EXISTS idx_briefings_user_id ON briefings(user_id);
      CREATE INDEX IF NOT EXISTS idx_briefings_date ON briefings(date);
    `);
  } else {
    const briefingCols = db.prepare("PRAGMA table_info(briefings)").all() as any[];
    const hasBriefingUserId = briefingCols.some(c => c.name === 'user_id');
    const briefingSql = ((db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='briefings'").get() as any)?.sql || '').toLowerCase();
    const hasGlobalBriefingUnique = briefingSql.includes('date text not null unique') || briefingSql.includes('unique (date)') || briefingSql.includes('unique(date)');

    if (!hasBriefingUserId || hasGlobalBriefingUnique) {
      db.pragma('foreign_keys = OFF');
      db.exec(`
        CREATE TABLE briefings_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          title TEXT NOT NULL,
          content_json TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, date)
        );
        INSERT OR IGNORE INTO briefings_new (id, user_id, date, title, content_json, created_at)
        SELECT id, ${hasBriefingUserId ? 'COALESCE(user_id, 1)' : '1'}, date, title, content_json, created_at FROM briefings;
        DROP TABLE briefings;
        ALTER TABLE briefings_new RENAME TO briefings;
        CREATE INDEX IF NOT EXISTS idx_briefings_user_id ON briefings(user_id);
        CREATE INDEX IF NOT EXISTS idx_briefings_date ON briefings(date);
      `);
      db.pragma('foreign_keys = ON');
    }
  }

  // 6. Telegram subscriptions table & migration to per-user UNIQUE(user_id, chat_id)
  const tgCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='telegram_subscriptions'").get();
  if (!tgCheck) {
    db.exec(`
      CREATE TABLE telegram_subscriptions (
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
      CREATE INDEX IF NOT EXISTS idx_telegram_active ON telegram_subscriptions(is_active);
      CREATE INDEX IF NOT EXISTS idx_telegram_chat_id ON telegram_subscriptions(chat_id);
      CREATE INDEX IF NOT EXISTS idx_telegram_user_id ON telegram_subscriptions(user_id);
    `);
  } else {
    const tgCols = db.prepare("PRAGMA table_info(telegram_subscriptions)").all() as any[];
    const hasTgUserId = tgCols.some(c => c.name === 'user_id');
    const tgSql = ((db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='telegram_subscriptions'").get() as any)?.sql || '').toLowerCase();
    const hasGlobalChatUnique = tgSql.includes('chat_id text not null unique') || tgSql.includes('unique (chat_id)') || tgSql.includes('unique(chat_id)');

    if (!hasTgUserId || hasGlobalChatUnique) {
      db.pragma('foreign_keys = OFF');
      db.exec(`
        CREATE TABLE telegram_subscriptions_new (
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
        SELECT id, ${hasTgUserId ? 'COALESCE(user_id, 1)' : '1'}, chat_id, username, first_name, bot_token, schedule_times, timezone, folder_ids, is_active, last_sent_at, last_sent_slot, created_at, updated_at FROM telegram_subscriptions;
        DROP TABLE telegram_subscriptions;
        ALTER TABLE telegram_subscriptions_new RENAME TO telegram_subscriptions;
        CREATE INDEX IF NOT EXISTS idx_telegram_active ON telegram_subscriptions(is_active);
        CREATE INDEX IF NOT EXISTS idx_telegram_chat_id ON telegram_subscriptions(chat_id);
        CREATE INDEX IF NOT EXISTS idx_telegram_user_id ON telegram_subscriptions(user_id);
      `);
      db.pragma('foreign_keys = ON');
    }
  }

  // Ensure is_full_extracted column
  try {
    db.exec('ALTER TABLE articles ADD COLUMN is_full_extracted INTEGER DEFAULT 0');
  } catch {}

  // Seed default folders for user 1
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

  const insertFolder = db.prepare('INSERT OR IGNORE INTO folders (user_id, name, icon, order_index) VALUES (1, ?, ?, ?)');
  for (const f of defaultFolders) {
    insertFolder.run(f.name, f.icon, f.order);
  }

  // Initialize taste profile if empty for user 1
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
