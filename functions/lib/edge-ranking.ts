import { Env, UserTasteProfile } from './types.js';

const STOPWORDS = new Set([
  // Persian
  'و', 'در', 'به', 'از', 'که', 'این', 'رو', 'با', 'برای', 'آن', 'یک', 'شود', 'شده', 'خود', 'ها', 'های',
  'یا', 'است', 'شد', 'کند', 'کرد', 'بود', 'تا', 'بر', 'نیز', 'وی', 'هم', 'اما', 'پس', 'چون', 'باید',
  'می', 'نمی', 'او', 'ما', 'شما', 'آنها', 'اگر', 'هر', 'چه', 'چند', 'بسیار', 'همه', 'بین', 'روی',
  'بودن', 'شدن', 'کردن', 'داشتن', 'نیست', 'باشند', 'بوده', 'دارد', 'دارند',
  // English
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'up', 'about', 'into', 'over', 'after', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'can', 'could', 'this', 'that', 'these',
  'those', 'it', 'its', 'they', 'them', 'their', 'we', 'us', 'our', 'you', 'your', 'he', 'him', 'his',
  'she', 'her', 'not', 'no', 'as', 'more', 'all', 'new', 'how', 'why', 'what', 'when', 'where', 'who'
]);

export function normalizePersian(text: string): string {
  if (!text) return '';
  return text
    .replace(/\u064A/g, 'ی') // Arabic Yeh -> Persian Yeh
    .replace(/\u0649/g, 'ی') // Alef Maksura -> Persian Yeh
    .replace(/\u0643/g, 'ک') // Arabic Kaf -> Persian Kaf
    .replace(/\u0629/g, 'ه') // Teh Marbuta -> Heh
    .replace(/[\u064B-\u065F\u0670]/g, '') // Diacritics
    .replace(/\u0640/g, '') // Tatweel
    .trim();
}

export function extractKeywords(text: string): string[] {
  if (!text) return [];
  const normalized = normalizePersian(text)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\w\u0600-\u06FF\u200C\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const rawWords = normalized.split(' ').filter(w => w.length > 1);
  const filteredWords: string[] = [];

  for (const w of rawWords) {
    const cleanWord = w.replace(/^[\u200C-]+|[\u200C-]+$/g, '');
    if (cleanWord.length > 1 && !STOPWORDS.has(cleanWord)) {
      filteredWords.push(cleanWord);
      if (cleanWord.includes('\u200C')) {
        filteredWords.push(cleanWord.replace(/\u200C/g, ' '));
      }
    }
  }

  const frequency: Record<string, number> = {};
  for (const word of filteredWords) {
    frequency[word] = (frequency[word] || 0) + 1;
  }

  // Bigrams
  for (let i = 0; i < rawWords.length - 1; i++) {
    const w1 = rawWords[i];
    const w2 = rawWords[i + 1];
    if (w1.length > 2 && w2.length > 2 && !STOPWORDS.has(w1) && !STOPWORDS.has(w2)) {
      const bigram = `${w1} ${w2}`;
      frequency[bigram] = (frequency[bigram] || 0) + 2;
    }
  }

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([w]) => w);
}

export async function getUserTasteProfile(db: D1Database, userId: number = 1): Promise<UserTasteProfile> {
  const key = userId === 1 ? 'taste_profile' : `taste_profile_${userId}`;
  const row = await db.prepare('SELECT value FROM user_profile WHERE key = ?').bind(key).first<{ value: string }>();
  if (row && row.value) {
    try {
      const parsed = JSON.parse(row.value);
      // Synchronize live counts from D1 for this user
      const [readRes, starRes, hlRes] = await Promise.all([
        db.prepare('SELECT COUNT(*) as c FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE f.user_id = ? AND a.is_read = 1').bind(userId).first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE f.user_id = ? AND a.is_starred = 1').bind(userId).first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM highlights h JOIN articles a ON h.article_id = a.id JOIN feeds f ON a.feed_id = f.id WHERE f.user_id = ?').bind(userId).first<{ c: number }>()
      ]);
      parsed.readCount = readRes?.c ?? 0;
      parsed.starredCount = starRes?.c ?? 0;
      parsed.highlightCount = hlRes?.c ?? 0;
      return parsed;
    } catch {
      // ignore
    }
  }

  return {
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
  };
}

export async function saveUserTasteProfile(db: D1Database, profile: UserTasteProfile, userId: number = 1): Promise<void> {
  profile.lastUpdated = new Date().toISOString();
  const key = userId === 1 ? 'taste_profile' : `taste_profile_${userId}`;
  await db.prepare('INSERT INTO user_profile (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, JSON.stringify(profile))
    .run();
}

const HIGH_SIGNAL_KEYWORDS = [
  'فوری', 'مهم', 'انقلاب', 'کشف', 'اختراع', 'هشدار', 'امنیتی', 'رسمی', 'نسخه جدید', 'شکست', 'پیروزی',
  'breaking', 'official', 'exclusive', 'critical', 'vulnerability', 'launch', 'release', 'ai', 'gpt'
];

export async function calculateArticleImportance(
  db: D1Database,
  article: {
    id?: number;
    feed_id: number;
    title: string;
    summary?: string | null;
    full_content?: string | null;
    published_at: string;
  },
  tasteProfile: UserTasteProfile
): Promise<{ score: number; reasons: string[] }> {
  let score = 30.0;
  const reasons: string[] = [];

  const textToAnalyze = `${article.title} ${article.summary || ''} ${article.full_content || ''}`;
  const keywords = extractKeywords(textToAnalyze);

  // 1. Recency Decay (0 - 30 pts)
  const pubTime = new Date(article.published_at).getTime();
  const now = Date.now();
  const hoursAgo = Math.max(0, (now - pubTime) / (1000 * 60 * 60));

  if (hoursAgo <= 4) {
    score += 30;
    reasons.push('خبر بسیار تازه (زیر ۴ ساعت گذشته)');
  } else if (hoursAgo <= 12) {
    score += 24;
    reasons.push('خبر تازه (زیر ۱۲ ساعت گذشته)');
  } else if (hoursAgo <= 24) {
    score += 18;
    reasons.push('انتشار در ۲۴ ساعت گذشته');
  } else if (hoursAgo <= 48) {
    score += 10;
  } else if (hoursAgo <= 72) {
    score += 5;
  }

  // 2. High-signal Keywords (0 - 15 pts)
  const normalizedTitle = normalizePersian(article.title).toLowerCase();
  for (const sig of HIGH_SIGNAL_KEYWORDS) {
    if (normalizedTitle.includes(sig)) {
      score += 10;
      reasons.push(`شامل واژه کلیدی مهم: «${sig}»`);
      break;
    }
  }

  // 3. User Taste Alignment (0 - 30 pts)
  let tasteMatchScore = 0;
  const matchedTopics: string[] = [];
  for (const kw of keywords) {
    if (tasteProfile.topics[kw]) {
      const weight = tasteProfile.topics[kw];
      tasteMatchScore += weight * 2.5;
      matchedTopics.push(kw);
    }
  }

  const feedWeight = tasteProfile.feedAffinity[article.feed_id.toString()] || 0;
  tasteMatchScore += feedWeight * 2;

  const boundedTasteScore = Math.min(30, tasteMatchScore);
  score += boundedTasteScore;
  if (matchedTopics.length > 0) {
    reasons.push(`مطابق با سلایق شما: ${matchedTopics.slice(0, 3).join('، ')}`);
  }

  // 4. Content Completeness & Depth (0 - 10 pts)
  const contentLength = (article.full_content || article.summary || '').length;
  if (contentLength > 1500) {
    score += 10;
    reasons.push('محتوای جامع و کامل');
  } else if (contentLength > 600) {
    score += 5;
  }

  // Bound score between 5 and 99
  const finalScore = Math.min(99, Math.max(5, Math.round(score * 10) / 10));
  return { score: finalScore, reasons };
}

export async function onArticleStarred(db: D1Database, articleId: number): Promise<void> {
  const article = await db.prepare('SELECT a.*, f.user_id FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE a.id = ?').bind(articleId).first<any>();
  if (!article) return;
  const userId = article.user_id || 1;

  const profile = await getUserTasteProfile(db, userId);
  const keywords = extractKeywords(`${article.title} ${article.summary || ''}`);
  for (const kw of keywords.slice(0, 8)) {
    profile.topics[kw] = (profile.topics[kw] || 0) + 3;
  }
  const feedKey = article.feed_id.toString();
  profile.feedAffinity[feedKey] = (profile.feedAffinity[feedKey] || 0) + 2;

  await saveUserTasteProfile(db, profile, userId);
}

export async function onArticleUnstarred(db: D1Database, articleId: number): Promise<void> {
  const article = await db.prepare('SELECT a.*, f.user_id FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE a.id = ?').bind(articleId).first<any>();
  if (!article) return;
  const userId = article.user_id || 1;

  const profile = await getUserTasteProfile(db, userId);
  const keywords = extractKeywords(`${article.title} ${article.summary || ''}`);
  for (const kw of keywords.slice(0, 8)) {
    if (profile.topics[kw]) {
      profile.topics[kw] = Math.max(0, profile.topics[kw] - 3);
      if (profile.topics[kw] === 0) delete profile.topics[kw];
    }
  }
  const feedKey = article.feed_id.toString();
  if (profile.feedAffinity[feedKey]) {
    profile.feedAffinity[feedKey] = Math.max(0, profile.feedAffinity[feedKey] - 2);
    if (profile.feedAffinity[feedKey] === 0) delete profile.feedAffinity[feedKey];
  }

  await saveUserTasteProfile(db, profile, userId);
}

export async function onHighlightCreated(db: D1Database, articleId: number, text: string): Promise<void> {
  const article = await db.prepare('SELECT a.*, f.user_id FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE a.id = ?').bind(articleId).first<any>();
  if (!article) return;
  const userId = article.user_id || 1;

  const profile = await getUserTasteProfile(db, userId);
  const keywords = extractKeywords(text);
  for (const kw of keywords.slice(0, 6)) {
    profile.topics[kw] = (profile.topics[kw] || 0) + 4;
  }
  const feedKey = article.feed_id.toString();
  profile.feedAffinity[feedKey] = (profile.feedAffinity[feedKey] || 0) + 1;

  await saveUserTasteProfile(db, profile, userId);
}

export async function onHighlightDeleted(db: D1Database, text: string, articleId?: number): Promise<void> {
  let userId = 1;
  if (articleId) {
    const article = await db.prepare('SELECT a.*, f.user_id FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE a.id = ?').bind(articleId).first<any>();
    if (article?.user_id) userId = article.user_id;
  }
  const profile = await getUserTasteProfile(db, userId);
  const keywords = extractKeywords(text);
  for (const kw of keywords.slice(0, 6)) {
    if (profile.topics[kw]) {
      profile.topics[kw] = Math.max(0, profile.topics[kw] - 4);
      if (profile.topics[kw] === 0) delete profile.topics[kw];
    }
  }
  await saveUserTasteProfile(db, profile, userId);
}

export async function onArticleRead(db: D1Database, articleId: number): Promise<void> {
  const article = await db.prepare('SELECT a.*, f.user_id FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE a.id = ?').bind(articleId).first<any>();
  if (!article) return;
  const userId = article.user_id || 1;

  const profile = await getUserTasteProfile(db, userId);
  const keywords = extractKeywords(article.title);
  for (const kw of keywords.slice(0, 4)) {
    profile.topics[kw] = (profile.topics[kw] || 0) + 0.5;
  }
  const feedKey = article.feed_id.toString();
  profile.feedAffinity[feedKey] = (profile.feedAffinity[feedKey] || 0) + 0.3;

  await saveUserTasteProfile(db, profile, userId);
}

export async function onArticleUnread(db: D1Database, articleId: number): Promise<void> {
  const article = await db.prepare('SELECT a.*, f.user_id FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE a.id = ?').bind(articleId).first<any>();
  if (!article) return;
  const userId = article.user_id || 1;

  const profile = await getUserTasteProfile(db, userId);
  const keywords = extractKeywords(article.title);
  for (const kw of keywords.slice(0, 4)) {
    if (profile.topics[kw]) {
      profile.topics[kw] = Math.max(0, profile.topics[kw] - 0.5);
      if (profile.topics[kw] === 0) delete profile.topics[kw];
    }
  }
  const feedKey = article.feed_id.toString();
  if (profile.feedAffinity[feedKey]) {
    profile.feedAffinity[feedKey] = Math.max(0, profile.feedAffinity[feedKey] - 0.3);
    if (profile.feedAffinity[feedKey] === 0) delete profile.feedAffinity[feedKey];
  }

  await saveUserTasteProfile(db, profile, userId);
}
