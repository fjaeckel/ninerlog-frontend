import { useEffect } from 'react';
import { useThemeStore, type Theme } from '../stores/themeStore';

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemPreference() : theme;
  const root = document.documentElement;

  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Set meta theme-color for mobile browser chrome
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#0F172A' : '#FFFFFF');
  }
}

/**
 * Hook that syncs the selected theme to the document.
 * Call once at the app root (e.g. in App.tsx or main.tsx).
 */
export function useTheme() {
  const { theme, setTheme } = useThemeStore();

  // Apply on mount and when theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? getSystemPreference() : theme;

  return { theme, setTheme, resolvedTheme };
}
