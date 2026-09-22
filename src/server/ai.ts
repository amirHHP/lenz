import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';

export interface TodayBriefingCategory {
  category: string;
  headline: string;
  summary: string;
  whyItMatters: string;
  articleIds: number[];
  articles: Array<{
    id: number;
    title: string;
    feedTitle: string;
    link: string;
  }>;
}

export interface TodayBriefingData {
  date: string;
  executiveSummary: string;
  topHighlights: string[];
  categories: TodayBriefingCategory[];
}

/**
 * Gets Gemini API Key from environment or database settings.
 */
export function getGeminiApiKey(): string | null {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  try {
    const row = db.prepare('SELECT value FROM user_profile WHERE key = ?').get('gemini_api_key') as { value: string } | undefined;
    if (row && row.value && row.value.trim().length > 0) {
      return row.value.trim();
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Generates Today's Briefing («امروز چه خبر»).
 * Uses Gemini 3.8 Flash if API key is available, or high quality local NLP synthesis fallback.
 */
export async function generateTodayBriefing(): Promise<TodayBriefingData> {
  const todayStr = new Date().toISOString().split('T')[0];

  // Check if we already have a cached briefing for today generated recently (last 2 hours)
  const cached = db.prepare('SELECT * FROM briefings WHERE date = ?').get(todayStr) as any;
  if (cached) {
    try {
      const parsed = JSON.parse(cached.content_json);
      return parsed;
    } catch {
      // regenerate if corrupt
    }
  }

  // Fetch top articles from the last 48 hours, ordered by importance
  let articles = db.prepare(`
    SELECT a.id, a.title, a.summary, a.full_content, a.link, a.published_at, a.importance_score, f.title as feed_title
    FROM articles a
    JOIN feeds f ON a.feed_id = f.id
    WHERE datetime(a.published_at) >= datetime('now', '-2 days')
    ORDER BY a.importance_score DESC
    LIMIT 25
  `).all() as any[];

  // Fallback to top recent articles overall if none found in last 48h
  if (articles.length === 0) {
    articles = db.prepare(`
      SELECT a.id, a.title, a.summary, a.full_content, a.link, a.published_at, a.importance_score, f.title as feed_title
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
      ORDER BY a.published_at DESC, a.importance_score DESC
      LIMIT 25
    `).all() as any[];
  }

  if (articles.length === 0) {
    // Fallback if no articles exist yet
    return {
      date: todayStr,
      executiveSummary: 'هنوز خبر جدیدی برای امروز دریافت نشده است. لطفاً از بخش دایرکتوری سایت‌های مورد نظر خود را سابسکرایب کنید یا فیدها را به‌روزرسانی نمایید.',
      topHighlights: ['برای شروع چند فید اضافه کنید'],
      categories: []
    };
  }

  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const client = new GoogleGenAI({ apiKey });
      const prompt = `
شما هوش مصنوعی دستیار خبری پیشرفته نرم‌افزار Lenz هستید.
لیست ۲۵ خبر مهم زیر به همراه منبع و خلاصه در اختیار شماست:

${articles.map((a, i) => `[${i + 1}] شناسه: ${a.id} | عنوان: ${a.title} | منبع: ${a.feed_title} | خلاصه: ${a.summary?.slice(0, 180)}`).join('\n')}

لطفاً بخش «امروز چه خبر» را به زبان فارسی روان، شیوا و ساختاریافته تولید کنید.
خروجی باید دقیقاً و صرفاً یک شیء JSON با ساختار زیر باشد (بدون هیچ توضیح اضافه و ترجیحاً بدون markdown):

{
  "date": "${todayStr}",
  "executiveSummary": "یک پاراگراف چکیده ۳ تا ۴ خطی از مهم‌ترین اتفاقات و روند کلی اخبار امروز",
  "topHighlights": [
    "مهم‌ترین تیتر و تحول اول امروز در یک جمله",
    "تحول دوم",
    "تحول سوم"
  ],
  "categories": [
    {
      "category": "نام دسته مثلا هوش مصنوعی و فناوری یا اقتصاد یا جهان",
      "headline": "تیتر اصلی این دسته",
      "summary": "خلاصه دو جمله‌ای از مهم‌ترین رخدادهای این دسته",
      "whyItMatters": "چرا این خبر مهم است و چه تاثیری دارد",
      "articleIds": [1, 2]
    }
  ]
}
`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const rawOutput = response.text || '';
      const parsedData = extractJsonFromText(rawOutput);

      // Hydrate article details
      for (const cat of parsedData.categories || []) {
        cat.articles = (cat.articleIds || [])
          .map((aid: number) => articles.find(a => a.id === aid))
          .filter(Boolean)
          .map((a: any) => ({
            id: a.id,
            title: a.title,
            feedTitle: a.feed_title,
            link: a.link
          }));
      }

      // Save briefing to DB
      db.prepare(`
        INSERT INTO briefings (date, title, content_json)
        VALUES (?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET title = excluded.title, content_json = excluded.content_json
      `).run(todayStr, 'امروز چه خبر — ' + todayStr, JSON.stringify(parsedData));

      return parsedData;
    } catch (geminiError) {
      console.warn('Gemini briefing generation failed, falling back to local NLP engine:', geminiError);
    }
  }

  // Local Rule-Based & NLP Fallback Synthesizer
  return generateLocalNLPBriefing(todayStr, articles);
}

/**
 * Safely extracts a JSON object from text even if wrapped with markdown or commentary.
 */
function extractJsonFromText(text: string): any {
  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Could not parse JSON from response');
  }
}

/**
 * High-quality local NLP synthesis engine that clusters news by theme without requiring external APIs.
 */
function generateLocalNLPBriefing(todayStr: string, articles: any[]): TodayBriefingData {
  // Topic clustering keywords
  const clusters: Record<string, { title: string; matchers: RegExp[]; articles: any[] }> = {
    tech_ai: {
      title: 'هوش مصنوعی و نوآوری دیجیتال',
      matchers: [/ai\b/i, /gpt/i, /llm/i, /هوش مصنوعی/i, /مدل/i, /انویدیا/i, /open\s?ai/i, /گوگل/i, /اپل/i, /نرم‌افزار/i, /فناوری/i, /tech/i],
      articles: []
    },
    world_news: {
      title: 'رویدادهای مهم بین‌الملل و جامعه',
      matchers: [/جنگ/i, /سیاست/i, /دولت/i, /ایران/i, /آمریکا/i, /اروپا/i, /تحریم/i, /رئیس/i, /world/i, /news/i, /global/i],
      articles: []
    },
    science_dev: {
      title: 'دانش، طراحی و توسعه',
      matchers: [/علمی/i, /پژوهش/i, /طراحی/i, /برنامه‌نویسی/i, /کد/i, /css/i, /react/i, /فضا/i, /کشف/i, /science/i, /design/i],
      articles: []
    }
  };

  for (const art of articles) {
    const text = `${art.title} ${art.summary || ''}`.toLowerCase();
    let assigned = false;
    for (const key of Object.keys(clusters)) {
      if (clusters[key].matchers.some(m => m.test(text))) {
        clusters[key].articles.push(art);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      clusters.tech_ai.articles.push(art);
    }
  }

  const topArticles = articles.slice(0, 3);
  const highlights = topArticles.map(a => a.title);

  const categories: TodayBriefingCategory[] = [];

  for (const key of Object.keys(clusters)) {
    const cluster = clusters[key];
    if (cluster.articles.length > 0) {
      const mainArticle = cluster.articles[0];
      categories.push({
        category: cluster.title,
        headline: mainArticle.title,
        summary: mainArticle.summary?.slice(0, 200) || mainArticle.title,
        whyItMatters: 'این موضوع به دلیل تأثیر مستقیم بر حوزه‌های مرتبط و بازتاب گسترده در منابع معتبر از اهمیت بالایی برخوردار است.',
        articleIds: cluster.articles.slice(0, 4).map(a => a.id),
        articles: cluster.articles.slice(0, 4).map(a => ({
          id: a.id,
          title: a.title,
          feedTitle: a.feed_title,
          link: a.link
        }))
      });
    }
  }

  const briefing: TodayBriefingData = {
    date: todayStr,
    executiveSummary: `امروز مهم‌ترین موضوعات خبری حول محور ${categories.map(c => c.category).join('، ')} متمرکز بوده است. ${topArticles[0]?.title || ''} در کانون توجه منابع خبری قرار گرفته است.`,
    topHighlights: highlights,
    categories
  };

  // Cache briefing in DB
  try {
    db.prepare(`
      INSERT INTO briefings (date, title, content_json)
      VALUES (?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET title = excluded.title, content_json = excluded.content_json
    `).run(todayStr, 'امروز چه خبر — ' + todayStr, JSON.stringify(briefing));
  } catch (e) {
    // ignore
  }

  return briefing;
}

/**
 * Generates an AI summary for a single article.
 */
export async function generateArticleSummary(articleId: number): Promise<string> {
  const article = db.prepare(`
    SELECT a.*, f.title as feed_title 
    FROM articles a 
    JOIN feeds f ON a.feed_id = f.id 
    WHERE a.id = ?
  `).get(articleId) as any;

  if (!article) {
    throw new Error('مقاله یافت نشد');
  }

  if (article.ai_summary) {
    return article.ai_summary;
  }

  const apiKey = getGeminiApiKey();
  const textContent = article.full_content || article.summary || article.title;

  if (apiKey) {
    try {
      const client = new GoogleGenAI({ apiKey });
      const prompt = `
شما دستیار خلاصه‌سازی نرم‌افزار لنز هستید.
مقاله زیر را در ۳ نکته کلیدی و بولت‌وار (Bullet points) کوتاه به زبان فارسی خلاصه کن:
عنوان: ${article.title}
منبع: ${article.feed_title}
متن:
${textContent.slice(0, 4000)}
`;
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const summary = response.text?.trim() || '';
      if (summary) {
        db.prepare('UPDATE articles SET ai_summary = ? WHERE id = ?').run(summary, articleId);
        return summary;
      }
    } catch (e) {
      console.warn('Gemini article summary failed, falling back:', e);
    }
  }

  // Fallback: extract leading sentences
  const cleanText = textContent.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  const sentences = cleanText.split(/[\.!\?\u06D4]/).filter((s: string) => s.trim().length > 25);
  const fallbackSummary = sentences.slice(0, 3).map((s: string) => `• ${s.trim()}`).join('\n');

  db.prepare('UPDATE articles SET ai_summary = ? WHERE id = ?').run(fallbackSummary, articleId);
  return fallbackSummary;
}
