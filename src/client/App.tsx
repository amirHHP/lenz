import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ArticleList } from './components/ArticleList';
import { ArticleReader } from './components/ArticleReader';
import { TodayBriefing } from './components/TodayBriefing';
import { HighlightsView } from './components/HighlightsView';
import { DirectoryModal } from './components/DirectoryModal';
import { AddFeedModal } from './components/AddFeedModal';
import { FolderModal } from './components/FolderModal';
import { TasteProfileModal } from './components/TasteProfileModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { SettingsModal } from './components/SettingsModal';
import { TelegramModal } from './components/TelegramModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Article, Feed, Folder, ActiveView } from './types';

export const App: React.FC = () => {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // View state
  const [activeView, setActiveView] = useState<ActiveView>({ type: 'all' });
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [stats, setStats] = useState({ unread_total: 0, starred_total: 0, highlights_total: 0 });

  // Filters & Sorting (defaults to smart importance)
  const [sort, setSort] = useState<'smart' | 'newest' | 'oldest'>('smart');
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);

  // Modals state
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [isAddFeedOpen, setIsAddFeedOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isTasteProfileOpen, setIsTasteProfileOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch folders and feeds
  const loadSidebarData = useCallback(async () => {
    try {
      const [foldersRes, feedsRes] = await Promise.all([
        fetch('/api/folders').then(r => r.json()),
        fetch('/api/feeds').then(r => r.json())
      ]);
      setFolders(foldersRes.folders || []);
      setFeeds(feedsRes.feeds || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadSidebarData();
  }, [loadSidebarData]);

  // Fetch articles based on active view, sort, filters
  const loadArticles = useCallback(async () => {
    if (activeView.type === 'briefing' || activeView.type === 'highlights') {
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('sort', sort);
      if (filterUnreadOnly) params.append('isRead', 'false');
      if (search.trim()) params.append('search', search.trim());

      if (activeView.type === 'starred') {
        params.append('isStarred', 'true');
      } else if (activeView.type === 'folder') {
        params.append('folderId', activeView.folderId.toString());
      } else if (activeView.type === 'feed') {
        params.append('feedId', activeView.feedId.toString());
      }

      const res = await fetch(`/api/articles?${params.toString()}`);
      const data = await res.json();
      setArticles(data.articles || []);
      if (data.stats) {
        setStats(data.stats);
      }

      // Auto-select first article if none selected or if previous selected no longer in list
      if (data.articles && data.articles.length > 0) {
        setSelectedArticleId(prev => {
          if (!prev || !data.articles.some((a: Article) => a.id === prev)) {
            return data.articles[0].id;
          }
          return prev;
        });
      } else {
        setSelectedArticleId(null);
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeView, sort, filterUnreadOnly, search]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // Mark article as read when selected
  const handleSelectArticle = useCallback(async (articleId: number) => {
    setSelectedArticleId(articleId);

    // If currently in briefing or highlights view, switch to all view to show reader
    if (activeView.type === 'briefing' || activeView.type === 'highlights') {
      setActiveView({ type: 'all' });
    }

    try {
      await fetch(`/api/articles/${articleId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      });
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, is_read: 1 } : a));
      setStats(prev => ({ ...prev, unread_total: Math.max(0, prev.unread_total - 1) }));
      loadSidebarData();
    } catch (err) {
      console.error(err);
    }
  }, [activeView, loadSidebarData]);

  // Highlight callbacks
  const handleHighlightCreated = useCallback(() => {
    setStats(prev => ({ ...prev, highlights_total: prev.highlights_total + 1 }));
    if (selectedArticleId) {
      setArticles(prev => prev.map(a => a.id === selectedArticleId ? {
        ...a,
        highlight_count: (a.highlight_count || 0) + 1
      } : a));
    }
  }, [selectedArticleId]);

  const handleHighlightDeleted = useCallback(() => {
    setStats(prev => ({ ...prev, highlights_total: Math.max(0, prev.highlights_total - 1) }));
    loadArticles();
  }, [loadArticles]);

  // Update feed folder or title
  const handleUpdateFeed = useCallback(async (feedId: number, folderId: number | null, title?: string) => {
    try {
      await fetch(`/api/feeds/${feedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, title })
      });
      await Promise.all([loadSidebarData(), loadArticles()]);
    } catch (err) {
      console.error(err);
    }
  }, [loadSidebarData, loadArticles]);

  // Delete folder
  const handleDeleteFolder = useCallback(async (folderId: number) => {
    if (!confirm('آیا از حذف این پوشه اطمینان دارید؟ فیدهای داخل آن به بخش بدون پوشه منتقل می‌شوند.')) return;
    try {
      await fetch(`/api/folders/${folderId}`, { method: 'DELETE' });
      if (activeView.type === 'folder' && activeView.folderId === folderId) {
        setActiveView({ type: 'all' });
      }
      await Promise.all([loadSidebarData(), loadArticles()]);
    } catch (err) {
      console.error(err);
    }
  }, [activeView, loadSidebarData, loadArticles]);

  // Star toggle
  const handleToggleStar = useCallback(async (articleId: number, current: boolean) => {
    try {
      const newStatus = !current;
      await fetch(`/api/articles/${articleId}/star`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: newStatus })
      });
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, is_starred: newStatus ? 1 : 0 } : a));
      setStats(prev => ({
        ...prev,
        starred_total: newStatus ? prev.starred_total + 1 : Math.max(0, prev.starred_total - 1)
      }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Read toggle
  const handleToggleRead = useCallback(async (articleId: number, current: boolean) => {
    try {
      const newStatus = !current;
      await fetch(`/api/articles/${articleId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: newStatus })
      });
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, is_read: newStatus ? 1 : 0 } : a));
      setStats(prev => ({
        ...prev,
        unread_total: newStatus ? Math.max(0, prev.unread_total - 1) : prev.unread_total + 1
      }));
      loadSidebarData();
    } catch (err) {
      console.error(err);
    }
  }, [loadSidebarData]);

  // Mark all as read
  async function handleMarkAllRead() {
    try {
      const body: any = {};
      if (activeView.type === 'feed') body.feedId = activeView.feedId;
      if (activeView.type === 'folder') body.folderId = activeView.folderId;

      await fetch('/api/articles/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      setArticles(prev => prev.map(a => ({ ...a, is_read: 1 })));
      loadSidebarData();
      setStats(prev => ({ ...prev, unread_total: 0 }));
    } catch (err) {
      console.error(err);
    }
  }

  // Refresh all feeds
  async function handleRefreshAll() {
    setIsRefreshing(true);
    try {
      await fetch('/api/feeds/sync', { method: 'POST' });
      await Promise.all([loadSidebarData(), loadArticles()]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  }

  // Delete feed
  async function handleDeleteFeed(feedId: number) {
    if (!confirm('آیا از حذف این فید اطمینان دارید؟')) return;
    try {
      await fetch(`/api/feeds/${feedId}`, { method: 'DELETE' });
      if (activeView.type === 'feed' && activeView.feedId === feedId) {
        setActiveView({ type: 'all' });
      }
      await Promise.all([loadSidebarData(), loadArticles()]);
    } catch (err) {
      console.error(err);
    }
  }

  // Next article shortcut ('j')
  const handleNextArticle = useCallback(() => {
    if (articles.length === 0) return;
    if (!selectedArticleId) {
      handleSelectArticle(articles[0].id);
      return;
    }
    const currentIndex = articles.findIndex(a => a.id === selectedArticleId);
    if (currentIndex >= 0 && currentIndex < articles.length - 1) {
      handleSelectArticle(articles[currentIndex + 1].id);
    }
  }, [articles, selectedArticleId, handleSelectArticle]);

  // Previous article shortcut ('k')
  const handlePrevArticle = useCallback(() => {
    if (articles.length === 0) return;
    if (!selectedArticleId) {
      handleSelectArticle(articles[0].id);
      return;
    }
    const currentIndex = articles.findIndex(a => a.id === selectedArticleId);
    if (currentIndex > 0) {
      handleSelectArticle(articles[currentIndex - 1].id);
    }
  }, [articles, selectedArticleId, handleSelectArticle]);

  // Star current shortcut ('s')
  const handleStarCurrent = useCallback(() => {
    if (!selectedArticleId) return;
    const art = articles.find(a => a.id === selectedArticleId);
    if (art) {
      handleToggleStar(selectedArticleId, art.is_starred === 1);
    }
  }, [selectedArticleId, articles, handleToggleStar]);

  // Read current shortcut ('m')
  const handleReadCurrent = useCallback(() => {
    if (!selectedArticleId) return;
    const art = articles.find(a => a.id === selectedArticleId);
    if (art) {
      handleToggleRead(selectedArticleId, art.is_read === 1);
    }
  }, [selectedArticleId, articles, handleToggleRead]);

  // Search focus shortcut ('/')
  const handleSearchFocus = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  // Escape shortcut
  const handleEscape = useCallback(() => {
    setIsZenMode(false);
    setIsShortcutsOpen(false);
    setIsSettingsOpen(false);
    setIsDirectoryOpen(false);
    setIsAddFeedOpen(false);
    setIsNewFolderOpen(false);
    setIsTasteProfileOpen(false);
  }, []);

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    onNext: handleNextArticle,
    onPrev: handlePrevArticle,
    onStar: handleStarCurrent,
    onRead: handleReadCurrent,
    onZenToggle: () => setIsZenMode(prev => !prev),
    onSearchFocus: handleSearchFocus,
    onHelp: () => setIsShortcutsOpen(prev => !prev),
    onEscape: handleEscape
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-100 dark:bg-zinc-950 font-sans">
      {/* Left Sidebar (hidden in Zen mode) */}
      {!isZenMode && (
        <Sidebar
          activeView={activeView}
          onSelectView={setActiveView}
          folders={folders}
          feeds={feeds}
          unreadTotal={stats.unread_total}
          starredTotal={stats.starred_total}
          highlightsTotal={stats.highlights_total}
          onRefreshAll={handleRefreshAll}
          isRefreshing={isRefreshing}
          onOpenDirectory={() => setIsDirectoryOpen(true)}
          onOpenAddFeed={() => setIsAddFeedOpen(true)}
          onOpenNewFolder={() => setIsNewFolderOpen(true)}
          onOpenTasteProfile={() => setIsTasteProfileOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenTelegram={() => setIsTelegramOpen(true)}
          onDeleteFeed={handleDeleteFeed}
          onUpdateFeed={handleUpdateFeed}
          onDeleteFolder={handleDeleteFolder}
        />
      )}

      {/* Main Content Area */}
      {activeView.type === 'briefing' ? (
        <TodayBriefing onSelectArticle={handleSelectArticle} />
      ) : activeView.type === 'highlights' ? (
        <HighlightsView
          onSelectArticle={handleSelectArticle}
          onDeleteHighlight={handleHighlightDeleted}
        />
      ) : (
        <div className="flex-1 flex h-full overflow-hidden">
          {/* Middle Article List (hidden in Zen mode) */}
          {!isZenMode && (
            <ArticleList
              articles={articles}
              selectedArticleId={selectedArticleId}
              onSelectArticle={handleSelectArticle}
              onToggleStar={handleToggleStar}
              onToggleRead={handleToggleRead}
              onMarkAllRead={handleMarkAllRead}
              search={search}
              onSearchChange={setSearch}
              filterUnreadOnly={filterUnreadOnly}
              onToggleFilterUnread={() => setFilterUnreadOnly(prev => !prev)}
              sort={sort}
              onSortChange={setSort}
              activeView={activeView}
              searchRef={searchInputRef}
            />
          )}

          {/* Right Full Article Reader View */}
          <ArticleReader
            articleId={selectedArticleId}
            onNext={handleNextArticle}
            onPrev={handlePrevArticle}
            onToggleStar={handleToggleStar}
            onToggleRead={handleToggleRead}
            onHighlightCreated={handleHighlightCreated}
            isZenMode={isZenMode}
            onToggleZen={() => setIsZenMode(prev => !prev)}
          />
        </div>
      )}

      {/* Modals */}
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDark={isDark}
        onToggleTheme={() => setIsDark(prev => !prev)}
        onOpenTelegram={() => setIsTelegramOpen(true)}
      />
      <TelegramModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
      />
      <DirectoryModal
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
        folders={folders}
        onSubscribed={() => {
          loadSidebarData();
          loadArticles();
        }}
      />
      <AddFeedModal
        isOpen={isAddFeedOpen}
        onClose={() => setIsAddFeedOpen(false)}
        folders={folders}
        onFeedAdded={() => {
          loadSidebarData();
          loadArticles();
        }}
      />
      <FolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onFolderCreated={loadSidebarData}
      />
      <TasteProfileModal
        isOpen={isTasteProfileOpen}
        onClose={() => setIsTasteProfileOpen(false)}
      />
    </div>
  );
};
