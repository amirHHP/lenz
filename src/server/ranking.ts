import { db } from './db.js';

export interface ImportanceResult {
  score: number;
  reasons: string[];
}

export interface UserTasteProfile {
  topics: Record<string, number>;
  feedAffinity: Record<string, number>;
  readCount: number;
  starredCount: number;
  highlightCount: number;
  lastUpdated: string;
}

// Stopwords in Persian and English to filter out non-informative noise
// Stopwords in Persian and English to filter out non-informative noise
const STOPWORDS = new Set([
  // Persian stopwords
  'و', 'در', 'به', 'از', 'که', 'این', 'رو', 'با', 'برای', 'آن', 'یک', 'شود', 'شده', 'خود', 'ها', 'های',
  'یا', 'است', 'شد', 'کند', 'کرد', 'بود', 'تا', 'بر', 'نیز', 'وی', 'هم', 'اما', 'پس', 'چون', 'باید',
  'می', 'نمی', 'او', 'ما', 'شما', 'آنها', 'اگر', 'هر', 'چه', 'چند', 'بسیار', 'همه', 'بین', 'روی',
  'بودن', 'شدن', 'کردن', 'داشتن', 'نیست', 'باشند', 'بوده', 'دارد', 'دارند',
  // English stopwords
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'up', 'about', 'into', 'over', 'after', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'can', 'could', 'this', 'that', 'these',
  'those', 'it', 'its', 'they', 'them', 'their', 'we', 'us', 'our', 'you', 'your', 'he', 'him', 'his',
  'she', 'her', 'not', 'no', 'as', 'more', 'all', 'new', 'how', 'why', 'what', 'when', 'where', 'who'
]);

/**
 * Normalizes Persian and Arabic text variations (Yeh, Kaf, Tashdeed, Tanween, etc.)
 */
export function normalizePersian(text: string): string {
  if (!text) return '';
  return text
    .replace(/\u064A/g, 'ی') // Arabic Yeh -> Persian Yeh
    .replace(/\u0649/g, 'ی') // Alef Maksura -> Persian Yeh
    .replace(/\u0643/g, 'ک') // Arabic Kaf -> Persian Kaf
    .replace(/\u0629/g, 'ه') // Teh Marbuta -> Heh
    .replace(/[\u064B-\u065F\u0670]/g, '') // Arabic diacritics
    .replace(/\u0640/g, '') // Tatweel
    .trim();
}

/**
 * Extracts clean, informative keywords and n-grams from text.
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];

  // Normalize Persian and clean text
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
      // If word contains ZWNJ (e.g. نرم‌افزار), also index space-separated version (نرم افزار)
      if (cleanWord.includes('\u200C')) {
        filteredWords.push(cleanWord.replace(/\u200C/g, ' '));
      }
    }
  }

  const frequency: Record<string, number> = {};

  // Unigram frequencies
  for (const word of filteredWords) {
    frequency[word] = (frequency[word] || 0) + 1;
  }

  // Bigrams (e.g. "هوش مصنوعی", "machine learning", "پردازش تصویر")
  for (let i = 0; i < rawWords.length - 1; i++) {
    const w1 = rawWords[i];
    const w2 = rawWords[i + 1];
    if (w1.length > 2 && w2.length > 2 && !STOPWORDS.has(w1) && !STOPWORDS.has(w2)) {
      const bigram = `${w1} ${w2}`;
      frequency[bigram] = (frequency[bigram] || 0) + 2;
    }
  }

  // Sort by frequency and take top 25
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([w]) => w);
}

/**
 * Retrieves the current user taste profile from SQLite, synchronizing live counters.
 */
export function getUserTasteProfile(): UserTasteProfile {
  let readCount = 0;
  let starredCount = 0;
  let highlightCount = 0;

  try {
    const counts = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM articles WHERE is_read = 1) as readCount,
        (SELECT COUNT(*) FROM articles WHERE is_starred = 1) as starredCount,
        (SELECT COUNT(*) FROM highlights) as highlightCount
    `).get() as any;
    if (counts) {
      readCount = counts.readCount || 0;
      starredCount = counts.starredCount || 0;
      highlightCount = counts.highlightCount || 0;
    }
  } catch {
    // fallback if DB not fully initialized
  }

  const row = db.prepare('SELECT value FROM user_profile WHERE key = ?').get('taste_profile') as { value: string } | undefined;
  if (!row) {
    return {
      topics: {},
      feedAffinity: {},
      readCount,
      starredCount,
      highlightCount,
      lastUpdated: new Date().toISOString()
    };
  }
  try {
    const parsed = JSON.parse(row.value);
    if (!parsed.topics) parsed.topics = {};
    if (!parsed.feedAffinity) parsed.feedAffinity = {};
    return {
      topics: parsed.topics,
      feedAffinity: parsed.feedAffinity,
      readCount: Math.max(parsed.readCount || 0, readCount),
      starredCount: Math.max(parsed.starredCount || 0, starredCount),
      highlightCount: Math.max(parsed.highlightCount || 0, highlightCount),
      lastUpdated: parsed.lastUpdated || new Date().toISOString()
    };
  } catch {
    return {
      topics: {},
      feedAffinity: {},
      readCount,
      starredCount,
      highlightCount,
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Saves updated taste profile to SQLite.
 */
export function saveUserTasteProfile(profile: UserTasteProfile): void {
  profile.lastUpdated = new Date().toISOString();
  db.prepare(`
    INSERT INTO user_profile (key, value) VALUES ('taste_profile', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(JSON.stringify(profile));
}

/**
 * Multi-factor importance scoring algorithm:
 * Combines User Taste affinity (0-45) + Freshness (0-25) + Content Depth (0-15) + Feed Affinity (0-15).
 */
export function calculateImportanceScore(params: {
  title: string;
  summary: string;
  fullContent?: string;
  publishedAt: string;
  feedId: number;
  categories?: string[];
}): ImportanceResult {
  const profile = getUserTasteProfile();
  const reasons: string[] = [];

  // 1. User Taste Alignment (0 - 45 points)
  const textToAnalyze = `${params.title} ${params.summary} ${(params.categories || []).join(' ')}`;
  const keywords = extractKeywords(textToAnalyze);

  let tasteMatchScore = 0;
  const matchedKeywords: string[] = [];

  for (const kw of keywords) {
    const kwNormalized = normalizePersian(kw);
    const weight = profile.topics[kw] || profile.topics[kwNormalized] || 0;
    if (weight > 0) {
      tasteMatchScore += weight * 2.5;
      matchedKeywords.push(kw);
    }
  }

  // Cap taste score at 45
  tasteMatchScore = Math.min(45, tasteMatchScore);
  if (matchedKeywords.length > 0) {
    reasons.push(`مطابق با علایق شما در: ${matchedKeywords.slice(0, 3).join('، ')}`);
  }

  // 2. Freshness & Decay (0 - 25 points)
  const pubTime = new Date(params.publishedAt).getTime();
  const now = Date.now();
  const hoursAgo = Math.max(0, (now - pubTime) / (1000 * 60 * 60));

  let freshnessScore = 0;
  if (hoursAgo <= 4) {
    freshnessScore = 25;
    reasons.push('خبر بسیار تازه (زیر ۴ ساعت)');
  } else if (hoursAgo <= 12) {
    freshnessScore = 21;
  } else if (hoursAgo <= 24) {
    freshnessScore = 17;
  } else if (hoursAgo <= 48) {
    freshnessScore = 12;
  } else if (hoursAgo <= 96) {
    freshnessScore = 7;
  } else {
    freshnessScore = 3;
  }

  // 3. Content Signal & Substance (0 - 15 points)
  const content = params.fullContent || params.summary || '';
  const wordCount = content.split(/\s+/).length;
  let substanceScore = 5; // base

  if (wordCount > 600) {
    substanceScore = 15;
    reasons.push('گزارش یا تحلیل جامع و عمیق');
  } else if (wordCount > 250) {
    substanceScore = 10;
  }

  // 4. Feed Authority & Engagement (0 - 15 points)
  const feedAffinity = profile.feedAffinity[params.feedId.toString()] || 0;
  const feedScore = Math.min(15, 5 + feedAffinity * 2);
  if (feedAffinity > 2) {
    reasons.push('منبع منتخب و پربازدید شما');
  }

  const totalScore = Math.round(tasteMatchScore + freshnessScore + substanceScore + feedScore);
  const finalScore = Math.min(100, Math.max(10, totalScore));

  return {
    score: finalScore,
    reasons: reasons.length > 0 ? reasons : ['محتوای عمومی پیشنهادی']
  };
}

/**
 * Called when an article is starred: learns user taste and updates weights.
 */
export function onArticleStarred(articleId: number): void {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId) as any;
  if (!article) return;

  try {
    db.prepare('UPDATE articles SET is_starred = 1 WHERE id = ?').run(articleId);
  } catch {}

  const profile = getUserTasteProfile();
  profile.starredCount = (profile.starredCount || 0) + 1;

  // Boost feed affinity
  const feedKey = article.feed_id.toString();
  profile.feedAffinity[feedKey] = (profile.feedAffinity[feedKey] || 0) + 2;

  // Extract keywords and boost
  const keywords = extractKeywords(`${article.title} ${article.summary}`);
  for (const kw of keywords) {
    profile.topics[kw] = (profile.topics[kw] || 0) + 5;
  }

  saveUserTasteProfile(profile);
  recalculateUnreadScores();
}

/**
 * Called when an article is un-starred: reverts user taste weights.
 */
export function onArticleUnstarred(articleId: number): void {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId) as any;
  if (!article) return;

  try {
    db.prepare('UPDATE articles SET is_starred = 0 WHERE id = ?').run(articleId);
  } catch {}

  const profile = getUserTasteProfile();
  profile.starredCount = Math.max(0, (profile.starredCount || 0) - 1);

  // Reduce feed affinity
  const feedKey = article.feed_id.toString();
  if (profile.feedAffinity[feedKey]) {
    profile.feedAffinity[feedKey] = Math.max(0, profile.feedAffinity[feedKey] - 2);
    if (profile.feedAffinity[feedKey] === 0) delete profile.feedAffinity[feedKey];
  }

  // Reduce keywords
  const keywords = extractKeywords(`${article.title} ${article.summary}`);
  for (const kw of keywords) {
    if (profile.topics[kw]) {
      profile.topics[kw] = Math.max(0, profile.topics[kw] - 5);
      if (profile.topics[kw] === 0) delete profile.topics[kw];
    }
  }

  saveUserTasteProfile(profile);
  recalculateUnreadScores();
}

/**
 * Called when text is highlighted: strong signal of deep interest in specific concepts.
 */
export function onHighlightCreated(articleId: number, highlightText: string): void {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId) as any;
  if (!article) return;

  const profile = getUserTasteProfile();
  profile.highlightCount = (profile.highlightCount || 0) + 1;

  // Highlights have the strongest topical weight
  const keywords = extractKeywords(highlightText);
  for (const kw of keywords) {
    profile.topics[kw] = (profile.topics[kw] || 0) + 8;
  }

  saveUserTasteProfile(profile);
  recalculateUnreadScores();
}

/**
 * Called when a highlight is deleted: reverts highlight topic weight.
 */
export function onHighlightDeleted(articleId: number, highlightText: string): void {
  const profile = getUserTasteProfile();
  profile.highlightCount = Math.max(0, (profile.highlightCount || 0) - 1);

  const keywords = extractKeywords(highlightText);
  for (const kw of keywords) {
    if (profile.topics[kw]) {
      profile.topics[kw] = Math.max(0, profile.topics[kw] - 8);
      if (profile.topics[kw] === 0) delete profile.topics[kw];
    }
  }

  saveUserTasteProfile(profile);
  recalculateUnreadScores();
}

/**
 * Called when an article is marked read.
 */
export function onArticleRead(articleId: number): void {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId) as any;
  if (!article) return;

  try {
    db.prepare('UPDATE articles SET is_read = 1 WHERE id = ?').run(articleId);
  } catch {}

  const profile = getUserTasteProfile();
  profile.readCount = (profile.readCount || 0) + 1;

  // Gentle topic boost
  const keywords = extractKeywords(article.title);
  for (const kw of keywords) {
    profile.topics[kw] = (profile.topics[kw] || 0) + 1;
  }

  saveUserTasteProfile(profile);
}

/**
 * Called when an article is marked unread: reverts gentle topic boost.
 */
export function onArticleUnread(articleId: number): void {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId) as any;
  if (!article) return;

  try {
    db.prepare('UPDATE articles SET is_read = 0 WHERE id = ?').run(articleId);
  } catch {}

  const profile = getUserTasteProfile();
  profile.readCount = Math.max(0, (profile.readCount || 0) - 1);

  const keywords = extractKeywords(article.title);
  for (const kw of keywords) {
    if (profile.topics[kw]) {
      profile.topics[kw] = Math.max(0, profile.topics[kw] - 1);
      if (profile.topics[kw] === 0) delete profile.topics[kw];
    }
  }

  saveUserTasteProfile(profile);
}

/**
 * Recalculates importance score for all unread articles with updated user taste and freshness.
 */
export function recalculateUnreadScores(): void {
  try {
    const unreadArticles = db.prepare(`
      SELECT id, title, summary, full_content, published_at, feed_id 
      FROM articles 
      WHERE is_read = 0 
      ORDER BY published_at DESC 
      LIMIT 200
    `).all() as any[];

    const updateStmt = db.prepare('UPDATE articles SET importance_score = ? WHERE id = ?');
    for (const art of unreadArticles) {
      const res = calculateImportanceScore({
        title: art.title,
        summary: art.summary,
        fullContent: art.full_content,
        publishedAt: art.published_at,
        feedId: art.feed_id
      });
      updateStmt.run(res.score, art.id);
    }
  } catch (err) {
    console.error('Error recalculating scores:', err);
  }
}
