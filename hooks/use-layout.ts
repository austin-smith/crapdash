'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DashboardLayout } from '@/lib/types';

const STORAGE_KEY = 'dashboard-layout';
const DEFAULT_LAYOUT: DashboardLayout = 'rows';

export function useLayout() {
  const [layout, setLayoutState] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as DashboardLayout | null;
    if (stored === 'rows' || stored === 'columns') {
      setLayoutState(stored);
    }
  }, []);

  const setLayout = useCallback((newLayout: DashboardLayout) => {
    setLayoutState(newLayout);
    localStorage.setItem(STORAGE_KEY, newLayout);
  }, []);

  return { layout, setLayout, mounted };
}

