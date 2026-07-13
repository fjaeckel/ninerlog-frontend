import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useFlight, useDeleteFlight } from '../../hooks/useFlights';
import FlightForm from '../../components/flights/FlightForm';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SignatureSection } from '../../components/flights/SignatureSection';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';

export default function FlightDetailPage() {
  const { flightId } = useParams<{ flightId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('flights');
  const { data: flight, isLoading, error } = useFlight(flightId || '');
  const deleteFlight = useDeleteFlight();
  const [showEditForm, setShowEditForm] = useState(false);
  const { fmtDateTime, fmtDateLong, fmtDuration } = useFormatPrefs();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-[960px] mx-auto px-4 py-8" role="status" aria-label={t('detail.loadingFlightDetails')}>
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="grid gap-6 md:grid-cols-2">
            <SkeletonCard className="h-64" />
            <SkeletonCard className="h-64" />
            <SkeletonCard className="h-48" />
            <SkeletonCard className="h-32" />
          </div>
        </div>
        <span className="sr-only">{t('detail.loadingFlightDetails')}</span>
      </div>
    );
  }

  if (error || !flight) {
    return (
      <div className="max-w-[960px] mx-auto px-4 py-8">
        <ErrorState
          title={t('detail.flightNotFound')}
          message={t('detail.flightNotFoundMessage')}
          onRetry={() => navigate('/flights')}
        />
      </div>
    );
  }

  const totalLandings = flight.allLandings;
  const totalTakeoffs = flight.takeoffsDay + flight.takeoffsNight;

  const hasInstrumentData =
    (flight.ifrTime ?? 0) > 0 ||
    (flight.actualInstrumentTime ?? 0) > 0 ||
    (flight.simulatedInstrumentTime ?? 0) > 0 ||
    (flight.holds ?? 0) > 0 ||
    (flight.approachesCount ?? 0) > 0 ||
    (flight.approaches && flight.approaches.length > 0) ||
    !!flight.isIpc;

  const hasTrainingData =
    (flight.simulatedFlightTime ?? 0) > 0 ||
    (flight.groundTrainingTime ?? 0) > 0 ||
    (flight.multiPilotTime ?? 0) > 0 ||
    !!flight.fstdType ||
    !!flight.isFlightReview ||
    !!flight.isProficiencyCheck;

  const handleDelete = async () => {
    await deleteFlight.mutateAsync(flight.id);
    navigate('/flights');
  };

  const timeFields = [
    { label: t('detail.totalBlockTime'), value: flight.totalTime },
    { label: t('detail.pilotFunction'), value: -1, text: flight.isPic ? 'PIC' : flight.isDual ? 'Dual' : '—' },
    { label: t('fields.picTime'), value: flight.picTime },
    { label: t('detail.dualTime'), value: flight.dualTime },
    { label: t('fields.soloTime'), value: flight.soloTime },
    { label: t('detail.crossCountry'), value: flight.crossCountryTime },
    { label: t('fields.nightTime'), value: flight.nightTime },
    { label: t('detail.sicTime'), value: flight.sicTime || 0 },
    { label: t('detail.dualGiven'), value: flight.dualGivenTime || 0 },
  ];

  return (
    <div className="max-w-[960px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <button
            onClick={() => navigate('/flights')}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mb-2 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('detail.backToFlights')}
          </button>
          <h1 className="page-title truncate">
            {flight.departureIcao || '—'} → {flight.arrivalIcao || '—'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {fmtDateLong(flight.date)}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowEditForm(true)}
            className="btn-secondary flex-1 sm:flex-none"
            aria-label={t('editFlightAriaLabel', { departure: flight.departureIcao, arrival: flight.arrivalIcao })}
          >
            <Pencil className="w-4 h-4" />
            {t('detail.edit')}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-secondary flex-1 sm:flex-none hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            aria-label={t('deleteFlightAriaLabel', { departure: flight.departureIcao, arrival: flight.arrivalIcao })}
          >
            <Trash2 className="w-4 h-4" />
            {t('detail.delete')}
          </button>
        </div>
      </div>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title={t('deleteTitle')}
        description={t('deleteDescription')}
        confirmLabel={t('deleteFlight')}
        variant="danger"
        isLoading={deleteFlight.isPending}
      />

      {/* Edit Form Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center sm:p-4 z-[1020]" role="dialog" aria-modal="true" aria-labelledby="edit-flight-title">
          <div className="bg-white dark:bg-slate-800 w-full sm:rounded-xl sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-slate-800 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 -mt-4 sm:-mt-6 pt-4 sm:pt-6 border-b border-slate-100 dark:border-slate-700 sm:border-0">
                <h2 id="edit-flight-title" className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">{t('editFlight')}</h2>
                <button
                  onClick={() => setShowEditForm(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-2xl min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={t('detail.close')}
                >
                  ×
                </button>
              </div>
              <FlightForm flightId={flight.id} onClose={() => setShowEditForm(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Flight Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Aircraft & Route */}
        <div className="card">
          <h2 className="section-title mb-4">{t('detail.aircraftAndRoute')}</h2>
          <dl className="space-y-3">
            <DetailRow label={t('detail.aircraft')} value={`${flight.aircraftReg} (${flight.aircraftType})`} />
            <DetailRow label={t('detail.departure')} value={flight.departureIcao || '—'} />
            {flight.offBlockTime && (
              <DetailRow label={t('detail.offBlock')} value={`${flight.offBlockTime.slice(0, 5)} UTC`} mono />
            )}
            {flight.departureTime && (
              <DetailRow label={t('detail.takeoff')} value={`${flight.departureTime.slice(0, 5)} UTC`} mono />
            )}
            <DetailRow label={t('detail.arrival')} value={flight.arrivalIcao || '—'} />
            {flight.arrivalTime && (
              <DetailRow label={t('detail.landing')} value={`${flight.arrivalTime.slice(0, 5)} UTC`} mono />
            )}
            {flight.onBlockTime && (
              <DetailRow label={t('detail.onBlock')} value={`${flight.onBlockTime.slice(0, 5)} UTC`} mono />
            )}
            {flight.route && (
              <DetailRow label={t('fields.route')} value={flight.route} mono />
            )}
            {flight.distance > 0 && (
              <DetailRow label={t('fields.distance')} value={`${flight.distance.toFixed(1)} NM`} mono />
            )}
            {flight.launchMethod && (
              <DetailRow label={t('fields.launchMethod')} value={t(`launchMethods.${flight.launchMethod === 'self-launch' ? 'selfLaunch' : flight.launchMethod}`, { defaultValue: flight.launchMethod })} />
            )}
          </dl>
        </div>

        {/* Flight Times */}
        <div className="card">
          <h2 className="section-title mb-4">{t('detail.blockTimes')}</h2>
          <dl className="space-y-3">
            {timeFields.map(({ label, value, text }) => (
              <div key={label} className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                <dd className={`font-medium ${value > 0 || text ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'} ${!text ? 'font-mono tabular-nums' : ''}`}>
                  {text ?? fmtDuration(value)}
                </dd>
              </div>
            ))}
            {flight.picName && (
              <DetailRow label={t('fields.picName')} value={flight.picName} />
            )}
          </dl>
        </div>

        {/* Takeoffs & Landings */}
        <div className="card">
          <h2 className="section-title mb-4">{t('detail.takeoffsAndLandings')}</h2>
          <dl className="space-y-3">
            <DetailRow label={t('fields.dayTakeoffs')} value={String(flight.takeoffsDay)} mono />
            <DetailRow label={t('fields.nightTakeoffs')} value={String(flight.takeoffsNight)} mono />
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">{t('detail.totalTakeoffs')}</dt>
              <dd className="font-bold text-slate-800 dark:text-slate-100 font-mono tabular-nums">{totalTakeoffs}</dd>
            </div>
            <DetailRow label={t('fields.dayLandings')} value={String(flight.landingsDay)} mono />
            <DetailRow label={t('fields.nightLandings')} value={String(flight.landingsNight)} mono />
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">{t('detail.totalLandings')}</dt>
              <dd className="font-bold text-slate-800 dark:text-slate-100 font-mono tabular-nums">{totalLandings}</dd>
            </div>
          </dl>
        </div>

        {/* Instrument & Approaches */}
        {hasInstrumentData && (
          <div className="card">
            <h2 className="section-title mb-4">{t('detail.instrumentAndApproaches')}</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">{t('fields.ifrTime')}</dt>
                <dd className={`font-medium font-mono tabular-nums ${flight.ifrTime > 0 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'}`}>
                  {fmtDuration(flight.ifrTime)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">{t('fields.actualInstrumentTime')}</dt>
                <dd className={`font-medium font-mono tabular-nums ${(flight.actualInstrumentTime ?? 0) > 0 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'}`}>
                  {fmtDuration(flight.actualInstrumentTime ?? 0)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">{t('fields.simulatedInstrumentTime')}</dt>
                <dd className={`font-medium font-mono tabular-nums ${(flight.simulatedInstrumentTime ?? 0) > 0 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'}`}>
                  {fmtDuration(flight.simulatedInstrumentTime ?? 0)}
                </dd>
              </div>
              <DetailRow label={t('fields.holds')} value={String(flight.holds ?? 0)} mono />
              <DetailRow label={t('fields.approaches')} value={String(flight.approachesCount ?? 0)} mono />
              {flight.isIpc && (
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">{t('fields.isIpc')}</dt>
                  <dd>
                    <span className="badge-info text-xs">{t('detail.yes')}</span>
                  </dd>
                </div>
              )}
              {flight.approaches && flight.approaches.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                  <dt className="text-slate-500 dark:text-slate-400 text-sm mb-2">{t('fields.approaches')}</dt>
                  <ul className="space-y-1.5">
                    {flight.approaches.map((a, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <span className="badge-info text-xs">
                          {t(`approachTypes.${a.type}`, { defaultValue: a.type })}
                        </span>
                        <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200">
                          {a.airport || '—'}
                          {a.runway ? ` · RWY ${a.runway}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Training & Currency */}
        {hasTrainingData && (
          <div className="card">
            <h2 className="section-title mb-4">{t('detail.trainingAndCurrency')}</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">{t('fields.simulatedFlightTime')}</dt>
                <dd className={`font-medium font-mono tabular-nums ${(flight.simulatedFlightTime ?? 0) > 0 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'}`}>
                  {fmtDuration(flight.simulatedFlightTime ?? 0)}
                </dd>
              </div>
              {flight.fstdType && (
                <DetailRow label={t('fields.fstdType')} value={flight.fstdType} />
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">{t('fields.groundTrainingTime')}</dt>
                <dd className={`font-medium font-mono tabular-nums ${(flight.groundTrainingTime ?? 0) > 0 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'}`}>
                  {fmtDuration(flight.groundTrainingTime ?? 0)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">{t('fields.multiPilotTime')}</dt>
                <dd className={`font-medium font-mono tabular-nums ${(flight.multiPilotTime ?? 0) > 0 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'}`}>
                  {fmtDuration(flight.multiPilotTime ?? 0)}
                </dd>
              </div>
              {flight.isFlightReview && (
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">{t('fields.isFlightReview')}</dt>
                  <dd>
                    <span className="badge-info text-xs">{t('detail.yes')}</span>
                  </dd>
                </div>
              )}
              {flight.isProficiencyCheck && (
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">{t('fields.isProficiencyCheck')}</dt>
                  <dd>
                    <span className="badge-info text-xs">{t('detail.yes')}</span>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Remarks & Comments */}
        <div className="card">
          <h2 className="section-title mb-4">{t('detail.remarksAndComments')}</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-slate-500 dark:text-slate-400 text-sm mb-1">{t('fields.remarks')}</dt>
              <dd className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {flight.remarks || <span className="text-slate-400 italic">—</span>}
              </dd>
            </div>
            {flight.instructorName && (
              <div>
                <dt className="text-slate-500 dark:text-slate-400 text-sm mb-1">{t('detail.instructor')}</dt>
                <dd className="text-slate-700 dark:text-slate-300">{flight.instructorName}</dd>
              </div>
            )}
            {flight.instructorComments && (
              <div>
                <dt className="text-slate-500 dark:text-slate-400 text-sm mb-1">{t('detail.instructorComments')}</dt>
                <dd className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{flight.instructorComments}</dd>
              </div>
            )}
            {flight.endorsements && (
              <div>
                <dt className="text-slate-500 dark:text-slate-400 text-sm mb-1">{t('fields.endorsements')}</dt>
                <dd className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{flight.endorsements}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Instructor Signature */}
        <SignatureSection flight={flight} />

        {/* Crew Members */}
        {flight.crewMembers && flight.crewMembers.length > 0 && (
          <div className="card">
            <h2 className="section-title mb-4">{t('sections.crew')}</h2>
            <div className="space-y-2">
              {flight.crewMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-2 text-sm">
                  <span className="badge-info text-xs">{member.role}</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{member.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-6 text-xs text-slate-400 dark:text-slate-500 text-center">
        {t('detail.created', { date: fmtDateTime(flight.createdAt) })}
        {flight.updatedAt !== flight.createdAt &&
          ` · ${t('detail.updated', { date: fmtDateTime(flight.updatedAt) })}`}
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`font-medium text-slate-800 dark:text-slate-100 ${mono ? 'font-mono tabular-nums' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
