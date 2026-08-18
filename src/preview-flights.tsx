/* eslint-disable react-refresh/only-export-components -- dev-only entry point, not an HMR component module */
/**
 * DEV-ONLY preview entry — NOT part of the app build.
 *
 * Renders the real flights list and flight detail pages against seeded query
 * data, without a backend. Reachable at /preview-flights.html on the dev
 * server. Anything not seeded below — signatures, licenses — falls back to
 * the page's own empty/error state.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router';
import FlightsPage from './pages/flights/FlightsPage';
import FlightDetailPage from './pages/flights/FlightDetailPage';
import { ThemeSwitcher } from './components/ui/ThemeSwitcher';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useTheme } from './hooks/useTheme';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { previewFlights as flights } from './preview-flight-fixtures';
import './index.css';
import './i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

// Same key shape the pages build.
queryClient.setQueryData(['flights', { page: 1, pageSize: 20, sortBy: 'date', sortOrder: 'desc' }], {
  data: flights,
  pagination: { page: 1, pageSize: 20, total: flights.length, totalPages: 1 },
});
// Infinite-scroll key, seeded with two pages already loaded.
const half = Math.ceil(flights.length / 2);
queryClient.setQueryData(['flights', 'infinite', { pageSize: 20, sortBy: 'date', sortOrder: 'desc' }], {
  pages: [
    { data: flights.slice(0, half), pagination: { page: 1, pageSize: half, total: flights.length, totalPages: 2 } },
    { data: flights.slice(half), pagination: { page: 2, pageSize: half, total: flights.length, totalPages: 2 } },
  ],
  pageParams: [1, 2],
});
queryClient.setQueryData(['licenses'], []);
for (const flight of flights) {
  queryClient.setQueryData(['flights', flight.id], flight);
}

function Preview() {
  useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Stand-in for the app header the sticky month headings tuck under */}
      <div className="surface-glass fixed inset-x-0 top-0 z-[1010] flex h-14 items-center gap-4 border-b px-4">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Flights — preview</span>
      </div>
      {/* Preview controls, fixed outside the layout */}
      <div data-preview-controls className="fixed bottom-4 right-4 z-[1030] flex items-end gap-3 rounded-xl border border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-800/90">
        <LanguageSwitcher />
        <ThemeSwitcher variant="full" />
      </div>
      <ScrollToTop />
      <main className="px-4 pt-14 pb-24">
        <Routes>
          <Route path="/flights" element={<FlightsPage />} />
          <Route path="/flights/:flightId" element={<FlightDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/flights']}>
        <Preview />
      </MemoryRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
