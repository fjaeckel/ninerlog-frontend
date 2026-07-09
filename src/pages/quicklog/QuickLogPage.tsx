import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PlaneTakeoff, PlaneLanding, Timer, CheckCircle2, Trash2, WifiOff, ArrowRight,
} from 'lucide-react';
import { PageWrapper, PageHeader } from '../../components/ui/PageWrapper';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useAircraft, useCreateAircraft } from '../../hooks/useAircraft';
import { extractApiError } from '../../lib/errors';
import {
  useCurrentFlightSession,
  useRecordFlightSessionEvent,
  useDiscardFlightSession,
  useQuickLogQueueSync,
  FlightSessionEventError,
  type FlightSession,
  type FlightSessionEvent,
  type FlightSessionEventType,
} from '../../hooks/useFlightSession';
import { loadQuickLogQueue } from '../../lib/quickLogQueue';

const LAST_REG_KEY = 'ninerlog.quicklog.lastReg';
const NEW_AIRCRAFT_OPTION = '__new__';

// Best-effort GPS fix: resolves null rather than blocking the tap when the
// phone can't produce a position quickly (cockpit, airplane mode, denied).
function getPosition(timeoutMs = 4000): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 }
    );
  });
}

// A flight walks offblock → takeoff → landing → onblock; the primary button
// always offers the first step the open session is still missing.
function nextEventFor(session: FlightSession | null): FlightSessionEventType {
  if (!session || session.status !== 'open') return 'offblock';
  if (!session.takeoffAt) return 'takeoff';
  if (!session.landingAt) return 'landing';
  return 'onblock';
}

function formatUTC(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}Z`;
}

function formatElapsed(fromIso: string, now: number): string {
  const totalSec = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function QuickLogPage() {
  const { t } = useTranslation(['quicklog', 'common']);
  const { data: session, isLoading } = useCurrentFlightSession();
  const { data: aircraft } = useAircraft();
  const createAircraft = useCreateAircraft();
  const recordEvent = useRecordFlightSessionEvent();
  const discardSession = useDiscardFlightSession();
  useQuickLogQueueSync();

  const [selectedReg, setSelectedReg] = useState(() => localStorage.getItem(LAST_REG_KEY) ?? '');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queuedCount, setQueuedCount] = useState(() => loadQuickLogQueue().length);
  const [completedFlightId, setCompletedFlightId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Quick-add new aircraft state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddReg, setQuickAddReg] = useState('');
  const [quickAddType, setQuickAddType] = useState('');
  const [quickAddMake, setQuickAddMake] = useState('');
  const [quickAddModel, setQuickAddModel] = useState('');
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  const openSession = session?.status === 'open' ? session : null;
  const nextEvent = nextEventFor(openSession);

  // Tick the elapsed-time display while a session is running
  useEffect(() => {
    if (!openSession?.offBlockAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [openSession?.offBlockAt]);

  // Single-plane pilots get their aircraft preselected without an extra tap
  const effectiveReg = selectedReg || (aircraft?.length === 1 ? aircraft[0].registration : '');
  const activeReg = openSession?.aircraftReg ?? effectiveReg;

  const handleAircraftSelect = (value: string) => {
    if (value === NEW_AIRCRAFT_OPTION) {
      setShowQuickAdd(true);
      return;
    }
    setSelectedReg(value);
    setShowQuickAdd(false);
  };

  const handleQuickAdd = async () => {
    const regUppercase = quickAddReg.trim().toUpperCase();
    if (!regUppercase || !quickAddType || !quickAddMake || !quickAddModel) return;
    setQuickAddError(null);
    try {
      await createAircraft.mutateAsync({
        registration: regUppercase,
        type: quickAddType.toUpperCase(),
        make: quickAddMake,
        model: quickAddModel,
        isComplex: false,
        isHighPerformance: false,
        isTailwheel: false,
      });
      setSelectedReg(regUppercase);
      setShowQuickAdd(false);
      setQuickAddReg('');
      setQuickAddType('');
      setQuickAddMake('');
      setQuickAddModel('');
    } catch (error) {
      setQuickAddError(extractApiError(error, t('quicklog:failedToQuickAdd')));
    }
  };

  const handleTap = async (type: FlightSessionEventType) => {
    setErrorMessage(null);
    const position = await getPosition();
    const event: FlightSessionEvent = { type };
    if (position) {
      event.lat = position.lat;
      event.lon = position.lon;
    }
    // Registration rides along on every tap so the session always completes
    if (activeReg) {
      event.aircraftReg = activeReg;
      localStorage.setItem(LAST_REG_KEY, activeReg);
    }
    try {
      const result = await recordEvent.mutateAsync(event);
      setQueuedCount(loadQuickLogQueue().length);
      if (result.session?.status === 'completed' && result.session.flightId) {
        setCompletedFlightId(result.session.flightId);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof FlightSessionEventError ? err.message : t('quicklog:genericError')
      );
    }
  };

  const handleDiscard = async () => {
    await discardSession.mutateAsync();
    setQueuedCount(loadQuickLogQueue().length);
    setShowDiscardConfirm(false);
    setErrorMessage(null);
  };

  const timeline = useMemo(
    () => [
      { type: 'offblock' as const, at: openSession?.offBlockAt, label: t('quicklog:offBlock') },
      { type: 'takeoff' as const, at: openSession?.takeoffAt, label: t('quicklog:takeoff') },
      { type: 'landing' as const, at: openSession?.landingAt, label: t('quicklog:landing') },
      { type: 'onblock' as const, at: null, label: t('quicklog:onBlock') },
    ],
    [openSession, t]
  );

  const tapLabels: Record<FlightSessionEventType, string> = {
    offblock: t('quicklog:tapOffBlock'),
    takeoff: t('quicklog:tapTakeoff'),
    landing: t('quicklog:tapLanding'),
    onblock: t('quicklog:tapOnBlock'),
  };

  const tapColors: Record<FlightSessionEventType, string> = {
    offblock: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
    takeoff: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
    landing: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
    onblock: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
  };

  const tapIcons: Record<FlightSessionEventType, React.ReactNode> = {
    offblock: <Timer className="w-10 h-10" aria-hidden="true" />,
    takeoff: <PlaneTakeoff className="w-10 h-10" aria-hidden="true" />,
    landing: <PlaneLanding className="w-10 h-10" aria-hidden="true" />,
    onblock: <Timer className="w-10 h-10" aria-hidden="true" />,
  };

  // Completion celebration replaces the tap UI until the pilot moves on
  if (completedFlightId) {
    return (
      <PageWrapper maxWidth="form">
        <div className="card p-8 text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" aria-hidden="true" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t('quicklog:flightLogged')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('quicklog:flightLoggedHint')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to={`/flights/${completedFlightId}`} className="btn-primary justify-center">
              {t('quicklog:reviewFlight')}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <button onClick={() => setCompletedFlightId(null)} className="btn-secondary justify-center">
              {t('quicklog:logAnother')}
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper maxWidth="form">
      <PageHeader title={t('quicklog:title')} subtitle={t('quicklog:subtitle')} />

      {queuedCount > 0 && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm">
          <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
          {t('quicklog:queuedTaps', { count: queuedCount })}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm" role="alert">
          {errorMessage}
        </div>
      )}

      {/* Aircraft selection — editable until the session knows its aircraft */}
      <div className="card p-4 mb-4">
        <label htmlFor="quicklog-aircraft" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {t('quicklog:aircraft')}
        </label>
        {openSession?.aircraftReg ? (
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{openSession.aircraftReg}</p>
        ) : (
          <div>
            <select
              id="quicklog-aircraft"
              value={showQuickAdd ? NEW_AIRCRAFT_OPTION : effectiveReg}
              onChange={(e) => handleAircraftSelect(e.target.value)}
              className="input w-full"
            >
              <option value="">{t('quicklog:selectAircraft')}</option>
              {aircraft?.map((a) => (
                <option key={a.id} value={a.registration}>
                  {a.registration} — {a.type}
                </option>
              ))}
              <option value={NEW_AIRCRAFT_OPTION}>{t('quicklog:addNewAircraft')}</option>
            </select>

            {/* Quick-add aircraft inline form */}
            {showQuickAdd && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                  {t('quicklog:quickAddTitle')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={quickAddReg}
                    onChange={(e) => setQuickAddReg(e.target.value.toUpperCase())}
                    className="input text-sm"
                    placeholder={t('quicklog:registrationPlaceholder')}
                    autoComplete="off"
                  />
                  <input
                    type="text"
                    value={quickAddType}
                    onChange={(e) => setQuickAddType(e.target.value.toUpperCase())}
                    className="input text-sm"
                    placeholder={t('quicklog:typePlaceholder')}
                  />
                  <input
                    type="text"
                    value={quickAddMake}
                    onChange={(e) => setQuickAddMake(e.target.value)}
                    className="input text-sm"
                    placeholder={t('quicklog:makePlaceholder')}
                  />
                  <input
                    type="text"
                    value={quickAddModel}
                    onChange={(e) => setQuickAddModel(e.target.value)}
                    className="input text-sm"
                    placeholder={t('quicklog:modelPlaceholder')}
                  />
                </div>
                {quickAddError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{quickAddError}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => void handleQuickAdd()}
                    disabled={!quickAddReg || !quickAddType || !quickAddMake || !quickAddModel || createAircraft.isPending}
                    className="btn-primary btn-sm text-xs"
                  >
                    {createAircraft.isPending ? t('common:saving') : t('quicklog:quickAddSave')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuickAdd(false)}
                    className="btn-ghost btn-sm text-xs"
                  >
                    {t('quicklog:skip')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* The big tap button */}
      <button
        onClick={() => void handleTap(nextEvent)}
        disabled={isLoading || recordEvent.isPending || (nextEvent === 'offblock' && !activeReg)}
        className={`w-full rounded-2xl text-white shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed py-10 flex flex-col items-center gap-3 ${tapColors[nextEvent]}`}
        aria-label={tapLabels[nextEvent]}
      >
        {tapIcons[nextEvent]}
        <span className="text-2xl font-bold tracking-wide">{tapLabels[nextEvent]}</span>
        {recordEvent.isPending && <span className="text-sm opacity-80">{t('common:loading')}</span>}
      </button>
      {nextEvent === 'offblock' && !activeReg && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-2">
          {t('quicklog:selectAircraftFirst')}
        </p>
      )}

      {/* Skip straight to on-block when takeoff/landing taps were missed */}
      {openSession && nextEvent !== 'onblock' && nextEvent !== 'offblock' && (
        <button
          onClick={() => void handleTap('onblock')}
          disabled={recordEvent.isPending}
          className="btn-secondary w-full justify-center mt-3"
        >
          {t('quicklog:skipToOnBlock')}
        </button>
      )}

      {/* Running session state */}
      {openSession?.offBlockAt && (
        <div className="card p-4 mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('quicklog:blockTime')}
            </span>
            <span className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {formatElapsed(openSession.offBlockAt, now)}
            </span>
          </div>
          <ol className="space-y-1.5">
            {timeline.map((entry) => (
              <li key={entry.type} className="flex items-center justify-between text-sm">
                <span
                  className={
                    entry.at
                      ? 'text-slate-900 dark:text-white font-medium'
                      : entry.type === nextEvent
                        ? 'text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-slate-400 dark:text-slate-500'
                  }
                >
                  {entry.label}
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatUTC(entry.at) ?? (entry.type === nextEvent ? '· · ·' : '—')}
                </span>
              </li>
            ))}
          </ol>
          {(openSession.departureIcao || openSession.arrivalIcao) && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {openSession.departureIcao ?? '????'}
              {' → '}
              {openSession.arrivalIcao ?? '????'}
            </p>
          )}
          <button
            onClick={() => setShowDiscardConfirm(true)}
            className="btn-ghost w-full justify-center text-red-600 dark:text-red-400"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            {t('quicklog:discard')}
          </button>
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-6">
        {t('quicklog:gpsHint')}
      </p>

      <ConfirmDialog
        open={showDiscardConfirm}
        onConfirm={handleDiscard}
        onCancel={() => setShowDiscardConfirm(false)}
        title={t('quicklog:discardTitle')}
        description={t('quicklog:discardDescription')}
        confirmLabel={t('quicklog:discardConfirm')}
        isLoading={discardSession.isPending}
      />
    </PageWrapper>
  );
}
