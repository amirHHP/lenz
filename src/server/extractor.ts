import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface ExtractedArticle {
  title: string | null;
  content: string | null;
  textContent: string | null;
  excerpt: string | null;
  byline: string | null;
  length: number;
}

/**
 * Extracts full readability article from a web URL.
 */
export async function extractFullArticle(url: string): Promise<ExtractedArticle | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Lenz/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fa,en-US,en;q=0.9'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    // Resolve relative image src and link href to absolute URLs
    doc.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('data:')) {
        try {
          img.setAttribute('src', new URL(src, url).href);
        } catch {}
      }
    });
    doc.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('javascript:')) {
        try {
          a.setAttribute('href', new URL(href, url).href);
        } catch {}
      }
    });

    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article || !article.content) {
      return null;
    }

    return {
      title: article.title || null,
      content: article.content,
      textContent: article.textContent || null,
      excerpt: article.excerpt || null,
      byline: article.byline || null,
      length: article.length || 0
    };
  } catch (error) {
    // If extraction fails or times out, return null gracefully
    return null;
  }
}

/**
 * Estimates reading time in minutes based on Persian & English words per minute.
 */
export function calculateReadingTime(text: string): number {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).length;
  // Average reading speed ~ 200 words per minute
  return Math.max(1, Math.ceil(words / 200));
}
