import Parser from 'rss-parser';
import { db } from './db.js';
import { JSDOM } from 'jsdom';
import { calculateImportanceScore, extractKeywords } from './ranking.js';
import { calculateReadingTime } from './extractor.js';

interface CustomItem {
  guid?: string;
  id?: string;
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  content?: string;
  contentSnippet?: string;
  'content:encoded'?: string;
  creator?: string;
  author?: string;
  categories?: string[];
}

interface CustomFeed {
  title?: string;
  description?: string;
  link?: string;
  feedUrl?: string;
  image?: {
    url?: string;
    title?: string;
  };
}

const parser = new Parser<CustomFeed, CustomItem>({
  customFields: {
    item: ['content:encoded', 'categories']
  },
  timeout: 12000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Lenz/1.0',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
  }
});

/**
 * Attempts to discover an RSS/Atom feed from a generic website URL.
 */
export async function discoverFeedUrl(rawUrl: string): Promise<string> {
  let url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // First try direct parse in case it's already an RSS feed
  try {
    await parser.parseURL(url);
    return url;
  } catch (e) {
    // If not a direct RSS feed, check HTML links
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Lenz/1.0'
      }
    });

    if (res.ok) {
      const html = await res.text();
      const dom = new JSDOM(html);
      const doc = dom.window.document;

      const link = doc.querySelector('link[type="application/rss+xml"], link[type="application/atom+xml"]');
      if (link) {
        const href = link.getAttribute('href');
        if (href) {
          return new URL(href, url).href;
        }
      }
    }
  } catch (e) {
    // continue to fallback paths
  }

  // Fallback: check common feed endpoints
  const commonPaths = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml'];
  for (const path of commonPaths) {
    try {
      const testUrl = new URL(path, url).href;
      await parser.parseURL(testUrl);
      return testUrl;
    } catch {
      // ignore
    }
  }

  return url;
}

/**
 * Gets a clean favicon URL for a feed site.
 */
export function getFaviconUrl(siteUrl: string): string {
  try {
    const domain = new URL(siteUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return '';
  }
}

/**
 * Synchronizes a single feed by fetching items and inserting new ones.
 */
export async function syncFeed(feedId: number): Promise<{ newCount: number }> {
  const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(feedId) as any;
  if (!feed) {
    throw new Error(`Feed not found: ${feedId}`);
  }

  const parsed = await parser.parseURL(feed.url);

  // Update feed metadata if missing
  const siteUrl = feed.site_url || parsed.link || feed.url;
  const iconUrl = feed.icon_url || (parsed.image?.url ? parsed.image.url : getFaviconUrl(siteUrl));
  db.prepare(`
    UPDATE feeds 
    SET title = COALESCE(NULLIF(title, ''), ?),
        site_url = ?,
        icon_url = ?,
        description = COALESCE(NULLIF(description, ''), ?),
        last_fetched_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(parsed.title || feed.title, siteUrl, iconUrl, parsed.description || feed.description, feedId);

  const insertArticle = db.prepare(`
    INSERT INTO articles (
      feed_id, guid, title, link, author, published_at, summary, full_content, reading_time_minutes, importance_score, keywords
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(feed_id, guid) DO NOTHING
  `);

  let newCount = 0;

  for (const item of parsed.items) {
    const guid = item.guid || item.id || item.link || item.title || Math.random().toString();
    const title = item.title?.trim() || 'بدون عنوان';
    const link = item.link || feed.url;
    const author = item.creator || item.author || (parsed.title || '');
    const pubDateStr = item.isoDate || item.pubDate || new Date().toISOString();
    const publishedAt = new Date(pubDateStr).toISOString();

    const rawContent = item['content:encoded'] || item.content || item.contentSnippet || '';
    const summary = item.contentSnippet || rawContent.replace(/<[^>]*>?/gm, '').slice(0, 350);
    const readingTime = calculateReadingTime(rawContent);

    // Initial keywords
    const keywords = extractKeywords(title + ' ' + summary);

    // Calculate Lenz importance score based on user taste profile and signal
    const importance = calculateImportanceScore({
      title,
      summary,
      fullContent: rawContent,
      publishedAt,
      feedId,
      categories: item.categories || []
    });

    const result = insertArticle.run(
      feedId,
      guid,
      title,
      link,
      author,
      publishedAt,
      summary,
      rawContent, // store available feed content initially; full extraction can occur on-demand or background
      readingTime,
      importance.score,
      JSON.stringify(keywords)
    );

    if (result.changes > 0) {
      newCount++;
    }
  }

  return { newCount };
}

/**
 * Synchronizes all feeds in the database.
 */
export async function syncAllFeeds(): Promise<{ totalNew: number }> {
  const feeds = db.prepare('SELECT id FROM feeds').all() as { id: number }[];
  let totalNew = 0;

  for (const feed of feeds) {
    try {
      const res = await syncFeed(feed.id);
      totalNew += res.newCount;
    } catch (err) {
      console.error(`Error syncing feed ${feed.id}:`, err);
    }
  }

  return { totalNew };
}
