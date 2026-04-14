import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAircraft, useDeleteAircraft } from '../../hooks/useAircraft';
import AircraftForm from '../../components/aircraft/AircraftForm';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SkeletonGrid } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import HelpLink from '../../components/ui/HelpLink';

export default function AircraftPage() {
  const { t } = useTranslation('aircraft');
  const { data: aircraft, isLoading, error } = useAircraft();
  const deleteAircraft = useDeleteAircraft();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteAircraft.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[960px] py-6">
        <SkeletonGrid count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[960px] py-6">
        <ErrorState
          title={t('errorTitle')}
          message={t('errorMessage')}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[960px] py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            {t('subtitle')}
            <HelpLink topic="aircraft" />
          </p>
        </div>
        <button
          onClick={() => { setEditingId(null); setShowForm(true); }}
          className="btn-primary"
        >
          + {t('addAircraft')}
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="aircraft-form-title"
        >
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2
                  id="aircraft-form-title"
                  className="text-xl font-semibold text-slate-800 dark:text-slate-100"
                >
                  {editingId ? t('editAircraft') : t('addAircraft')}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label={t('close')}
                >
                  ✕
                </button>
              </div>
              <AircraftForm
                aircraftId={editingId}
                onClose={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Aircraft List */}
      {!aircraft || aircraft.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {t('noAircraft')}
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            {t('addFirst')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {aircraft.map((ac) => (
            <div key={ac.id} className="card">
              {/* Header: Reg + Status */}
              <div className="flex justify-between items-start mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate text-lg">
                    {ac.registration}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {ac.make} {ac.model}
                  </p>
                </div>
                <span
                  className={`badge text-xs shrink-0 ml-2 ${
                    ac.isActive
                      ? 'badge-current'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  }`}
                >
                  {ac.isActive ? t('active') : t('inactive')}
                </span>
              </div>

              {/* Details */}
              <dl className="text-sm space-y-1.5 mb-4">
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">{t('fields.type')}</dt>
                  <dd className="text-slate-700 dark:text-slate-300">{ac.type}</dd>
                </div>
                {ac.aircraftClass && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">{t('fields.class')}</dt>
                    <dd className="text-slate-700 dark:text-slate-300">
                      {t(`classes.${ac.aircraftClass}`, { defaultValue: ac.aircraftClass })}
                    </dd>
                  </div>
                )}
                {(ac.isComplex || ac.isHighPerformance || ac.isTailwheel) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ac.isComplex && (
                      <span className="badge-info">
                        {t('fields.isComplex')}
                      </span>
                    )}
                    {ac.isHighPerformance && (
                      <span className="badge-expiring">
                        {t('highPerf')}
                      </span>
                    )}
                    {ac.isTailwheel && (
                      <span className="badge-neutral">
                        {t('fields.isTailwheel')}
                      </span>
                    )}
                  </div>
                )}
              </dl>

              {ac.notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-3 truncate">
                  {ac.notes}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => { setEditingId(ac.id); setShowForm(true); }}
                  className="btn-ghost btn-sm flex-1"
                >
                  {t('edit')}
                </button>
                <button
                  onClick={() => handleDelete(ac.id)}
                  className="btn-ghost btn-sm flex-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  {t('delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        title={t('deleteConfirmTitle')}
        description={t('deleteConfirmDescription')}
        confirmLabel={t('delete')}
        variant="danger"
        isLoading={deleteAircraft.isPending}
      />
    </div>
  );
}
