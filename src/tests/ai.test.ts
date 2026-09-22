import { describe, it, expect, beforeEach } from 'vitest';
import { generateTodayBriefing, generateArticleSummary } from '../server/ai.js';
import { db, initDatabase } from '../server/db.js';

describe('Lenz AI Module & Fallbacks', () => {
  beforeEach(() => {
    initDatabase();
  });

  it('should return a structured Today Briefing with categories and topHighlights', async () => {
    // Seed at least 2 articles in SQLite
    const feed = db.prepare('INSERT INTO feeds (title, url) VALUES (?, ?)').run('Tech News', 'https://technews.example/feed' + Math.random());
    const feedId = Number(feed.lastInsertRowid);

    db.prepare(`
      INSERT INTO articles (feed_id, guid, title, link, published_at, summary, importance_score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(feedId, 'art-1-' + Math.random(), 'مدل جدید هوش مصنوعی رونمایی شد', 'https://technews.example/1', new Date().toISOString(), 'توسعه فناوری هوش مصنوعی با شتاب ادامه دارد.', 95);

    db.prepare(`
      INSERT INTO articles (feed_id, guid, title, link, published_at, summary, importance_score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(feedId, 'art-2-' + Math.random(), 'توافق جدید تجاری در نشست بین‌المللی', 'https://technews.example/2', new Date().toISOString(), 'اخبار دیپلماسی و تجارت جهانی در اروپا', 80);

    const briefing = await generateTodayBriefing();
    expect(briefing).toBeDefined();
    expect(briefing.date).toBeDefined();
    expect(briefing.executiveSummary).toBeTruthy();
    expect(briefing.categories.length).toBeGreaterThan(0);
    expect(briefing.topHighlights.length).toBeGreaterThan(0);
  });

  it('should generate an extractive article summary fallback', async () => {
    const feed = db.prepare('INSERT INTO feeds (title, url) VALUES (?, ?)').run('Blog', 'https://blog.example/rss' + Math.random());
    const feedId = Number(feed.lastInsertRowid);

    const art = db.prepare(`
      INSERT INTO articles (feed_id, guid, title, link, published_at, summary, full_content)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      feedId, 
      'art-summary-' + Math.random(), 
      'معرفی فناوری‌های وب در سال جاری', 
      'https://blog.example/web-tech', 
      new Date().toISOString(), 
      'خلاصه مقدماتی متن',
      'فناوری‌های فرانت‌اند با سرعت بی‌سابقه‌ای در حال پیشرفت هستند. کامپایلرهای مدرن و سیستم‌های بیلد سرعت را به شدت بالا برده‌اند. توسعه‌دهندگان می‌توانند تجربیات کاربری بسیار روان‌تری خلق کنند.'
    );
    const articleId = Number(art.lastInsertRowid);

    const summary = await generateArticleSummary(articleId);
    expect(summary).toBeDefined();
    expect(summary.length).toBeGreaterThan(10);
  });
});
