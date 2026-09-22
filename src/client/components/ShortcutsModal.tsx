import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'j', label: 'رفتن به خبر بعدی و علامت به عنوان خوانده‌شده' },
    { key: 'k', label: 'رفتن به خبر قبلی' },
    { key: 's', label: 'ستاره‌دار کردن / برداشتن ستاره (علاقه‌مندی)' },
    { key: 'm', label: 'تغییر وضعیت خوانده‌شده / خوانده‌نشده' },
    { key: 'h', label: 'هایلایت کردن متن انتخاب‌شده در مقاله' },
    { key: 'z', label: 'ورود یا خروج از حالت زِن (مطالعه بدون حواس‌پرتی)' },
    { key: '/', label: 'جستجو در میان اخبار' },
    { key: 'Esc', label: 'بستن پنجره‌ها و خروج از حالت زِن' },
    { key: '?', label: 'نمایش همین راهنمای کلیدها' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">کلیدهای میان‌بر Lenz</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {shortcuts.map(sc => (
            <div key={sc.key} className="flex items-center justify-between py-1.5 border-b border-zinc-100/60 dark:border-zinc-800/60 last:border-0">
              <span className="text-sm text-zinc-600 dark:text-zinc-300">{sc.label}</span>
              <kbd className="px-2.5 py-1 text-xs font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-md border border-zinc-200 dark:border-zinc-700 shadow-xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-zinc-400">
            برای تجربه خواندن سریع بدون ماوس، از کلیدهای j و k استفاده کنید.
          </p>
        </div>
      </div>
    </div>
  );
};
