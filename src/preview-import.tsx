/* eslint-disable react-refresh/only-export-components -- dev-only entry point, not an HMR component module */
/**
 * DEV-ONLY preview entry — NOT part of the app build.
 *
 * Renders the real ImportPage against the real template catalogue, so the
 * import screen can be reviewed without a backend. Reachable at
 * /preview-import.html on the dev server.
 *
 * The upload step is genuinely interactive: `window.fetch` is stubbed for the
 * upload endpoint alone, so choosing any file walks the page into its mapping
 * step with a canned MyFlightbook response. That is the only way to see the
 * detected-template banner and the unmapped-column count, both of which live
 * behind component state rather than a query.
 *
 * The admin dashboard is included too, for the imports-by-source-logbook tile.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import ImportPage from './pages/import/ImportPage';
import { useTheme } from './hooks/useTheme';
import { previewTemplates } from './preview-import-fixtures';
import './index.css';
import './i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

queryClient.setQueryData(['import-templates'], previewTemplates);
queryClient.setQueryData(['imports', 1, 10], {
  data: [],
  pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
});

// A MyFlightbook upload, shaped exactly as the API answers it — including
// "Hobbs Start", which no template maps, so the unmapped-column warning has
// something real to count.
const uploadResponse = {
  uploadToken: 'preview-token',
  format: 'MYFLIGHTBOOK_CSV',
  columns: ['Date', 'Tail Number', 'ICAO Model', 'Route', 'Total Flight Time', 'Landings', 'Comments', 'Hobbs Start'],
  previewRows: [
    {
      Date: '2026-08-14',
      'Tail Number': 'D-ERAE',
      'ICAO Model': 'C172',
      Route: 'EDAZ EDAY',
      'Total Flight Time': '2.7',
      Landings: '1',
      Comments: 'Bay tour',
      'Hobbs Start': '1234.5',
    },
  ],
  totalRows: 1,
  suggestedMappings: [
    { sourceColumn: 'Date', targetField: 'date', dateFormat: '2006-01-02' },
    { sourceColumn: 'Tail Number', targetField: 'aircraftReg' },
    { sourceColumn: 'ICAO Model', targetField: 'aircraftType' },
    { sourceColumn: 'Route', targetField: 'route' },
    { sourceColumn: 'Total Flight Time', targetField: 'totalTime' },
    { sourceColumn: 'Landings', targetField: 'landingsTotal' },
    { sourceColumn: 'Comments', targetField: 'remarks' },
  ],
  detectedTemplate: previewTemplates.find((t) => t.id === 'MYFLIGHTBOOK_CSV'),
};

const realFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.includes('/imports/upload')) {
    return Promise.resolve(new Response(JSON.stringify(uploadResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  }
  return realFetch(input, init);
}) as typeof window.fetch;

function Preview() {
  useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Stand-in for the app header. The real theme and language switchers are
          left out on purpose: both render expanded panels that would dominate a
          screenshot of the screen underneath. */}
      <div className="surface-glass flex h-14 items-center gap-4 border-b px-4">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Import — preview
        </span>
      </div>
      <div className="px-4">
        <ImportPage />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Preview />
      </MemoryRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
