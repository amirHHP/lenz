import React, { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  Star, 
  Highlighter, 
  Folder as FolderIcon, 
  FolderPlus, 
  Rss, 
  Globe, 
  Settings, 
  Keyboard, 
  RefreshCw, 
  ChevronDown, 
  ChevronLeft, 
  Brain,
  Plus,
  Trash2,
  Send,
  LogIn,
  LogOut,
  Users
} from 'lucide-react';
import { Folder, Feed, ActiveView, User } from '../types';

interface Props {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  folders: Folder[];
  feeds: Feed[];
  unreadTotal: number;
  starredTotal: number;
  highlightsTotal: number;
  onRefreshAll: () => void;
  isRefreshing: boolean;
  onOpenDirectory: () => void;
  onOpenAddFeed: () => void;
  onOpenNewFolder: () => void;
  onOpenTasteProfile: () => void;
  onOpenShortcuts: () => void;
  onOpenSettings: () => void;
  onOpenTelegram?: () => void;
  onDeleteFeed: (feedId: number) => void;
  onUpdateFeed?: (feedId: number, folderId: number | null, title?: string) => void;
  onDeleteFolder?: (folderId: number) => void;
  currentUser?: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

function safeDomain(urlStr: string): string {
  try {
    const formatted = urlStr.startsWith('http://') || urlStr.startsWith('https://') ? urlStr : `https://${urlStr}`;
    return new URL(formatted).hostname;
  } catch {
    return '';
  }
}

export const Sidebar: React.FC<Props> = ({
  activeView,
  onSelectView,
  folders,
  feeds,
  unreadTotal,
  starredTotal,
  highlightsTotal,
  onRefreshAll,
  isRefreshing,
  onOpenDirectory,
  onOpenAddFeed,
  onOpenNewFolder,
  onOpenTasteProfile,
  onOpenShortcuts,
  onOpenSettings,
  onOpenTelegram,
  onDeleteFeed,
  onUpdateFeed,
  onDeleteFolder,
  currentUser,
  onOpenAuth,
  onLogout
}) => {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<number, boolean>>({});

  function toggleFolder(id: number) {
    setCollapsedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <aside className="w-64 h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 border-l border-zinc-200/80 dark:border-zinc-800 shrink-0 select-none">
      {/* Brand & Sync Header */}
      <div className="p-4 border-b border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            L
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>لنز</span>
              <span className="text-[10px] font-normal text-zinc-400">Lenz</span>
            </h1>
            <p className="text-[10px] text-zinc-400">فیدخوان هوشمند و مینیمال</p>
          </div>
        </div>

        <button
          onClick={onRefreshAll}
          disabled={isRefreshing}
          title="به‌روزرسانی همه فیدها"
          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
        </button>
      </div>

      {/* User Account Bar */}
      <div className="px-3 py-2 border-b border-zinc-200/50 dark:border-zinc-800/60 bg-zinc-100/50 dark:bg-zinc-900/40">
        {currentUser ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {currentUser.displayName ? currentUser.displayName.slice(0, 1) : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {currentUser.displayName}
                </p>
                <p className="text-[10px] text-zinc-400 truncate" dir="ltr">
                  @{currentUser.username}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onOpenAuth}
                title="تغییر حساب کاربری"
                className="p-1 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onLogout}
                title="خروج از حساب"
                className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-between px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold transition-all border border-blue-200/60 dark:border-blue-800/50"
          >
            <div className="flex items-center gap-2">
              <LogIn className="w-3.5 h-3.5" />
              <span>ورود / ساخت حساب شخصی</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </button>
        )}
      </div>

      {/* Main Navigation Items */}
      <div className="p-3 space-y-1">
        {/* Today's AI Briefing */}
        <button
          onClick={() => onSelectView({ type: 'briefing' })}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeView.type === 'briefing'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className={`w-4 h-4 ${activeView.type === 'briefing' ? 'text-amber-300' : 'text-amber-500'}`} />
            <span>امروز چه خبر؟</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            activeView.type === 'briefing' ? 'bg-blue-500 text-white' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold'
          }`}>
            AI
          </span>
        </button>

        {/* All Articles */}
        <button
          onClick={() => onSelectView({ type: 'all' })}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            activeView.type === 'all'
              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-zinc-500" />
            <span>همه اخبار</span>
          </div>
          {unreadTotal > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full font-bold">
              {unreadTotal}
            </span>
          )}
        </button>

        {/* Starred */}
        <button
          onClick={() => onSelectView({ type: 'starred' })}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            activeView.type === 'starred'
              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>ستاره‌دارها</span>
          </div>
          {starredTotal > 0 && (
            <span className="text-[10px] text-zinc-400 font-semibold">{starredTotal}</span>
          )}
        </button>

        {/* Highlights */}
        <button
          onClick={() => onSelectView({ type: 'highlights' })}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            activeView.type === 'highlights'
              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Highlighter className="w-4 h-4 text-emerald-500" />
            <span>هایلایت‌ها و یادداشت‌ها</span>
          </div>
          {highlightsTotal > 0 && (
            <span className="text-[10px] text-zinc-400 font-semibold">{highlightsTotal}</span>
          )}
        </button>
      </div>

      {/* Folders & Feeds Section */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        <div className="flex items-center justify-between px-2 pt-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
          <span>دسته‌بندی‌ها و فیدها</span>
          <button
            onClick={onOpenNewFolder}
            title="افزودن پوشه جدید"
            className="p-1 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Folders List */}
        <div className="space-y-1">
          {folders.map(folder => {
            const folderFeeds = feeds.filter(f => f.folder_id === folder.id);
            const isCollapsed = collapsedFolders[folder.id];
            const isFolderActive = activeView.type === 'folder' && activeView.folderId === folder.id;

            return (
              <div key={folder.id} className="space-y-0.5">
                <div
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition-colors group ${
                    isFolderActive
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <button
                    onClick={() => onSelectView({ type: 'folder', folderId: folder.id, folderName: folder.name })}
                    className="flex items-center gap-2 truncate flex-1 text-right"
                  >
                    <FolderIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {(folder.unread_count || 0) > 0 && (
                      <span className="text-[10px] text-zinc-400 font-bold">
                        {folder.unread_count}
                      </span>
                    )}
                    {onDeleteFolder && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteFolder(folder.id);
                        }}
                        title="حذف پوشه"
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-rose-500 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => toggleFolder(folder.id)}
                      className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      {isCollapsed ? (
                        <ChevronLeft className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Sub-feeds inside folder */}
                {!isCollapsed && folderFeeds.length > 0 && (
                  <div className="pr-4 space-y-0.5 border-r border-zinc-200/80 dark:border-zinc-800 mr-2">
                    {folderFeeds.map(feed => {
                      const isFeedActive = activeView.type === 'feed' && activeView.feedId === feed.id;
                      const domain = safeDomain(feed.site_url || feed.url);
                      return (
                        <div
                          key={feed.id}
                          className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition-colors group ${
                            isFeedActive
                              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold'
                              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/30 dark:hover:bg-zinc-800/30'
                          }`}
                        >
                          <button
                            onClick={() => onSelectView({ type: 'feed', feedId: feed.id, feedTitle: feed.title })}
                            className="flex items-center gap-1.5 truncate flex-1 text-right"
                          >
                            <img
                              src={feed.icon_url || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : '')}
                              alt=""
                              className="w-3.5 h-3.5 rounded-xs shrink-0"
                              onError={e => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span className="truncate">{feed.title}</span>
                          </button>

                          <div className="flex items-center gap-1">
                            {onUpdateFeed && (
                              <select
                                value={feed.folder_id || ''}
                                onChange={e => {
                                  e.stopPropagation();
                                  onUpdateFeed(feed.id, e.target.value ? Number(e.target.value) : null);
                                }}
                                title="تغییر پوشه"
                                className="opacity-0 group-hover:opacity-100 text-[9px] bg-zinc-100 dark:bg-zinc-800 rounded px-1 py-0.5 border border-zinc-200 dark:border-zinc-700 text-zinc-500 transition-opacity"
                              >
                                <option value="">(بدون پوشه)</option>
                                {folders.map(f => (
                                  <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                              </select>
                            )}
                            {(feed.unread_count || 0) > 0 && (
                              <span className="text-[10px] text-zinc-400">{feed.unread_count}</span>
                            )}
                            <button
                              onClick={() => onDeleteFeed(feed.id)}
                              title="حذف فید"
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-rose-500 transition-opacity"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Uncategorized Feeds */}
          {feeds.filter(f => !f.folder_id).map(feed => {
            const isFeedActive = activeView.type === 'feed' && activeView.feedId === feed.id;
            const domain = safeDomain(feed.site_url || feed.url);
            return (
              <div
                key={feed.id}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors group ${
                  isFeedActive
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40'
                }`}
              >
                <button
                  onClick={() => onSelectView({ type: 'feed', feedId: feed.id, feedTitle: feed.title })}
                  className="flex items-center gap-2 truncate flex-1 text-right"
                >
                  <img
                    src={feed.icon_url || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : '')}
                    alt=""
                    className="w-3.5 h-3.5 rounded-xs shrink-0"
                    onError={e => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="truncate">{feed.title}</span>
                </button>

                <div className="flex items-center gap-1">
                  {onUpdateFeed && (
                    <select
                      value=""
                      onChange={e => {
                        e.stopPropagation();
                        onUpdateFeed(feed.id, e.target.value ? Number(e.target.value) : null);
                      }}
                      title="انتقال به پوشه"
                      className="opacity-0 group-hover:opacity-100 text-[9px] bg-zinc-100 dark:bg-zinc-800 rounded px-1 py-0.5 border border-zinc-200 dark:border-zinc-700 text-zinc-500 transition-opacity"
                    >
                      <option value="">پوشه‌بندی...</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  )}
                  {(feed.unread_count || 0) > 0 && (
                    <span className="text-[10px] text-zinc-400">{feed.unread_count}</span>
                  )}
                  <button
                    onClick={() => onDeleteFeed(feed.id)}
                    title="حذف فید"
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-rose-500 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Utility Actions */}
      <div className="p-3 border-t border-zinc-200/60 dark:border-zinc-800/80 space-y-1">
        {/* Curated Directory */}
        <button
          onClick={onOpenDirectory}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>دایرکتوری سایت‌های برتر</span>
        </button>

        {/* Add custom feed */}
        <button
          onClick={onOpenAddFeed}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>افزودن فید دلخواه (RSS)</span>
        </button>

        {/* AI & Taste Profile */}
        <button
          onClick={onOpenTasteProfile}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
        >
          <Brain className="w-3.5 h-3.5 text-indigo-500" />
          <span>سلایق یادگرفته‌شده (AI)</span>
        </button>

        {/* Telegram Digest Integration */}
        {onOpenTelegram && (
          <button
            onClick={onOpenTelegram}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-sky-600 dark:text-sky-400 font-semibold hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>اتصال به تلگرام و خلاصه</span>
          </button>
        )}

        <div className="flex items-center justify-between pt-1 text-zinc-400">
          <button
            onClick={onOpenShortcuts}
            title="کلیدهای میان‌بر (?)"
            className="p-1.5 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg transition-colors"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSettings}
            title="تنظیمات و کلید Gemini"
            className="p-1.5 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
