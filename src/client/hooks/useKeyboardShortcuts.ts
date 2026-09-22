import { useEffect } from 'react';

interface ShortcutHandlers {
  onNext?: () => void;
  onPrev?: () => void;
  onStar?: () => void;
  onRead?: () => void;
  onHighlight?: () => void;
  onZenToggle?: () => void;
  onSearchFocus?: () => void;
  onHelp?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore shortcut keys if user is typing in form inputs
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        if (e.key === 'Escape') {
          target.blur();
          handlers.onEscape?.();
        }
        return;
      }

      // Ignore shortcuts if modifier keys (Cmd, Ctrl, Alt) are pressed to avoid hijacking browser shortcuts
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();
      const code = e.code;

      // Next article ('j' or physical KeyJ or Persian 'ت')
      if (code === 'KeyJ' || key === 'j' || key === 'ت') {
        e.preventDefault();
        handlers.onNext?.();
        return;
      }

      // Previous article ('k' or physical KeyK or Persian 'ن')
      if (code === 'KeyK' || key === 'k' || key === 'ن') {
        e.preventDefault();
        handlers.onPrev?.();
        return;
      }

      // Star ('s' or physical KeyS or Persian 'س')
      if (code === 'KeyS' || key === 's' || key === 'س') {
        e.preventDefault();
        handlers.onStar?.();
        return;
      }

      // Read toggle ('m' or physical KeyM or Persian 'پ')
      if (code === 'KeyM' || key === 'm' || key === 'پ') {
        e.preventDefault();
        handlers.onRead?.();
        return;
      }

      // Highlight ('h' or physical KeyH or Persian 'ا')
      if (code === 'KeyH' || key === 'h' || key === 'ا') {
        e.preventDefault();
        handlers.onHighlight?.();
        return;
      }

      // Zen mode toggle ('z' or physical KeyZ or Persian 'ظ')
      if (code === 'KeyZ' || key === 'z' || key === 'ظ') {
        e.preventDefault();
        handlers.onZenToggle?.();
        return;
      }

      // Search focus ('/' or physical Slash)
      if (code === 'Slash' || key === '/') {
        e.preventDefault();
        handlers.onSearchFocus?.();
        return;
      }

      // Help ('?' or Shift + Slash)
      if (key === '?' || (e.shiftKey && (code === 'Slash' || key === '/'))) {
        e.preventDefault();
        handlers.onHelp?.();
        return;
      }

      // Escape
      if (code === 'Escape' || key === 'escape') {
        e.preventDefault();
        handlers.onEscape?.();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
