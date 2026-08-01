import { useState, type ReactNode } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useFlight, useDeleteFlight } from '../../hooks/useFlights';
import FlightForm from '../../components/flights/FlightForm';
import FlightRouteCard from '../../components/flights/FlightRouteCard';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SignatureSection } from '../../components/flights/SignatureSection';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { formatAirportLabel } from '../../lib/airport';
import { cn } from '../../lib/cn';

export default function FlightDetailPage() {
  const { flightId } = useParams<{ flightId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // The list passes its query string along so going back keeps the search,
  // filters, sort and page the user came from.
  const listSearch = (location.state as { listSearch?: string } | null)?.listSearch ?? '';
  const flightsListPath = `/flights${listSearch}`;
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
          onRetry={() => navigate(flightsListPath)}
        />
      </div>
    );
  }

  const totalLandings = flight.allLandings;
  const totalTakeoffs = flight.takeoffsDay + flight.takeoffsNight;

  // Airport names are resolved by the API and are null for off-airport sites,
  // in which case the raw stored location is shown.
  const departureLabel = formatAirportLabel(flight.departureIcao, flight.departureAirportName);
  const arrivalLabel = formatAirportLabel(flight.arrivalIcao, flight.arrivalAirportName);

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
    navigate(flightsListPath);
  };

  const timeFields = [
    { label: t('detail.totalBlockTime'), value: flight.totalTime },
    {
      label: t('detail.pilotFunction'),
      value: -1,
      text: flight.isPic ? 'PIC' : flight.isDual ? 'Dual' : (flight.sicTime || 0) > 0 ? 'SIC' : '—',
    },
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
            onClick={() => navigate(flightsListPath)}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mb-2 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('detail.backToFlights')}
          </button>
          <h1 className="page-title truncate" title={`${departureLabel} → ${arrivalLabel}`}>
            {flight.departureIcao || '—'} → {flight.arrivalIcao || '—'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">{fmtDateLong(flight.date)}</p>
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
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center sm:p-4 z-[1020]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-flight-title"
        >
          <div className="bg-white dark:bg-slate-800 w-full sm:rounded-xl sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-slate-800 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 -mt-4 sm:-mt-6 pt-4 sm:pt-6 border-b border-slate-100 dark:border-slate-700 sm:border-0">
                <h2 id="edit-flight-title" className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {t('editFlight')}
                </h2>
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
        <FlightRouteCard flight={flight} />

        {/* Flight Times */}
        <div className="card">
          <h2 className="section-title mb-4">{t('detail.blockTimes')}</h2>
          <dl className="space-y-3">
            {timeFields.map(({ label, value, text }) => (
              <DetailRow
                key={label}
                label={label}
                value={text ?? fmtDuration(value)}
                mono={!text}
                muted={value <= 0 && !text}
              />
            ))}
            {flight.picName && <DetailRow label={t('fields.picName')} value={flight.picName} />}
          </dl>
        </div>

        {/* Takeoffs & Landings */}
        <div className="card">
          <h2 className="section-title mb-4">{t('detail.takeoffsAndLandings')}</h2>
          <dl className="space-y-3">
            <DetailRow label={t('fields.dayTakeoffs')} value={String(flight.takeoffsDay)} mono />
            <DetailRow label={t('fields.nightTakeoffs')} value={String(flight.takeoffsNight)} mono />
            <DetailRow
              label={t('detail.totalTakeoffs')}
              value={String(totalTakeoffs)}
              mono
              strong
              className="border-t border-slate-200 dark:border-slate-700 pt-2"
            />
            <DetailRow label={t('fields.dayLandings')} value={String(flight.landingsDay)} mono />
            <DetailRow label={t('fields.nightLandings')} value={String(flight.landingsNight)} mono />
            <DetailRow
              label={t('detail.totalLandings')}
              value={String(totalLandings)}
              mono
              strong
              className="border-t border-slate-200 dark:border-slate-700 pt-2"
            />
          </dl>
        </div>

        {/* Instrument & Approaches */}
        {hasInstrumentData && (
          <div className="card">
            <h2 className="section-title mb-4">{t('detail.instrumentAndApproaches')}</h2>
            <dl className="space-y-3">
              <DurationRow label={t('fields.ifrTime')} minutes={flight.ifrTime} />
              <DurationRow label={t('fields.actualInstrumentTime')} minutes={flight.actualInstrumentTime ?? 0} />
              <DurationRow label={t('fields.simulatedInstrumentTime')} minutes={flight.simulatedInstrumentTime ?? 0} />
              <DetailRow label={t('fields.holds')} value={String(flight.holds ?? 0)} mono />
              <DetailRow label={t('fields.approaches')} value={String(flight.approachesCount ?? 0)} mono />
              {flight.isIpc && (
                <DetailRow
                  label={t('fields.isIpc')}
                  value={<span className="badge-info text-xs">{t('detail.yes')}</span>}
                />
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
              <DurationRow label={t('fields.simulatedFlightTime')} minutes={flight.simulatedFlightTime ?? 0} />
              {flight.fstdType && <DetailRow label={t('fields.fstdType')} value={flight.fstdType} />}
              <DurationRow label={t('fields.groundTrainingTime')} minutes={flight.groundTrainingTime ?? 0} />
              <DurationRow label={t('fields.multiPilotTime')} minutes={flight.multiPilotTime ?? 0} />
              {flight.isFlightReview && (
                <DetailRow
                  label={t('fields.isFlightReview')}
                  value={<span className="badge-info text-xs">{t('detail.yes')}</span>}
                />
              )}
              {flight.isProficiencyCheck && (
                <DetailRow
                  label={t('fields.isProficiencyCheck')}
                  value={<span className="badge-info text-xs">{t('detail.yes')}</span>}
                />
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
        {flight.updatedAt !== flight.createdAt && ` · ${t('detail.updated', { date: fmtDateTime(flight.updatedAt) })}`}
      </div>
    </div>
  );
}

interface DetailRowProps {
  label: string;
  value: ReactNode;
  /** Tabular values (times, counts, distances). */
  mono?: boolean;
  /** Dim a zero/empty value without dropping the row. */
  muted?: boolean;
  /** Totals and other rows that summarise the ones above them. */
  strong?: boolean;
  className?: string;
}

function DetailRow({ label, value, mono, muted, strong, className }: DetailRowProps) {
  return (
    // gap-4 keeps a gutter between label and value once either of them wraps;
    // the label may take at most half the row so the value keeps room to wrap
    // into rather than being squeezed to one character per line.
    <div className={cn('flex justify-between items-baseline gap-4', className)}>
      <dt
        className={cn('text-slate-500 dark:text-slate-400 max-w-[55%] shrink-0 break-words', strong && 'font-medium')}
      >
        {label}
      </dt>
      <dd
        className={cn(
          'min-w-0 text-right break-words font-medium',
          muted ? 'text-slate-300 dark:text-slate-600' : 'text-slate-800 dark:text-slate-100',
          mono && 'font-mono tabular-nums',
          strong && 'font-bold'
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** A duration in minutes, dimmed when the flight logged none of it. */
function DurationRow({ label, minutes }: { label: string; minutes: number }) {
  const { fmtDuration } = useFormatPrefs();
  return <DetailRow label={label} value={fmtDuration(minutes)} mono muted={minutes <= 0} />;
}
