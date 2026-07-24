import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useBackupDestinations,
  useDeleteBackupDestination,
  useRunBackupNow,
  useTestBackupDestination,
} from '../../hooks/useBackups';
import BackupDestinationForm from '../../components/backups/BackupDestinationForm';
import BackupRunsList from '../../components/backups/BackupRunsList';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SkeletonGrid } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { extractApiError } from '../../lib/errors';
import type { components } from '../../api/schema';

type BackupDestination = components['schemas']['BackupDestination'];

export default function BackupsPage() {
  const { t } = useTranslation('backups');
  const { fmtDate } = useFormatPrefs();
  const { data: destinations, isLoading, error } = useBackupDestinations();
  const deleteMutation = useDeleteBackupDestination();
  const testMutation = useTestBackupDestination();
  const runMutation = useRunBackupNow();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BackupDestination | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BackupDestination | null>(null);
  const [historyTarget, setHistoryTarget] = useState<BackupDestination | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(() => setStatusMessage(null), 6000);
    return () => clearTimeout(t);
  }, [statusMessage]);

  // Sort destinations: enabled first, then alphabetically by displayName.
  const sortedDestinations = useMemo(() => {
    if (!destinations) return destinations;
    return [...destinations].sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });
    });
  }, [destinations]);

  const handleTest = async (dest: BackupDestination) => {
    setBusyId(dest.id);
    setStatusMessage(null);
    try {
      const result = await testMutation.mutateAsync(dest.id);
      if (result.success) {
        setStatusMessage({ kind: 'ok', text: t('messages.testSuccess', { name: dest.displayName }) });
      } else {
        setStatusMessage({ kind: 'err', text: result.message || t('messages.testFailed') });
      }
    } catch (err) {
      setStatusMessage({ kind: 'err', text: extractApiError(err, t('messages.testFailed')) });
    } finally {
      setBusyId(null);
    }
  };

  const handleRun = async (dest: BackupDestination) => {
    setBusyId(dest.id);
    setStatusMessage(null);
    try {
      const run = await runMutation.mutateAsync(dest.id);
      if (run.status === 'success') {
        setStatusMessage({ kind: 'ok', text: t('messages.runSuccess', { name: dest.displayName }) });
      } else {
        setStatusMessage({ kind: 'err', text: run.errorMessage || t('messages.runFailed') });
      }
    } catch (err) {
      setStatusMessage({ kind: 'err', text: extractApiError(err, t('messages.runFailed')) });
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setStatusMessage({ kind: 'err', text: extractApiError(err, t('messages.deleteFailed')) });
    }
  };

  if (isLoading) {
    return (
      <div className="py-2">
        <SkeletonGrid count={3} />
      </div>
    );
  }

  if (error) {
    // 503 means feature is disabled (no BACKUP_CREDENTIALS_KEY on server)
    const status =
      (error as { status?: number; response?: { status?: number } } | undefined)?.status ??
      (error as { response?: { status?: number } } | undefined)?.response?.status;
    if (status === 503) {
      return (
        <div className="card">
          <h2 className="section-title mb-2">{t('title')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('disabled')}</p>
        </div>
      );
    }
    return <ErrorState title={t('error.title')} message={t('error.message')} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="btn-primary self-start sm:self-auto whitespace-nowrap"
        >
          + {t('addDestination')}
        </button>
      </div>

      {statusMessage && (
        <div
          role="status"
          className={`mb-4 p-3 rounded-lg text-sm border ${
            statusMessage.kind === 'ok'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[1020]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="backup-form-title"
        >
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 id="backup-form-title" className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                  {editing ? t('form.editTitle') : t('form.createTitle')}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label={t('form.close')}
                >
                  ✕
                </button>
              </div>
              <BackupDestinationForm destination={editing} onClose={() => setShowForm(false)} />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        title={t('deleteTitle')}
        description={t('deleteConfirm', { name: deleteTarget?.displayName ?? '' })}
        confirmLabel={t('delete')}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {historyTarget && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[1020]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="backup-history-title"
        >
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 id="backup-history-title" className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                  {t('history.title', { name: historyTarget.displayName })}
                </h2>
                <button
                  onClick={() => setHistoryTarget(null)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label={t('form.close')}
                >
                  ✕
                </button>
              </div>
              <BackupRunsList destinationId={historyTarget.id} />
            </div>
          </div>
        </div>
      )}

      {!sortedDestinations || sortedDestinations.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-500 dark:text-slate-400 mb-4">{t('empty')}</p>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="btn-primary"
          >
            {t('addFirst')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedDestinations.map((dest) => {
            const statusClass =
              dest.status === 'active'
                ? 'badge-current'
                : dest.status === 'error'
                ? 'badge-expired'
                : 'badge-expiring';
            const isBusy = busyId === dest.id;
            return (
              <div key={dest.id} className="card" data-testid="backup-destination">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {dest.displayName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {dest.provider} · {t(`schedule.${dest.schedule}`)}
                      {!dest.enabled && <> · {t('paused')}</>}
                    </p>
                  </div>
                  <span className={`badge text-xs shrink-0 ${statusClass}`}>
                    {t(`status.${dest.status}`)}
                  </span>
                </div>

                <dl className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mb-4">
                  {dest.lastRunAt && (
                    <div className="flex justify-between sm:block">
                      <dt className="text-slate-500 dark:text-slate-400 sm:text-xs sm:uppercase">{t('lastRun')}</dt>
                      <dd className="text-slate-700 dark:text-slate-300">{fmtDate(dest.lastRunAt)}</dd>
                    </div>
                  )}
                  {dest.lastSuccessAt && (
                    <div className="flex justify-between sm:block">
                      <dt className="text-slate-500 dark:text-slate-400 sm:text-xs sm:uppercase">{t('lastSuccess')}</dt>
                      <dd className="text-slate-700 dark:text-slate-300">{fmtDate(dest.lastSuccessAt)}</dd>
                    </div>
                  )}
                  {dest.credentialHint && (
                    <div className="flex justify-between sm:block">
                      <dt className="text-slate-500 dark:text-slate-400 sm:text-xs sm:uppercase">{t('credentialHint')}</dt>
                      <dd className="text-slate-700 dark:text-slate-300">{dest.credentialHint}</dd>
                    </div>
                  )}
                  <div className="flex justify-between sm:block">
                    <dt className="text-slate-500 dark:text-slate-400 sm:text-xs sm:uppercase">{t('retention')}</dt>
                    <dd className="text-slate-700 dark:text-slate-300">
                      {dest.retentionCount === 0 ? t('retentionAll') : dest.retentionCount}
                    </dd>
                  </div>
                </dl>

                {dest.lastError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mb-3 break-all">{dest.lastError}</p>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => handleTest(dest)}
                    disabled={isBusy}
                    className="btn-ghost btn-sm"
                    data-testid="backup-test"
                  >
                    {isBusy && testMutation.isPending ? t('testing') : t('test')}
                  </button>
                  <button
                    onClick={() => handleRun(dest)}
                    disabled={isBusy}
                    className="btn-ghost btn-sm"
                    data-testid="backup-run"
                  >
                    {isBusy && runMutation.isPending ? t('running') : t('runNow')}
                  </button>
                  <button
                    onClick={() => setHistoryTarget(dest)}
                    className="btn-ghost btn-sm"
                    data-testid="backup-history"
                  >
                    {t('history.button')}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(dest);
                      setShowForm(true);
                    }}
                    className="btn-ghost btn-sm"
                  >
                    {t('edit')}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(dest)}
                    className="btn-ghost btn-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    data-testid="backup-delete"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
