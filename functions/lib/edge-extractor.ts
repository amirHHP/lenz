import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';

export interface ExtractedArticle {
  title: string;
  content: string;
  excerpt: string;
  byline: string | null;
  siteName: string | null;
}

export async function extractFullArticle(url: string): Promise<ExtractedArticle | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!res.ok) {
      return null;
    }

    const html = await res.text();
    const { document } = parseHTML(html);

    // Resolve relative URLs for images and anchors
    try {
      const baseUrl = new URL(url);
      const images = document.querySelectorAll('img');
      for (const img of images) {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
          try {
            img.setAttribute('src', new URL(src, baseUrl).href);
          } catch {}
        }
      }

      const links = document.querySelectorAll('a');
      for (const a of links) {
        const href = a.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('#')) {
          try {
            a.setAttribute('href', new URL(href, baseUrl).href);
          } catch {}
        }
      }
    } catch {}

    const reader = new Readability(document as any, {
      charThreshold: 200,
      keepClasses: false
    });

    const parsed = reader.parse();
    if (!parsed || !parsed.content) {
      return null;
    }

    return {
      title: parsed.title || '',
      content: parsed.content,
      excerpt: parsed.excerpt || '',
      byline: parsed.byline || null,
      siteName: parsed.siteName || null
    };
  } catch (err) {
    console.error('Extraction error for URL:', url, err);
    return null;
  }
}
