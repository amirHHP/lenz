export async function ensureD1Schema(db: D1Database): Promise<void> {
  // Check if tables already initialized
  const check = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='folders'").first();
  if (check) {
    // Migration: ensure telegram_subscriptions exists on existing databases
    const checkTg = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='telegram_subscriptions'").first();
    if (!checkTg) {
      await db.batch([
        db.prepare(`
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
          )
        `),
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_telegram_active ON telegram_subscriptions(is_active)`),
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_telegram_chat_id ON telegram_subscriptions(chat_id)`)
      ]);
    } else {
      try {
        await db.prepare('ALTER TABLE telegram_subscriptions ADD COLUMN last_sent_slot TEXT').run();
      } catch {
        // Column already exists
      }
    }
    // Ensure all 10 default folders exist
    await db.prepare(`
      INSERT OR IGNORE INTO folders (name, icon, order_index) VALUES 
        ('فناوری و استارتاپ', 'cpu', 0),
        ('هوش مصنوعی و داده', 'sparkles', 1),
        ('برنامه‌نویسی و مهندسی نرم‌افزار', 'code', 2),
        ('سیاست و اخبار عمومی', 'globe', 3),
        ('اقتصاد و بازارهای مالی', 'trending-up', 4),
        ('دانش و پژوهش', 'book-open', 5),
        ('طراحی و تجربه کاربری', 'palette', 6),
        ('امنیت سایبری و شبکه', 'shield', 7),
        ('بازی و سرگرمی دیجیتال', 'gamepad-2', 8),
        ('سبک زندگی، فرهنگ و یادگیری', 'sun', 9)
    `).run();
    return;
  }

  // Execute initialization statements in batch
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon TEXT DEFAULT 'folder',
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
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
      )
    `),
    db.prepare(`
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
      )
    `),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_articles_is_starred ON articles(is_starred)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_articles_importance ON articles(importance_score DESC)`),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS highlights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        note TEXT,
        color TEXT DEFAULT 'yellow',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_highlights_article_id ON highlights(article_id)`),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS user_profile (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS briefings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        content_json TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
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
      )
    `),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_telegram_active ON telegram_subscriptions(is_active)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_telegram_chat_id ON telegram_subscriptions(chat_id)`),
    db.prepare(`
      INSERT OR IGNORE INTO folders (name, icon, order_index) VALUES 
        ('فناوری و استارتاپ', 'cpu', 0),
        ('هوش مصنوعی و داده', 'sparkles', 1),
        ('برنامه‌نویسی و مهندسی نرم‌افزار', 'code', 2),
        ('سیاست و اخبار عمومی', 'globe', 3),
        ('اقتصاد و بازارهای مالی', 'trending-up', 4),
        ('دانش و پژوهش', 'book-open', 5),
        ('طراحی و تجربه کاربری', 'palette', 6),
        ('امنیت سایبری و شبکه', 'shield', 7),
        ('بازی و سرگرمی دیجیتال', 'gamepad-2', 8),
        ('سبک زندگی، فرهنگ و یادگیری', 'sun', 9)
    `),
    db.prepare(`
      INSERT OR IGNORE INTO user_profile (key, value) VALUES (
        'taste_profile',
        '{"topics":{"هوش مصنوعی":10,"ai":10,"فناوری":8,"technology":8,"نرم‌افزار":7,"توسعه":6,"استارتاپ":5,"علمی":5},"feedAffinity":{},"readCount":0,"starredCount":0,"highlightCount":0,"lastUpdated":"2026-09-22T00:00:00.000Z"}'
      )
    `)
  ]);
}
