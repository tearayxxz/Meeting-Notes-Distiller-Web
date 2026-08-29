import { useEffect, useState } from 'react';

export const THEME_STORAGE_KEY = 'meeting-distiller-theme';

export const themes = ['light', 'dark', 'web-slinger'] as const;
export type Theme = (typeof themes)[number];

const isTheme = (value: string | null): value is Theme =>
  themes.some((theme) => theme === value);

const readStoredTheme = (): Theme => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : 'light';
  } catch {
    return 'light';
  }
};

const applyTheme = (theme: Theme): void => {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
};

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme still works when browser storage is disabled.
    }
  }, [theme]);

  return { theme, setTheme };
};
