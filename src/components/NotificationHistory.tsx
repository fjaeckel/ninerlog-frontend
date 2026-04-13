import { useState } from 'react';
import { useNotificationHistory } from '../hooks/useNotifications';

const CATEGORY_LABELS: Record<string, string> = {
  credential_medical: 'Medical',
  credential_language: 'Language',
  credential_security: 'Security',
  credential_other: 'Credential',
  rating_expiry: 'Rating Expiry',
  currency_passenger: 'Passenger',
  currency_night: 'Night',
  currency_instrument: 'Instrument',
  currency_flight_review: 'Flight Review',
  currency_revalidation: 'Revalidation',
};

const CATEGORY_COLORS: Record<string, string> = {
  credential_medical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  credential_language: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  credential_security: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  credential_other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  rating_expiry: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  currency_passenger: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  currency_night: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  currency_instrument: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  currency_flight_review: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  currency_revalidation: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

export function NotificationHistory() {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const { data, isLoading } = useNotificationHistory(pageSize, page * pageSize);

  if (isLoading) {
    return (
      <div className="card mb-6">
        <h2 className="section-title mb-4">Notification History</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="card mb-6">
        <h2 className="section-title mb-4">Notification History</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">No notifications sent yet.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / pageSize);

  return (
    <div className="card mb-6">
      <h2 className="section-title mb-4">Notification History</h2>
      <div className="space-y-2">
        {data.items.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
          >
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap mt-0.5 ${
                CATEGORY_COLORS[entry.category] || 'bg-slate-100 text-slate-600'
              }`}
            >
              {CATEGORY_LABELS[entry.category] || entry.category}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{entry.subject}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{new Date(entry.sentAt).toLocaleDateString()}</span>
                {entry.daysBeforeExpiry != null && (
                  <span>• {entry.daysBeforeExpiry}d before expiry</span>
                )}
                {entry.referenceType && (
                  <span>• {entry.referenceType}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="text-sm text-blue-600 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="text-sm text-blue-600 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
