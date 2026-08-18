import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App';
import './index.css';
import './i18n'; // i18n initialization — must be imported before App
import { initWebVitals } from './lib/web-vitals';
import { httpStatusOf } from './api/client';

/**
 * Retry transient failures once, never client errors. Network failures
 * surface with no status and still get a retry.
 */
function retryTransientOnly(failureCount: number, error: unknown): boolean {
  const status = httpStatusOf(error);
  if (status !== undefined && status >= 400 && status < 500) return false;
  return failureCount < 1;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: retryTransientOnly,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Report Core Web Vitals
initWebVitals();
