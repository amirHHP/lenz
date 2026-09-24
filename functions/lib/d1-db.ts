export async function ensureD1Schema(db: D1Database): Promise<void> {
  // Check if tables already initialized
  const check = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='folders'").first();
  if (check) {
    // Ensure users table exists
    const checkUsers = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();
    if (!checkUsers) {
      await db.batch([
        db.prepare(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            display_name TEXT NOT NULL,
            email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `),
        db.prepare(`
          CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL
          )
        `),
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`),
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`),
        db.prepare(`
          INSERT OR IGNORE INTO users (id, username, password_hash, display_name)
          VALUES (1, 'admin', 'a1b2c3d4e5f60718:1e0f48709b7135e2cae4d2acde0b81b43e887848dcc5dda72655afb549b19319', 'مدیر سیستم')
        `)
      ]);
    }

    // Check & migrate folders to composite UNIQUE(user_id, name)
    try {
      const folderSql = ((await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='folders'").first<any>())?.sql || '').toLowerCase();
      if (folderSql.includes('name text not null unique') || folderSql.includes('unique (name)') || folderSql.includes('unique(name)')) {
        await db.batch([
          db.prepare(`
            CREATE TABLE IF NOT EXISTS folders_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
              name TEXT NOT NULL,
              icon TEXT DEFAULT 'folder',
              order_index INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(user_id, name)
            )
          `),
          db.prepare('INSERT OR IGNORE INTO folders_new SELECT id, COALESCE(user_id, 1), name, icon, order_index, created_at FROM folders'),
          db.prepare('DROP TABLE folders'),
          db.prepare('ALTER TABLE folders_new RENAME TO folders'),
          db.prepare('CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id)')
        ]);
      } else {
        await db.prepare('ALTER TABLE folders ADD COLUMN user_id INTEGER DEFAULT 1').run().catch(() => {});
      }
    } catch {}

    // Check & migrate feeds to composite UNIQUE(user_id, url)
    try {
      const feedSql = ((await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='feeds'").first<any>())?.sql || '').toLowerCase();
      if (feedSql.includes('url text not null unique') || feedSql.includes('unique (url)') || feedSql.includes('unique(url)')) {
        await db.batch([
          db.prepare(`
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
            )
          `),
          db.prepare('INSERT OR IGNORE INTO feeds_new SELECT id, COALESCE(user_id, 1), folder_id, title, url, site_url, description, icon_url, last_fetched_at, created_at FROM feeds'),
          db.prepare('DROP TABLE feeds'),
          db.prepare('ALTER TABLE feeds_new RENAME TO feeds'),
          db.prepare('CREATE INDEX IF NOT EXISTS idx_feeds_user_id ON feeds(user_id)')
        ]);
      } else {
        await db.prepare('ALTER TABLE feeds ADD COLUMN user_id INTEGER DEFAULT 1').run().catch(() => {});
      }
    } catch {}

    // Check & migrate briefings to composite UNIQUE(user_id, date)
    try {
      const briefingSql = ((await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='briefings'").first<any>())?.sql || '').toLowerCase();
      if (briefingSql.includes('date text not null unique') || briefingSql.includes('unique (date)') || briefingSql.includes('unique(date)')) {
        await db.batch([
          db.prepare(`
            CREATE TABLE IF NOT EXISTS briefings_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
              date TEXT NOT NULL,
              title TEXT NOT NULL,
              content_json TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(user_id, date)
            )
          `),
          db.prepare('INSERT OR IGNORE INTO briefings_new SELECT id, COALESCE(user_id, 1), date, title, content_json, created_at FROM briefings'),
          db.prepare('DROP TABLE briefings'),
          db.prepare('ALTER TABLE briefings_new RENAME TO briefings'),
          db.prepare('CREATE INDEX IF NOT EXISTS idx_briefings_user_id ON briefings(user_id)'),
          db.prepare('CREATE INDEX IF NOT EXISTS idx_briefings_date ON briefings(date)')
        ]);
      } else {
        await db.prepare('ALTER TABLE briefings ADD COLUMN user_id INTEGER DEFAULT 1').run().catch(() => {});
      }
    } catch {}

    // Check & migrate telegram_subscriptions
    const checkTg = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='telegram_subscriptions'").first();
    if (!checkTg) {
      await db.batch([
        db.prepare(`
          CREATE TABLE IF NOT EXISTS telegram_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
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
          )
        `),
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_telegram_active ON telegram_subscriptions(is_active)`),
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_telegram_chat_id ON telegram_subscriptions(chat_id)`),
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_telegram_user_id ON telegram_subscriptions(user_id)`)
      ]);
    } else {
      try {
        const tgSql = ((await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='telegram_subscriptions'").first<any>())?.sql || '').toLowerCase();
        if (tgSql.includes('chat_id text not null unique') || tgSql.includes('unique (chat_id)') || tgSql.includes('unique(chat_id)')) {
          await db.batch([
            db.prepare(`
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
              )
            `),
            db.prepare('INSERT OR IGNORE INTO telegram_subscriptions_new SELECT id, COALESCE(user_id, 1), chat_id, username, first_name, bot_token, schedule_times, timezone, folder_ids, is_active, last_sent_at, last_sent_slot, created_at, updated_at FROM telegram_subscriptions'),
            db.prepare('DROP TABLE telegram_subscriptions'),
            db.prepare('ALTER TABLE telegram_subscriptions_new RENAME TO telegram_subscriptions'),
            db.prepare('CREATE INDEX IF NOT EXISTS idx_telegram_active ON telegram_subscriptions(is_active)'),
            db.prepare('CREATE INDEX IF NOT EXISTS idx_telegram_chat_id ON telegram_subscriptions(chat_id)'),
            db.prepare('CREATE INDEX IF NOT EXISTS idx_telegram_user_id ON telegram_subscriptions(user_id)')
          ]);
        } else {
          await db.prepare('ALTER TABLE telegram_subscriptions ADD COLUMN user_id INTEGER DEFAULT 1').run().catch(() => {});
          await db.prepare('ALTER TABLE telegram_subscriptions ADD COLUMN last_sent_slot TEXT').run().catch(() => {});
        }
      } catch {}
    }

    // Ensure all 10 default folders exist for user 1
    await db.prepare(`
      INSERT OR IGNORE INTO folders (user_id, name, icon, order_index) VALUES 
        (1, 'فناوری و استارتاپ', 'cpu', 0),
        (1, 'هوش مصنوعی و داده', 'sparkles', 1),
        (1, 'برنامه‌نویسی و مهندسی نرم‌افزار', 'code', 2),
        (1, 'سیاست و اخبار عمومی', 'globe', 3),
        (1, 'اقتصاد و بازارهای مالی', 'trending-up', 4),
        (1, 'دانش و پژوهش', 'book-open', 5),
        (1, 'طراحی و تجربه کاربری', 'palette', 6),
        (1, 'امنیت سایبری و شبکه', 'shield', 7),
        (1, 'بازی و سرگرمی دیجیتال', 'gamepad-2', 8),
        (1, 'سبک زندگی، فرهنگ و یادگیری', 'sun', 9)
    `).run().catch(() => {});
    return;
  }

  // Execute initialization statements in batch
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      )
    `),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        icon TEXT DEFAULT 'folder',
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      )
    `),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id)`),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS feeds (
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
      )
    `),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_feeds_user_id ON feeds(user_id)`),
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
        user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        content_json TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      )
    `),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_briefings_user_id ON briefings(user_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_briefings_date ON briefings(date)`),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS telegram_subscriptions (
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
      )
    `),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_telegram_active ON telegram_subscriptions(is_active)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_telegram_chat_id ON telegram_subscriptions(chat_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_telegram_user_id ON telegram_subscriptions(user_id)`),
    db.prepare(`
      INSERT OR IGNORE INTO users (id, username, password_hash, display_name)
      VALUES (1, 'admin', 'a1b2c3d4e5f60718:1e0f48709b7135e2cae4d2acde0b81b43e887848dcc5dda72655afb549b19319', 'مدیر سیستم')
    `),
    db.prepare(`
      INSERT OR IGNORE INTO folders (user_id, name, icon, order_index) VALUES 
        (1, 'فناوری و استارتاپ', 'cpu', 0),
        (1, 'هوش مصنوعی و داده', 'sparkles', 1),
        (1, 'برنامه‌نویسی و مهندسی نرم‌افزار', 'code', 2),
        (1, 'سیاست و اخبار عمومی', 'globe', 3),
        (1, 'اقتصاد و بازارهای مالی', 'trending-up', 4),
        (1, 'دانش و پژوهش', 'book-open', 5),
        (1, 'طراحی و تجربه کاربری', 'palette', 6),
        (1, 'امنیت سایبری و شبکه', 'shield', 7),
        (1, 'بازی و سرگرمی دیجیتال', 'gamepad-2', 8),
        (1, 'سبک زندگی، فرهنگ و یادگیری', 'sun', 9)
    `),
    db.prepare(`
      INSERT OR IGNORE INTO user_profile (key, value) VALUES (
        'taste_profile',
        '{"topics":{"هوش مصنوعی":10,"ai":10,"فناوری":8,"technology":8,"نرم‌افزار":7,"توسعه":6,"استارتاپ":5,"علمی":5},"feedAffinity":{},"readCount":0,"starredCount":0,"highlightCount":0,"lastUpdated":"2026-09-22T00:00:00.000Z"}'
      )
    `)
  ]);
}
