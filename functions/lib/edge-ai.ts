import { Env, ArticleRow } from './types.js';
import { extractKeywords } from './edge-ranking.js';

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

export async function getGeminiApiKey(db: D1Database, env?: any, userId: number = 1): Promise<string | null> {
  if (env?.GEMINI_API_KEY) return env.GEMINI_API_KEY;
  try {
    const key = userId === 1 ? 'gemini_api_key' : `gemini_api_key_${userId}`;
    const row = await db.prepare('SELECT value FROM user_profile WHERE key = ?').bind(key).first<{ value: string }>();
    if (row && row.value && row.value.trim().length > 0) {
      return row.value.trim();
    }
    if (userId !== 1) {
      const fallback = await db.prepare("SELECT value FROM user_profile WHERE key = 'gemini_api_key'").first<{ value: string }>();
      if (fallback && fallback.value && fallback.value.trim().length > 0) {
        return fallback.value.trim();
      }
    }
  } catch {}
  return null;
}

export async function generateTodayBriefingInD1(db: D1Database, env?: any, userId: number = 1): Promise<TodayBriefingData> {
  const todayStr = new Date().toISOString().split('T')[0];

  // Check cache in D1
  const cached = await db.prepare('SELECT * FROM briefings WHERE date = ? AND user_id = ?').bind(todayStr, userId).first<any>();
  if (cached) {
    try {
      return JSON.parse(cached.content_json);
    } catch {}
  }

  // Fetch top articles from the last 48 hours for this user
  const recentRes = await db.prepare(`
    SELECT a.id, a.title, a.summary, a.full_content, a.link, a.published_at, a.importance_score, f.title as feed_title
    FROM articles a
    JOIN feeds f ON a.feed_id = f.id
    WHERE f.user_id = ? AND datetime(a.published_at) >= datetime('now', '-2 days')
    ORDER BY a.importance_score DESC
    LIMIT 25
  `).bind(userId).all<any>();

  let articles = recentRes.results || [];
  if (articles.length === 0) {
    const fallbackRes = await db.prepare(`
      SELECT a.id, a.title, a.summary, a.full_content, a.link, a.published_at, a.importance_score, f.title as feed_title
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
      WHERE f.user_id = ?
      ORDER BY a.published_at DESC, a.importance_score DESC
      LIMIT 25
    `).bind(userId).all<any>();
    articles = fallbackRes.results || [];
  }

  if (articles.length === 0) {
    return {
      date: todayStr,
      executiveSummary: 'هنوز خبر جدیدی برای امروز دریافت نشده است. لطفاً از بخش دایرکتوری سایت‌های مورد نظر خود را سابسکرایب کنید یا فیدها را به‌روزرسانی نمایید.',
      topHighlights: ['برای شروع چند فید اضافه کنید'],
      categories: []
    };
  }

  const apiKey = await getGeminiApiKey(db, env, userId);

  if (apiKey) {
    try {
      const prompt = `
شما هوش مصنوعی دستیار خبری پیشرفته نرم‌افزار Lenz هستید.
لیست ۲۵ خبر مهم زیر به همراه منبع و خلاصه در اختیار شماست:

${articles.map((a: any, i: number) => `[${i + 1}] شناسه: ${a.id} | عنوان: ${a.title} | منبع: ${a.feed_title} | خلاصه: ${a.summary?.slice(0, 180)}`).join('\n')}

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

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json'
            }
          })
        }
      );

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json() as any;
        const textOut = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textOut) {
          const parsedData = extractJsonFromText(textOut);
          for (const cat of parsedData.categories || []) {
            cat.articles = (cat.articleIds || [])
              .map((aid: number) => articles.find((a: any) => a.id === aid))
              .filter(Boolean)
              .map((a: any) => ({
                id: a.id,
                title: a.title,
                feedTitle: a.feed_title,
                link: a.link
              }));
          }

          await db.prepare('DELETE FROM briefings WHERE date = ? AND user_id = ?').bind(todayStr, userId).run();
          await db.prepare(`
            INSERT INTO briefings (user_id, date, title, content_json)
            VALUES (?, ?, ?, ?)
          `).bind(userId, todayStr, 'امروز چه خبر — ' + todayStr, JSON.stringify(parsedData)).run();

          return parsedData;
        }
      }
    } catch (err) {
      console.warn('Gemini briefing generation failed on edge, falling back to local NLP:', err);
    }
  }

  // Local NLP fallback
  return generateLocalNLPBriefing(todayStr, articles, db, userId);
}

function extractJsonFromText(text: string): any {
  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

async function generateLocalNLPBriefing(todayStr: string, articles: any[], db: D1Database, userId: number = 1): Promise<TodayBriefingData> {
  const categoryKeywords: Record<string, string[]> = {
    'هوش مصنوعی و نوآوری دیجیتال': ['هوش مصنوعی', 'ai', 'gpt', 'مدل', 'openai', 'گوگل', 'مایکروسافت', 'ماشین لرنینگ', 'داده'],
    'فناوری و استارتاپ': ['اپل', 'گوگل', 'آیفون', 'اندروید', 'سامسونگ', 'تراشه', 'پردازنده', 'نرم افزار', 'نرم‌افزار', 'استارتاپ', 'اینترنت'],
    'اقتصاد و بازارهای مالی': ['بورس', 'سهام', 'دلار', 'ارز', 'طلا', 'تورم', 'بانک', 'مسکن', 'خودرو', 'تجارت', 'بازار', 'رمزارز', 'بیت کوین'],
    'سیاست و رویدادهای بین‌المللی': ['ایران', 'آمریکا', 'مذاکرات', 'توافق', 'وزارت', 'دولت', 'مجلس', 'سازمان ملل', 'اروپا', 'جنگ', 'صلح'],
    'علم، فضا و سلامت': ['ناسا', 'فضا', 'تلسکوپ', 'کشف', 'پزشکی', 'درمان', 'ویروس', 'واکسن', 'اقلیم', 'محیط زیست']
  };

  const buckets: Record<string, any[]> = {};
  for (const cat of Object.keys(categoryKeywords)) {
    buckets[cat] = [];
  }
  const generalArticles: any[] = [];

  for (const article of articles) {
    const text = `${article.title} ${article.summary || ''}`.toLowerCase();
    let assigned = false;

    for (const [catName, kws] of Object.entries(categoryKeywords)) {
      for (const kw of kws) {
        if (text.includes(kw)) {
          buckets[catName].push(article);
          assigned = true;
          break;
        }
      }
      if (assigned) break;
    }

    if (!assigned) {
      generalArticles.push(article);
    }
  }

  const categories: TodayBriefingCategory[] = [];

  for (const [catName, artList] of Object.entries(buckets)) {
    if (artList.length === 0) continue;
    const topArticle = artList[0];
    categories.push({
      category: catName,
      headline: topArticle.title,
      summary: topArticle.summary ? topArticle.summary.slice(0, 160) + '...' : topArticle.title,
      whyItMatters: `این رویداد به عنوان یکی از تحولات مهم حوزه ${catName} رصد شده و بر روندهای مرتبط تأثیرگذار است.`,
      articleIds: artList.map(a => a.id),
      articles: artList.slice(0, 4).map(a => ({
        id: a.id,
        title: a.title,
        feedTitle: a.feed_title,
        link: a.link
      }))
    });
  }

  if (generalArticles.length > 0 && categories.length < 3) {
    const topGen = generalArticles[0];
    categories.push({
      category: 'سایر رویدادهای منتخب',
      headline: topGen.title,
      summary: topGen.summary ? topGen.summary.slice(0, 160) + '...' : topGen.title,
      whyItMatters: 'این گزارش تحولات مهم و خبرهای برجسته روز را در بر می‌گیرد.',
      articleIds: generalArticles.map(a => a.id),
      articles: generalArticles.slice(0, 4).map(a => ({
        id: a.id,
        title: a.title,
        feedTitle: a.feed_title,
        link: a.link
      }))
    });
  }

  const top3Titles = articles.slice(0, 3).map(a => a.title);
  const briefingData: TodayBriefingData = {
    date: todayStr,
    executiveSummary: `امروز ${articles.length} رخداد خبری مهم در حوزه‌های فناوری، اقتصاد و رویدادهای روز شناسایی شد. مهم‌ترین سرخط‌ها با تمرکز بر پیشرفت‌های فناوری و تحولات کلان منطقه‌ای و جهانی شکل گرفته‌اند.`,
    topHighlights: top3Titles,
    categories
  };

  await db.prepare('DELETE FROM briefings WHERE date = ? AND user_id = ?').bind(todayStr, userId).run();
  await db.prepare(`
    INSERT INTO briefings (user_id, date, title, content_json)
    VALUES (?, ?, ?, ?)
  `).bind(userId, todayStr, 'امروز چه خبر — ' + todayStr, JSON.stringify(briefingData)).run();

  return briefingData;
}

/**
 * Generates an AI summary for a single article on Cloudflare Workers / D1.
 */
export async function generateArticleSummaryInD1(
  db: D1Database,
  env: Env,
  articleId: number,
  userId: number = 1
): Promise<string> {
  const article = await db.prepare(`
    SELECT a.*, f.title as feed_title 
    FROM articles a 
    JOIN feeds f ON a.feed_id = f.id 
    WHERE a.id = ? AND f.user_id = ?
  `).bind(articleId, userId).first<any>();

  if (!article) {
    throw new Error('مقاله یافت نشد');
  }

  if (article.ai_summary) {
    return article.ai_summary;
  }

  const apiKey = await getGeminiApiKey(db, env, userId);
  const textContent = article.full_content || article.summary || article.title;

  if (apiKey) {
    try {
      const prompt = `شما دستیار خلاصه‌سازی نرم‌افزار لنز هستید.
مقاله زیر را در ۳ نکته کلیدی و بولت‌وار (Bullet points) کوتاه به زبان فارسی خلاصه کن:
عنوان: ${article.title}
منبع: ${article.feed_title}
متن:
${textContent.slice(0, 4000)}
`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 }
          })
        }
      );
      if (res.ok) {
        const geminiData = await res.json() as any;
        const summary = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (summary) {
          await db.prepare('UPDATE articles SET ai_summary = ? WHERE id = ?').bind(summary, articleId).run();
          return summary;
        }
      }
    } catch (e) {
      console.warn('Gemini article summary failed on edge:', e);
    }
  }

  // Fallback: extract leading sentences
  const cleanText = textContent.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  const sentences = cleanText.split(/[\.!\?\u06D4]/).filter((s: string) => s.trim().length > 25);
  const fallbackSummary = sentences.slice(0, 3).map((s: string) => `• ${s.trim()}`).join('\n');

  await db.prepare('UPDATE articles SET ai_summary = ? WHERE id = ?').bind(fallbackSummary, articleId).run();
  return fallbackSummary;
}
