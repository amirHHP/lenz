import { Env } from './types.js';

export interface EdgeAuthUser {
  id: number;
  username: string;
  displayName: string;
  email?: string | null;
  createdAt?: string;
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

export async function hashPassword(password: string, salt?: string): Promise<string> {
  const s = salt || Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', 
    enc.encode(password), 
    { name: 'PBKDF2' }, 
    false, 
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(s),
      iterations: 100000,
      hash: 'SHA-256'
    }, 
    keyMaterial, 
    256
  );
  const hash = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return `${s}:${hash}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !storedHash.includes(':')) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHash] = parts;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', 
    enc.encode(password), 
    { name: 'PBKDF2' }, 
    false, 
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    }, 
    keyMaterial, 
    256
  );
  const hash = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return hash === expectedHash;
}

export function generateSessionToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createSession(db: D1Database, userId: number, daysValid = 30): Promise<{ token: string; expiresAt: string }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000).toISOString();
  await db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, userId, expiresAt)
    .run();
  return { token, expiresAt };
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}

export async function getUserByToken(db: D1Database, token: string): Promise<EdgeAuthUser | null> {
  try {
    const row = await db.prepare(`
      SELECT u.id, u.username, u.display_name, u.email, u.created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
    `).bind(token).first<any>();

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

export async function seedUserFoldersInD1(db: D1Database, userId: number): Promise<void> {
  const statements = DEFAULT_FOLDERS.map(f =>
    db.prepare('INSERT OR IGNORE INTO folders (user_id, name, icon, order_index) VALUES (?, ?, ?, ?)')
      .bind(userId, f.name, f.icon, f.order)
  );
  await db.batch(statements);
}

export async function seedUserTasteProfileInD1(db: D1Database, userId: number): Promise<void> {
  const key = userId === 1 ? 'taste_profile' : `taste_profile_${userId}`;
  const existing = await db.prepare('SELECT value FROM user_profile WHERE key = ?').bind(key).first();
  if (!existing) {
    await db.prepare('INSERT INTO user_profile (key, value) VALUES (?, ?)')
      .bind(
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
      )
      .run();
  }
}
