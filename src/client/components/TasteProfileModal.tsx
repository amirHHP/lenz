import React, { useState, useEffect } from 'react';
import { X, Sparkles, Brain, Star, Highlighter, BookOpen, TrendingUp } from 'lucide-react';
import { UserTasteProfile } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TasteProfileModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState<UserTasteProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/profile/taste')
        .then(r => r.json())
        .then(data => {
          setProfile(data.profile);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const topicsArray = profile?.topics
    ? Object.entries(profile.topics).sort((a, b) => b[1] - a[1]).slice(0, 12)
    : [];

  const maxWeight = topicsArray.length > 0 ? Math.max(...topicsArray.map(t => t[1])) : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">شناخت هوشمند سلایق شما (AI Profile)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-5">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            لنز با هر خبری که می‌خوانید، ستاره می‌دهید یا هایلایت می‌کنید، موضوعات مورد علاقه شما را به تدریج یاد می‌گیرد تا در مرتب‌سازی «مهم‌ترین‌ها»، خبرهای واقعاً مرتبط را در بالاترین اولویت قرار دهد.
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/50 dark:border-zinc-800 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                <Star className="w-4 h-4 fill-amber-500" />
              </div>
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {profile?.starredCount || 0}
              </span>
              <p className="text-[10px] text-zinc-400 mt-0.5">اخبار ستاره‌دار</p>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/50 dark:border-zinc-800 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
                <Highlighter className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {profile?.highlightCount || 0}
              </span>
              <p className="text-[10px] text-zinc-400 mt-0.5">بخش‌های هایلایت‌شده</p>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/50 dark:border-zinc-800 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {profile?.readCount || 0}
              </span>
              <p className="text-[10px] text-zinc-400 mt-0.5">اخبار مطالعه‌شده</p>
            </div>
          </div>

          {/* Learned Topics Bar Chart */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-3">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span>کلیدواژه‌ها و موضوعات برتر یادگرفته‌شده:</span>
            </div>

            {topicsArray.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">هنوز اطلاعات کافی ثبت نشده است. با ستاره‌دار کردن و هایلایت مقالات، این نمودار تکمیل می‌شود.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {topicsArray.map(([topic, weight]) => {
                  const percentage = Math.round((weight / maxWeight) * 100);
                  return (
                    <div key={topic} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{topic}</span>
                        <span className="text-[10px] text-zinc-400">{percentage}٪ تمایل</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
