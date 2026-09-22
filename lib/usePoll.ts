'use client';

import { useEffect, useRef } from 'react';

/**
 * Re-run `fn` on an interval while the tab is visible, and once on return.
 *
 * Riders were not seeing newly assigned jobs: every screen loaded once and
 * only refetched after the rider's own write. Polling is paused while the tab
 * is hidden so a backgrounded phone is not burning mobile data.
 */
export function usePoll(fn: () => void, ms = 30_000, enabled = true) {
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      saved.current();
    };
    const id = setInterval(tick, ms);

    // Coming back to the app should feel current immediately.
    const onVisible = () => {
      if (!document.hidden) saved.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [ms, enabled]);
}
