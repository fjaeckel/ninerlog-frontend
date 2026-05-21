import { useTranslation } from 'react-i18next';
import { useBackupRuns } from '../../hooks/useBackups';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';

interface BackupRunsListProps {
  destinationId: string;
}

function formatBytes(bytes?: number): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function formatDuration(ms?: number): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

export default function BackupRunsList({ destinationId }: BackupRunsListProps) {
  const { t } = useTranslation('backups');
  const { fmtDate } = useFormatPrefs();
  const { data, isLoading, error } = useBackupRuns(destinationId, { pageSize: 20 });

  if (isLoading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400 py-4">{t('runs.loading')}</div>;
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 dark:text-red-400 py-4">{t('runs.loadError')}</div>
    );
  }

  if (!data || data.data.length === 0) {
    return <div className="text-sm text-slate-500 dark:text-slate-400 py-4">{t('runs.empty')}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
          <tr>
            <th className="text-left py-2 pr-3">{t('runs.status')}</th>
            <th className="text-left py-2 pr-3">{t('runs.startedAt')}</th>
            <th className="text-left py-2 pr-3">{t('runs.trigger')}</th>
            <th className="text-left py-2 pr-3">{t('runs.duration')}</th>
            <th className="text-left py-2 pr-3">{t('runs.size')}</th>
            <th className="text-left py-2 pr-3">{t('runs.remotePath')}</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((run) => {
            const badge =
              run.status === 'success'
                ? 'badge-current'
                : run.status === 'failed'
                ? 'badge-expired'
                : 'badge-expiring';
            return (
              <tr key={run.id} className="border-t border-slate-100 dark:border-slate-800 align-top">
                <td className="py-2 pr-3">
                  <span className={`badge text-xs ${badge}`}>{t(`runs.statuses.${run.status}`)}</span>
                </td>
                <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">
                  {fmtDate(run.startedAt)}{' '}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(run.startedAt).toLocaleTimeString()}
                  </span>
                </td>
                <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">
                  {run.trigger ? t(`runs.triggers.${run.trigger}`) : '—'}
                </td>
                <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{formatDuration(run.durationMs)}</td>
                <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{formatBytes(run.sizeBytes)}</td>
                <td className="py-2 pr-3 text-slate-700 dark:text-slate-300 break-all">
                  {run.remotePath || '—'}
                  {run.errorMessage && (
                    <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">{run.errorMessage}</div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
