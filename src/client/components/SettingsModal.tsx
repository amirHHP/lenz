import React, { useState, useEffect } from 'react';
import { X, Settings, Sparkles, Key, Check, Moon, Sun, Send, User as UserIcon, LogOut, LogIn, Lock, Edit3, AlertCircle, CheckCircle2 } from 'lucide-react';
import { User } from '../types';
import { updateProfileApi } from '../api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenTelegram?: () => void;
  currentUser?: User | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onUpdateUser?: (user: User) => void;
}

export const SettingsModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  isDark, 
  onToggleTheme, 
  onOpenTelegram,
  currentUser,
  onOpenAuth,
  onLogout,
  onUpdateUser
}) => {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then(r => r.json())
        .then(data => {
          setHasKey(data.hasGeminiKey ?? data.geminiApiKeySet ?? false);
          setMaskedKey(data.maskedApiKey || null);
        })
        .catch(console.error);

      if (currentUser) {
        setDisplayName(currentUser.displayName || '');
      }
      setIsEditingProfile(false);
      setProfileError(null);
      setProfileSuccess(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, currentUser]);

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
        setHasKey(Boolean(apiKey.trim()));
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!displayName.trim() || displayName.trim().length < 2) {
      setProfileError('نام نمایشی باید حداقل ۲ کاراکتر باشد.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 4) {
        setProfileError('رمز عبور جدید باید حداقل ۴ کاراکتر باشد.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setProfileError('رمز عبور جدید و تکرار آن یکسان نیستند.');
        return;
      }
      if (!currentPassword) {
        setProfileError('برای تغییر رمز عبور، وارد کردن رمز عبور فعلی الزامی است.');
        return;
      }
    }

    setProfileSaving(true);
    try {
      const updatedUser = await updateProfileApi({
        displayName: displayName.trim(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined
      });

      if (onUpdateUser && updatedUser) {
        onUpdateUser(updatedUser);
      }
      setProfileSuccess('مشخصات حساب کاربری با موفقیت به‌روزرسانی شد.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsEditingProfile(false);
        setProfileSuccess(null);
      }, 1500);
    } catch (err: any) {
      setProfileError(err.message || 'خطا در ذخیره مشخصات حساب');
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150" dir="rtl">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-lg">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2>تنظیمات لنز</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {/* User Account Section */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <UserIcon className="w-4 h-4" />
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">حساب کاربری</p>
              </div>
              {currentUser && onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>خروج از حساب</span>
                </button>
              )}
            </div>

            {currentUser ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {currentUser.displayName ? currentUser.displayName.slice(0, 1) : 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {currentUser.displayName}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400" dir="ltr">
                        @{currentUser.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg border border-blue-200/60 dark:border-blue-800/50 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditingProfile ? 'بستن فرم' : 'ویرایش مشخصات'}</span>
                    </button>
                    {onOpenAuth && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAuth();
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors"
                      >
                        تغییر حساب
                      </button>
                    )}
                  </div>
                </div>

                {/* Profile Edit Form */}
                {isEditingProfile && (
                  <form onSubmit={handleSaveProfile} className="mt-3 pt-3 border-t border-zinc-200/80 dark:border-zinc-700/80 space-y-3">
                    {profileError && (
                      <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 rounded-lg text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{profileError}</span>
                      </div>
                    )}
                    {profileSuccess && (
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-lg text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{profileSuccess}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        نام نمایشی
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="نام شما در لنز"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50">
                      <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                        تغییر رمز عبور (در صورت نیاز اختیاری)
                      </p>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-[11px] text-zinc-600 dark:text-zinc-400 mb-1">
                            رمز عبور فعلی
                          </label>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            placeholder="رمز فعلی"
                            dir="ltr"
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 text-left"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-zinc-600 dark:text-zinc-400 mb-1">
                            رمز عبور جدید
                          </label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="حداقل ۴ کاراکتر"
                            dir="ltr"
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 text-left"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-zinc-600 dark:text-zinc-400 mb-1">
                            تکرار رمز عبور جدید
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="تکرار رمز جدید"
                            dir="ltr"
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 text-left"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {profileSaving ? (
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>ذخیره تغییرات</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  در حال استفاده به عنوان مهمان هستید. برای ذخیره دائمی فیدها و سلایق خود وارد شوید.
                </p>
                {onOpenAuth && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuth();
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>ورود / ثبت‌نام</span>
                  </button>
                )}
              </div>
            )}
          </div>

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

          {/* Telegram Settings Entry */}
          <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
            <div>
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-semibold text-sm">
                <Send className="w-4 h-4" />
                <p className="text-zinc-800 dark:text-zinc-200">اتصال به تلگرام و زمان‌بندی خلاصه اخبار</p>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                دریافت منظم چکیده اخبار گروه‌های منتخب طبق ساعات دلخواه در تلگرام
              </p>
            </div>
            {onOpenTelegram && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTelegram();
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors shrink-0"
              >
                تنظیمات تلگرام
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
