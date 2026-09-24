import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';

export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  email?: string | null;
  createdAt?: string;
}

// Augment Express Request interface
declare global {
  namespace Express {
    interface Request {
      user: AuthUser;
      isAuthenticated: boolean;
      sessionToken?: string;
    }
  }
}

export const DEFAULT_FOLDERS = [
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

export function hashPassword(password: string, salt?: string): string {
  const s = salt || Buffer.from(crypto.randomBytes(16)).toString('hex');
  const hash = Buffer.from(crypto.pbkdf2Sync(password, s, 100000, 32, 'sha256')).toString('hex');
  return `${s}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHash] = parts;
  const hash = Buffer.from(crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256')).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  return Buffer.from(crypto.randomBytes(32)).toString('hex');
}

export function createSession(userId: number, daysValid = 30): { token: string; expiresAt: string } {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
  return { token, expiresAt };
}

export function deleteSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function getUserByToken(token: string): AuthUser | null {
  try {
    const row = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.email, u.created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
    `).get(token) as any;

    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      email: row.email,
      createdAt: row.created_at
    };
  } catch {
    return null;
  }
}

export function seedUserFolders(userId: number): void {
  const insertFolder = db.prepare('INSERT OR IGNORE INTO folders (user_id, name, icon, order_index) VALUES (?, ?, ?, ?)');
  for (const f of DEFAULT_FOLDERS) {
    insertFolder.run(userId, f.name, f.icon, f.order);
  }
}

export function seedUserTasteProfile(userId: number): void {
  const key = userId === 1 ? 'taste_profile' : `taste_profile_${userId}`;
  const existing = db.prepare('SELECT value FROM user_profile WHERE key = ?').get(key);
  if (!existing) {
    db.prepare('INSERT INTO user_profile (key, value) VALUES (?, ?)').run(
      key,
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
        feedAffinity: {},
        readCount: 0,
        starredCount: 0,
        highlightCount: 0,
        lastUpdated: new Date().toISOString()
      })
    );
  }
}

export function registerUser(
  username: string, 
  password: string, 
  displayName: string, 
  email?: string
): { user: AuthUser; token: string } {
  const cleanUsername = username.trim().toLowerCase();
  const cleanDisplayName = displayName.trim();
  const cleanEmail = email?.trim() || null;

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
  if (existing) {
    throw new Error('این نام کاربری قبلاً ثبت شده است');
  }

  const pwdHash = hashPassword(password);
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, display_name, email)
    VALUES (?, ?, ?, ?)
  `);
  const info = insertUser.run(cleanUsername, pwdHash, cleanDisplayName, cleanEmail);
  const userId = Number(info.lastInsertRowid);

  // Initialize folders and taste profile for the new user
  seedUserFolders(userId);
  seedUserTasteProfile(userId);

  const { token } = createSession(userId);

  return {
    user: {
      id: userId,
      username: cleanUsername,
      displayName: cleanDisplayName,
      email: cleanEmail,
      createdAt: new Date().toISOString()
    },
    token
  };
}

export function loginUser(username: string, password: string): { user: AuthUser; token: string } | null {
  const cleanUsername = username.trim().toLowerCase();
  const userRow = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUsername) as any;
  if (!userRow) {
    return null;
  }

  const isValid = verifyPassword(password, userRow.password_hash);
  if (!isValid) {
    return null;
  }

  const { token } = createSession(userRow.id);
  return {
    user: {
      id: userRow.id,
      username: userRow.username,
      displayName: userRow.display_name,
      email: userRow.email,
      createdAt: userRow.created_at
    },
    token
  };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const user = getUserByToken(token);
      if (user) {
        req.user = user;
        req.isAuthenticated = true;
        req.sessionToken = token;
        return next();
      } else {
        res.status(401).json({ error: 'نشست کاربری نامعتبر است یا منقضی شده است' });
        return;
      }
    }
  }

  // Fallback to default user (id = 1) for unauthenticated / legacy / test calls
  req.user = {
    id: 1,
    username: 'admin',
    displayName: 'کاربر پیش‌فرض'
  };
  req.isAuthenticated = false;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated) {
    res.status(401).json({ error: 'برای دسترسی به این بخش باید وارد حساب کاربری خود شوید' });
    return;
  }
  next();
}
