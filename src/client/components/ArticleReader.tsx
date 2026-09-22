import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { 
  Star, 
  Check, 
  ExternalLink, 
  Highlighter, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Maximize2, 
  Minimize2, 
  Clock, 
  Calendar, 
  Flame, 
  Download, 
  Share2,
  Trash2,
  Type
} from 'lucide-react';
import { Article, Highlight } from '../types';

interface Props {
  articleId: number | null;
  onNext: () => void;
  onPrev: () => void;
  onToggleStar: (articleId: number, current: boolean) => void;
  onToggleRead: (articleId: number, current: boolean) => void;
  onHighlightCreated?: () => void;
  isZenMode: boolean;
  onToggleZen: () => void;
}

export const ArticleReader: React.FC<Props> = ({
  articleId,
  onNext,
  onPrev,
  onToggleStar,
  onToggleRead,
  onHighlightCreated,
  isZenMode,
  onToggleZen
}) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  // Text selection & highlight popover state
  const [selectionRange, setSelectionRange] = useState<{
    text: string;
    top: number;
    left: number;
  } | null>(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!articleId) {
      setArticle(null);
      setHighlights([]);
      setAiSummary(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setAiSummary(null);
    setSelectionRange(null);
    setShowNoteInput(false);
    setNoteText('');

    fetch(`/api/articles/${articleId}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        setArticle(data.article);
        setHighlights(data.highlights || []);
        if (data.article?.ai_summary) {
          setAiSummary(data.article.ai_summary);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [articleId]);

  // Handle text selection for highlighting
  useEffect(() => {
    function handleSelectionChange() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        // If note input is currently open, don't clear immediately
        if (!showNoteInput) {
          setSelectionRange(null);
        }
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 2) {
        if (!showNoteInput) setSelectionRange(null);
        return;
      }

      // Check if selection is inside article content container
      if (contentRef.current && contentRef.current.contains(selection.anchorNode)) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSelectionRange({
            text,
            top: rect.top - 50,
            left: rect.left + rect.width / 2
          });
        } catch {
          // ignore
        }
      } else {
        if (!showNoteInput) setSelectionRange(null);
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [showNoteInput]);

  async function handleCreateHighlight(color: 'yellow' | 'green' | 'blue' = 'yellow', note?: string) {
    if (!article || !selectionRange) return;

    try {
      const res = await fetch('/api/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          text: selectionRange.text,
          note: note || (noteText.trim() ? noteText.trim() : null),
          color
        })
      });
      const data = await res.json();
      if (res.ok) {
        setHighlights(prev => [...prev, data]);
        setSelectionRange(null);
        setShowNoteInput(false);
        setNoteText('');
        window.getSelection()?.removeAllRanges();
        onHighlightCreated?.();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Keyboard shortcut 'h' to highlight selected text
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if ((e.code === 'KeyH' || e.key === 'h' || e.key === 'H' || e.key === 'ا') && selectionRange) {
        e.preventDefault();
        handleCreateHighlight('yellow');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionRange, article]);

  function handleToggleStarLocal() {
    if (!article) return;
    const current = article.is_starred === 1;
    setArticle(prev => prev ? { ...prev, is_starred: current ? 0 : 1 } : null);
    onToggleStar(article.id, current);
  }

  function handleToggleReadLocal() {
    if (!article) return;
    const current = article.is_read === 1;
    setArticle(prev => prev ? { ...prev, is_read: current ? 0 : 1 } : null);
    onToggleRead(article.id, current);
  }

  async function handleForceExtract() {
    if (!article) return;
    setExtracting(true);
    try {
      const res = await fetch(`/api/articles/${article.id}/extract`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.fullContent) {
        setArticle(prev => prev ? { ...prev, full_content: data.fullContent } : null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExtracting(false);
    }
  }

  async function handleGenerateSummary() {
    if (!article) return;
    setSummarizing(true);
    try {
      const res = await fetch(`/api/articles/${article.id}/summary`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.summary) {
        setAiSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSummarizing(false);
    }
  }

  if (!articleId || (!article && !loading)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50/50 dark:bg-zinc-950">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-4 text-zinc-400">
          <Type className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-zinc-700 dark:text-zinc-300">مقاله‌ای انتخاب نشده است</h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
          یک مقاله را از ستون کناری انتخاب کنید، یا از کلید <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono text-[10px]">j</kbd> برای شروع مطالعه استفاده نمایید.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-zinc-50/50 dark:bg-zinc-950">
        <div className="space-y-4 max-w-xl w-full animate-pulse">
          <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-md w-3/4" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-1/3" />
          <div className="space-y-2 pt-6">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-5/6" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) return null;

  // Process highlights into content
  const rawHtml = article.full_content || article.summary || '';
  let processedHtml = rawHtml;

  // Apply highlights to HTML text safely without corrupting HTML tags or attributes
  highlights.forEach(h => {
    if (!h.text || !h.text.trim()) return;
    try {
      const escaped = h.text.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(<[^>]+>)|(${escaped})`, 'gi');
      processedHtml = processedHtml.replace(regex, (match, tag, textMatch) => {
        if (tag) return tag;
        return `<mark class="lenz-highlight-${h.color || 'yellow'}">${textMatch}</mark>`;
      });
    } catch {
      // ignore
    }
  });

  const sanitizedContent = DOMPurify.sanitize(processedHtml, {
    ADD_TAGS: ['mark'],
    ADD_ATTR: ['class']
  });

  // Relative formatted date
  const publishedDate = new Date(article.published_at).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const fontSizeClasses = {
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-loose',
    lg: 'text-lg leading-loose'
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 overflow-hidden relative">
      {/* Top Floating Selection Popover for Highlighting */}
      {selectionRange && (
        <div
          onMouseDown={e => e.preventDefault()}
          style={{ top: `${Math.max(10, selectionRange.top)}px`, left: `${selectionRange.left}px` }}
          className="fixed -translate-x-1/2 z-50 flex flex-col p-1.5 bg-zinc-900 dark:bg-zinc-800 text-white rounded-xl shadow-2xl border border-zinc-700 animate-in fade-in duration-100"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold px-1.5 text-zinc-300">هایلایت:</span>
            <button
              onClick={() => handleCreateHighlight('yellow')}
              className="w-5 h-5 rounded-full bg-amber-400 hover:scale-110 transition-transform"
              title="هایلایت زرد (کلید h)"
            />
            <button
              onClick={() => handleCreateHighlight('green')}
              className="w-5 h-5 rounded-full bg-emerald-400 hover:scale-110 transition-transform"
              title="هایلایت سبز"
            />
            <button
              onClick={() => handleCreateHighlight('blue')}
              className="w-5 h-5 rounded-full bg-blue-400 hover:scale-110 transition-transform"
              title="هایلایت آبی"
            />
            <button
              onClick={() => setShowNoteInput(prev => !prev)}
              className="text-[10px] text-zinc-300 hover:text-white px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors mr-1"
            >
              {showNoteInput ? 'بستن یادداشت' : '+ یادداشت'}
            </button>
          </div>
          {showNoteInput && (
            <div className="mt-2 pt-2 border-t border-zinc-700/80 flex items-center gap-1">
              <input
                type="text"
                placeholder="یادداشت برای این هایلایت..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateHighlight('yellow', noteText);
                  }
                }}
                className="px-2 py-1 text-xs bg-zinc-800 text-zinc-100 placeholder-zinc-400 rounded border border-zinc-700 focus:outline-hidden focus:border-blue-500 w-48"
                autoFocus
              />
              <button
                onClick={() => handleCreateHighlight('yellow', noteText)}
                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
              >
                ثبت
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reader Action Header Bar */}
      <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xs shrink-0 z-10">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrev}
            title="خبر قبلی (k)"
            className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={onNext}
            title="خبر بعدی (j)"
            className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-zinc-200 dark:border-zinc-800 mx-1" />

          {/* Star toggle */}
          <button
            onClick={handleToggleStarLocal}
            title="ستاره‌دار کردن (s)"
            className={`p-1.5 rounded-lg transition-colors ${
              article.is_starred === 1
                ? 'text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Star className={`w-4 h-4 ${article.is_starred === 1 ? 'fill-amber-500' : ''}`} />
          </button>

          {/* Read toggle */}
          <button
            onClick={handleToggleReadLocal}
            title="تغییر وضعیت خوانده‌شده (m)"
            className={`p-1.5 rounded-lg transition-colors ${
              article.is_read === 1
                ? 'text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/40'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Check className="w-4 h-4" />
          </button>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2">
          {/* AI Summary Button */}
          <button
            onClick={handleGenerateSummary}
            disabled={summarizing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-xs disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${summarizing ? 'animate-spin' : ''}`} />
            {summarizing ? 'در حال خلاصه‌سازی...' : 'خلاصه هوشمند AI'}
          </button>

          {/* Full Readable Content Extractor */}
          <button
            onClick={handleForceExtract}
            disabled={extracting}
            title="استخراج و نمایش متن کامل وب‌سایت"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Download className={`w-3.5 h-3.5 ${extracting ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline">{extracting ? 'در حال استخراج...' : 'متن کامل'}</span>
          </button>

          {/* Font Size Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setFontSize('sm')}
              className={`px-2 py-0.5 text-xs rounded-md ${fontSize === 'sm' ? 'bg-white dark:bg-zinc-700 font-bold shadow-xs' : 'text-zinc-500'}`}
            >
              A-
            </button>
            <button
              onClick={() => setFontSize('base')}
              className={`px-2 py-0.5 text-xs rounded-md ${fontSize === 'base' ? 'bg-white dark:bg-zinc-700 font-bold shadow-xs' : 'text-zinc-500'}`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize('lg')}
              className={`px-2 py-0.5 text-xs rounded-md ${fontSize === 'lg' ? 'bg-white dark:bg-zinc-700 font-bold shadow-xs' : 'text-zinc-500'}`}
            >
              A+
            </button>
          </div>

          {/* Original Link */}
          <a
            href={article.link}
            target="_blank"
            rel="noreferrer"
            title="مشاهده در وب‌سایت اصلی"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Zen mode toggle */}
          <button
            onClick={onToggleZen}
            title={isZenMode ? 'خروج از حالت زِن (Esc)' : 'حالت زِن تمام‌صفحه'}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Article Content Scroll Container */}
      <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8 max-w-3xl mx-auto w-full">
        {/* Article Meta Header */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/40">
              {article.feed_title}
            </span>

            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {publishedDate}
            </span>

            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {article.reading_time_minutes} دقیقه مطالعه
            </span>

            {/* Importance Rating Badge */}
            <span
              title="امتیاز اهمیت Lenz بر اساس الگوریتم هوشمند و سلایق شما"
              className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/40"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              امتیاز اهمیت: {Math.round(article.importance_score)}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 leading-tight">
            {article.title}
          </h1>

          {article.author && (
            <p className="text-xs text-zinc-400">
              نویسنده: <span className="text-zinc-700 dark:text-zinc-300 font-medium">{article.author}</span>
            </p>
          )}
        </div>

        {/* AI Summary Card (if generated) */}
        {aiSummary && (
          <div className="mb-8 p-5 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-800/40 rounded-2xl">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs font-bold mb-2.5">
              <Sparkles className="w-4 h-4" />
              <span>خلاصه ۳ نکته‌ای هوش مصنوعی:</span>
            </div>
            <div className="text-xs md:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-line font-medium">
              {aiSummary}
            </div>
          </div>
        )}

        {/* Highlights count alert */}
        {highlights.length > 0 && (
          <div className="mb-6 flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-xl text-xs border border-amber-200/60 dark:border-amber-900/40">
            <Highlighter className="w-4 h-4 text-amber-500 shrink-0" />
            <span>شما {highlights.length} بخش از این مقاله را هایلایت کرده‌اید.</span>
          </div>
        )}

        {/* Article Full Content (Sanitized & Highlighted) */}
        <div
          ref={contentRef}
          className={`article-content ${fontSizeClasses[fontSize]} text-zinc-800 dark:text-zinc-200`}
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        {/* Footer info */}
        <div className="mt-12 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>پایان مقاله</span>
          <a
            href={article.link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            <span>منبع در وب‌سایت اصلی</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
