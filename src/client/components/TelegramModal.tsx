import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Send, 
  Check, 
  Clock, 
  Bell, 
  AlertCircle, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Folder as FolderIcon,
  RefreshCw,
  Sliders,
  HelpCircle,
  Play
} from 'lucide-react';
import { TelegramStatusResponse, TelegramSubscription } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_TIMEZONES = [
  { value: 'Asia/Tehran', label: 'تهران (UTC+3:30)' },
  { value: 'Asia/Dubai', label: 'دبی (UTC+4:00)' },
  { value: 'Europe/Istanbul', label: 'استانبول (UTC+3:00)' },
  { value: 'Europe/London', label: 'لندن (UTC+0:00 / UTC+1:00)' },
  { value: 'Europe/Berlin', label: 'برلین / پاریس (UTC+1:00)' },
  { value: 'UTC', label: 'ساعت جهانی (UTC)' },
  { value: 'America/New_York', label: 'نیویورک (UTC-5:00)' },
  { value: 'America/Los_Angeles', label: 'لس‌آنجلس (UTC-8:00)' }
];

const PRESET_SCHEDULES = [
  { label: '۱ بار در روز (صبح)', times: ['09:00'] },
  { label: '۲ بار در روز (صبح و شب)', times: ['09:00', '21:00'] },
  { label: '۳ بار در روز (صبح، ظهر، شب)', times: ['08:00', '14:00', '21:00'] },
];

export const TelegramModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [detectingChat, setDetectingChat] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Status data from API
  const [statusData, setStatusData] = useState<TelegramStatusResponse | null>(null);

  // Bot Token state
  const [botToken, setBotToken] = useState('');
  const [isEditingToken, setIsEditingToken] = useState(false);
  const [savingToken, setSavingToken] = useState(false);

  // Form state for current subscription
  const [chatId, setChatId] = useState('');
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(['09:00', '21:00']);
  const [newTimeInput, setNewTimeInput] = useState('12:00');
  const [timezone, setTimezone] = useState('Asia/Tehran');
  const [selectedFolderIds, setSelectedFolderIds] = useState<number[] | 'all'>('all');
  const [isActive, setIsActive] = useState(true);
  const [editingSubId, setEditingSubId] = useState<number | null>(null);

  // Guide toggle
  const [showBotGuide, setShowBotGuide] = useState(false);

  function handleStartNewSubscription() {
    setEditingSubId(null);
    setChatId('');
    setScheduleTimes(['09:00', '21:00']);
    setSelectedFolderIds('all');
    setTimezone('Asia/Tehran');
    setIsActive(true);
    setFeedback(null);
  }

  async function handleDetectChat() {
    setDetectingChat(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/telegram/detect-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: botToken.trim() || undefined })
      });
      const data = await res.json();
      if (res.ok && data.ok && data.chatId) {
        setChatId(data.chatId);
        const nameDisplay = [data.firstName, data.username ? `@${data.username}` : null].filter(Boolean).join(' ');
        setFeedback({
          type: 'success',
          message: `شناسه چت (${data.chatId}${nameDisplay ? ` مربوط به ${nameDisplay}` : ''}) با موفقیت شناسایی و درج شد!`
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'پیامی در ربات یافت نشد. لطفاً در تلگرام دکمه Start ربات را بزنید و مجدداً امتحان کنید.'
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'خطا در برقراری ارتباط با سرور' });
    } finally {
      setDetectingChat(false);
    }
  }

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/telegram/status');
      const data: TelegramStatusResponse = await res.json();
      setStatusData(data);

      // Pre-fill form if existing active subscription
      if (data.subscriptions && data.subscriptions.length > 0) {
        const primary = data.subscriptions[0];
        setChatId(primary.chat_id);
        setScheduleTimes(primary.schedule_times || ['09:00', '21:00']);
        setTimezone(primary.timezone || 'Asia/Tehran');
        setSelectedFolderIds(primary.folder_ids);
        setIsActive(primary.is_active === 1);
        setEditingSubId(primary.id);
      }
    } catch (err: any) {
      console.error('Failed to load telegram status:', err);
      setFeedback({ type: 'error', message: 'خطا در بارگذاری تنظیمات تلگرام' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      setFeedback(null);
    }
  }, [isOpen, loadStatus]);

  if (!isOpen) return null;

  async function handleSaveBotToken(e: React.FormEvent) {
    e.preventDefault();
    setSavingToken(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/telegram/bot-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ 
          type: 'success', 
          message: data.botInfo?.ok 
            ? `توکن ذخیره شد! ربات: @${data.botInfo.username}` 
            : 'توکن با موفقیت ذخیره شد.' 
        });
        setIsEditingToken(false);
        setBotToken('');
        loadStatus();
      } else {
        setFeedback({ type: 'error', message: data.error || 'خطا در ثبت توکن' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'خطا در برقراری ارتباط' });
    } finally {
      setSavingToken(false);
    }
  }

  async function handleSaveSubscription(e: React.FormEvent) {
    e.preventDefault();
    if (!chatId.trim()) {
      setFeedback({ type: 'error', message: 'لطفاً شناسه چت (Chat ID) تلگرام را وارد کنید.' });
      return;
    }

    if (scheduleTimes.length === 0) {
      setFeedback({ type: 'error', message: 'حداقل یک ساعت برای ارسال در روز باید مشخص شود.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        chatId: chatId.trim(),
        scheduleTimes,
        timezone,
        folderIds: selectedFolderIds,
        isActive
      };

      const endpoint = editingSubId 
        ? `/api/telegram/subscriptions/${editingSubId}` 
        : '/api/telegram/subscriptions';
      const method = editingSubId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: 'تنظیمات اتصال و زمان‌بندی با موفقیت ذخیره شد.' });
        loadStatus();
      } else {
        setFeedback({ type: 'error', message: data.error || 'خطا در ذخیره اشتراک' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'خطا در ذخیره اطلاعات' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!chatId.trim()) {
      setFeedback({ type: 'error', message: 'لطفاً ابتدا شناسه چت را وارد کنید.' });
      return;
    }

    setTesting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chatId.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: 'پیام تست با موفقیت به تلگرام ارسال شد! لطفاً تلگرام خود را چک کنید.' });
      } else {
        setFeedback({ type: 'error', message: data.error || 'ارسال پیام تست با خطا مواجه شد.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'خطا در ارسال پیام تست' });
    } finally {
      setTesting(false);
    }
  }

  async function handleSendDigestNow() {
    setSendingNow(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/telegram/digest/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chatId.trim() || undefined,
          subscriptionId: editingSubId || undefined,
          folderIds: selectedFolderIds
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ 
          type: 'success', 
          message: `خلاصه اخبار (${data.articleCount} خبر از ${data.groupCount} گروه) با موفقیت به تلگرام ارسال شد!` 
        });
        loadStatus();
      } else {
        setFeedback({ type: 'error', message: data.error || 'ارسال خلاصه اخبار با خطا مواجه شد.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'خطا در ارسال خلاصه' });
    } finally {
      setSendingNow(false);
    }
  }

  async function handleDeleteSubscription(subId: number) {
    if (!confirm('آیا از حذف این اتصال تلگرام اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/telegram/subscriptions/${subId}`, { method: 'DELETE' });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'اتصال حذف شد.' });
        if (editingSubId === subId) {
          setEditingSubId(null);
          setChatId('');
        }
        loadStatus();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'خطا در حذف اشتراک' });
    }
  }

  function addScheduleTime(time: string) {
    if (!time || !time.trim()) return;
    const parts = time.trim().split(':').map(Number);
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return;
    const [h, m] = parts;
    if (h < 0 || h > 23 || m < 0 || m > 59) return;
    const normalized = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (scheduleTimes.includes(normalized)) return;
    const updated = [...scheduleTimes, normalized].sort();
    setScheduleTimes(updated);
  }

  function removeScheduleTime(time: string) {
    const updated = scheduleTimes.filter(t => t !== time);
    setScheduleTimes(updated);
  }

  function toggleFolder(folderId: number) {
    const allFolderIds = statusData?.folders.map(f => f.id) || [];
    if (selectedFolderIds === 'all') {
      setSelectedFolderIds(allFolderIds.filter(id => id !== folderId));
    } else {
      let next: number[];
      if (selectedFolderIds.includes(folderId)) {
        next = selectedFolderIds.filter(id => id !== folderId);
      } else {
        next = [...selectedFolderIds, folderId];
      }
      if (next.length === allFolderIds.length && allFolderIds.length > 0) {
        setSelectedFolderIds('all');
      } else {
        setSelectedFolderIds(next);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
              <Send className="w-4 h-4 ml-0.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">اتصال به تلگرام و خلاصه اخبار</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">ارسال خودکار و زمان‌بندی‌شده‌ی خلاصه اخبار گروه‌های منتخب به تلگرام</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className={`px-5 py-2.5 text-xs flex items-center justify-between border-b ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-400 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>در حال بارگذاری اطلاعات تلگرام...</span>
            </div>
          ) : (
            <>
              {/* 1. Telegram Bot Token Card */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-semibold text-sm">
                    <Send className="w-4 h-4" />
                    <span>ربات اختصاصی تلگرام (Bot Token)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBotGuide(prev => !prev)}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>راهنمای ساخت ربات</span>
                  </button>
                </div>

                {statusData?.botTokenConfigured && !isEditingToken ? (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {statusData.botInfo?.username ? `@${statusData.botInfo.username}` : 'ربات فعال است'}
                        </span>
                        {statusData.botInfo?.username && (
                          <a
                            href={`https://t.me/${statusData.botInfo.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-sky-600 hover:underline flex items-center gap-0.5"
                          >
                            <span>ورود به ربات</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        توکن: {statusData.maskedBotToken}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingToken(true)}
                      className="text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors"
                    >
                      تغییر توکن
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSaveBotToken} className="space-y-2">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      توکن ربات تلگرام خود را که از BotFather@ دریافت کرده‌اید وارد کنید:
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                        value={botToken}
                        onChange={e => setBotToken(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:border-sky-500"
                      />
                      <button
                        type="submit"
                        disabled={savingToken || !botToken.trim()}
                        className="px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1 shrink-0"
                      >
                        {savingToken ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>ثبت توکن</span>
                      </button>
                      {statusData?.botTokenConfigured && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingToken(false);
                            setBotToken('');
                          }}
                          className="px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg"
                        >
                          انصراف
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {/* Collapsible Guide */}
                {showBotGuide && (
                  <div className="p-3 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/50 rounded-lg text-xs space-y-1.5 text-zinc-700 dark:text-zinc-300">
                    <p className="font-semibold text-sky-800 dark:text-sky-300">راهنمای دریافت رایگان توکن در ۱ دقیقه:</p>
                    <ol className="list-decimal list-inside space-y-1 leading-relaxed text-zinc-600 dark:text-zinc-400">
                      <li>در پیام‌رسان تلگرام، شناسه <code className="bg-white dark:bg-zinc-800 px-1 py-0.5 rounded">@BotFather</code> را جستجو کنید.</li>
                      <li>دستور <code className="bg-white dark:bg-zinc-800 px-1 py-0.5 rounded">/newbot</code> را ارسال کنید و نام و آیدی ربات خود را انتخاب نمایید.</li>
                      <li>متن توکن (Token) که ربات ارسال می‌کند را کپی کرده و در کادر بالا قرار دهید.</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* 2. Main Subscription Settings Form */}
              <form onSubmit={handleSaveSubscription} className="space-y-6">
                
                {/* Chat ID Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <span>شناسه چت تلگرام (Chat ID)</span>
                      <span className="text-rose-500">*</span>
                      {editingSubId && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-normal">
                          در حال ویرایش اشتراک #{editingSubId}
                        </span>
                      )}
                    </label>
                    {editingSubId && (
                      <button
                        type="button"
                        onClick={handleStartNewSubscription}
                        className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ اتصال چت یا کانال جدید</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="مثال: 987654321 یا -100123456789"
                      value={chatId}
                      onChange={e => setChatId(e.target.value)}
                      className="flex-1 px-3.5 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={handleDetectChat}
                      disabled={detectingChat}
                      className="px-3.5 py-2 text-xs font-semibold bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                      title="شناسایی خودکار چت آیدی از پیام ارسالی شما به ربات"
                    >
                      {detectingChat ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>شناسایی خودکار</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testing || !chatId.trim()}
                      className="px-3.5 py-2 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                      title="ارسال پیام تست به این چت"
                    >
                      {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5 text-sky-500" />}
                      <span>تست اتصال</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    💡 <b>اتصال آسان بدون نیاز به کپی شناسه:</b> کافیست در تلگرام وارد ربات خود شوید و دکمه <b>Start</b> را بزنید، سپس روی دکمه «<b>شناسایی خودکار</b>» کلیک کنید تا حساب شما فوراً متصل گردد. (یا می‌توانید شناسه چت را دستی وارد کنید).
                  </p>
                </div>

                {/* Schedule & Times */}
                <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-sky-500" />
                      <span>زمان‌بندی ارسال (چند بار در روز چه ساعتی)</span>
                    </label>
                    <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                      {scheduleTimes.length} بار در روز
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SCHEDULES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setScheduleTimes(preset.times)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                          JSON.stringify(scheduleTimes) === JSON.stringify(preset.times)
                            ? 'bg-sky-600 border-sky-600 text-white font-medium'
                            : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Active Times Pills */}
                  <div className="pt-2">
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1.5">ساعت‌های انتخابی برای تحویل خلاصه:</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {scheduleTimes.map(time => (
                        <span
                          key={time}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold text-sky-600 dark:text-sky-400 shadow-2xs"
                        >
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>{time}</span>
                          <button
                            type="button"
                            onClick={() => removeScheduleTime(time)}
                            className="p-0.5 hover:text-rose-500 rounded text-zinc-400 transition-colors"
                            title="حذف این ساعت"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {/* Add Custom Time Input */}
                      <div className="inline-flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
                        <input
                          type="time"
                          value={newTimeInput}
                          onChange={e => setNewTimeInput(e.target.value)}
                          className="text-xs px-1.5 py-0.5 bg-transparent text-zinc-700 dark:text-zinc-300 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => addScheduleTime(newTimeInput)}
                          className="px-2 py-0.5 text-xs bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 hover:bg-sky-200 rounded font-medium transition-colors"
                        >
                          افزودن
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Timezone Selector */}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">منطقه زمانی:</span>
                    <select
                      value={timezone}
                      onChange={e => setTimezone(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-hidden"
                    >
                      {COMMON_TIMEZONES.map(tz => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Folder / Groups Selection */}
                <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <FolderIcon className="w-4 h-4 text-amber-500" />
                      <span>خلاصه اخبار کدام گروه‌ها ارسال شود؟</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedFolderIds === 'all') {
                          setSelectedFolderIds([]);
                        } else {
                          setSelectedFolderIds('all');
                        }
                      }}
                      className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium"
                    >
                      {selectedFolderIds === 'all' ? 'انتخاب دسته‌ای گروه‌ها' : 'انتخاب همه گروه‌ها'}
                    </button>
                  </div>

                  {selectedFolderIds === 'all' ? (
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>تمامی پوشه‌ها و گروه‌های خبری فعال در فیدخوان شما در خلاصه تلگرام گنجانده می‌شوند.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {statusData?.folders.map(folder => {
                        const isChecked = selectedFolderIds.includes(folder.id);
                        return (
                          <label
                            key={folder.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer select-none transition-colors ${
                              isChecked
                                ? 'bg-sky-50/60 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800'
                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleFolder(folder.id)}
                                className="rounded text-sky-600 focus:ring-sky-500"
                              />
                              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                {folder.name}
                              </span>
                            </div>
                            <span className="text-[11px] text-zinc-400">
                              {folder.feed_count} منبع
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Active Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                  <div>
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">ارسال خودکار طبق زمان‌بندی</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">در صورت غیرفعال بودن، خلاصه خودکار متوقف می‌شود.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={e => setIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-zinc-200 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleSendDigestNow}
                    disabled={sendingNow || !chatId.trim()}
                    className="px-4 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {sendingNow ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>ارسال خلاصه اخبار هم‌اکنون</span>
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>ذخیره تنظیمات زمان‌بندی</span>
                  </button>
                </div>
              </form>

              {/* 5. Connected Subscriptions List */}
              {statusData?.subscriptions && statusData.subscriptions.length > 0 && (
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                  <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    حساب‌ها و چت‌های متصل ({statusData.subscriptions.length})
                  </h3>

                  <div className="space-y-2">
                    {statusData.subscriptions.map(sub => (
                      <div
                        key={sub.id}
                        className={`p-3 border rounded-xl flex items-center justify-between text-xs transition-colors ${
                          editingSubId === sub.id
                            ? 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-400 dark:border-sky-600'
                            : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200/80 dark:border-zinc-700/80'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${sub.is_active === 1 ? 'bg-emerald-500' : 'bg-zinc-400'}`}></span>
                            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                              {sub.chat_id}
                            </span>
                            {sub.username && (
                              <span className="text-zinc-400">(@{sub.username})</span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                              {sub.schedule_times.length} بار در روز
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            ساعت‌ها: {sub.schedule_times.join(' ، ')} | آخرین ارسال: {sub.last_sent_at ? new Date(sub.last_sent_at).toLocaleString('fa-IR') : 'ارسال نشده'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setChatId(sub.chat_id);
                              setScheduleTimes(sub.schedule_times || ['09:00', '21:00']);
                              setTimezone(sub.timezone || 'Asia/Tehran');
                              setSelectedFolderIds(sub.folder_ids);
                              setIsActive(sub.is_active === 1);
                              setEditingSubId(sub.id);
                            }}
                            className="p-1.5 text-zinc-500 hover:text-sky-600 hover:bg-zinc-200/60 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                            title="ویرایش این اشتراک"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubscription(sub.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-zinc-200/60 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                            title="حذف این اشتراک"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
