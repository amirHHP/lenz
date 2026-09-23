import React, { useState, useEffect } from 'react';
import { X, Globe, Check, Plus, Search, Sparkles, Folder as FolderIcon, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { DirectoryFeed, Folder } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  onSubscribed: () => void;
}

function safeDomain(urlStr?: string): string {
  if (!urlStr) return '';
  try {
    const formatted = urlStr.startsWith('http://') || urlStr.startsWith('https://') ? urlStr : `https://${urlStr}`;
    return new URL(formatted).hostname;
  } catch {
    return '';
  }
}

export const DirectoryModal: React.FC<Props> = ({ isOpen, onClose, folders, onSubscribed }) => {
  const [directory, setDirectory] = useState<DirectoryFeed[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      fetch('/api/directory')
        .then(r => r.json())
        .then(data => setDirectory(data.directory || []))
        .catch(err => {
          console.error(err);
          setError('خطا در دریافت فهرست وب‌سایت‌های برتر');
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ['all', ...Array.from(new Set(directory.map(d => d.category)))];

  const query = search.trim().toLowerCase();
  const filtered = directory.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = !query || 
      item.title.toLowerCase().includes(query) || 
      item.description.toLowerCase().includes(query) ||
      item.siteUrl.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);
    return matchesCat && matchesSearch;
  });

  async function handleSubscribe(item: DirectoryFeed) {
    setSubscribingId(item.id);
    setError(null);
    try {
      const res = await fetch('/api/directory/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directoryId: item.id })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDirectory(prev => prev.map(d => d.id === item.id ? { ...d, isSubscribed: true } : d));
        if (data.alreadySubscribed) {
          setSuccessMessage(`«${item.title}» قبلاً به فهرست فیدهای شما افزوده شده است`);
        } else {
          setSuccessMessage(`«${item.title}» با موفقیت به پوشه «${item.category}» افزوده شد`);
        }
        setTimeout(() => setSuccessMessage(null), 3500);
        onSubscribed();
      } else {
        setError(data.error || 'خطا در سابسکرایب فید');
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'خطا در ارتباط با سرور');
    } finally {
      setSubscribingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">دایرکتوری وب‌سایت‌های برتر</h2>
              <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full">
                {directory.length} منبع در {categories.length - 1} دسته‌بندی
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              منابع برتر فناوری، هوش مصنوعی، برنامه‌نویسی، اخبار، اقتصاد، دانش، دیزاین و سرگرمی را با یک کلیک سابسکرایب کنید
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="mx-6 mt-3 p-3 text-xs bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-3 p-3 text-xs bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search & Category Tabs */}
        <div className="p-6 py-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="جستجو در نام و توضیحات..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div className="text-xs text-zinc-400 self-end sm:self-center">
              نمایش {filtered.length} وب‌سایت
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 scrollbar-thin">
            {categories.map(cat => {
              const count = cat === 'all' ? directory.length : directory.filter(d => d.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  <span>{cat === 'all' ? 'همه دسته‌ها' : cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-blue-700/70 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-zinc-400 text-xs">
              منبعی با عنوان یا دسته مورد نظر یافت نشد.
            </div>
          ) : (
            filtered.map(item => {
              const domain = safeDomain(item.siteUrl);
              const isSubscribing = subscribingId === item.id;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : '/favicon.ico'}
                          alt={item.title}
                          className="w-6 h-6 rounded-md shrink-0 bg-white"
                          onError={e => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.title}</h3>
                            {item.isPopular && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-sm">
                                <Sparkles className="w-2.5 h-2.5" /> برتر
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-400">{domain || item.siteUrl}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900/40 shrink-0">
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
                        disabled={isSubscribing}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white rounded-lg transition-colors shadow-xs disabled:opacity-50"
                      >
                        {isSubscribing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>در حال ثبت...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>سابسکرایب</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
