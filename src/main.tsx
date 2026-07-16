import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { BetaGate } from './components/BetaGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App';
import './index.css';
import './i18n'; // i18n initialization — must be imported before App
import { initWebVitals } from './lib/web-vitals';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Always revalidate against the live API so navigating to a page shows
      // the newest data. Cached data is still served instantly while a
      // background refetch runs (stale-while-revalidate), so there is no
      // loading flash — but the user never sees stale data after navigation
      // or returning to the app. Hooks that need slower-changing data (e.g.
      // useBaseline, useBackups, useSignatures) opt out with their own
      // staleTime.
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BetaGate>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </BetaGate>
    </ErrorBoundary>
  </React.StrictMode>
);

// Report Core Web Vitals
initWebVitals();
