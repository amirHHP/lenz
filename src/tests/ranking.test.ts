import { describe, it, expect, beforeEach } from 'vitest';
import { 
  normalizePersian,
  extractKeywords, 
  calculateImportanceScore, 
  getUserTasteProfile, 
  saveUserTasteProfile, 
  onArticleStarred,
  onArticleUnstarred,
  onHighlightCreated,
  onHighlightDeleted
} from '../server/ranking.js';
import { db, initDatabase } from '../server/db.js';

describe('Lenz Smart Ranking & Taste Engine', () => {
  beforeEach(() => {
    initDatabase();
  });

  it('should extract informative keywords without stopwords', () => {
    const text = 'تحولات هوش مصنوعی و مدل های زبانی جدید در فناوری و تکنولوژی روز';
    const keywords = extractKeywords(text);
    expect(keywords).toContain('هوش');
    expect(keywords).toContain('مصنوعی');
    expect(keywords).not.toContain('در');
    expect(keywords).not.toContain('و');
  });

  it('should boost importance score for fresh articles matching user taste', () => {
    // Set a known user taste
    const profile = getUserTasteProfile();
    profile.topics['هوش'] = 10;
    profile.topics['مصنوعی'] = 10;
    saveUserTasteProfile(profile);

    const relevantScore = calculateImportanceScore({
      title: 'مدل جدید هوش مصنوعی معرفی شد',
      summary: 'پیشرفت چشمگیر در پردازش زبان طبیعی و هوش مصنوعی',
      publishedAt: new Date().toISOString(),
      feedId: 1
    });

    const irrelevantScore = calculateImportanceScore({
      title: 'قیمت سیب‌زمینی در بازار کاهش یافت',
      summary: 'گزارش قیمت صیفی‌جات در میادین میوه و تره‌بار',
      publishedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      feedId: 2
    });

    expect(relevantScore.score).toBeGreaterThan(irrelevantScore.score);
    expect(relevantScore.reasons.length).toBeGreaterThan(0);
  });

  it('should update user taste profile when article is starred or highlighted', () => {
    // Insert dummy feed and article
    const feed = db.prepare('INSERT INTO feeds (title, url) VALUES (?, ?)').run('Test Feed', 'https://test.com/rss' + Math.random());
    const feedId = Number(feed.lastInsertRowid);

    const art = db.prepare(`
      INSERT INTO articles (feed_id, guid, title, link, published_at, summary)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(feedId, 'test-guid-' + Math.random(), 'پیشرفت‌های مدل‌های کوانتومی', 'https://test.com/1', new Date().toISOString(), 'محاسبات کوانتومی و فیزیک');
    const articleId = Number(art.lastInsertRowid);

    const profileBefore = getUserTasteProfile();
    const quantumWeightBefore = profileBefore.topics['کوانتومی'] || 0;

    // Star article
    onArticleStarred(articleId);

    const profileAfterStar = getUserTasteProfile();
    expect(profileAfterStar.starredCount).toBeGreaterThan(profileBefore.starredCount || 0);
    expect(profileAfterStar.topics['کوانتومی']).toBeGreaterThan(quantumWeightBefore);

    // Highlight text
    onHighlightCreated(articleId, 'الگوریتم‌های رمزنگاری پساکوانتومی');
    const profileAfterHighlight = getUserTasteProfile();
    expect(profileAfterHighlight.highlightCount).toBeGreaterThan(profileBefore.highlightCount || 0);
    expect(profileAfterHighlight.topics['پساکوانتومی']).toBeGreaterThan(0);

    // Unstar article: should reduce weight and count
    onArticleUnstarred(articleId);
    const profileAfterUnstar = getUserTasteProfile();
    expect(profileAfterUnstar.starredCount).toBeLessThan(profileAfterStar.starredCount);

    // Delete highlight: should reduce weight and count
    onHighlightDeleted(articleId, 'الگوریتم‌های رمزنگاری پساکوانتومی');
    const profileAfterHlDelete = getUserTasteProfile();
    expect(profileAfterHlDelete.highlightCount).toBeLessThan(profileAfterHighlight.highlightCount);
  });

  it('should normalize Persian text characters and remove diacritics', () => {
    // Arabic Kaf and Yeh vs Persian Kaf and Yeh
    const rawArabic = 'شَبَكَةٌ ذَكِيَّةٌ';
    const normalized = normalizePersian(rawArabic);
    expect(normalized).toContain('ک'); // kaf normalized
    expect(normalized).toContain('ی'); // yeh normalized
    expect(normalized).not.toContain('ك'); // no arabic kaf
    expect(normalized).not.toContain('ي'); // no arabic yeh
    expect(normalized).not.toContain('ً'); // no tanween
  });

  it('should extract informative n-grams/bigrams in addition to unigrams', () => {
    const text = 'پیشرفت هوش مصنوعی و یادگیری عمیق در ایران';
    const keywords = extractKeywords(text);
    expect(keywords).toContain('هوش مصنوعی');
    expect(keywords).toContain('یادگیری عمیق');
  });
});
