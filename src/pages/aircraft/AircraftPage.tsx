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
      <div className="mx-auto max-w-7xl py-6">
        <SkeletonGrid count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl py-6">
        <ErrorState
          title={t('errorTitle')}
          message={t('errorMessage')}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            {t('subtitle')}
            <HelpLink topic="aircraft" />
          </p>
        </div>
        <button
          onClick={() => { setEditingId(null); setShowForm(true); }}
          className="btn-primary self-start sm:self-auto"
        >
          + {t('addAircraft')}
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[1020]"
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
        <div className="flex flex-col gap-4">
          {aircraft.map((ac) => (
            <div key={ac.id} className="card">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
                {/* Identity */}
                <div className="lg:w-72 lg:shrink-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                      {ac.registration}
                    </h3>
                    <span
                      className={`badge text-xs ${
                        ac.isActive
                          ? 'badge-current'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {ac.isActive ? t('active') : t('inactive')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {ac.make} {ac.model}
                  </p>
                </div>

                {/* Specs grid */}
                <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-3 flex-1 text-sm min-w-0">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('fields.type')}
                    </dt>
                    <dd className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">
                      {ac.type}
                    </dd>
                  </div>
                  {ac.aircraftClass && (
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('fields.class')}
                      </dt>
                      <dd className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">
                        {t(`classes.${ac.aircraftClass}`, { defaultValue: ac.aircraftClass })}
                      </dd>
                    </div>
                  )}
                  <div className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-2">
                    <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('form.characteristics')}
                    </dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {ac.isComplex && (
                        <span className="badge-info">{t('fields.isComplex')}</span>
                      )}
                      {ac.isHighPerformance && (
                        <span className="badge-expiring">{t('highPerf')}</span>
                      )}
                      {ac.isTailwheel && (
                        <span className="badge-neutral">{t('fields.isTailwheel')}</span>
                      )}
                      {!ac.isComplex && !ac.isHighPerformance && !ac.isTailwheel && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </dd>
                  </div>
                  {ac.notes && (
                    <div className="col-span-2 sm:col-span-3 lg:col-span-2 xl:col-span-4">
                      <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('fields.notes', { defaultValue: 'Notes' })}
                      </dt>
                      <dd className="mt-0.5 text-slate-600 dark:text-slate-300 italic break-words">
                        {ac.notes}
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Actions */}
                <div className="flex lg:flex-col gap-2 lg:w-28 lg:shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-700">
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
