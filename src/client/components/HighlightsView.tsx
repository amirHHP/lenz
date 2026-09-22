import React, { useState, useEffect } from 'react';
import { Highlighter, Trash2, ChevronLeft, ExternalLink, Sparkles } from 'lucide-react';
import { Highlight } from '../types';

interface Props {
  onSelectArticle: (articleId: number) => void;
  onDeleteHighlight?: () => void;
}

export const HighlightsView: React.FC<Props> = ({ onSelectArticle, onDeleteHighlight }) => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHighlights();
  }, []);

  async function loadHighlights() {
    setLoading(true);
    try {
      const res = await fetch('/api/highlights');
      const data = await res.json();
      setHighlights(data.highlights || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await fetch(`/api/highlights/${id}`, { method: 'DELETE' });
      setHighlights(prev => prev.filter(h => h.id !== id));
      onDeleteHighlight?.();
    } catch (err) {
      console.error(err);
    }
  }

  const colorStyles: Record<string, string> = {
    yellow: 'border-r-4 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100',
    green: 'border-r-4 border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100',
    blue: 'border-r-4 border-blue-400 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100'
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Highlighter className="w-6 h-6 text-blue-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto">
      <div className="pb-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Highlighter className="w-5 h-5 text-amber-500" />
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">یادداشت‌ها و هایلایت‌های شما</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            مجموعاً {highlights.length} قطعه متن برجسته و نشانه‌گذاری شده
          </p>
        </div>
      </div>

      {highlights.length === 0 ? (
        <div className="mt-16 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <Highlighter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">هنوز هیچ متنی را هایلایت نکرده‌اید</h3>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            هنگام خواندن هر مقاله در ستون سمت راست، کافیست بخشی از متن را با ماوس انتخاب کرده و دکمه هایلایت یا کلید h را بزنید.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {highlights.map(h => (
            <div
              key={h.id}
              onClick={() => onSelectArticle(h.article_id)}
              className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-3">
                <blockquote className={`p-3 rounded-lg text-sm font-medium leading-relaxed flex-1 ${colorStyles[h.color] || colorStyles.yellow}`}>
                  «{h.text}»
                </blockquote>

                <button
                  onClick={e => handleDelete(h.id, e)}
                  title="حذف هایلایت"
                  className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {h.note && (
                <p className="mt-2.5 text-xs text-zinc-500 dark:text-zinc-400 pr-3">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">یادداشت: </span>
                  {h.note}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                <div className="flex items-center gap-1.5 truncate max-w-md">
                  <span className="font-semibold text-zinc-600 dark:text-zinc-300">{h.feed_title}</span>
                  <span>•</span>
                  <span className="truncate">{h.article_title}</span>
                </div>

                <div className="flex items-center gap-1 text-blue-500 font-medium group-hover:translate-x-[-2px] transition-transform">
                  <span>مطالعه مقاله</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
