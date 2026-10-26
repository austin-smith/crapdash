'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface WidgetAutoRefreshProps {
  intervalMs: number;
}

/**
 * Re-renders server widgets on an interval while the tab is visible, and catches up
 * immediately when a hidden tab becomes visible after the interval has elapsed.
 */
export function WidgetAutoRefresh({ intervalMs }: WidgetAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    let lastRefreshAt = Date.now();

    const refresh = () => {
      lastRefreshAt = Date.now();
      router.refresh();
    };

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefreshAt >= intervalMs) {
        refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, router]);

  return null;
}
