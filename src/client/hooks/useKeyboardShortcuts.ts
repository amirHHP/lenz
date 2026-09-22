import { useEffect } from 'react';

interface ShortcutHandlers {
  onNext?: () => void;
  onPrev?: () => void;
  onStar?: () => void;
  onRead?: () => void;
  onHighlight?: () => void;
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

      switch (e.key) {
        case 'j':
        case 'J':
          e.preventDefault();
          handlers.onNext?.();
          break;
        case 'k':
        case 'K':
          e.preventDefault();
          handlers.onPrev?.();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          handlers.onStar?.();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          handlers.onRead?.();
          break;
        case 'h':
        case 'H':
          e.preventDefault();
          handlers.onHighlight?.();
          break;
        case '/':
          e.preventDefault();
          handlers.onSearchFocus?.();
          break;
        case '?':
          e.preventDefault();
          handlers.onHelp?.();
          break;
        case 'Escape':
          e.preventDefault();
          handlers.onEscape?.();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
