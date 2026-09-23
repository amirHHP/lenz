export interface Env {
  DB: D1Database;
  GEMINI_API_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_API_ROOT?: string;
}

export interface FolderRow {
  id: number;
  name: string;
  icon: string;
  order_index: number;
  created_at: string;
}

export interface FeedRow {
  id: number;
  folder_id: number | null;
  title: string;
  url: string;
  site_url: string | null;
  description: string | null;
  icon_url: string | null;
  last_fetched_at: string | null;
  created_at: string;
}

export interface ArticleRow {
  id: number;
  feed_id: number;
  guid: string;
  title: string;
  link: string;
  author: string | null;
  published_at: string;
  summary: string | null;
  full_content: string | null;
  is_full_extracted: number;
  is_read: number;
  is_starred: number;
  reading_time_minutes: number;
  importance_score: number;
  ai_category: string | null;
  ai_summary: string | null;
  keywords: string | null;
  created_at: string;
  feed_title?: string;
  folder_id?: number | null;
  highlight_count?: number;
}

export interface HighlightRow {
  id: number;
  article_id: number;
  text: string;
  note: string | null;
  color: string;
  created_at: string;
  article_title?: string;
  article_link?: string;
  feed_title?: string;
}

export interface UserTasteProfile {
  topics: Record<string, number>;
  feedAffinity: Record<string, number>;
  readCount: number;
  starredCount: number;
  highlightCount: number;
  lastUpdated: string;
}
