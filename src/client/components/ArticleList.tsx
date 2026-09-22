import React, { useEffect, useRef } from 'react';
import { 
  Flame, 
  Clock, 
  Star, 
  CheckCheck, 
  Search, 
  Filter, 
  Sparkles, 
  Highlighter, 
  SlidersHorizontal 
} from 'lucide-react';
import { Article, ActiveView } from '../types';

interface Props {
  articles: Article[];
  selectedArticleId: number | null;
  onSelectArticle: (articleId: number) => void;
  onToggleStar: (articleId: number, current: boolean) => void;
  onToggleRead: (articleId: number, current: boolean) => void;
  onMarkAllRead: () => void;
  search: string;
  onSearchChange: (val: string) => void;
  filterUnreadOnly: boolean;
  onToggleFilterUnread: () => void;
  sort: 'smart' | 'newest' | 'oldest';
  onSortChange: (sort: 'smart' | 'newest' | 'oldest') => void;
  activeView: ActiveView;
  searchRef?: React.RefObject<HTMLInputElement | null>;
}

export const ArticleList: React.FC<Props> = ({
  articles,
  selectedArticleId,
  onSelectArticle,
  onToggleStar,
  onToggleRead,
  onMarkAllRead,
  search,
  onSearchChange,
  filterUnreadOnly,
  onToggleFilterUnread,
  sort,
  onSortChange,
  activeView,
  searchRef
}) => {
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Scroll active item into view when navigating via j/k
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedArticleId]);

  function getViewTitle(): string {
    switch (activeView.type) {
      case 'all': return 'همه اخبار';
      case 'starred': return 'اخبار ستاره‌دار';
      case 'highlights': return 'هایلایت‌ها و یادداشت‌ها';
      case 'folder': return activeView.folderName;
      case 'feed': return activeView.feedTitle;
      default: return 'اخبار';
    }
  }

  function getRelativeTime(dateStr: string): string {
    try {
      const pub = new Date(dateStr).getTime();
      const diff = Math.max(0, Date.now() - pub);
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 5) return 'چند لحظه پیش';
      if (minutes < 60) return `${minutes} دقیقه پیش`;
      if (hours < 24) return `${hours} ساعت پیش`;
      if (days < 30) return `${days} روز پیش`;
      return new Date(dateStr).toLocaleDateString('fa-IR');
    } catch {
      return '';
    }
  }

  return (
    <div className="w-full md:w-96 lg:w-[420px] h-full flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200/80 dark:border-zinc-800 shrink-0">
      {/* List Header & Controls */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {getViewTitle()}
          </h2>
          <button
            onClick={onMarkAllRead}
            title="علامت‌گذاری همه به عنوان خوانده‌شده"
            className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>خواندن همه</span>
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-zinc-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="جستجو در مقالات... (/)"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pr-8 pl-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/80 rounded-lg text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        {/* Filter and Sorting Options */}
        <div className="flex items-center justify-between gap-1 pt-1 text-xs">
          {/* Sort Selector */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
            <button
              onClick={() => onSortChange('smart')}
              title="مرتب‌سازی بر اساس مهم‌ترین‌ها و سلایق شما"
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                sort === 'smart'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-500" />
              <span>مهم‌ترین‌ها</span>
            </button>
            <button
              onClick={() => onSortChange('newest')}
              title="جدیدترین اخبار به ترتیب زمان"
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                sort === 'newest'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              جدیدترین
            </button>
            <button
              onClick={() => onSortChange('oldest')}
              title="قدیمی‌ترین اخبار"
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                sort === 'oldest'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              قدیمی‌ترین
            </button>
          </div>

          {/* Unread Only Filter Toggle */}
          <button
            onClick={onToggleFilterUnread}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
              filterUnreadOnly
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60'
                : 'text-zinc-500 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            فقط خوانده‌نشده
          </button>
        </div>
      </div>

      {/* Articles List Stream */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {articles.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            هیچ مقاله‌ای یافت نشد.
          </div>
        ) : (
          articles.map(art => {
            const isSelected = art.id === selectedArticleId;
            const isRead = art.is_read === 1;
            const isStarred = art.is_starred === 1;

            return (
              <div
                key={art.id}
                ref={isSelected ? selectedItemRef : null}
                onClick={() => onSelectArticle(art.id)}
                className={`p-3.5 cursor-pointer transition-all relative group ${
                  isSelected
                    ? 'bg-blue-50/60 dark:bg-blue-950/20 border-r-3 border-blue-600 dark:border-blue-400'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                } ${isRead ? 'opacity-70 hover:opacity-100' : ''}`}
              >
                {/* Meta Row: Source + Time + Unread indicator */}
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                  <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                    {!isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                    )}
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                      {art.feed_title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span>{getRelativeTime(art.published_at)}</span>
                    {/* Star quick button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onToggleStar(art.id, isStarred);
                      }}
                      className="p-0.5 text-zinc-300 hover:text-amber-500 transition-colors"
                    >
                      <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-500 text-amber-500' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className={`text-xs md:text-sm leading-snug line-clamp-2 ${
                  isRead ? 'font-normal text-zinc-600 dark:text-zinc-400' : 'font-bold text-zinc-900 dark:text-zinc-100'
                }`}>
                  {art.title}
                </h3>

                {/* Excerpt */}
                {art.summary && (
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {art.summary.replace(/<[^>]*>?/gm, '')}
                  </p>
                )}

                {/* Bottom Tags / Badges */}
                <div className="mt-2.5 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2">
                    {/* Importance badge */}
                    <span
                      title="امتیاز اهمیت Lenz"
                      className="flex items-center gap-0.5 font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md"
                    >
                      <Flame className="w-3 h-3 text-amber-500" />
                      {Math.round(art.importance_score)}
                    </span>

                    {/* Highlights indicator if any */}
                    {art.highlight_count && art.highlight_count > 0 ? (
                      <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
                        <Highlighter className="w-3 h-3" />
                        {art.highlight_count}
                      </span>
                    ) : null}
                  </div>

                  <span className="text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {art.reading_time_minutes} دقیقه
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
