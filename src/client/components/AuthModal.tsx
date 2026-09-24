import React, { useState } from 'react';
import { X, LogIn, UserPlus, Shield, User, Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { loginApi, registerApi } from '../api';
import { User as UserType } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserType) => void;
  onContinueAsGuest?: () => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  onContinueAsGuest
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form fields
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regDisplayName, setRegDisplayName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) {
      setError('لطفاً نام کاربری و رمز عبور را وارد کنید.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await loginApi(loginUsername.trim(), loginPassword);
      setSuccessMsg('با موفقیت وارد شدید!');
      setTimeout(() => {
        onAuthSuccess(res.user);
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'خطا در ورود به حساب کاربری');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regDisplayName.trim()) {
      setError('نام نمایشی الزامی است.');
      return;
    }
    if (!regUsername.trim()) {
      setError('نام کاربری الزامی است.');
      return;
    }
    if (regPassword.length < 4) {
      setError('رمز عبور باید حداقل ۴ کاراکتر باشد.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('رمز عبور و تکرار آن یکسان نیستند.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await registerApi(regUsername.trim(), regPassword, regDisplayName.trim());
      setSuccessMsg('حساب کاربری با موفقیت ساخته شد!');
      setTimeout(() => {
        onAuthSuccess(res.user);
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'خطا در ساخت حساب کاربری');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" 
      dir="rtl"
    >
      <div 
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              L
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                حساب کاربری لنز
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                فیدها، علاقه‌مندی‌ها و سلایق هوش مصنوعی اختصاصی خود را داشته باشید
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-6 pt-2 bg-zinc-50/50 dark:bg-zinc-950/20">
          <button
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${
              tab === 'login'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>ورود به حساب</span>
          </button>
          <button
            onClick={() => { setTab('register'); setError(null); }}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${
              tab === 'register'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>ثبت‌نام حساب جدید</span>
          </button>
        </div>

        {/* Content & Forms */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  نام کاربری
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    placeholder="مثال: amir یا admin"
                    autoFocus
                    required
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                  <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  رمز عبور
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>ورود به حساب شخصی</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  نام و نام خانوادگی (نام نمایشی)
                </label>
                <input
                  type="text"
                  value={regDisplayName}
                  onChange={e => setRegDisplayName(e.target.value)}
                  placeholder="مثال: کیوان رضایی"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  نام کاربری (انگلیسی، بدون فاصله)
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value)}
                  placeholder="مثال: keyvan_r"
                  required
                  dir="ltr"
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  رمز عبور
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="حداقل ۴ کاراکتر"
                  required
                  dir="ltr"
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  تکرار رمز عبور
                </label>
                <input
                  type="password"
                  value={regConfirmPassword}
                  onChange={e => setRegConfirmPassword(e.target.value)}
                  placeholder="تکرار رمز عبور"
                  required
                  dir="ltr"
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 text-left"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>ساخت حساب و شروع</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Continue as guest option */}
          {onContinueAsGuest && (
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 text-center">
              <button
                onClick={() => {
                  onContinueAsGuest();
                  onClose();
                }}
                className="text-xs text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1.5"
              >
                <span>ادامه بدون ورود (به عنوان کاربر مهمان)</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
