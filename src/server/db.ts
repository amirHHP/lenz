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
  `);

  // Seed default folders if empty
  const folderCount = db.prepare('SELECT COUNT(*) as count FROM folders').get() as { count: number };
  if (folderCount.count === 0) {
    const insertFolder = db.prepare('INSERT INTO folders (name, icon, order_index) VALUES (?, ?, ?)');
    insertFolder.run('فناوری و استارتاپ', 'cpu', 0);
    insertFolder.run('هوش مصنوعی و داده', 'sparkles', 1);
    insertFolder.run('سیاست و اخبار عمومی', 'globe', 2);
    insertFolder.run('دانش و پژوهش', 'book-open', 3);
    insertFolder.run('طراحی و تجربه کاربری', 'palette', 4);
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
