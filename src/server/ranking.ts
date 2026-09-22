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
const STOPWORDS = new Set([
  // Persian stopwords
  'و', 'در', 'به', 'از', 'که', 'این', 'رو', 'با', 'برای', 'آن', 'یک', 'شود', 'شده', 'خود', 'ها', 'های',
  'یا', 'است', 'شد', 'کند', 'کرد', 'بود', 'تا', 'بر', 'نیز', 'وی', 'هم', 'اما', 'پس', 'چون', 'باید',
  'می', 'نمی', 'او', 'ما', 'شما', 'آنها', 'اگر', 'هر', 'چه', 'چند', 'بسیار', 'همه', 'بین', 'روی',
  // English stopwords
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'up', 'about', 'into', 'over', 'after', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'can', 'could', 'this', 'that', 'these',
  'those', 'it', 'its', 'they', 'them', 'their', 'we', 'us', 'our', 'you', 'your', 'he', 'him', 'his',
  'she', 'her', 'not', 'no', 'as', 'more', 'all', 'new', 'how', 'why', 'what', 'when', 'where', 'who'
]);

/**
 * Extracts clean, informative keywords and n-grams from text.
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];

  // Normalize text: lowercase, remove URLs, punctuation, special chars
  const cleaned = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\w\u0600-\u06FF\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(' ').filter(w => w.length > 2 && !STOPWORDS.has(w));

  const frequency: Record<string, number> = {};
  for (const word of words) {
    frequency[word] = (frequency[word] || 0) + 1;
  }

  // Sort by frequency and take top 15
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([w]) => w);
}

/**
 * Retrieves the current user taste profile from SQLite.
 */
export function getUserTasteProfile(): UserTasteProfile {
  const row = db.prepare('SELECT value FROM user_profile WHERE key = ?').get('taste_profile') as { value: string } | undefined;
  if (!row) {
    return {
      topics: {},
      feedAffinity: {},
      readCount: 0,
      starredCount: 0,
      highlightCount: 0,
      lastUpdated: new Date().toISOString()
    };
  }
  try {
    const parsed = JSON.parse(row.value);
    if (!parsed.topics) parsed.topics = {};
    if (!parsed.feedAffinity) parsed.feedAffinity = {};
    return parsed;
  } catch {
    return {
      topics: {},
      feedAffinity: {},
      readCount: 0,
      starredCount: 0,
      highlightCount: 0,
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
    if (profile.topics[kw]) {
      const weight = profile.topics[kw];
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

  // Recalculate scores for unread articles in the background
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
 * Called when an article is marked read.
 */
export function onArticleRead(articleId: number): void {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId) as any;
  if (!article) return;

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
 * Recalculates importance score for all unread articles with updated user taste.
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
