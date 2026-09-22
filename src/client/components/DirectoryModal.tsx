import React, { useState, useEffect } from 'react';
import { X, Globe, Check, Plus, Search, Sparkles, Folder as FolderIcon } from 'lucide-react';
import { DirectoryFeed, Folder } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  onSubscribed: () => void;
}

export const DirectoryModal: React.FC<Props> = ({ isOpen, onClose, folders, onSubscribed }) => {
  const [directory, setDirectory] = useState<DirectoryFeed[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/directory')
        .then(r => r.json())
        .then(data => setDirectory(data.directory || []))
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ['all', ...Array.from(new Set(directory.map(d => d.category)))];

  const filtered = directory.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  async function handleSubscribe(item: DirectoryFeed) {
    setSubscribingId(item.id);
    try {
      const res = await fetch('/api/directory/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directoryId: item.id })
      });
      if (res.ok) {
        setDirectory(prev => prev.map(d => d.id === item.id ? { ...d, isSubscribed: true } : d));
        onSubscribed();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubscribingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[85vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">دایرکتوری وب‌سایت‌های برتر</h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              مهم‌ترین منابع فناوری، هوش مصنوعی، اخبار جهان و طراحی را با یک کلیک سابسکرایب کنید
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Tabs */}
        <div className="p-6 py-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {cat === 'all' ? 'همه دسته‌ها' : cat}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="جستجو در منابع..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(item => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${new URL(item.siteUrl).hostname}&sz=32`}
                      alt={item.title}
                      className="w-6 h-6 rounded-md shrink-0 bg-white"
                      onError={e => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.title}</h3>
                      <span className="text-[11px] text-zinc-400">{new URL(item.siteUrl).hostname}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900/40">
                    {item.category}
                  </span>
                </div>
                <p className="mt-2.5 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-200/50 dark:border-zinc-800 flex items-center justify-between">
                <a
                  href={item.siteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2"
                >
                  مشاهده وب‌سایت
                </a>

                {item.isSubscribed ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                    <Check className="w-3.5 h-3.5" /> سابسکرایب شده
                  </span>
                ) : (
                  <button
                    onClick={() => handleSubscribe(item)}
                    disabled={subscribingId === item.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white rounded-lg transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {subscribingId === item.id ? 'در حال ثبت...' : 'سابسکرایب'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
