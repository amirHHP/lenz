import { XMLParser } from 'fast-xml-parser';
import { extractKeywords, calculateArticleImportance, getUserTasteProfile } from './edge-ranking.js';

export interface ParsedItem {
  guid: string;
  title: string;
  link: string;
  pubDate: string;
  summary: string;
  content: string;
  author: string | null;
}

export interface ParsedFeed {
  title: string;
  description: string;
  siteUrl: string;
  items: ParsedItem[];
}

export async function fetchAndParseFeed(url: string): Promise<ParsedFeed> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LenzRSSReader/1.0; +https://github.com/amirHHP/lenz)'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch RSS feed: ${res.status} ${res.statusText}`);
  }

  const xmlText = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    trimValues: true
  });

  const parsed = parser.parse(xmlText);

  // Check if RSS 2.0
  if (parsed.rss && parsed.rss.channel) {
    const ch = parsed.rss.channel;
    const feedTitle = getText(ch.title) || 'بدون عنوان';
    const feedDesc = getText(ch.description) || '';
    const feedLink = getText(ch.link) || url;

    let itemsRaw = ch.item || [];
    if (!Array.isArray(itemsRaw)) itemsRaw = [itemsRaw];

    const items: ParsedItem[] = itemsRaw.map((it: any) => {
      const link = getText(it.link) || '';
      const guid = getText(it.guid) || link || (getText(it.title) + '_' + Date.now());
      const title = getText(it.title) || 'بدون عنوان';
      let rawDate = getText(it.pubDate) || getText(it['dc:date']) || '';
      let parsedD = new Date(rawDate);
      if (isNaN(parsedD.getTime())) parsedD = new Date();

      const summary = cleanHtml(getText(it.description) || '');
      const content = getText(it['content:encoded']) || getText(it.content) || summary;
      const author = getText(it.author) || getText(it['dc:creator']) || null;

      return {
        guid,
        title,
        link,
        pubDate: parsedD.toISOString(),
        summary,
        content,
        author
      };
    });

    return { title: feedTitle, description: feedDesc, siteUrl: feedLink, items };
  }

  // Check if Atom
  if (parsed.feed) {
    const f = parsed.feed;
    const feedTitle = getText(f.title) || 'بدون عنوان';
    const feedDesc = getText(f.subtitle) || '';
    let siteUrl = url;
    if (f.link) {
      if (Array.isArray(f.link)) {
        const alt = f.link.find((l: any) => l['@_rel'] === 'alternate') || f.link[0];
        siteUrl = alt?.['@_href'] || siteUrl;
      } else {
        siteUrl = f.link['@_href'] || siteUrl;
      }
    }

    let entriesRaw = f.entry || [];
    if (!Array.isArray(entriesRaw)) entriesRaw = [entriesRaw];

    const items: ParsedItem[] = entriesRaw.map((en: any) => {
      let link = '';
      if (en.link) {
        if (Array.isArray(en.link)) {
          const alt = en.link.find((l: any) => l['@_rel'] === 'alternate') || en.link[0];
          link = alt?.['@_href'] || '';
        } else {
          link = en.link['@_href'] || '';
        }
      }

      const guid = getText(en.id) || link || (getText(en.title) + '_' + Date.now());
      const title = getText(en.title) || 'بدون عنوان';
      let rawDate = getText(en.published) || getText(en.updated) || '';
      let parsedD = new Date(rawDate);
      if (isNaN(parsedD.getTime())) parsedD = new Date();

      const summary = cleanHtml(getText(en.summary) || '');
      const content = getText(en.content) || summary;
      const author = getText(en.author?.name) || null;

      return {
        guid,
        title,
        link,
        pubDate: parsedD.toISOString(),
        summary,
        content,
        author
      };
    });

    return { title: feedTitle, description: feedDesc, siteUrl, items };
  }

  throw new Error('Unsupported feed format: not valid RSS or Atom');
}

function getText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node.trim();
  if (typeof node === 'number') return String(node);
  if (node['#text']) return String(node['#text']).trim();
  return '';
}

function cleanHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

export async function syncFeedInD1(db: D1Database, feedId: number): Promise<{ inserted: number; updated: number }> {
  const feed = await db.prepare('SELECT * FROM feeds WHERE id = ?').bind(feedId).first<any>();
  if (!feed) throw new Error('Feed not found');

  const parsed = await fetchAndParseFeed(feed.url);
  const tasteProfile = await getUserTasteProfile(db);

  let inserted = 0;
  let updated = 0;

  for (const item of parsed.items) {
    if (!item.title || !item.link) continue;

    const existing = await db.prepare('SELECT id, is_full_extracted FROM articles WHERE feed_id = ? AND guid = ?')
      .bind(feedId, item.guid)
      .first<{ id: number; is_full_extracted: number }>();

    const keywords = extractKeywords(`${item.title} ${item.summary} ${item.content}`);
    const keywordsStr = keywords.join(',');
    const readingTime = Math.max(1, Math.round((item.content || item.summary || '').length / 500));

    const { score } = await calculateArticleImportance(db, {
      feed_id: feedId,
      title: item.title,
      summary: item.summary,
      full_content: item.content,
      published_at: item.pubDate
    }, tasteProfile);

    if (existing) {
      await db.prepare(`
        UPDATE articles SET
          title = ?,
          link = ?,
          author = ?,
          published_at = ?,
          summary = ?,
          importance_score = ?,
          keywords = ?
        WHERE id = ?
      `).bind(
        item.title,
        item.link,
        item.author,
        item.pubDate,
        item.summary,
        score,
        keywordsStr,
        existing.id
      ).run();
      updated++;
    } else {
      await db.prepare(`
        INSERT INTO articles (
          feed_id, guid, title, link, author, published_at,
          summary, full_content, reading_time_minutes, importance_score, keywords
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        feedId,
        item.guid,
        item.title,
        item.link,
        item.author,
        item.pubDate,
        item.summary,
        item.content || item.summary,
        readingTime,
        score,
        keywordsStr
      ).run();
      inserted++;
    }
  }

  await db.prepare('UPDATE feeds SET last_fetched_at = CURRENT_TIMESTAMP WHERE id = ?').bind(feedId).run();
  return { inserted, updated };
}

export async function syncAllFeedsInD1(db: D1Database): Promise<{ totalFeeds: number; inserted: number; updated: number }> {
  const feedsRes = await db.prepare('SELECT id FROM feeds').all<{ id: number }>();
  const feeds = feedsRes.results || [];
  let totalInserted = 0;
  let totalUpdated = 0;

  for (const f of feeds) {
    try {
      const res = await syncFeedInD1(db, f.id);
      totalInserted += res.inserted;
      totalUpdated += res.updated;
    } catch (err) {
      console.error(`Error syncing feed ${f.id}:`, err);
    }
  }

  return { totalFeeds: feeds.length, inserted: totalInserted, updated: totalUpdated };
}
