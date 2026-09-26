import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { useCreateFlight, useUpdateFlight, useFlight, useFlights } from '../../hooks/useFlights';
import { useAircraft, useCreateAircraft } from '../../hooks/useAircraft';
import { useCreateContact } from '../../hooks/useContacts';
import { formatDuration, type TimeDisplayFormat } from '../../lib/duration';
import { normalizeLocation } from '../../lib/airport';
import { cn } from '../../lib/cn';
import { extractApiError } from '../../lib/errors';
import { useAuthStore } from '../../stores/authStore';
import { isCanonicalTime, type ClockFormat } from '../../lib/timeOfDay';
import { TimeOfDayInput } from '../ui/TimeOfDayInput';
import type { Aircraft } from '../../hooks/useAircraft';
import type { FlightCrewMemberInput } from '../../types/api';
import { CrewEditor } from './CrewEditor';
import { crewDerivedNames, toCrewInputs } from './crewRoles';
import { AIRCRAFT_CLASSES, classFromRegistration } from '../../lib/aircraftClass';
import { isSailplane } from '../../lib/launchMethod';
import { IgcImportEntry } from './igc/IgcImportEntry';
import { UL_AIRCRAFT_KINDS, type ULKind } from '../../lib/ultralight';
import { useRelevance, type RelevanceCtx } from '../../lib/relevance';
import { FoldDrawer, FoldScope, Relevant } from '../relevance';
import {
  timeErrorsFromApi,
  timePairIssues,
  totalFromClocks,
  type ClockField,
  type TimeLead,
} from './flightTimes';
import { CircuitsEntry } from './CircuitsEntry';
import { CircuitsForm, type CircuitsInitial } from './CircuitsForm';
import type { FlightPrefill } from './logAnother';
import type { SavedFlights } from './FlightSavedNotice';

/** Returns the current UTC time as "HH:MM". Used to pre-fill Off-Block on new flights. */
const getCurrentUtcTime = (): string => {
  const now = new Date();
  return `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
};

/** Sentinel message for a time field that does not parse. */
const INVALID_TIME = 'form.invalidTime';

const CLOCK_FIELDS: readonly ClockField[] = ['offBlockTime', 'onBlockTime', 'departureTime', 'arrivalTime'];

const optionalNumber = (v: string) => (v === '' ? undefined : Number(v));

const makeFlightSchema = (lead: TimeLead) => z.object({
  date: z.string().min(1, 'Date is required'),
  isSimulator: z.boolean(),
  aircraftReg: z.string().max(20),
  aircraftType: z.string().min(1, 'Aircraft type is required'),
  departureIcao: z.string().max(100),
  arrivalIcao: z.string().max(100),
  offBlockTime: z.string(),
  onBlockTime: z.string(),
  departureTime: z.string().optional().or(z.literal('')),
  arrivalTime: z.string().optional().or(z.literal('')),
  route: z.string().optional().or(z.literal('')),
  ifrTime: z.number().min(0),
  landings: z.number().int().min(0),
  takeoffsDay: z.number().int().min(0).optional(),
  takeoffsNight: z.number().int().min(0).optional(),
  nightTime: z.number().int().min(0).optional(),
  crossCountryTime: z.number().int().min(0).optional(),
  remarks: z.string().optional().or(z.literal('')),
  // New fields
  instructorName: z.string().optional().or(z.literal('')),
  instructorComments: z.string().optional().or(z.literal('')),
  simulatedFlightTime: z.number().min(0),
  groundTrainingTime: z.number().min(0),
  actualInstrumentTime: z.number().min(0),
  simulatedInstrumentTime: z.number().min(0),
  holds: z.number().int().min(0),
  approachesCount: z.number().int().min(0),
  isIpc: z.boolean(),
  isFlightReview: z.boolean(),
  isProficiencyCheck: z.boolean(),
  launchMethod: z.string().optional().or(z.literal('')),
  launches: z.number().int().min(0).optional(),
  isOutlanding: z.boolean(),
  isTowFlight: z.boolean(),
  releaseHeightM: z.number().int().min(0).max(20000).optional(),
  // Phase 6c regulatory compliance fields
  picName: z.string().optional().or(z.literal('')),
  multiPilotTime: z.number().min(0),
  picusTime: z.number().min(0),
  spicTime: z.number().min(0),
  examinerTime: z.number().min(0),
  reliefTime: z.number().min(0),
  fstdType: z.string().optional().or(z.literal('')),
  endorsements: z.string().optional().or(z.literal('')),
}).superRefine((v, ctx) => {
  const missing = (path: keyof typeof v, message: string) => {
    ctx.addIssue({ code: 'custom', path: [path], message });
  };
  if (v.isSimulator) {
    if (!v.fstdType) missing('fstdType', 'Device type is required');
    if (!v.simulatedFlightTime) missing('simulatedFlightTime', 'Session time is required');
    return;
  }
  if (!v.aircraftReg) missing('aircraftReg', 'Aircraft registration is required');
  if (!v.departureIcao) missing('departureIcao', 'Departure is required');
  if (!v.arrivalIcao) missing('arrivalIcao', 'Arrival is required');
  for (const [field, message] of timePairIssues(v, lead)) missing(field, message);
  for (const field of CLOCK_FIELDS) {
    const value = v[field];
    if (value && !isCanonicalTime(value)) missing(field, INVALID_TIME);
  }
});

type FlightFormData = z.infer<ReturnType<typeof makeFlightSchema>>;

interface FlightFormProps {
  flightId?: string | null;
  onClose: () => void;
  /** Values a new flight starts from. */
  prefill?: FlightPrefill | null;
  /** Called after a create with what was logged. */
  onSaved?: (saved: SavedFlights) => void;
}

export default function FlightForm({ flightId, onClose, prefill, onSaved }: FlightFormProps) {
  const { t } = useTranslation(['flights', 'common']);
  const createFlight = useCreateFlight();
  const updateFlight = useUpdateFlight();
  const { data: existingFlight } = useFlight(flightId || '');
  const isLocked = !!existingFlight?.signatureId;
  const { data: aircraftList } = useAircraft();
  const createAircraft = useCreateAircraft();
  const { data: recentFlightsData } = useFlights({ page: 1, pageSize: 1, sortBy: 'date', sortOrder: 'desc' });
  const { user } = useAuthStore();
  const fmt = (user?.timeDisplayFormat as TimeDisplayFormat) ?? 'hm';
  const clockFormat = (user?.clockFormat as ClockFormat) ?? '24h';

  const isEditing = !!flightId;
  const timeError = (message?: string) => (message?.startsWith('form.') ? t(message) : message);
  const lastFlight = recentFlightsData?.data?.[0];

  // Aircraft autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddMake, setQuickAddMake] = useState('');
  const [quickAddModel, setQuickAddModel] = useState('');
  const [quickAddClass, setQuickAddClass] = useState<string | null>(null);
  const [quickAddUlKind, setQuickAddUlKind] = useState('');
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Form error state
  const [apiError, setApiError] = useState<string | null>(null);

  // Collapsible section state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    route: true,
    times: true,
    landings: true,
    instrument: false,
    training: false,
    remarks: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Crew members state
  const [crewMembers, setCrewMembers] = useState<FlightCrewMemberInput[]>(() => (flightId ? [] : prefill?.crew ?? []));

  // Structured approaches state
  interface ApproachInput { type: string; airport: string; runway: string }
  const APPROACH_TYPES = ['ILS', 'LOC', 'VOR', 'RNAV/GPS', 'NDB', 'LDA', 'SDF', 'PAR', 'ASR', 'Visual', 'Circling', 'Other'] as const;
  const [approaches, setApproaches] = useState<ApproachInput[]>([]);
  const createContact = useCreateContact();

  // Clock time a new flight starts from, on the lead pair's first field.
  const [prefillTime] = useState(getCurrentUtcTime);
  const leadRef = useRef<TimeLead>('block');
  const resolver: Resolver<FlightFormData> = (values, context, options) =>
    zodResolver(makeFlightSchema(leadRef.current))(values, context, options);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, submitCount },
    reset,
    watch,
    setValue,
    getValues,
    setError,
  } = useForm<FlightFormData>({
    resolver,
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      isSimulator: false,
      aircraftReg: '',
      aircraftType: '',
      departureIcao: '',
      arrivalIcao: '',
      offBlockTime: isEditing ? '' : prefillTime,
      onBlockTime: '',
      departureTime: '',
      arrivalTime: '',
      route: '',
      ifrTime: 0,
      landings: 1,
      takeoffsDay: undefined,
      takeoffsNight: undefined,
      nightTime: undefined,
      crossCountryTime: undefined,
      remarks: '',
      instructorName: '',
      instructorComments: '',
      simulatedFlightTime: 0,
      groundTrainingTime: 0,
      actualInstrumentTime: 0,
      simulatedInstrumentTime: 0,
      holds: 0,
      approachesCount: 0,
      isIpc: false,
      isFlightReview: false,
      isProficiencyCheck: false,
      launchMethod: '',
      launches: undefined,
      isOutlanding: false,
      isTowFlight: false,
      releaseHeightM: undefined,
      picName: '',
      multiPilotTime: 0,
      picusTime: 0,
      spicTime: 0,
      examinerTime: 0,
      reliefTime: 0,
      fstdType: '',
      endorsements: '',
      ...(isEditing ? {} : prefill?.values),
    },
  });

  useEffect(() => {
    if (existingFlight && isEditing) {
      reset({
        date: existingFlight.date,
        isSimulator: existingFlight.isSimulator ?? false,
        aircraftReg: existingFlight.aircraftReg,
        aircraftType: existingFlight.aircraftType,
        departureIcao: existingFlight.departureIcao || '',
        arrivalIcao: existingFlight.arrivalIcao || '',
        offBlockTime: existingFlight.offBlockTime?.slice(0, 5) || '',
        onBlockTime: existingFlight.onBlockTime?.slice(0, 5) || '',
        departureTime: existingFlight.departureTime?.slice(0, 5) || '',
        arrivalTime: existingFlight.arrivalTime?.slice(0, 5) || '',
        route: existingFlight.route || '',
        ifrTime: existingFlight.ifrTime,
        landings: existingFlight.allLandings,
        takeoffsDay: existingFlight.takeoffsDayOverride ? existingFlight.takeoffsDay : undefined,
        takeoffsNight: existingFlight.takeoffsNightOverride ? existingFlight.takeoffsNight : undefined,
        nightTime: existingFlight.nightTimeOverride ? existingFlight.nightTime : undefined,
        crossCountryTime: existingFlight.crossCountryTimeOverride ? existingFlight.crossCountryTime : undefined,
        remarks: existingFlight.remarks || '',
        instructorName: existingFlight.instructorName || '',
        instructorComments: existingFlight.instructorComments || '',
        simulatedFlightTime: existingFlight.simulatedFlightTime || 0,
        groundTrainingTime: existingFlight.groundTrainingTime || 0,
        actualInstrumentTime: existingFlight.actualInstrumentTime || 0,
        simulatedInstrumentTime: existingFlight.simulatedInstrumentTime || 0,
        holds: existingFlight.holds || 0,
        approachesCount: existingFlight.approachesCount || 0,
        isIpc: existingFlight.isIpc || false,
        isFlightReview: existingFlight.isFlightReview || false,
        isProficiencyCheck: existingFlight.isProficiencyCheck || false,
        launchMethod: existingFlight.launchMethod || '',
        launches: existingFlight.launchesOverride ? existingFlight.launches : undefined,
        isOutlanding: existingFlight.isOutlanding ?? false,
        isTowFlight: existingFlight.isTowFlight ?? false,
        releaseHeightM: existingFlight.releaseHeightM ?? undefined,
        picName: existingFlight.picName || '',
        multiPilotTime: existingFlight.multiPilotTime || 0,
        picusTime: existingFlight.picusTime || 0,
        spicTime: existingFlight.spicTime || 0,
        examinerTime: existingFlight.examinerTime || 0,
        reliefTime: existingFlight.reliefTime || 0,
        fstdType: existingFlight.fstdType || '',
        endorsements: existingFlight.endorsements || '',
      });
      // Load existing crew members
      if (existingFlight.crewMembers) {
        setCrewMembers(toCrewInputs(existingFlight.crewMembers));
      }
      // Load existing approaches
      if (existingFlight.approaches && existingFlight.approaches.length > 0) {
        setApproaches(existingFlight.approaches.map((a: { type: string; airport?: string | null; runway?: string | null }) => ({
          type: a.type,
          airport: a.airport || '',
          runway: a.runway || '',
        })));
      }
    }
  }, [existingFlight, isEditing, reset]);

  const [circuitsInitial, setCircuitsInitial] = useState<CircuitsInitial | null>(null);



  // Aircraft autocomplete: filter suggestions based on typed registration
  const watchedReg = watch('aircraftReg');
  const filteredAircraft = (aircraftList ?? []).filter(
    (ac) =>
      ac.isActive &&
      ac.registration.toUpperCase().includes((watchedReg || '').toUpperCase()) &&
      (watchedReg || '').length > 0
  );

  // Prefill empty airfield fields from the aircraft's logging defaults
  const applyAircraftDefaults = useCallback(
    (ac: Aircraft) => {
      if (isEditing) return;
      if (ac.defaultDepartureIcao && !getValues('departureIcao')) {
        setValue('departureIcao', ac.defaultDepartureIcao, { shouldValidate: true });
      }
      if (ac.defaultArrivalIcao && !getValues('arrivalIcao')) {
        setValue('arrivalIcao', ac.defaultArrivalIcao, { shouldValidate: true });
      }
    },
    [setValue, getValues, isEditing]
  );

  // Auto-fill aircraft type when registration matches a known aircraft
  const selectAircraft = useCallback(
    (ac: Aircraft) => {
      setValue('aircraftReg', ac.registration, { shouldValidate: true });
      setValue('aircraftType', ac.type, { shouldValidate: true });
      applyAircraftDefaults(ac);
      setShowSuggestions(false);
      setShowQuickAdd(false);
    },
    [setValue, applyAircraftDefaults]
  );

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Determine if entered reg matches a known aircraft (for quick-add prompt)
  const regUppercase = (watchedReg || '').toUpperCase();
  const matchedAircraft = (aircraftList ?? []).find(
    (ac) => ac.registration.toUpperCase() === regUppercase
  );

  // Auto-fill type when registration exactly matches a known aircraft
  useEffect(() => {
    if (matchedAircraft && !isEditing) {
      setValue('aircraftType', matchedAircraft.type, { shouldValidate: true });
      applyAircraftDefaults(matchedAircraft);
    }
  }, [matchedAircraft, setValue, isEditing, applyAircraftDefaults]);

  const isSim = watch('isSimulator');
  const currentAircraft = matchedAircraft ?? null;

  // Take-off and landing lead for gliders, TMGs and ultralights; block times fold.
  const blockTimesLead = useRelevance('flight.blockTimes', { aircraft: currentAircraft });
  const timeLead: TimeLead = !isSim && blockTimesLead.folded ? 'airborne' : 'block';
  useEffect(() => {
    leadRef.current = timeLead;
  }, [timeLead]);

  // Moves the untouched start-time prefill onto the lead pair.
  useEffect(() => {
    if (isEditing) return;
    const [off, on, dep, arr] = getValues(['offBlockTime', 'onBlockTime', 'departureTime', 'arrivalTime']);
    const untouched = (start?: string, end?: string) => start === prefillTime && (!end || end === prefillTime);
    if (timeLead === 'airborne' && untouched(off, on) && !dep && !arr) {
      setValue('onBlockTime', '');
      setValue('offBlockTime', '');
      setValue('departureTime', prefillTime);
    } else if (timeLead === 'block' && untouched(dep, arr) && !off && !on) {
      setValue('arrivalTime', '');
      setValue('departureTime', '');
      setValue('offBlockTime', prefillTime);
    }
  }, [timeLead, isEditing, getValues, setValue, prefillTime]);

  // Pre-fill the end of the lead pair with its start (and on-block from off-block).
  // Cuts down on time-wheel scrolling on mobile.
  const watchedOffBlock = watch('offBlockTime');
  const watchedOnBlock = watch('onBlockTime');
  const watchedDeparture = watch('departureTime');
  const watchedArrival = watch('arrivalTime');
  useEffect(() => {
    if (isEditing) return;
    const [off, on] = getValues(['offBlockTime', 'onBlockTime']);
    if (off && isCanonicalTime(off) && !on) setValue('onBlockTime', off, { shouldValidate: true });
  }, [watchedOffBlock, watchedOnBlock, getValues, setValue, isEditing]);
  useEffect(() => {
    if (isEditing || timeLead !== 'airborne') return;
    const [dep, arr] = getValues(['departureTime', 'arrivalTime']);
    if (dep && isCanonicalTime(dep) && !arr) setValue('arrivalTime', dep, { shouldValidate: true });
  }, [watchedDeparture, watchedArrival, getValues, setValue, isEditing, timeLead]);

  // Total minutes by the API's rule; fills a duration field in one tap.
  const liveTotal = totalFromClocks({
    offBlockTime: watchedOffBlock,
    onBlockTime: watchedOnBlock,
    departureTime: watchedDeparture,
    arrivalTime: watchedArrival,
  });
  const canUseTotal = liveTotal !== null && liveTotal.minutes > 0;
  const totalSource: TimeLead = liveTotal?.source ?? timeLead;
  const fillWithTotal = (field: 'ifrTime' | 'picusTime') => {
    if (!liveTotal || !canUseTotal) return;
    setValue(field, liveTotal.minutes, { shouldValidate: true, shouldDirty: true });
  };
  const totalTimeButton = (field: 'ifrTime' | 'picusTime') => (
    <button
      type="button"
      onClick={() => fillWithTotal(field)}
      disabled={!canUseTotal}
      title={liveTotal && canUseTotal ? formatDuration(liveTotal.minutes, fmt) : t('form.useBlockTimeDisabled')}
      className="link text-xs py-3.5 -my-3.5 whitespace-nowrap ml-auto disabled:opacity-50 disabled:pointer-events-none"
    >
      {totalSource === 'block' ? t('form.useBlockTime') : t('form.useFlightTime')}
    </button>
  );

  type OverrideTimeField = 'nightTime' | 'crossCountryTime';
  type OverrideField = OverrideTimeField | 'takeoffsDay' | 'takeoffsNight' | 'launches';

  // A number overrides the derived value; an emptied field on a flight the
  // pilot had overridden sends null so the server derives it again.
  const overridePayload = (field: OverrideField, value: number | undefined) => {
    if (value !== undefined) return { [field]: value };
    if (isEditing && existingFlight?.[`${field}Override`]) return { [field]: null };
    return {};
  };

  const overrideTimeHelper = (field: OverrideTimeField, autoHint: string) => {
    if (watch(field) !== undefined) return t('form.minutesEntered');
    if (isEditing && existingFlight && !existingFlight[`${field}Override`]) {
      return t('form.minutesAutoValue', { value: formatDuration(existingFlight[field], fmt) });
    }
    return autoHint;
  };

  const overrideTimeInput = (field: OverrideTimeField, label: string, autoHint: string) => (
    <div>
      <label htmlFor={field} className="form-label">{label}</label>
      <input
        {...register(field, { setValueAs: (v: string) => (v === '' ? undefined : Number(v)) })}
        type="number"
        id={field}
        min="0"
        step="1"
        className="input"
        placeholder={t('form.autoPlaceholder')}
      />
      <p className="form-helper flex flex-wrap items-baseline justify-between gap-x-2">
        <span>{overrideTimeHelper(field, autoHint)}</span>
        {watch(field) !== undefined && (
          <button
            type="button"
            onClick={() => setValue(field, undefined, { shouldDirty: true })}
            className="link text-xs py-3.5 -my-3.5 whitespace-nowrap ml-auto"
          >
            {t('form.resetToAuto')}
          </button>
        )}
      </p>
    </div>
  );

  // Quick-add class: the pilot's pick, else the class the registration implies
  const suggestedQuickAddClass = classFromRegistration(regUppercase);
  const effectiveQuickAddClass = quickAddClass ?? suggestedQuickAddClass ?? '';
  const quickAddIsUltralight = effectiveQuickAddClass === 'ULTRALIGHT';
  const quickAddComplete =
    !!quickAddMake && !!quickAddModel && !!effectiveQuickAddClass && (!quickAddIsUltralight || !!quickAddUlKind);

  // Quick-add aircraft handler
  const handleQuickAdd = async () => {
    if (!regUppercase || !quickAddComplete) return;
    const watchedType = watch('aircraftType');
    try {
      await createAircraft.mutateAsync({
        registration: regUppercase,
        type: (watchedType || '').toUpperCase(),
        make: quickAddMake,
        model: quickAddModel,
        aircraftClass: effectiveQuickAddClass,
        ulKind: quickAddIsUltralight ? (quickAddUlKind as ULKind) : null,
        isComplex: false,
        isHighPerformance: false,
        isTailwheel: false,
        isMultiPilot: false,
      });
      setShowQuickAdd(false);
      setQuickAddMake('');
      setQuickAddModel('');
      setQuickAddClass(null);
      setQuickAddUlKind('');
    } catch (error) {
      setQuickAddError(extractApiError(error, t('form.failedToQuickAdd')));
    }
  };

  // Auto-fill from last flight: aircraft, place, launch method and crew
  const handleAutoFill = () => {
    if (!lastFlight) return;
    setValue('aircraftReg', lastFlight.aircraftReg, { shouldValidate: true });
    setValue('aircraftType', lastFlight.aircraftType, { shouldValidate: true });
    const lastDeparture = (lastFlight.departureIcao || '').trim();
    const lastArrival = (lastFlight.arrivalIcao || '').trim();
    if (lastDeparture && lastDeparture.toUpperCase() === lastArrival.toUpperCase()) {
      setValue('departureIcao', lastArrival, { shouldValidate: true });
      setValue('arrivalIcao', lastArrival, { shouldValidate: true });
    } else {
      if (lastFlight.departureIcao) setValue('departureIcao', lastFlight.arrivalIcao || '', { shouldValidate: true });
      if (lastFlight.arrivalIcao) setValue('arrivalIcao', '', { shouldValidate: false });
    }
    if (lastFlight.launchMethod) setValue('launchMethod', lastFlight.launchMethod, { shouldDirty: true });
    if (lastFlight.crewMembers && lastFlight.crewMembers.length > 0) {
      setCrewMembers(toCrewInputs(lastFlight.crewMembers));
    }
    if (lastFlight.instructorName) setValue('instructorName', lastFlight.instructorName);
  };

  // An FSTD session logs its duration and device instead of a route, block
  // times and landings, and feeds no flight total.
  const watchedTakeoffsDay = watch('takeoffsDay');
  const watchedTakeoffsNight = watch('takeoffsNight');
  const watchedLandings = watch('landings');
  const enteredTakeoffs = (watchedTakeoffsDay ?? 0) + (watchedTakeoffsNight ?? 0);
  const takeoffsMismatch =
    (watchedTakeoffsDay !== undefined || watchedTakeoffsNight !== undefined) &&
    Number.isFinite(watchedLandings) &&
    enteredTakeoffs !== watchedLandings;

  // Record the fold decisions read: the saved flight, overlaid with the form values
  // as they stood when the aircraft changed or a submit was tried.
  const aircraftKey = currentAircraft?.id ?? '';
  const foldRecord = useMemo(() => {
    const record: Record<string, unknown> = { ...(existingFlight ?? {}) };
    const values: Record<string, unknown> = { ...getValues(), approaches, snapshot: [aircraftKey, submitCount] };
    for (const f of CLOCK_FIELDS) if (!isEditing && values[f] === prefillTime) delete values[f];
    for (const [k, v] of Object.entries(values)) {
      if (v !== undefined && v !== null && v !== '' && v !== false && v !== 0) record[k] = v;
    }
    return record;
  }, [existingFlight, getValues, approaches, aircraftKey, submitCount, isEditing, prefillTime]);
  const watchedLaunchMethod = watch('launchMethod');
  const foldCtx: RelevanceCtx = useMemo(() => ({ aircraft: currentAircraft, record: foldRecord }), [currentAircraft, foldRecord]);
  const releaseCtx: RelevanceCtx = useMemo(
    () => ({ aircraft: currentAircraft, record: { ...foldRecord, launchMethod: watchedLaunchMethod || foldRecord.launchMethod } }),
    [currentAircraft, foldRecord, watchedLaunchMethod],
  );
  const launchMethodRel = useRelevance('flight.launchMethod', foldCtx);
  const launchesRel = useRelevance('flight.launches', foldCtx);
  const releaseRel = useRelevance('flight.releaseHeight', releaseCtx);
  const launchGroupVisible = launchMethodRel.visible || launchesRel.visible || releaseRel.visible;
  const ifrRel = useRelevance('flight.ifrSection', foldCtx);
  const sailplaneForm = isSailplane(currentAircraft) || (!currentAircraft && launchMethodRel.visible);

  const launchesHelper = () => {
    if (watch('launches') !== undefined) return t('form.launchesEntered');
    if (isEditing && existingFlight && !existingFlight.launchesOverride) {
      return t('form.launchesDerivedValue', { value: existingFlight.launches });
    }
    return t('form.launchesHelper');
  };

  const clockInput = (field: ClockField, label: string, title: string, required: boolean) => (
    <div>
      <label htmlFor={field} className="form-label">
        {label}
        {required && <> <span className="text-red-500">*</span></>}
      </label>
      <Controller
        control={control}
        name={field}
        render={({ field: f }) => (
          <TimeOfDayInput
            ref={f.ref}
            id={field}
            name={f.name}
            value={f.value ?? ''}
            onChange={f.onChange}
            onBlur={f.onBlur}
            clockFormat={clockFormat}
            invalid={!!errors[field]}
            className={cn('input px-1 text-center tabular-nums', errors[field] && 'input-error')}
            title={title}
          />
        )}
      />
      {errors[field] && <p className="form-error">{timeError(errors[field]?.message)}</p>}
    </div>
  );

  const flagInput = (field: 'isOutlanding' | 'isTowFlight', label: string, helper: string) => (
    <div>
      <label className="flex items-center gap-2 min-h-11 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
        <input {...register(field)} type="checkbox" id={field} className="checkbox" />
        {label}
      </label>
      <p className="form-helper mt-0">{helper}</p>
    </div>
  );

  const outlandingRel = useRelevance('flight.outlanding', foldCtx);
  const towFlightRel = useRelevance('flight.towFlight', foldCtx);
  const flightFacts = (
    <>
      <Relevant id="flight.outlanding" ctx={foldCtx}>
        {flagInput('isOutlanding', t('form.outlandingLabel'), t('form.outlandingHelper'))}
      </Relevant>
      <Relevant id="flight.towFlight" ctx={foldCtx}>
        {flagInput('isTowFlight', t('form.towFlightLabel'), t('form.towFlightHelper'))}
      </Relevant>
    </>
  );

  const launchFields = (
    <>
      <Relevant id="flight.launchMethod" ctx={foldCtx}>
        <div>
          <label htmlFor="launchMethod" className="form-label">{t('fields.launchMethod')}</label>
          <select {...register('launchMethod')} id="launchMethod" className="input">
            <option value="">{t('form.notSpecified')}</option>
            <option value="winch">{t('form.winchLaunch')}</option>
            <option value="aerotow">{t('form.aerotow')}</option>
            <option value="self-launch">{t('form.selfLaunch')}</option>
            <option value="car">{t('form.carLaunch')}</option>
            <option value="bungee">{t('form.bungeeLaunch')}</option>
          </select>
          <p className="form-helper">{t('form.launchMethodHelper')}</p>
        </div>
      </Relevant>
      <Relevant id="flight.releaseHeight" ctx={releaseCtx}>
        <div>
          <label htmlFor="releaseHeightM" className="form-label">{t('fields.releaseHeightM')}</label>
          <input
            {...register('releaseHeightM', { setValueAs: optionalNumber })}
            type="number"
            id="releaseHeightM"
            min="0"
            max="20000"
            step="1"
            inputMode="numeric"
            className={cn('input', errors.releaseHeightM && 'input-error')}
          />
          {errors.releaseHeightM && <p className="form-error">{t('form.releaseHeightInvalid')}</p>}
          <p className="form-helper">{t('form.releaseHeightHelper')}</p>
        </div>
      </Relevant>
      <Relevant id="flight.launches" ctx={foldCtx}>
        <div>
          <label htmlFor="launches" className="form-label">{t('fields.launches')}</label>
          <input
            {...register('launches', { setValueAs: optionalNumber })}
            type="number"
            id="launches"
            min="0"
            step="1"
            inputMode="numeric"
            className={cn('input', errors.launches && 'input-error')}
            placeholder={t('form.autoPlaceholder')}
          />
          {errors.launches && <p className="form-error">{t('form.launchesInvalid')}</p>}
          <p className="form-helper flex flex-wrap items-baseline justify-between gap-x-2">
            <span>{launchesHelper()}</span>
            {watch('launches') !== undefined && (
              <button
                type="button"
                onClick={() => setValue('launches', undefined, { shouldDirty: true })}
                className="link text-xs py-3.5 -my-3.5 whitespace-nowrap ml-auto"
              >
                {t('form.resetToDerived')}
              </button>
            )}
          </p>
        </div>
      </Relevant>
    </>
  );

  const onSubmit = async (data: FlightFormData) => {
    try {
      // Columns both kinds of entry carry.
      const sharedPayload = {
        date: data.date,
        isSimulator: data.isSimulator,
        aircraftType: data.aircraftType.toUpperCase(),
        remarks: data.remarks || null,
        // Auto-derive instructor & PIC names from crew (single source of truth: Crew section).
        instructorName: crewDerivedNames(crewMembers).instructorName,
        instructorComments: data.instructorComments || null,
        simulatedFlightTime: data.simulatedFlightTime,
        groundTrainingTime: data.groundTrainingTime,
        simulatedInstrumentTime: data.simulatedInstrumentTime,
        holds: data.holds,
        approaches: approaches.length > 0 ? approaches.map(a => ({
          type: a.type as any,
          airport: a.airport || null,
          runway: a.runway || null,
        })) : undefined,
        isIpc: data.isIpc,
        isFlightReview: data.isFlightReview,
        isProficiencyCheck: data.isProficiencyCheck,
        picName: crewDerivedNames(crewMembers).picName,
        fstdType: data.fstdType || null,
        endorsements: data.endorsements || null,
        crewMembers: isEditing || crewMembers.length > 0 ? crewMembers : undefined,
        isOutlanding: !data.isSimulator && data.isOutlanding,
        isTowFlight: !data.isSimulator && data.isTowFlight,
      };

      // A training device is not flown between places: the API rejects the
      // registration, route, block times and landings a flight requires, and
      // carries zero in every flight-time column.
      const basePayload = data.isSimulator
        ? { ...sharedPayload, ifrTime: 0 }
        : {
            ...sharedPayload,
            aircraftReg: data.aircraftReg.toUpperCase(),
            departureIcao: normalizeLocation(data.departureIcao),
            arrivalIcao: normalizeLocation(data.arrivalIcao),
            route: data.route || null,
            ifrTime: data.ifrTime,
            actualInstrumentTime: data.actualInstrumentTime,
            multiPilotTime: data.multiPilotTime,
            picusTime: data.picusTime,
            spicTime: data.spicTime,
            examinerTime: data.examinerTime,
            reliefTime: data.reliefTime,
            landings: data.landings,
            ...overridePayload('takeoffsDay', data.takeoffsDay),
            ...overridePayload('takeoffsNight', data.takeoffsNight),
            ...overridePayload('nightTime', data.nightTime),
            ...overridePayload('crossCountryTime', data.crossCountryTime),
            ...overridePayload('launches', data.launches),
            launchMethod: (data.launchMethod || null) as any,
            releaseHeightM: data.releaseHeightM ?? null,
          };

      // An emptied clock time on an edited flight is cleared; a new flight omits it.
      const clock = (v?: string) => (v ? `${v}:00` : undefined);
      if (isEditing && flightId) {
        const clocks = data.isSimulator
          ? {}
          : Object.fromEntries(CLOCK_FIELDS.map((f) => [f, clock(data[f]) ?? null]));
        await updateFlight.mutateAsync({ id: flightId, data: { ...basePayload, ...clocks } });
      } else {
        const clocks = data.isSimulator
          ? {}
          : Object.fromEntries(CLOCK_FIELDS.flatMap((f) => (data[f] ? [[f, clock(data[f])]] : [])));
        const created = await createFlight.mutateAsync({ ...basePayload, ...clocks });
        onSaved?.({ count: 1, flight: data.isSimulator ? undefined : created });
      }
      onClose();
    } catch (error) {
      const message = extractApiError(error, t('form.failedToSave'));
      const timeErrors = timeErrorsFromApi(message, timeLead);
      for (const [field, key] of timeErrors) setError(field, { type: 'server', message: key });
      setApiError(timeErrors.length > 0 ? t(timeErrors[0][1]) : message);
    }
  };

  if (circuitsInitial) {
    return (
      <CircuitsForm
        initial={circuitsInitial}
        onBack={() => setCircuitsInitial(null)}
        onSaved={(count) => {
          onSaved?.({ count });
          onClose();
        }}
      />
    );
  }

  return (
    <FoldScope>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-full overflow-x-hidden">
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {apiError}
        </div>
      )}
      {isLocked && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
          {t('form.lockedBySignature')}
        </div>
      )}

      {/* Entry kind — a flight, or a session in a training device */}
      <div role="radiogroup" aria-label={t('form.entryKind')} className="flex gap-2">
        {([false, true] as const).map((simulator) => (
          <button
            key={String(simulator)}
            type="button"
            role="radio"
            aria-checked={isSim === simulator}
            disabled={isLocked}
            onClick={() => setValue('isSimulator', simulator, { shouldValidate: true })}
            className={cn(
              'flex-1 min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50',
              isSim === simulator
                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/50'
            )}
          >
            {simulator ? t('form.entryKindSimulator') : t('form.entryKindFlight')}
          </button>
        ))}
      </div>
      {isSim && (
        <p className="-mt-4 text-xs text-slate-500 dark:text-slate-400">{t('form.simulatorHelper')}</p>
      )}

      {/* Auto-fill from last flight — prominent banner */}
      {!isEditing && !isSim && lastFlight && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">{t('form.fillFromLastFlightTitle')}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
              {lastFlight.aircraftReg} · {lastFlight.departureIcao || '?'} → {lastFlight.arrivalIcao || '?'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAutoFill}
            className="btn-primary btn-sm text-xs shrink-0 min-w-11"
          >
            {t('form.fill')}
          </button>
        </div>
      )}
      {!isEditing && !isSim && (
        <CircuitsEntry
          registrations={[watch('aircraftReg'), lastFlight?.aircraftReg]}
          onOpen={() => {
            const v = getValues();
            setCircuitsInitial({
              date: v.date, aircraftReg: v.aircraftReg, aircraftType: v.aircraftType,
              departureIcao: v.departureIcao, arrivalIcao: v.arrivalIcao,
              launchMethod: v.launchMethod, crew: crewMembers, remarks: v.remarks,
            });
          }}
        />
      )}

      <fieldset disabled={isLocked} className="space-y-6 border-0 p-0 m-0 min-w-0">
      {/* Basic Info */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('sections.basic')}</legend>
        <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
          <div>
            <label htmlFor="date" className="form-label">
              {t('fields.date')} <span className="text-red-500">*</span>
            </label>
            <input {...register('date')} type="date" id="date" className="input px-1.5" />
            {errors.date && (
              <p className="form-error">{errors.date.message}</p>
            )}
          </div>

          {isSim ? (
            <div>
              <label htmlFor="aircraftType" className="form-label">
                {t('fields.aircraftType')} <span className="text-red-500">*</span>
              </label>
              <input
                {...register('aircraftType')}
                type="text"
                id="aircraftType"
                className="input"
                placeholder="C172"
                autoComplete="off"
                onChange={(e) => setValue('aircraftType', e.target.value.toUpperCase(), { shouldValidate: true })}
              />
              {errors.aircraftType && (
                <p className="form-error">{errors.aircraftType.message}</p>
              )}
              <p className="form-helper">{t('form.simulatorTypeHelper')}</p>
            </div>
          ) : (
          <div className="relative" ref={suggestionsRef}>
            <label htmlFor="aircraftReg" className="form-label">
              {t('fields.aircraftReg')} <span className="text-red-500">*</span>
            </label>
            <input
              {...register('aircraftReg')}
              type="text"
              id="aircraftReg"
              className="input"
              placeholder="D-EFGH"
              autoComplete="off"
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                register('aircraftReg').onChange(e);
                setShowSuggestions(true);
              }}
            />
            {errors.aircraftReg && (
              <p className="form-error">{errors.aircraftReg.message}</p>
            )}

            {/* Autocomplete suggestions dropdown */}
            {showSuggestions && filteredAircraft.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                {filteredAircraft.slice(0, 8).map((ac) => (
                  <button
                    key={ac.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex justify-between items-center"
                    onClick={() => selectAircraft(ac)}
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-100">{ac.registration}</span>
                    <span className="text-slate-500 dark:text-slate-400">{ac.type} — {ac.make} {ac.model}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick-add prompt for unrecognized registration */}
            {!matchedAircraft && regUppercase.length >= 2 && !showQuickAdd && (
              <button
                type="button"
                className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline min-h-[44px] flex items-center"
                onClick={() => { setQuickAddClass(null); setQuickAddUlKind(''); setShowQuickAdd(true); }}
              >
                {t('form.quickAddPrompt', { reg: regUppercase })}
              </button>
            )}
          </div>
          )}
        </div>

        {/* Hidden aircraft type — auto-filled from aircraft selection */}
        {!isSim && <input {...register('aircraftType')} type="hidden" />}

        {/* Quick-add aircraft inline form */}
        {!isSim && showQuickAdd && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
              {t('form.quickAddTitle', { reg: regUppercase })}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={watch('aircraftType')}
                onChange={(e) => setValue('aircraftType', e.target.value.toUpperCase(), { shouldValidate: true })}
                className="input text-sm"
                placeholder={t('form.quickAddTypePlaceholder')}
              />
              <input
                type="text"
                value={quickAddMake}
                onChange={(e) => setQuickAddMake(e.target.value)}
                className="input text-sm"
                placeholder={t('form.quickAddMakePlaceholder')}
              />
              <input
                type="text"
                value={quickAddModel}
                onChange={(e) => setQuickAddModel(e.target.value)}
                className="input text-sm"
                placeholder={t('form.quickAddModelPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 [&>*]:min-w-0">
              <div>
                <label htmlFor="quickAddClass" className="form-label">
                  {t('form.quickAddClassLabel')} <span className="text-red-500">*</span>
                </label>
                <select
                  id="quickAddClass"
                  value={effectiveQuickAddClass}
                  onChange={(e) => setQuickAddClass(e.target.value)}
                  className="input text-sm"
                  aria-describedby="quickAddClassHelp"
                >
                  <option value="">{t('form.quickAddClassPlaceholder')}</option>
                  {AIRCRAFT_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>{t(`aircraft:classOptions.${cls}`)}</option>
                  ))}
                </select>
              </div>
              {quickAddIsUltralight && (
                <div>
                  <label htmlFor="quickAddUlKind" className="form-label">
                    {t('form.quickAddUlKindLabel')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="quickAddUlKind"
                    value={quickAddUlKind}
                    onChange={(e) => setQuickAddUlKind(e.target.value)}
                    className="input text-sm"
                  >
                    <option value="">{t('form.quickAddUlKindPlaceholder')}</option>
                    {UL_AIRCRAFT_KINDS.map((k) => (
                      <option key={k} value={k}>{t(`common:ulKinds.${k}`)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <p id="quickAddClassHelp" className="form-helper">
              {quickAddClass === null && suggestedQuickAddClass
                ? t('form.quickAddClassFromReg')
                : t('form.quickAddClassHelper')}
            </p>
            {quickAddError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{quickAddError}</p>
            )}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={!quickAddComplete || createAircraft.isPending}
                className="btn-primary btn-sm text-xs"
              >
                {createAircraft.isPending ? t('common:saving') : t('form.quickAddSave')}
              </button>
              <button
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="btn-ghost btn-sm text-xs"
              >
                {t('form.skip')}
              </button>
            </div>
          </div>
        )}
      </fieldset>

      {/* Launch — method, release height and launches lead a sailplane flight */}
      {!isSim &&
        (launchGroupVisible ? (
          <fieldset>
            <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('form.launchSection')}</legend>
            <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">{launchFields}</div>
          </fieldset>
        ) : (
          launchFields
        ))}
      {!isSim && <IgcImportEntry aircraft={currentAircraft} flightId={flightId ?? undefined} />}

      {/* Session — the device and its duration stand in for route and block times */}
      {isSim && (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('sections.session')}</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>*]:min-w-0">
            <div>
              <label htmlFor="sessionFstdType" className="form-label">
                {t('fields.fstdType')} <span className="text-red-500">*</span>
              </label>
              <input
                {...register('fstdType')}
                type="text"
                id="sessionFstdType"
                className="input"
                placeholder={t('form.fstdTypePlaceholder')}
              />
              {errors.fstdType && (
                <p className="form-error">{errors.fstdType.message}</p>
              )}
              <p className="form-helper">{t('form.fstdHelper')}</p>
            </div>
            <div>
              <label htmlFor="sessionTime" className="form-label">
                {t('fields.simulatedFlightTime')} <span className="text-red-500">*</span>
              </label>
              <input
                {...register('simulatedFlightTime', { valueAsNumber: true })}
                type="number"
                id="sessionTime"
                step="1"
                min="0"
                className="input"
              />
              {errors.simulatedFlightTime && (
                <p className="form-error">{errors.simulatedFlightTime.message}</p>
              )}
              <p className="form-helper">{t('form.minutesFtd')}</p>
            </div>
          </div>
        </fieldset>
      )}

      {/* Route & Times */}
      {!isSim && (
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('form.routeAndTimesUtc')}</legend>

        {/* Departure → Arrival ICAO side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 [&>*]:min-w-0">
          <div>
            <label htmlFor="departureIcao" className="form-label">
              {t('fields.departureIcao')} <span className="text-red-500">*</span>
            </label>
            <input
              {...register('departureIcao')}
              type="text"
              id="departureIcao"
              className="input"
              placeholder={t('form.locationPlaceholder')}
              maxLength={100}
            />
            {errors.departureIcao && (
              <p className="form-error">{errors.departureIcao.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="arrivalIcao" className="form-label">
              {t('fields.arrivalIcao')} <span className="text-red-500">*</span>
            </label>
            <input
              {...register('arrivalIcao')}
              type="text"
              id="arrivalIcao"
              className="input"
              placeholder={t('form.locationPlaceholder')}
              maxLength={100}
            />
            {errors.arrivalIcao && (
              <p className="form-error">{errors.arrivalIcao.message}</p>
            )}
          </div>
        </div>
        <p className="form-helper -mt-2 mb-4">{t('form.locationHelper')}</p>

        {/* Outlanding and tow flight */}
        {outlandingRel.visible || towFlightRel.visible ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 -mt-2 mb-4 [&>*]:min-w-0">{flightFacts}</div>
        ) : (
          flightFacts
        )}

        {/* Lead pair first: block times, or take-off and landing */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 [&>*]:min-w-0">
          {timeLead === 'block' ? (
            <>
              {clockInput('offBlockTime', t('detail.offBlock'), t('form.offBlockTooltip'), true)}
              {clockInput('onBlockTime', t('detail.onBlock'), t('form.onBlockTooltip'), true)}
              {clockInput('departureTime', t('detail.takeoff'), t('form.takeoffTooltip'), false)}
              {clockInput('arrivalTime', t('detail.landing'), t('form.landingTooltip'), false)}
            </>
          ) : (
            <>
              {clockInput('departureTime', t('detail.takeoff'), t('form.takeoffTooltipLead'), true)}
              {clockInput('arrivalTime', t('detail.landing'), t('form.landingTooltipLead'), true)}
              <Relevant id="flight.blockTimes" ctx={foldCtx}>
                <div className="col-span-2 grid grid-cols-2 gap-4 [&>*]:min-w-0">
                  {clockInput('offBlockTime', t('detail.offBlock'), t('form.offBlockTooltip'), false)}
                  {clockInput('onBlockTime', t('detail.onBlock'), t('form.onBlockTooltip'), false)}
                </div>
              </Relevant>
            </>
          )}
        </div>

        {/* Route waypoints */}
        <Relevant id="flight.route" ctx={foldCtx}>
          <div>
            <label htmlFor="route" className="form-label">
              {t('fields.route')}
            </label>
            <input
              {...register('route')}
              type="text"
              id="route"
              className="input uppercase"
              placeholder="EDDF,EDDS,EDDM"
            />
            <p className="form-helper">{t('form.commaSeparatedIcao')}</p>
          </div>
        </Relevant>
      </fieldset>
      )}

      {/* Takeoffs & Landings — right after route */}
      {!isSim && (
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('form.takeoffsAndLandings')}</legend>
        <div className="grid grid-cols-3 gap-3 [&>*]:min-w-0">
          <div>
            <label htmlFor="takeoffsDay" className="form-label">
              {t('fields.dayTakeoffs')}
            </label>
            <input
              {...register('takeoffsDay', { setValueAs: (v: string) => (v === '' ? undefined : Number(v)) })}
              type="number"
              id="takeoffsDay"
              min="0"
              className="input"
              placeholder={t('form.autoPlaceholder')}
            />
          </div>
          <div>
              <label htmlFor="takeoffsNight" className="form-label">
                {t('fields.nightTakeoffs')}
              </label>
              <input
                {...register('takeoffsNight', { setValueAs: (v: string) => (v === '' ? undefined : Number(v)) })}
                type="number"
                id="takeoffsNight"
                min="0"
                className="input"
                placeholder={t('form.autoPlaceholder')}
              />
            </div>
          <div>
            <label htmlFor="landings" className="form-label">
              {t('fields.landings')}
            </label>
            <input
              {...register('landings', { valueAsNumber: true })}
              type="number"
              id="landings"
              min="0"
              className="input"
            />
          </div>
        </div>
        <p className="form-helper mt-2">{t('form.takeoffsAutoHelper')}</p>
        {takeoffsMismatch && (
          <p role="status" className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            {t('form.takeoffsLandingsMismatch', { takeoffs: enteredTakeoffs, landings: watchedLandings })}
          </p>
        )}
      </fieldset>
      )}

      {/* Night & cross-country — derived unless the pilot enters a value */}
      {!isSim && (
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('form.nightAndCrossCountry')}</legend>
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          {overrideTimeInput('nightTime', t('fields.nightTime'), t('form.minutesAutoNight'))}
          {overrideTimeInput('crossCountryTime', t('fields.crossCountryTime'), t('form.minutesAutoCrossCountry'))}
        </div>
      </fieldset>
      )}

      {/* Crew — always visible: determines auto-calculated Solo/Dual/SIC time, not optional metadata */}
      <fieldset>
        <legend className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">
          {t('sections.crew')}
          {crewMembers.length > 0 && <span className="badge-info text-xs">{crewMembers.length}</span>}
        </legend>
        <div className="space-y-3">
          <CrewEditor
            crew={crewMembers}
            onChange={setCrewMembers}
            onPersonAdded={(name) => createContact.mutate({ name })}
            disabled={isLocked}
          />

          {/* Instructor comments — only shown when an instructor is on board */}
          {crewMembers.some((m) => m.role === 'Instructor') && (
            <div className="mt-3">
              <label htmlFor="instructorComments" className="form-label">{t('fields.instructorComments', { defaultValue: 'Instructor Comments' })}</label>
              <input {...register('instructorComments')} id="instructorComments" className="input text-sm" placeholder={t('form.instructorRemarks')} />
            </div>
          )}
        </div>
      </fieldset>

      {/* Total time (edit mode only): block span, else take-off to landing */}
      {isEditing && existingFlight && !isSim && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label">
              {totalSource === 'block' ? t('detail.totalBlockTime') : t('detail.totalFlightTime')}
            </label>
            <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
              {formatDuration(liveTotal?.minutes ?? existingFlight.totalTime, fmt)}
            </div>
            <p className="form-helper">
              {totalSource === 'block' ? t('form.computedFromBlockTimes') : t('form.computedFromTakeoffLanding')}
            </p>
          </div>
        </div>
      )}

      {/* Takeoffs & Landings — old location removed, now after route */}

      {/* Auto-Calculated Values (edit mode) */}
      {isEditing && existingFlight && !isSim && (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('form.autoCalculatedValues')}</legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="form-label">{t('form.allLandings')}</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                {existingFlight.allLandings}
              </div>
            </div>
            <div>
              <label className="form-label">{t('fields.soloTime')}</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                {formatDuration(existingFlight.soloTime, fmt)}h
              </div>
            </div>
            <div>
              <label className="form-label">{t('fields.distance')}</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                {existingFlight.distance.toFixed(1)} NM
              </div>
            </div>
            <div>
              <label className="form-label">{t('form.function')}</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                {existingFlight.isPic ? 'PIC' : existingFlight.isDual ? 'Dual' : (existingFlight.sicTime || 0) > 0 ? 'SIC' : '—'}
              </div>
              <p className="form-helper">{t('form.autoFromCrew')}</p>
            </div>
            <Relevant id="flight.multiCrew" ctx={foldCtx}>
              <div>
                <label className="form-label">{t('fields.sicTime')}</label>
                <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                  {formatDuration(existingFlight.sicTime || 0, fmt)}h
                </div>
                <p className="form-helper">{t('form.autoFromCrew')}</p>
              </div>
            </Relevant>
            <div>
              <label className="form-label">{t('detail.dualGiven')}</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                {formatDuration(existingFlight.dualGivenTime || 0, fmt)}h
              </div>
              <p className="form-helper">{t('form.autoFromInstructorRole')}</p>
            </div>
          </div>
        </fieldset>
      )}

      {/* Instrument / IFR Section (Collapsible; open when folded into More) */}
      <Relevant id="flight.ifrSection" ctx={foldCtx}>
      <fieldset>
        {ifrRel.folded ? (
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('sections.instrument')}</legend>
        ) : (
        <button
          type="button"
          onClick={() => toggleSection('instrument')}
          className="flex items-center gap-2 min-h-11 text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1 w-full text-left"
        >
          {expandedSections.instrument ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {t('sections.instrument')}
        </button>
        )}
        {(expandedSections.instrument || ifrRel.folded) && (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {!isSim && (
            <div>
              <label htmlFor="ifrTime" className="form-label">{t('fields.ifrTime')}</label>
              <input
                {...register('ifrTime', { valueAsNumber: true })}
                type="number"
                id="ifrTime"
                step="1"
                min="0"
                className="input"
              />
              <p className="form-helper flex flex-wrap items-baseline justify-between gap-x-2">
                <span>{t('common:minutes')}</span>
                {totalTimeButton('ifrTime')}
              </p>
            </div>
            )}
            {!isSim && (
            <div>
              <label htmlFor="actualInstrumentTime" className="form-label">{t('fields.actualInstrumentTime')}</label>
              <input
                {...register('actualInstrumentTime', { valueAsNumber: true })}
                type="number"
                id="actualInstrumentTime"
                step="1"
                min="0"
                className="input"
              />
              <p className="form-helper">{t('form.minutesImc')}</p>
            </div>
            )}
            <div>
              <label htmlFor="simulatedInstrumentTime" className="form-label">{t('fields.simulatedInstrumentTime')}</label>
              <input
                {...register('simulatedInstrumentTime', { valueAsNumber: true })}
                type="number"
                id="simulatedInstrumentTime"
                step="1"
                min="0"
                className="input"
              />
              <p className="form-helper">{t('form.minutesHood')}</p>
            </div>
            <div>
              <label htmlFor="holds" className="form-label">{t('fields.holds')}</label>
              <input
                {...register('holds', { valueAsNumber: true })}
                type="number"
                id="holds"
                min="0"
                className="input"
              />
              <p className="form-helper">{t('form.holdingProcedures')}</p>
            </div>
          </div>

          {/* Approaches — own subsection */}
          <div className="mt-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('fields.approaches')} {approaches.length > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">{approaches.length}</span>}
              </span>
              <button
                type="button"
                onClick={() => setApproaches([...approaches, { type: 'ILS', airport: '', runway: '' }])}
                className="btn-ghost btn-sm text-xs flex items-center gap-1"
              >
                <Plus size={12} /> {t('addApproach')}
              </button>
            </div>
            {approaches.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">{t('form.noApproachesLogged')}</p>
            )}
            {approaches.length > 0 && (
              <div className="space-y-2">
                <div className="sr-only sm:not-sr-only sm:grid sm:grid-cols-[2fr_1fr_1fr_auto] gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium px-0.5">
                  <span>{t('approachType')}</span><span>{t('approachAirport')}</span><span>{t('approachRunway')}</span><span></span>
                </div>
                {approaches.map((appr, idx) => (
                  <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-1.5 items-center">
                    <select
                      value={appr.type}
                      onChange={(e) => { const a = [...approaches]; a[idx] = { ...a[idx], type: e.target.value }; setApproaches(a); }}
                      className="input text-sm py-1.5"
                    >
                      {APPROACH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input
                      value={appr.airport}
                      onChange={(e) => { const a = [...approaches]; a[idx] = { ...a[idx], airport: e.target.value.toUpperCase() }; setApproaches(a); }}
                      className="input text-sm py-1.5"
                      placeholder="ICAO"
                      maxLength={4}
                    />
                    <input
                      value={appr.runway}
                      onChange={(e) => { const a = [...approaches]; a[idx] = { ...a[idx], runway: e.target.value }; setApproaches(a); }}
                      className="input text-sm py-1.5"
                      placeholder="Rwy"
                      maxLength={4}
                    />
                    <button type="button" onClick={() => setApproaches(approaches.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="form-helper mt-2">{t('form.approachHelper')}</p>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer mt-3">
            <input
              {...register('isIpc')}
              type="checkbox"
              id="isIpc"
              className="checkbox"
            />
            {t('form.ipcLabel')}
          </label>
          </>
        )}
      </fieldset>
      </Relevant>

      {/* Training & Currency Section (Collapsible) */}
      <fieldset>
        <button
          type="button"
          onClick={() => toggleSection('training')}
          className="flex items-center gap-2 min-h-11 text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1 w-full text-left"
        >
          {expandedSections.training ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {t('sections.training')}
        </button>
        {expandedSections.training && (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="groundTrainingTime" className="form-label">{t('fields.groundTrainingTime')}</label>
              <input
                {...register('groundTrainingTime', { valueAsNumber: true })}
                type="number"
                id="groundTrainingTime"
                step="1"
                min="0"
                className="input"
              />
              <p className="form-helper">{t('form.minutes')}</p>
            </div>
            {!isSim && (
            <div>
              <label htmlFor="simulatedFlightTime" className="form-label">{t('fields.simulatedFlightTime')}</label>
              <input
                {...register('simulatedFlightTime', { valueAsNumber: true })}
                type="number"
                id="simulatedFlightTime"
                step="1"
                min="0"
                className="input"
              />
              <p className="form-helper">{t('form.minutesFtd')}</p>
            </div>
            )}
            {!isSim && (
            <Relevant id="flight.multiCrew" ctx={foldCtx}>
            <div>
              <label htmlFor="multiPilotTime" className="form-label">{t('fields.multiPilotTime')}</label>
              <input
                {...register('multiPilotTime', { valueAsNumber: true })}
                type="number"
                id="multiPilotTime"
                step="1"
                min="0"
                className="input"
              />
              <p className="form-helper">
                {crewMembers.some((m) => m.role === 'PIC' || m.role === 'SIC')
                  ? t('form.multiPilotAutoHelper')
                  : t('form.multiPilotHelper')}
              </p>
            </div>
            </Relevant>
            )}
            {!isSim && (
            <Relevant id="flight.multiCrew" ctx={foldCtx}>
            <div>
              <label htmlFor="picusTime" className="form-label">{t('fields.picusTime')}</label>
              <input
                {...register('picusTime', { valueAsNumber: true })}
                type="number"
                id="picusTime"
                step="1"
                min="0"
                className="input"
              />
              <p className="form-helper flex flex-wrap items-baseline justify-between gap-x-2">
                <span>{t('form.picusHelper')}</span>
                {totalTimeButton('picusTime')}
              </p>
            </div>
            </Relevant>
            )}
            {!isSim && (
            <Relevant id="flight.spic" ctx={foldCtx}>
            <div>
              <label htmlFor="spicTime" className="form-label">{sailplaneForm ? t('fields.spicTimeGlider') : t('fields.spicTime')}</label>
              <input
                {...register('spicTime', { valueAsNumber: true })}
                type="number"
                id="spicTime"
                step="1"
                min="0"
                className="input"
              />
              <p className="form-helper">{sailplaneForm ? t('form.spicHelperGlider') : t('form.spicHelper')}</p>
            </div>
            </Relevant>
            )}
            {!isSim && (
            <Relevant id="flight.examiner" ctx={foldCtx}>
            <div>
              <label htmlFor="examinerTime" className="form-label">{t('fields.examinerTime')}</label>
              <input
                {...register('examinerTime', { valueAsNumber: true })}
                type="number"
                id="examinerTime"
                step="1"
                min="0"
                className="input"
              />
              <p className="form-helper">{t('form.examinerHelper')}</p>
            </div>
            </Relevant>
            )}
            {!isSim && (
            <Relevant id="flight.multiCrew" ctx={foldCtx}>
            <div>
              <label htmlFor="reliefTime" className="form-label">{t('fields.reliefTime')}</label>
              <input
                {...register('reliefTime', { valueAsNumber: true })}
                type="number"
                id="reliefTime"
                step="1"
                min="0"
                className="input"
              />
              <p className="form-helper">{t('form.reliefHelper')}</p>
            </div>
            </Relevant>
            )}
          </div>

          {/* FSTD Type — shown when simulated flight time > 0 */}
          {!isSim && (watch('simulatedFlightTime') > 0 || watch('fstdType')) && (
            <div className="mt-3">
              <label htmlFor="fstdType" className="form-label">{t('fields.fstdType')}</label>
              <input
                {...register('fstdType')}
                id="fstdType"
                className="input"
                placeholder={t('form.fstdTypePlaceholder')}
              />
              <p className="form-helper">{t('form.fstdHelper')}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-4">
            <label className="flex items-center gap-2 min-h-11 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                {...register('isFlightReview')}
                type="checkbox"
                id="isFlightReview"
                className="checkbox"
              />
              {t('form.flightReviewLabel')}
            </label>
            <label className="flex items-center gap-2 min-h-11 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                {...register('isProficiencyCheck')}
                type="checkbox"
                id="isProficiencyCheck"
                className="checkbox"
              />
              {t('form.proficiencyCheckLabel')}
            </label>
          </div>
          </>
        )}
      </fieldset>

      {/* Folded fields: toolkits the pilot does not use, for this aircraft */}
      <FoldDrawer className="mt-0" />

      {/* Remarks & Endorsements */}
      <div className="space-y-4">
        <div>
          <label htmlFor="remarks" className="form-label">
            {t('fields.remarks')}
          </label>
          <textarea
            {...register('remarks')}
            id="remarks"
            rows={2}
            className="input"
            placeholder={t('form.trainingFlightPlaceholder')}
          />
        </div>
        <div>
          <label htmlFor="endorsements" className="form-label">
            {t('fields.endorsements')}
          </label>
          <textarea
            {...register('endorsements')}
            id="endorsements"
            rows={2}
            className="input"
            placeholder={t('form.endorsementsPlaceholder')}
          />
          <p className="form-helper">{t('form.endorsementsHelper')}</p>
        </div>
      </div>
      </fieldset>

      {/* Submit */}
      <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button type="submit" disabled={isSubmitting || isLocked} className="btn-primary flex-1">
          {isSubmitting
            ? t('saving')
            : isEditing
              ? t(isSim ? 'updateSession' : 'updateFlight')
              : t(isSim ? 'logSession' : 'logFlight')}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1">
          {t('common:cancel')}
        </button>
      </div>
    </form>
    </FoldScope>
  );
}
