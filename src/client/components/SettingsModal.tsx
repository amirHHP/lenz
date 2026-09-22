import React, { useState, useEffect } from 'react';
import { X, Settings, Sparkles, Key, Check, Moon, Sun } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, isDark, onToggleTheme }) => {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then(r => r.json())
        .then(data => {
          setHasKey(data.hasGeminiKey);
          setMaskedKey(data.maskedApiKey);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: apiKey })
      });
      if (res.ok) {
        setSavedSuccess(true);
        setHasKey(!!apiKey.trim());
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">تنظیمات Lenz</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {/* Theme setting */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
            <div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">حالت نمایش (تم)</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">تغییر بین حالت تیره (Dark Mode) و روشن</p>
            </div>
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-500" />}
              {isDark ? 'حالت روشن' : 'حالت تیره'}
            </button>
          </div>

          {/* Gemini AI Key setting */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-3">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-4 h-4" />
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">کلید هوش مصنوعی Gemini</p>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              لنز بدون کلید هم با موتور هوشمند داخلی (NLP) کار می‌کند. اما برای تولید خلاصه‌های پیشرفته تحلیلی و دسته‌بندی با Gemini 3.8 Flash می‌توانید کلید اختصاصی گوگل خود را وارد کنید.
            </p>

            <form onSubmit={handleSaveKey} className="space-y-3 pt-1">
              <div className="relative">
                <input
                  type="password"
                  placeholder={hasKey && maskedKey ? `کلید فعلی: ${maskedKey}` : 'کلید هوش مصنوعی Gemini را اینجا وارد کنید (AIzaSy...)'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  {hasKey ? '✓ متصل به Gemini 3.8 Flash' : '• در حال استفاده از موتور خلاصه‌ساز داخلی'}
                </span>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
                  {savedSuccess ? 'ذخیره شد' : 'ثبت کلید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
