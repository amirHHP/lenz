export interface Article {
  id: number;
  feed_id: number;
  guid: string;
  title: string;
  link: string;
  author: string | null;
  published_at: string;
  summary: string | null;
  full_content?: string | null;
  is_read: number;
  is_starred: number;
  reading_time_minutes: number;
  importance_score: number;
  ai_category: string | null;
  ai_summary: string | null;
  feed_title: string;
  feed_icon_url?: string | null;
  feed_site_url?: string | null;
  highlight_count?: number;
}

export interface Highlight {
  id: number;
  article_id: number;
  text: string;
  note?: string | null;
  color: 'yellow' | 'green' | 'blue';
  created_at: string;
  article_title?: string;
  article_link?: string;
  feed_title?: string;
}

export interface Feed {
  id: number;
  folder_id: number | null;
  title: string;
  url: string;
  site_url: string | null;
  description: string | null;
  icon_url: string | null;
  last_fetched_at: string | null;
  unread_count?: number;
  total_count?: number;
}

export interface Folder {
  id: number;
  name: string;
  icon: string;
  order_index: number;
  feed_count?: number;
  unread_count?: number;
}

export interface DirectoryFeed {
  id: string;
  title: string;
  description: string;
  url: string;
  siteUrl: string;
  category: string;
  icon: string;
  isPopular?: boolean;
  isSubscribed?: boolean;
}

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

export interface UserTasteProfile {
  topics: Record<string, number>;
  feedAffinity: Record<string, number>;
  readCount: number;
  starredCount: number;
  highlightCount: number;
  lastUpdated: string;
}

export type ActiveView = 
  | { type: 'all' }
  | { type: 'briefing' }
  | { type: 'starred' }
  | { type: 'highlights' }
  | { type: 'folder'; folderId: number; folderName: string }
  | { type: 'feed'; feedId: number; feedTitle: string };

export interface TelegramSubscription {
  id: number;
  chat_id: string;
  username: string | null;
  first_name: string | null;
  bot_token: string | null;
  schedule_times: string[];
  timezone: string;
  folder_ids: number[] | 'all';
  is_active: number;
  last_sent_at: string | null;
  last_sent_slot?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TelegramFolderSummary {
  id: number;
  name: string;
  icon: string;
  feed_count: number;
  article_count: number;
  unread_count: number;
}

export interface TelegramStatusResponse {
  botTokenConfigured: boolean;
  maskedBotToken: string | null;
  botInfo?: {
    ok: boolean;
    username?: string;
    firstName?: string;
    error?: string;
  } | null;
  subscriptions: TelegramSubscription[];
  folders: TelegramFolderSummary[];
}
