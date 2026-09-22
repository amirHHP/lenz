import React, { useState } from 'react';
import { X, FolderPlus, Folder } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onFolderCreated: () => void;
}

export const FolderModal: React.FC<Props> = ({ isOpen, onClose, onFolderCreated }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      if (res.ok) {
        setName('');
        onFolderCreated();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">ایجاد پوشه جدید</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              نام پوشه (مثلاً اخبار سیاسی، طراحی، هوش مصنوعی)
            </label>
            <input
              type="text"
              placeholder="نام پوشه..."
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'در حال ساخت...' : 'ایجاد پوشه'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
