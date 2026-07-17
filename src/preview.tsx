/* eslint-disable react-refresh/only-export-components -- dev-only entry point, not an HMR component module */
/**
 * DEV-ONLY preview entry — NOT part of the app build.
 *
 * Renders the real HelpPage (with real theme-aware figures) without the auth
 * gate, plus a Light/Dark/System switcher, so the Help Base can be viewed in a
 * browser without a backend. Reachable at /preview.html on the dev server.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import HelpPage from './pages/help/HelpPage';
import { ThemeSwitcher } from './components/ui/ThemeSwitcher';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useTheme } from './hooks/useTheme';
import './index.css';
import './i18n';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function Preview() {
  useTheme(); // applies the .dark class to <html> from the theme store

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <span className="text-sm font-semibold">Help Base — preview</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">Toggle theme to see figures adapt →</span>
        <div className="ml-auto flex items-center gap-4">
          <LanguageSwitcher />
          <ThemeSwitcher variant="full" />
        </div>
      </div>
      <div className="px-4">
        <HelpPage />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Preview />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
