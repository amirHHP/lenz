import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, ChevronLeft, ArrowUpRight, Flame, Layers, CheckCircle2 } from 'lucide-react';
import { TodayBriefingData } from '../types';

interface Props {
  onSelectArticle: (articleId: number) => void;
}

export const TodayBriefing: React.FC<Props> = ({ onSelectArticle }) => {
  const [briefing, setBriefing] = useState<TodayBriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBriefing();
  }, []);

  async function loadBriefing() {
    setLoading(true);
    try {
      const res = await fetch('/api/briefing/today');
      const data = await res.json();
      setBriefing(data.briefing);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/briefing/generate', { method: 'POST' });
      const data = await res.json();
      setBriefing(data.briefing);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Sparkles className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">در حال تولید خلاصه هوشمند امروز...</h3>
        <p className="text-xs text-zinc-400 mt-1">اخبار ۲۴ ساعت گذشته در حال تجمیع، دسته‌بندی و تحلیل هستند</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">امروز چه خبر؟</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            خلاصه هوشمند و گزیده مهم‌ترین رویدادهای روز — {briefing?.date}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'در حال تحلیل...' : 'به‌روزرسانی تحلیل'}
        </button>
      </div>

      {/* Executive Summary Box */}
      {briefing?.executiveSummary && (
        <div className="mt-8 p-5 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>چکیده کلیدی امروز</span>
          </div>
          <p className="text-sm md:text-base leading-relaxed text-zinc-800 dark:text-zinc-200 font-medium">
            {briefing.executiveSummary}
          </p>
        </div>
      )}

      {/* Key Highlights Bullets */}
      {briefing?.topHighlights && briefing.topHighlights.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>مهم‌ترین تیترها در یک نگاه:</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {briefing.topHighlights.map((hl, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl flex items-start gap-3 shadow-xs"
              >
                <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-xs md:text-sm text-zinc-700 dark:text-zinc-300 font-medium leading-normal">
                  {hl}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thematic Categories */}
      <div className="mt-10 space-y-6">
        <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          <span>دسته‌بندی موضوعی تحولات امروز:</span>
        </h2>

        {briefing?.categories.map((cat, idx) => (
          <div
            key={idx}
            className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-full border border-zinc-200 dark:border-zinc-700">
                {cat.category}
              </span>
            </div>

            <div>
              <h3 className="text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                {cat.headline}
              </h3>
              <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-300 mt-2 leading-relaxed">
                {cat.summary}
              </p>
            </div>

            {cat.whyItMatters && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-xs text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">چرا اهمیت دارد: </span>
                {cat.whyItMatters}
              </div>
            )}

            {/* Sub-articles links */}
            {cat.articles && cat.articles.length > 0 && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                <span className="text-[11px] font-semibold text-zinc-400">مقالات مرتبط در این حوزه:</span>
                <div className="space-y-1.5">
                  {cat.articles.map(art => (
                    <button
                      key={art.id}
                      onClick={() => onSelectArticle(art.id)}
                      className="w-full text-right flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors group"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                          {art.title}
                        </span>
                        <span className="text-[10px] text-zinc-400 shrink-0">({art.feedTitle})</span>
                      </div>
                      <ChevronLeft className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-500 shrink-0 transition-transform group-hover:-translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
