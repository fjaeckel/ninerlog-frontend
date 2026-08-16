import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlaneTakeoff, Plus } from 'lucide-react';
import { useAircraft, useAircraftStats, useDeleteAircraft } from '../../hooks/useAircraft';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { useRecencyPrefs } from '../../hooks/useRecencyPrefs';
import { recencyLevel, RECENCY_DOT_CLASSES, RECENCY_REQUIRED_LANDINGS } from '../../lib/recency';
import AircraftForm from '../../components/aircraft/AircraftForm';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { FormModal } from '../../components/ui/FormModal';
import { PageHeader, PageWrapper } from '../../components/ui/PageWrapper';
import { SkeletonList } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import HelpLink from '../../components/ui/HelpLink';

const STALE_AFTER_DAYS = 90;

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (24 * 60 * 60 * 1000));
}

export default function AircraftPage() {
  const { t } = useTranslation('aircraft');
  const { data: aircraft, isLoading, error } = useAircraft();
  const { data: aircraftStats } = useAircraftStats();
  const { fmtDuration, fmtDate } = useFormatPrefs();
  const recencyPrefs = useRecencyPrefs();
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
      <PageWrapper>
        <SkeletonList rows={3} />
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <ErrorState title={t('errorTitle')} message={t('errorMessage')} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        titleAdornment={<HelpLink topic="aircraft" />}
        action={
          <button
            onClick={() => { setEditingId(null); setShowForm(true); }}
            className="btn-primary whitespace-nowrap"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t('addAircraft')}
          </button>
        }
      />

      {/* Form Modal */}
      <FormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? t('editAircraft') : t('addAircraft')}
        size="md"
      >
        <AircraftForm aircraftId={editingId} onClose={() => setShowForm(false)} />
      </FormModal>

      {/* Aircraft List */}
      {!aircraft || aircraft.length === 0 ? (
        <EmptyState
          icon={PlaneTakeoff}
          title={t('noAircraft')}
          action={{ label: t('addFirst'), onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {aircraft.map((ac) => {
            const stats = aircraftStats?.byReg.get(ac.registration.toUpperCase());
            const typeStats = aircraftStats?.byType.get(ac.type.toUpperCase());
            const staleDays = stats?.lastFlightDate ? daysSince(stats.lastFlightDate) : null;
            const isStale = ac.isActive && staleDays !== null && staleDays >= STALE_AFTER_DAYS;
            return (
            <div key={ac.id} className="card">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
                {/* Identity */}
                <div className="lg:w-52 lg:shrink-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold font-mono tracking-tight text-slate-800 dark:text-slate-100">
                      {ac.registration}
                    </h3>
                    <span className={ac.isActive ? 'badge-current' : 'badge-neutral'}>
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
                  {(ac.defaultDepartureIcao || ac.defaultArrivalIcao) && (
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('fields.homeAirfield')}
                      </dt>
                      <dd className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">
                        {ac.defaultDepartureIcao === ac.defaultArrivalIcao || !ac.defaultArrivalIcao
                          ? ac.defaultDepartureIcao
                          : `${ac.defaultDepartureIcao ?? '—'} → ${ac.defaultArrivalIcao}`}
                      </dd>
                    </div>
                  )}
                  {/* Flight statistics aggregated from the logbook */}
                  <div className="col-span-2 sm:col-span-3 lg:col-span-2 xl:col-span-4 pt-3 mt-1 border-t border-slate-100 dark:border-slate-700">
                    {stats ? (
                      <div className="flex flex-wrap gap-x-8 gap-y-2">
                        <div>
                          <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {t('stats.totalTime')}
                          </dt>
                          <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                            {fmtDuration(stats.totalMinutes)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {t('stats.flights')}
                          </dt>
                          <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                            {stats.totalFlights}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {t('stats.landings')}
                          </dt>
                          <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                            {stats.landingsDay + stats.landingsNight}
                            {stats.landingsNight > 0 && (
                              <span className="ml-1 font-normal text-xs text-slate-500 dark:text-slate-400">
                                ({stats.landingsNight} {t('stats.night')})
                              </span>
                            )}
                          </dd>
                        </div>
                        {stats.lastFlightDate && (
                          <div>
                            <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              {t('stats.lastFlown')}
                            </dt>
                            <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                              {fmtDate(stats.lastFlightDate)}
                              {isStale && (
                                <span className="badge-expiring text-xs font-normal">
                                  {t('stats.staleDays', { days: staleDays })}
                                </span>
                              )}
                            </dd>
                          </div>
                        )}
                        {recencyPrefs.perRegistration && (
                          <div>
                            <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              {t('stats.last90Days')}
                            </dt>
                            <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${RECENCY_DOT_CLASSES[recencyLevel(stats.landingsLast90Days)]}`}
                                aria-hidden="true"
                              />
                              {t('stats.landingsCount', {
                                count: stats.landingsLast90Days,
                                required: RECENCY_REQUIRED_LANDINGS,
                              })}
                              {stats.recencyLapsesOn && (
                                <span className="font-normal text-xs text-slate-500 dark:text-slate-400">
                                  {t('stats.until', { date: fmtDate(stats.recencyLapsesOn) })}
                                </span>
                              )}
                            </dd>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {t('stats.neverFlown')}
                      </p>
                    )}
                    {/* Model-level recency: aggregated across all registrations of this type */}
                    {recencyPrefs.perModel && typeStats && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${RECENCY_DOT_CLASSES[recencyLevel(typeStats.landingsLast90Days)]}`}
                          aria-hidden="true"
                        />
                        {t('stats.modelRecency', {
                          type: ac.type,
                          count: typeStats.landingsLast90Days,
                        })}
                        {typeStats.lastFlightDate && (
                          <span>
                            · {t('stats.modelLastFlown', { date: fmtDate(typeStats.lastFlightDate) })}
                          </span>
                        )}
                      </p>
                    )}
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
            );
          })}
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
    </PageWrapper>
  );
}
