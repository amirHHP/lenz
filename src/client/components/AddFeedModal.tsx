import React, { useState } from 'react';
import { X, Rss, Plus, Folder as FolderIcon, AlertCircle } from 'lucide-react';
import { Folder } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  onFeedAdded: () => void;
}

export const AddFeedModal: React.FC<Props> = ({ isOpen, onClose, folders, onFeedAdded }) => {
  const [url, setUrl] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          folderId: folderId ? Number(folderId) : null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ثبت فید');
      }

      setUrl('');
      onFeedAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت فید');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Rss className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">افزودن فید RSS دلخواه</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              آدرس RSS، Atom یا لینک وب‌سایت
            </label>
            <input
              type="text"
              placeholder="مثال: https://techcrunch.com/feed یا digiato.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-hidden focus:border-blue-500"
              dir="ltr"
            />
            <p className="text-[11px] text-zinc-400 mt-1">
              اگر فقط آدرس سایت را وارد کنید، لنز به صورت خودکار آدرس فید را پیدا می‌کند.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              دسته‌بندی / پوشه (اختیاری)
            </label>
            <div className="relative">
              <select
                value={folderId}
                onChange={e => setFolderId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:border-blue-500 appearance-none"
              >
                <option value="">بدون پوشه (مستقل)</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/40">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'در حال بررسی و افزودن...' : 'افزودن فید'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
