import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useAircraft } from '../../hooks/useAircraft';
import { useCreateFlight } from '../../hooks/useFlights';
import { useCreateFlightBatch } from '../../hooks/useFlightBatch';
import { useAuthStore } from '../../stores/authStore';
import { normalizeLocation } from '../../lib/airport';
import { cn } from '../../lib/cn';
import { extractApiError } from '../../lib/errors';
import { formatDuration, type TimeDisplayFormat } from '../../lib/duration';
import type { ClockFormat } from '../../lib/timeOfDay';
import {
  MAX_CIRCUITS,
  emptyLeg,
  legMinutes,
  legProblem,
  nextLeg,
  parseLegError,
  toApiTime,
  totalMinutes,
  type CircuitLeg,
} from '../../lib/circuits';
import type { FlightCrewMemberInput } from '../../types/api';
import { TimeOfDayInput } from '../ui/TimeOfDayInput';
import { CrewEditor } from './CrewEditor';
import { crewDerivedNames } from './crewRoles';
import { LaunchMethodChips } from './LaunchMethodChips';
import { isLaunchMethod, type LaunchMethod } from '../../lib/launchMethod';

/** Shared fields carried over from the flight form. */
export interface CircuitsInitial {
  date?: string;
  aircraftReg?: string;
  aircraftType?: string;
  departureIcao?: string;
  arrivalIcao?: string;
  launchMethod?: string | null;
  crew?: FlightCrewMemberInput[];
  remarks?: string;
}

interface CircuitsFormProps {
  initial?: CircuitsInitial;
  /** Back to the single-flight form. */
  onBack: () => void;
  /** Called with the number of flights created. */
  onSaved: (count: number) => void;
}

type EntryMode = 'legs' | 'series';

const today = () => new Date().toISOString().split('T')[0];

/** Several circuits at one site on one day, as one batch or as one series row. */
export function CircuitsForm({ initial, onBack, onSaved }: CircuitsFormProps) {
  const { t } = useTranslation(['flights', 'common']);
  const { user } = useAuthStore();
  const fmt = (user?.timeDisplayFormat as TimeDisplayFormat) ?? 'hm';
  const clockFormat = (user?.clockFormat as ClockFormat) ?? '24h';
  const { data: aircraftList } = useAircraft();
  const createBatch = useCreateFlightBatch();
  const createFlight = useCreateFlight();
  const fleetListId = useId();

  const [mode, setMode] = useState<EntryMode>('legs');
  const [date, setDate] = useState(initial?.date || today());
  const [aircraftReg, setAircraftReg] = useState((initial?.aircraftReg ?? '').toUpperCase());
  const [aircraftType, setAircraftType] = useState((initial?.aircraftType ?? '').toUpperCase());
  const [site, setSite] = useState(initial?.departureIcao ?? '');
  const initialArrival = initial?.arrivalIcao ?? '';
  const [arrival, setArrival] = useState(
    initialArrival && initialArrival.toUpperCase() !== (initial?.departureIcao ?? '').toUpperCase() ? initialArrival : '',
  );
  const [launchMethod, setLaunchMethod] = useState<LaunchMethod | ''>(
    isLaunchMethod(initial?.launchMethod) ? initial.launchMethod : '',
  );
  const [crew, setCrew] = useState<FlightCrewMemberInput[]>(initial?.crew ?? []);
  const [remarks, setRemarks] = useState(initial?.remarks ?? '');
  const [legs, setLegs] = useState<CircuitLeg[]>([emptyLeg()]);
  const [series, setSeries] = useState<CircuitLeg>(emptyLeg());
  const [launches, setLaunches] = useState('');

  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingFocus.current) return;
    inputRefs.current.get(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  }, [legs.length]);
  const focusInput = (key: string) => inputRefs.current.get(key)?.focus();

  const matched = (aircraftList ?? []).find((ac) => ac.registration.toUpperCase() === aircraftReg);
  const effectiveType = matched ? matched.type.toUpperCase() : aircraftType;

  const setLeg = (index: number, patch: Partial<CircuitLeg>) => {
    setLegs((prev) => prev.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)));
    setRowErrors((prev) => {
      if (!(index in prev)) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const addLeg = () => {
    if (legs.length >= MAX_CIRCUITS) return;
    const index = legs.length;
    setLegs((prev) => (prev.length >= MAX_CIRCUITS ? prev : [...prev, nextLeg(prev)]));
    pendingFocus.current = `${index}-landing`;
  };

  const removeLeg = (index: number) => {
    setLegs((prev) => (prev.length === 1 ? [emptyLeg()] : prev.filter((_, i) => i !== index)));
    setRowErrors({});
  };

  const onRowKeyDown = (index: number, field: 'takeoff' | 'landing') => (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (field === 'takeoff') focusInput(`${index}-landing`);
    else if (index === legs.length - 1) addLeg();
    else focusInput(`${index + 1}-takeoff`);
  };

  const problemText = (leg: CircuitLeg): string | null => {
    const p = legProblem(leg);
    return p ? t(`circuits.problem.${p}`) : null;
  };

  const template = () => {
    const names = crewDerivedNames(crew);
    const siteIcao = normalizeLocation(site);
    return {
      date,
      isSimulator: false,
      aircraftReg: aircraftReg.trim().toUpperCase(),
      aircraftType: effectiveType.trim().toUpperCase(),
      departureIcao: siteIcao,
      arrivalIcao: arrival.trim() ? normalizeLocation(arrival) : siteIcao,
      ifrTime: 0,
      landings: 1,
      launchMethod: launchMethod || null,
      remarks: remarks.trim() || null,
      instructorName: names.instructorName,
      picName: names.picName,
      crewMembers: crew.length > 0 ? crew : undefined,
      isOutlanding: false,
      isTowFlight: false,
    };
  };

  const validateShared = (): boolean => {
    const errs: Record<string, string> = {};
    if (!date) errs.date = t('circuits.required');
    if (!aircraftReg.trim()) errs.aircraftReg = t('circuits.required');
    if (!effectiveType.trim()) errs.aircraftType = t('circuits.required');
    if (!site.trim()) errs.site = t('circuits.required');
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError(null);
    const sharedOk = validateShared();

    if (mode === 'series') {
      const problem = problemText(series);
      const count = Number(launches);
      const launchesOk = Number.isInteger(count) && count >= 1;
      setRowErrors(problem ? { 0: problem } : {});
      if (!launchesOk) setFieldErrors((prev) => ({ ...prev, launches: t('circuits.launchesInvalid') }));
      if (!sharedOk || problem || !launchesOk) return;
      setSubmitting(true);
      try {
        await createFlight.mutateAsync({
          ...template(),
          departureTime: toApiTime(series.takeoff),
          arrivalTime: toApiTime(series.landing),
          landings: count,
          launches: count,
        });
        onSaved(1);
      } catch (err) {
        setApiError(extractApiError(err, t('form.failedToSave')));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const problems: Record<number, string> = {};
    legs.forEach((leg, i) => {
      const p = problemText(leg);
      if (p) problems[i] = p;
    });
    setRowErrors(problems);
    if (!sharedOk || Object.keys(problems).length > 0) return;

    setSubmitting(true);
    try {
      const result = await createBatch.mutateAsync({
        template: template(),
        legs: legs.map((leg) => ({ departureTime: toApiTime(leg.takeoff), arrivalTime: toApiTime(leg.landing) })),
      });
      onSaved(result.flights.length);
    } catch (err) {
      const message = extractApiError(err, t('form.failedToSave'));
      const legError = parseLegError(message);
      if (legError && legError.index < legs.length) {
        setRowErrors({ [legError.index]: legError.message });
        setApiError(t('circuits.legRejected', { n: legError.index + 1 }));
      } else {
        setApiError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const total = totalMinutes(legs);
  const completeLegs = legs.filter((leg) => legMinutes(leg) !== null).length;
  const seriesMinutes = legMinutes(series);

  const timeInput = (id: string, value: string, onChange: (v: string) => void, label: string, invalid: boolean) => (
    <TimeOfDayInput
      id={id}
      value={value}
      onChange={onChange}
      clockFormat={clockFormat}
      invalid={invalid}
      title={label}
      className="input text-center tabular-nums px-1"
      ref={(el: HTMLInputElement | null) => {
        const key = id.replace(/^circuit-/, '');
        if (el) inputRefs.current.set(key, el);
        else inputRefs.current.delete(key);
      }}
    />
  );

  const fieldError = (key: string) =>
    fieldErrors[key] ? <p className="form-error">{fieldErrors[key]}</p> : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 max-w-full overflow-x-hidden" data-testid="circuits-form">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="btn-ghost btn-sm min-h-11 -ml-2">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {t('circuits.back')}
        </button>
      </div>

      <div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('circuits.title')}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('circuits.intro')}</p>
      </div>

      {apiError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {apiError}
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('circuits.shared')}</legend>
        <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
          <div>
            <label htmlFor="circuits-date" className="form-label">{t('fields.date')}</label>
            <input id="circuits-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input px-1.5" />
            {fieldError('date')}
          </div>
          <div>
            <label htmlFor="circuits-reg" className="form-label">{t('fields.aircraftReg')}</label>
            <input
              id="circuits-reg"
              type="text"
              list={fleetListId}
              autoComplete="off"
              value={aircraftReg}
              onChange={(e) => setAircraftReg(e.target.value.toUpperCase())}
              className="input"
            />
            <datalist id={fleetListId}>
              {(aircraftList ?? []).filter((ac) => ac.isActive).map((ac) => (
                <option key={ac.id} value={ac.registration}>{ac.type}</option>
              ))}
            </datalist>
            {fieldError('aircraftReg')}
          </div>
          {!matched && (
            <div>
              <label htmlFor="circuits-type" className="form-label">{t('fields.aircraftType')}</label>
              <input
                id="circuits-type"
                type="text"
                value={aircraftType}
                onChange={(e) => setAircraftType(e.target.value.toUpperCase())}
                className="input"
              />
              {fieldError('aircraftType')}
            </div>
          )}
          <div>
            <label htmlFor="circuits-site" className="form-label">{t('circuits.site')}</label>
            <input
              id="circuits-site"
              type="text"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="input"
              placeholder={t('form.locationPlaceholder')}
            />
            {fieldError('site')}
          </div>
          <div>
            <label htmlFor="circuits-arrival" className="form-label">{t('circuits.landingSite')}</label>
            <input
              id="circuits-arrival"
              type="text"
              value={arrival}
              onChange={(e) => setArrival(e.target.value)}
              className="input"
              placeholder={site || t('circuits.sameAsSite')}
            />
          </div>
        </div>

        <div>
          <p className="form-label">{t('fields.launchMethod')}</p>
          <LaunchMethodChips value={launchMethod} onChange={setLaunchMethod} label={t('fields.launchMethod')} />
        </div>

        <div>
          <p className="form-label">{t('circuits.crew')}</p>
          <CrewEditor crew={crew} onChange={setCrew} defaultRole="Instructor" />
        </div>

        <div>
          <label htmlFor="circuits-remarks" className="form-label">{t('fields.remarks')}</label>
          <input id="circuits-remarks" type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="input" />
        </div>
      </fieldset>

      <div role="radiogroup" aria-label={t('circuits.entryMode')} className="flex gap-2">
        {(['legs', 'series'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => {
              setMode(m);
              setRowErrors({});
            }}
            className={cn(
              'flex-1 min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              mode === m
                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/50',
            )}
          >
            {m === 'legs' ? t('circuits.modeLegs') : t('circuits.modeSeries')}
          </button>
        ))}
      </div>

      {mode === 'legs' ? (
        <fieldset className="pr-1">
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('circuits.legsTitle')}</legend>
          <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_3.5rem_2.75rem] items-center gap-x-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            <span aria-hidden="true">#</span>
            <span>{t('circuits.takeoff')}</span>
            <span>{t('circuits.landing')}</span>
            <span className="text-right">{t('circuits.duration')}</span>
            <span />
          </div>
          <ol className="space-y-2">
            {legs.map((leg, i) => {
              const minutes = legMinutes(leg);
              const error = rowErrors[i];
              return (
                <li key={i} data-testid={`circuit-row-${i}`}>
                  <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_3.5rem_2.75rem] items-center gap-x-2">
                    <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{i + 1}</span>
                    <div onKeyDown={onRowKeyDown(i, 'takeoff')}>
                      {timeInput(`circuit-${i}-takeoff`, leg.takeoff, (v) => setLeg(i, { takeoff: v }), t('circuits.takeoffN', { n: i + 1 }), !!error)}
                    </div>
                    <div onKeyDown={onRowKeyDown(i, 'landing')}>
                      {timeInput(`circuit-${i}-landing`, leg.landing, (v) => setLeg(i, { landing: v }), t('circuits.landingN', { n: i + 1 }), !!error)}
                    </div>
                    <span className="text-right text-sm tabular-nums text-slate-700 dark:text-slate-200" data-testid={`circuit-duration-${i}`}>
                      {minutes !== null ? formatDuration(minutes, fmt) : '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLeg(i)}
                      aria-label={t('circuits.removeN', { n: i + 1 })}
                      className="inline-flex items-center justify-center w-11 h-11 rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                  {error && (
                    <p role="alert" className="form-error ml-8" data-testid={`circuit-error-${i}`}>{error}</p>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={addLeg}
              disabled={legs.length >= MAX_CIRCUITS}
              className="btn-secondary min-h-11"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              {t('circuits.addCircuit')}
            </button>
            <p className="text-sm text-slate-700 dark:text-slate-200" data-testid="circuits-total">
              {t('circuits.total', { count: completeLegs, duration: formatDuration(total, fmt) })}
            </p>
          </div>
          <p className="form-helper mt-2">{t('circuits.keyboardHint')}</p>
        </fieldset>
      ) : (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('circuits.seriesTitle')}</legend>
          <p className="form-helper mb-3">{t('circuits.seriesHelper')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 [&>*]:min-w-0">
            <div>
              <label htmlFor="circuit-0-takeoff" className="form-label">{t('circuits.firstTakeoff')}</label>
              {timeInput('circuit-0-takeoff', series.takeoff, (v) => setSeries((s) => ({ ...s, takeoff: v })), t('circuits.firstTakeoff'), !!rowErrors[0])}
            </div>
            <div>
              <label htmlFor="circuit-0-landing" className="form-label">{t('circuits.lastLanding')}</label>
              {timeInput('circuit-0-landing', series.landing, (v) => setSeries((s) => ({ ...s, landing: v })), t('circuits.lastLanding'), !!rowErrors[0])}
            </div>
            <div>
              <label htmlFor="circuits-launches" className="form-label">{t('circuits.launches')}</label>
              <input
                id="circuits-launches"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={launches}
                onChange={(e) => setLaunches(e.target.value)}
                className="input"
              />
              {fieldError('launches')}
            </div>
          </div>
          {rowErrors[0] && <p role="alert" className="form-error">{rowErrors[0]}</p>}
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {t('circuits.seriesTotal', { duration: seriesMinutes !== null ? formatDuration(seriesMinutes, fmt) : '—' })}
          </p>
        </fieldset>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={onBack} className="btn-secondary min-h-11 justify-center">
          {t('common:cancel')}
        </button>
        <button type="submit" disabled={submitting} className="btn-primary min-h-11 justify-center">
          {submitting
            ? t('common:saving')
            : mode === 'legs'
              ? t('circuits.submitLegs', { count: legs.length })
              : t('circuits.submitSeries')}
        </button>
      </div>
    </form>
  );
}
