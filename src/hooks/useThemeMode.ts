'use client';

import { useEffect, useMemo, useState } from 'react';

type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'minddash-theme';

const DEFAULT_THEME: ThemeMode = 'dark';

function readClientTheme(): ThemeMode {
  if (typeof window === 'undefined') return DEFAULT_THEME;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(DEFAULT_THEME);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setThemeMode(readClientTheme());

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme: ThemeMode }>;
      if (customEvent.detail?.theme) {
        setThemeMode(customEvent.detail.theme);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && (event.newValue === 'light' || event.newValue === 'dark')) {
        setThemeMode(event.newValue);
      }
    };

    window.addEventListener('theme-change', handleThemeChange as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('theme-change', handleThemeChange as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const isDark = themeMode === 'dark';

  const applyThemeClass = useMemo(
    () =>
      <T extends string | undefined | null>(darkVariant: T, lightVariant: T): T =>
        (isDark ? darkVariant : lightVariant),
    [isDark]
  );

  return {
    themeMode,
    isDark,
    applyThemeClass,
  } as const;
}
