import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Laptop, Monitor, Smartphone, Tablet } from 'lucide-react';
import {
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
  type Session,
} from '../../hooks/useSessions';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';

// Device label substring → icon. Order matters: tablets before phones, since
// an iPad label also reads as a mobile device.
function deviceIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes('ipad') || l.includes('tablet')) return Tablet;
  if (l.includes('iphone') || l.includes('android') || l.includes('ios')) return Smartphone;
  if (l.includes('mac') || l.includes('windows') || l.includes('linux') || l.includes('chromeos')) {
    return Laptop;
  }
  return Monitor;
}

export function SessionsSection() {
  const { t } = useTranslation('settings');
  const { fmtDateTime } = useFormatPrefs();
  const { data, isLoading, isError } = useSessions();
  const revokeSession = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const sessions = data?.sessions ?? [];
  const otherCount = sessions.filter((s) => !s.current).length;

  const handleRevoke = async (session: Session) => {
    setMessage('');
    setError('');
    setPendingId(session.id);
    try {
      await revokeSession.mutateAsync(session.id);
      setMessage(t('sessions.revoked', { device: session.deviceLabel }));
    } catch {
      setError(t('sessions.revokeFailed'));
    } finally {
      setPendingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    setMessage('');
    setError('');
    try {
      const revoked = await revokeOthers.mutateAsync();
      setMessage(t('sessions.revokedOthers', { count: revoked }));
    } catch {
      setError(t('sessions.revokeFailed'));
    }
  };

  return (
    <div className="card">
      <h2 className="section-title mb-2">{t('sessions.title')}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        {data?.maxSessions
          ? t('sessions.descriptionWithMax', { max: data.maxSessions })
          : t('sessions.description')}
      </p>

      {isLoading && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('sessions.loading')}</p>
      )}

      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">{t('sessions.loadFailed')}</p>
      )}

      {!isLoading && !isError && sessions.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('sessions.empty')}</p>
      )}

      {sessions.length > 0 && (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {sessions.map((session) => {
            const Icon = deviceIcon(session.deviceLabel);
            return (
              <li
                key={session.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <Icon
                    className="h-5 w-5 shrink-0 mt-0.5 text-slate-400 dark:text-slate-500"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {session.deviceLabel}
                      </span>
                      {session.current && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {t('sessions.thisDevice')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t('sessions.lastActive', { when: fmtDateTime(session.lastUsedAt) })}
                      {session.ipAddress ? ` · ${session.ipAddress}` : ''}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {t('sessions.signedIn', { when: fmtDateTime(session.createdAt) })}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRevoke(session)}
                  disabled={pendingId === session.id}
                  className="btn-secondary shrink-0 self-start text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-300 dark:border-red-700 sm:self-auto"
                >
                  {session.current ? t('sessions.signOutThis') : t('sessions.signOut')}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {otherCount > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={handleRevokeOthers}
            disabled={revokeOthers.isPending}
            className="btn-secondary text-sm"
          >
            {revokeOthers.isPending
              ? t('sessions.signingOutOthers')
              : t('sessions.signOutOthers', { count: otherCount })}
          </button>
        </div>
      )}

      {message && <p className="text-sm mt-3 text-green-600 dark:text-green-400">{message}</p>}
      {error && <p className="text-sm mt-3 text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
