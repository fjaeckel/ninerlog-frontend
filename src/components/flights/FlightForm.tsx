import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { DurationInput } from './DurationInput';
import { AirportInput } from './AirportInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { useCreateFlight, useFlight, useFlights } from '../../hooks/useFlights';
import { useAircraft, useCreateAircraft } from '../../hooks/useAircraft';
import { useCreateContact } from '../../hooks/useContacts';
import { formatDuration, blockMinutes, type TimeDisplayFormat } from '../../lib/duration';
import { parseHobbsReading, formatHobbsReading, hobbsMinutes } from '../../lib/hobbs';
import { airportDisplay, normalizeLocation } from '../../lib/airport';
import { cn } from '../../lib/cn';
import { extractApiCode, extractApiError, extractApiFieldErrors } from '../../lib/errors';
import { useAuthStore } from '../../stores/authStore';
import { isCanonicalTime, type ClockFormat } from '../../lib/timeOfDay';
import { TimeOfDayInput } from '../ui/TimeOfDayInput';
import type { Aircraft } from '../../hooks/useAircraft';
import type { CrewRole, FlightCrewMemberInput } from '../../types/api';
import { CrewEditor } from './CrewEditor';
import { crewDerivedNames, toCrewInputs } from './crewRoles';
import { useCorrectableFlightUpdate } from '../logbook/useCorrectableFlightUpdate';
import { logbookErrorMessage } from '../../lib/logbookErrors';
import { revisionFieldLabelKey } from '../../lib/flightRevisions';
import type { components } from '../../api/schema';

type FlightUpdate = components['schemas']['FlightUpdate'];

/** Override fields with an inline input in this form. */
const OVERRIDE_FORM_FIELDS = ['picTime', 'dualTime', 'nightTime', 'crossCountryTime', 'takeoffsDay', 'takeoffsNight', 'multiPilotTime'] as const;

/** Plain fields an edit sends only when the pilot changed them. */
const UNCHANGED_OMITTED_FIELDS: ReadonlySet<string> = new Set([
  'manualTotalTime', 'flightTimeMethod', 'date', 'isSimulator', 'aircraftReg', 'aircraftType', 'departureIcao', 'arrivalIcao',
  'offBlockTime', 'onBlockTime', 'departureTime', 'arrivalTime', 'route', 'ifrTime',
  'remarks', 'instructorComments', 'simulatedFlightTime', 'groundTrainingTime',
  'actualInstrumentTime', 'simulatedInstrumentTime', 'holds', 'isIpc', 'isFlightReview',
  'isProficiencyCheck', 'launchMethod', 'picusTime', 'spicTime', 'examinerTime',
  'reliefTime', 'fstdType', 'endorsements',
]);

/** Override fields the API can report without an inline input in this form. */
const OVERRIDE_BANNER_FIELDS = ['landingsDay', 'landingsNight', 'sicTime'] as const;

/** Returns the current UTC time as "HH:MM". Used to pre-fill Off-Block on new flights. */
const getCurrentUtcTime = (): string => {
  const now = new Date();
  return `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
};

/** Sentinel message for a time field that does not parse; rendered via `form.invalidTime`. */
const INVALID_TIME = 'invalidTime';

const flightSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  isSimulator: z.boolean(),
  flightTimeMethod: z.enum(['block', 'hobbs', 'manual']),
  totalTimeOverride: z.boolean(),
  manualTotalTime: z.number().int().min(0).max(2147483647).optional(),
  picTime: z.number().int().min(0).optional(),
  dualTime: z.number().int().min(0).optional(),
  hobbsStart: z.string(),
  hobbsEnd: z.string(),
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
  // Phase 6c regulatory compliance fields
  picName: z.string().optional().or(z.literal('')),
  multiPilotTime: z.number().int().min(0).optional(),
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
  const start = parseHobbsReading(v.hobbsStart);
  const end = parseHobbsReading(v.hobbsEnd);
  if (v.hobbsStart && start === null) missing('hobbsStart', 'hobbsInvalid');
  if (v.hobbsEnd && end === null) missing('hobbsEnd', 'hobbsInvalid');
  if (start !== null && end !== null && end <= start) missing('hobbsEnd', 'hobbsOrder');
  if (v.flightTimeMethod === 'manual' || v.totalTimeOverride) {
    if (!v.manualTotalTime) missing('manualTotalTime', 'durationRequired');
  } else if (v.flightTimeMethod === 'hobbs') {
    if (start === null) missing('hobbsStart', 'hobbsInvalid');
    if (end === null) missing('hobbsEnd', 'hobbsInvalid');
  } else {
    if (!v.offBlockTime) missing('offBlockTime', 'Off-block time is required');
    if (!v.onBlockTime) missing('onBlockTime', 'On-block time is required');
  }
  for (const field of ['offBlockTime', 'onBlockTime', 'departureTime', 'arrivalTime'] as const) {
    const value = v[field];
    if (value && !isCanonicalTime(value)) missing(field, INVALID_TIME);
  }
});

type FlightFormData = z.infer<typeof flightSchema>;

interface FlightFormProps {
  flightId?: string | null;
  onClose: () => void;
}

export default function FlightForm({ flightId, onClose }: FlightFormProps) {
  const { t } = useTranslation(['flights', 'common', 'logbook']);
  const createFlight = useCreateFlight();
  const correctable = useCorrectableFlightUpdate();
  const { data: existingFlight } = useFlight(flightId || '');
  const isLocked = !!existingFlight?.signatureId;
  const { data: aircraftList } = useAircraft();
  const createAircraft = useCreateAircraft();
  const { data: recentFlightsData } = useFlights({ page: 1, pageSize: 1, sortBy: 'date', sortOrder: 'desc' });
  const { user } = useAuthStore();
  const fmt = (user?.timeDisplayFormat as TimeDisplayFormat) ?? 'hm';
  const decimalSeparator = user?.decimalSeparator ?? 'comma';
  const clockFormat = (user?.clockFormat as ClockFormat) ?? '24h';

  const isEditing = !!flightId;
  const timeError = (message?: string) => (message === INVALID_TIME ? t('form.invalidTime') : message);
  const lastFlight = recentFlightsData?.data?.[0];

  // Aircraft autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddMake, setQuickAddMake] = useState('');
  const [quickAddModel, setQuickAddModel] = useState('');
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Form error state
  const [apiError, setApiError] = useState<string | null>(null);
  const [clockTimePolicy, setClockTimePolicy] = useState<'' | 'preserve' | 'recalculate'>('');

  // Override fields without an inline input that the API rejected
  const [bannerOverrideFields, setBannerOverrideFields] = useState<string[]>([]);

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
  const [crewMembers, setCrewMembers] = useState<FlightCrewMemberInput[]>([]);

  // Form values as loaded from the flight being edited
  const loadedValues = useRef<FlightFormData | null>(null);

  // Structured approaches state
  interface ApproachInput { type: string; airport: string; runway: string }
  const APPROACH_TYPES = ['ILS', 'LOC', 'VOR', 'RNAV/GPS', 'NDB', 'LDA', 'SDF', 'PAR', 'ASR', 'Visual', 'Circling', 'Other'] as const;
  const [approaches, setApproaches] = useState<ApproachInput[]>([]);
  const createContact = useCreateContact();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, dirtyFields },
    reset,
    watch,
    setValue,
    getValues,
    setError,
    clearErrors,
  } = useForm<FlightFormData>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      isSimulator: false,
      flightTimeMethod: user?.defaultFlightTimeMethod ?? 'block',
      totalTimeOverride: false,
      manualTotalTime: undefined,
      picTime: undefined,
      dualTime: undefined,
      hobbsStart: '',
      hobbsEnd: '',
      aircraftReg: '',
      aircraftType: '',
      departureIcao: '',
      arrivalIcao: '',
      offBlockTime: isEditing || (user?.defaultFlightTimeMethod ?? 'block') !== 'block' ? '' : getCurrentUtcTime(),
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
      picName: '',
      multiPilotTime: undefined,
      picusTime: 0,
      spicTime: 0,
      examinerTime: 0,
      reliefTime: 0,
      fstdType: '',
      endorsements: '',
    },
  });

  useEffect(() => {
    if (existingFlight && isEditing) {
      const loaded: FlightFormData = {
        date: existingFlight.date,
        flightTimeMethod: existingFlight.flightTimeMethod ?? 'block',
        totalTimeOverride: existingFlight.manualTotalTime !== undefined && existingFlight.manualTotalTime !== null,
        manualTotalTime: existingFlight.manualTotalTime,
        picTime: existingFlight.picTimeOverride ? existingFlight.picTime : undefined,
        dualTime: existingFlight.dualTimeOverride ? existingFlight.dualTime : undefined,
        hobbsStart: formatHobbsReading(existingFlight.hobbsStartTenths, decimalSeparator),
        hobbsEnd: formatHobbsReading(existingFlight.hobbsEndTenths, decimalSeparator),
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
        picName: existingFlight.picName || '',
        multiPilotTime: existingFlight.multiPilotTimeOverride ? existingFlight.multiPilotTime : undefined,
        picusTime: existingFlight.picusTime || 0,
        spicTime: existingFlight.spicTime || 0,
        examinerTime: existingFlight.examinerTime || 0,
        reliefTime: existingFlight.reliefTime || 0,
        fstdType: existingFlight.fstdType || '',
        endorsements: existingFlight.endorsements || '',
      };
      loadedValues.current = loaded;
      reset(loaded);
      if (existingFlight.ifrTime || existingFlight.actualInstrumentTime || existingFlight.simulatedInstrumentTime ||
          existingFlight.holds || existingFlight.approachesCount || existingFlight.approaches?.length || existingFlight.isIpc) {
        setExpandedSections((previous) => ({ ...previous, instrument: true }));
      }
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
  }, [existingFlight, isEditing, reset, decimalSeparator]);



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

  // Pre-fill on-block with off-block when off-block is entered (and on-block is empty)
  // Cuts down on time-wheel scrolling on mobile.
  const flightTimeMethod = watch('flightTimeMethod');
  const watchedOffBlock = watch('offBlockTime');
  const watchedOnBlock = watch('onBlockTime');
  const watchedDeparture = watch('departureTime');
  const watchedArrival = watch('arrivalTime');
  const removingClockEvidence = !!existingFlight && flightTimeMethod !== 'block' && (
    (!!existingFlight.offBlockTime && !watchedOffBlock) || (!!existingFlight.onBlockTime && !watchedOnBlock) ||
    (!!existingFlight.departureTime && !watchedDeparture) || (!!existingFlight.arrivalTime && !watchedArrival));
  useEffect(() => {
    if (!isEditing && flightTimeMethod === 'block' && watchedOffBlock && isCanonicalTime(watchedOffBlock) && !watchedOnBlock) {
      setValue('onBlockTime', watchedOffBlock, { shouldValidate: true });
    }
  }, [watchedOffBlock, watchedOnBlock, setValue, isEditing, flightTimeMethod]);

  // Block minutes from the entered times; fills a duration field in one tap.
  const watchedHobbsStart = watch('hobbsStart');
  const watchedHobbsEnd = watch('hobbsEnd');
  const blockTimesUnchanged = existingFlight &&
    watchedOffBlock === (existingFlight.offBlockTime?.slice(0, 5) ?? '') &&
    watchedOnBlock === (existingFlight.onBlockTime?.slice(0, 5) ?? '') &&
    (existingFlight.flightTimeMethod ?? 'block') === 'block';
  const enteredTotal = watch('manualTotalTime');
  const totalTimeOverride = watch('totalTimeOverride');
  const calculatedMinutes = flightTimeMethod === 'hobbs' ? hobbsMinutes(watchedHobbsStart, watchedHobbsEnd) : blockMinutes(watchedOffBlock || '', watchedOnBlock || '');
  const currentBlockMinutes = flightTimeMethod === 'manual' || totalTimeOverride
    ? (enteredTotal !== undefined && Number.isFinite(enteredTotal) ? enteredTotal : null)
    : flightTimeMethod === 'hobbs'
    ? hobbsMinutes(watchedHobbsStart, watchedHobbsEnd)
    : blockTimesUnchanged ? existingFlight.totalTime : blockMinutes(watchedOffBlock || '', watchedOnBlock || '');
  const canUseBlockTime = currentBlockMinutes !== null && currentBlockMinutes > 0;
  const fillWithBlockTime = (field: 'ifrTime' | 'picusTime') => {
    if (!canUseBlockTime) return;
    setValue(field, currentBlockMinutes, { shouldValidate: true, shouldDirty: true });
  };
  const blockTimeButton = (field: 'ifrTime' | 'picusTime') => (
    <button
      type="button"
      onClick={() => fillWithBlockTime(field)}
      disabled={!canUseBlockTime}
      title={canUseBlockTime ? formatDuration(currentBlockMinutes, fmt) : t(flightTimeMethod === 'hobbs' ? 'hobbs.invalid' : 'form.useBlockTimeDisabled')}
      className="link text-xs py-3.5 -my-3.5 whitespace-nowrap ml-auto disabled:opacity-50 disabled:pointer-events-none"
    >
      {t(flightTimeMethod !== 'block' ? 'hobbs.useTotalTime' : 'form.useBlockTime')}
    </button>
  );

  type OverrideTimeField = 'picTime' | 'dualTime' | 'nightTime' | 'crossCountryTime' | 'multiPilotTime';
  type OverrideField = OverrideTimeField | 'takeoffsDay' | 'takeoffsNight';

  // A number overrides the derived value; an emptied field on a flight the
  // pilot had overridden sends null so the server derives it again.
  const overridePayload = (field: OverrideField, value: number | undefined) => {
    if (value !== undefined) return { [field]: value };
    if (isEditing && existingFlight?.[`${field}Override`]) return { [field]: null };
    return {};
  };

  const overrideTimeHelper = (field: OverrideTimeField, autoHint: string) => {
    if (watch(field) !== undefined) return t(fmt === 'decimal' ? 'durationEntry.hoursEntered' : 'form.minutesEntered');
    if (isEditing && existingFlight && !existingFlight[`${field}Override`]) {
      return t('timeSource.savedValue', { value: formatDuration(existingFlight[field] ?? 0, fmt, decimalSeparator) });
    }
    return autoHint;
  };

  const overrideTimeInput = (field: OverrideTimeField, label: string, autoHint: string) => (
    <div>
      <label htmlFor={field} className="form-label">{label}</label>
      <Controller name={field} control={control} render={({ field: input }) => (
        <DurationInput id={field} value={input.value} onChange={input.onChange}
          onEmpty={() => input.onChange(undefined)} onBlur={input.onBlur} inputRef={input.ref}
          entryFormat={fmt} decimalSeparator={decimalSeparator} invalid={!!errors[field]}
          placeholder={t('form.autoPlaceholder')} className={cn('input', errors[field] && 'input-error')} />
      )} />
      {overrideError(field)}
      <p className="form-helper flex flex-wrap items-baseline justify-between gap-x-2">
        <span>{overrideTimeHelper(field, autoHint)}</span>
        {watch(field) !== undefined && (
          <button
            type="button"
            onClick={() => setValue(field, undefined, { shouldDirty: true, shouldValidate: true })}
            className="link text-xs py-3.5 -my-3.5 whitespace-nowrap ml-auto"
          >
            {t('form.resetToAuto')}
          </button>
        )}
      </p>
    </div>
  );

  // Names follow the crew list when it carries the role or the role was removed.
  const crewNamePayload = (field: 'instructorName' | 'picName', role: CrewRole) => {
    const hadRole = isEditing && (existingFlight?.crewMembers ?? []).some((m) => m.role === role);
    const hasRole = crewMembers.some((m) => m.role === role);
    if (!isEditing || hasRole || hadRole) return { [field]: crewDerivedNames(crewMembers)[field] };
    return {};
  };

  // Drops edit fields still holding the value they were loaded with.
  const omitUnchanged = <T extends object>(payload: T, data: FlightFormData): Partial<T> => {
    const loaded = loadedValues.current;
    if (!loaded) return payload;
    return Object.fromEntries(
      Object.entries(payload).filter(([key]) => {
        if (!UNCHANGED_OMITTED_FIELDS.has(key)) return true;
        const field = key as keyof FlightFormData;
        return data[field] !== loaded[field];
      }),
    ) as Partial<T>;
  };

  // Quick-add aircraft handler
  const handleQuickAdd = async () => {
    if (!regUppercase || !quickAddMake || !quickAddModel) return;
    const watchedType = watch('aircraftType');
    try {
      await createAircraft.mutateAsync({
        registration: regUppercase,
        type: (watchedType || '').toUpperCase(),
        make: quickAddMake,
        model: quickAddModel,
        isComplex: false,
        isHighPerformance: false,
        isTailwheel: false,
        isMultiPilot: false,
      });
      setShowQuickAdd(false);
      setQuickAddMake('');
      setQuickAddModel('');
    } catch (error) {
      setQuickAddError(extractApiError(error, t('form.failedToQuickAdd')));
    }
  };

  // Auto-fill from last flight
  const handleAutoFill = () => {
    if (!lastFlight) return;
    setValue('aircraftReg', lastFlight.aircraftReg, { shouldValidate: true });
    setValue('aircraftType', lastFlight.aircraftType, { shouldValidate: true });
    if (lastFlight.departureIcao) setValue('departureIcao', lastFlight.arrivalIcao || '', { shouldValidate: true });
    if (lastFlight.arrivalIcao) setValue('arrivalIcao', '', { shouldValidate: false });
  };

  // An FSTD session logs its duration and device instead of a route, block
  // times and landings, and feeds no flight total.
  const clearInvalidEntries = () => {
    const optional = new Set(['manualTotalTime', 'picTime', 'dualTime', 'nightTime', 'crossCountryTime', 'multiPilotTime', 'takeoffsDay', 'takeoffsNight']);
    for (const [key, value] of Object.entries(getValues())) {
      if (typeof value === 'number' && !Number.isFinite(value)) {
        const field = key as keyof FlightFormData;
        setValue(field, optional.has(key) ? undefined : 0);
        clearErrors(field);
      }
    }
  };
  const isSim = watch('isSimulator');
  const watchedTakeoffsDay = watch('takeoffsDay');
  const watchedTakeoffsNight = watch('takeoffsNight');
  const watchedLandings = watch('landings');
  const enteredTakeoffs = (watchedTakeoffsDay ?? 0) + (watchedTakeoffsNight ?? 0);
  const takeoffsMismatch =
    (watchedTakeoffsDay !== undefined || watchedTakeoffsNight !== undefined) &&
    Number.isFinite(watchedLandings) &&
    enteredTakeoffs !== watchedLandings;

  // Determine if current aircraft is a glider/TMG (show launch method)
  const currentAircraftClass = (aircraftList ?? []).find(
    (ac) => ac.registration.toUpperCase() === (watch('aircraftReg') || '').toUpperCase()
  )?.aircraftClass;
  const showLaunchMethod = !isSim && (currentAircraftClass === 'TMG' || currentAircraftClass === 'GLIDER' ||
    (currentAircraftClass && currentAircraftClass.toLowerCase().includes('glider')));

  const onSubmit = async (data: FlightFormData) => {
    try {
      // Columns both kinds of entry carry.
      const sharedPayload = {
        date: data.date,
        isSimulator: data.isSimulator,
        aircraftType: data.aircraftType.toUpperCase(),
        remarks: data.remarks || null,
        ...crewNamePayload('instructorName', 'Instructor'),
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
        ...crewNamePayload('picName', 'PIC'),
        fstdType: data.fstdType || null,
        endorsements: data.endorsements || null,
        crewMembers: isEditing || crewMembers.length > 0 ? crewMembers : undefined,
      };

      // A training device is not flown between places: the API rejects the
      // registration, route, block times and landings a flight requires, and
      // carries zero in every flight-time column.
      const basePayload = data.isSimulator
        ? { ...sharedPayload, ifrTime: 0 }
        : {
            ...sharedPayload,
            flightTimeMethod: data.flightTimeMethod,
            ...((data.flightTimeMethod === 'manual' || data.totalTimeOverride) ? { manualTotalTime: data.manualTotalTime } : isEditing && existingFlight?.manualTotalTime != null ? { manualTotalTime: null } : {}),
            ...overridePayload('picTime', data.picTime),
            ...overridePayload('dualTime', data.dualTime),
            hobbsStartTenths: parseHobbsReading(data.hobbsStart) ?? (isEditing && existingFlight?.hobbsStartTenths != null ? null : undefined),
            hobbsEndTenths: parseHobbsReading(data.hobbsEnd) ?? (isEditing && existingFlight?.hobbsEndTenths != null ? null : undefined),
            aircraftReg: data.aircraftReg.toUpperCase(),
            departureIcao: normalizeLocation(data.departureIcao),
            arrivalIcao: normalizeLocation(data.arrivalIcao),
            offBlockTime: data.offBlockTime ? data.offBlockTime + ':00' : undefined,
            onBlockTime: data.onBlockTime ? data.onBlockTime + ':00' : undefined,
            departureTime: data.departureTime ? data.departureTime + ':00' : undefined,
            arrivalTime: data.arrivalTime ? data.arrivalTime + ':00' : undefined,
            route: data.route || null,
            ifrTime: data.ifrTime,
            actualInstrumentTime: data.actualInstrumentTime,
            ...overridePayload('multiPilotTime', data.multiPilotTime),
            picusTime: data.picusTime,
            spicTime: data.spicTime,
            examinerTime: data.examinerTime,
            reliefTime: data.reliefTime,
            landings: data.landings,
            ...overridePayload('takeoffsDay', data.takeoffsDay),
            ...overridePayload('takeoffsNight', data.takeoffsNight),
            ...overridePayload('nightTime', data.nightTime),
            ...overridePayload('crossCountryTime', data.crossCountryTime),
            launchMethod: (data.launchMethod || null) as any,
          };

      setApiError(null);
      if (removingClockEvidence && !clockTimePolicy) { setApiError(t('timeSource.reviewClocks')); return; }
      setBannerOverrideFields([]);
      if (isEditing && flightId) {
        const timingPayload = omitUnchanged(basePayload, data) as FlightUpdate;
        if (removingClockEvidence && clockTimePolicy) timingPayload.clockTimePolicy = clockTimePolicy;
        if (!data.isSimulator && data.flightTimeMethod !== 'block') {
          if (!data.offBlockTime && loadedValues.current?.offBlockTime) timingPayload.offBlockTime = null;
          if (!data.onBlockTime && loadedValues.current?.onBlockTime) timingPayload.onBlockTime = null;
          if (!data.departureTime && loadedValues.current?.departureTime) timingPayload.departureTime = null;
          if (!data.arrivalTime && loadedValues.current?.arrivalTime) timingPayload.arrivalTime = null;
        }
        if (!data.isSimulator) {
          if (parseHobbsReading(data.hobbsStart) === existingFlight?.hobbsStartTenths) delete timingPayload.hobbsStartTenths;
          if (parseHobbsReading(data.hobbsEnd) === existingFlight?.hobbsEndTenths) delete timingPayload.hobbsEndTenths;
        }
        const outcome = await correctable.save(flightId, timingPayload);
        if (outcome.status === 'cancelled') return;
      } else {
        const { manualTotalTime, hobbsStartTenths, hobbsEndTenths, ...createPayload } = {
          ...basePayload,
          manualTotalTime: 'manualTotalTime' in basePayload ? basePayload.manualTotalTime : undefined,
          hobbsStartTenths: 'hobbsStartTenths' in basePayload ? basePayload.hobbsStartTenths : undefined,
          hobbsEndTenths: 'hobbsEndTenths' in basePayload ? basePayload.hobbsEndTenths : undefined,
        };
        await createFlight.mutateAsync({ ...createPayload,
          ...(manualTotalTime != null ? { manualTotalTime } : {}),
          ...(hobbsStartTenths != null ? { hobbsStartTenths } : {}),
          ...(hobbsEndTenths != null ? { hobbsEndTenths } : {}),
        });
      }
      onClose();
    } catch (error) {
      showSubmitError(error);
    }
  };

  const showSubmitError = (error: unknown) => {
    if (extractApiCode(error) === 'override_exceeds_calculated') {
      const fieldErrors = extractApiFieldErrors(error);
      for (const field of OVERRIDE_FORM_FIELDS) {
        if (fieldErrors[field]) setError(field, { type: 'server', message: fieldErrors[field] });
      }
      setBannerOverrideFields(OVERRIDE_BANNER_FIELDS.filter((field) => field in fieldErrors));
    }
    setApiError(logbookErrorMessage(error, t) ?? extractApiError(error, t('form.failedToSave')));
  };

  const overrideFieldLabel = (field: string) => t(revisionFieldLabelKey(field));

  const overrideError = (field: (typeof OVERRIDE_FORM_FIELDS)[number]) =>
    errors[field]?.message ? <p className="form-error">{errors[field]?.message}</p> : null;

  const hobbsInputs = (
    <>
      <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0 [&_.form-label]:min-h-10 sm:[&_.form-label]:min-h-0">
        {(['hobbsStart', 'hobbsEnd'] as const).map((field) => (
          <div key={field}>
            <label htmlFor={field} className="form-label">{t(`hobbs.${field}`)} {flightTimeMethod === 'hobbs' && !totalTimeOverride && <span className="text-red-500">*</span>}</label>
            <input id={field} {...register(field)} type="text" inputMode="decimal" maxLength={9}
              aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `${field}Error` : undefined}
              className={cn('input font-mono tabular-nums', errors[field] && 'input-error')} />
            {errors[field] && <p id={`${field}Error`} role="alert" className="form-error">{t(errors[field]?.message === 'hobbsOrder' ? 'hobbs.order' : 'hobbs.invalid')}</p>}
          </div>
        ))}
      </div>
      {(flightTimeMethod !== 'hobbs' || totalTimeOverride) && <p className="form-helper">{t('timeSource.retainedReadings')}</p>}
      <p className="form-helper">{t('timeSource.meterHelp')}</p>
    </>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-full overflow-x-hidden">
      {apiError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          <p>{apiError}</p>
          {bannerOverrideFields.length > 0 && (
            <p className="mt-1">
              {t('logbook:errors.overrideFields', {
                fields: bannerOverrideFields.map(overrideFieldLabel).join(', '),
              })}
            </p>
          )}
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
            onClick={() => { clearInvalidEntries(); setValue('isSimulator', simulator, { shouldValidate: true }); }}
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
              {lastFlight.aircraftReg} · {airportDisplay(lastFlight.departureIcao, lastFlight.departureAirportName, '?')} → {airportDisplay(lastFlight.arrivalIcao, lastFlight.arrivalAirportName, '?')}
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

      <fieldset disabled={isLocked} className="space-y-6 border-0 p-0 m-0 min-w-0">
      {/* Basic Info */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('sections.basic')}</legend>
        <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0 [&_.form-label]:min-h-10 sm:[&_.form-label]:min-h-0">
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
                onClick={() => setShowQuickAdd(true)}
              >
                {t('form.quickAddPrompt', { reg: regUppercase })}
              </button>
            )}
          </div>
          )}
        </div>

        {!isSim && <div className="mt-3">
          <label htmlFor="flightAircraftType" className="form-label">{t('fields.aircraftType')} <span className="text-red-500">*</span></label>
          <input {...register('aircraftType')} id="flightAircraftType" type="text" className="input uppercase" placeholder="C172 / 172S" />
          {errors.aircraftType && <p role="alert" className="form-error">{errors.aircraftType.message}</p>}
        </div>}

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
            {quickAddError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{quickAddError}</p>
            )}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={!quickAddMake || !quickAddModel || createAircraft.isPending}
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
              <Controller name="simulatedFlightTime" control={control} render={({ field }) => (
                <DurationInput id="sessionTime" value={field.value} onChange={field.onChange}
                  onBlur={field.onBlur} inputRef={field.ref} entryFormat={fmt} decimalSeparator={decimalSeparator}
                  invalid={!!errors.simulatedFlightTime} />
              )} />
              {errors.simulatedFlightTime && (
                <p className="form-error">{errors.simulatedFlightTime.message}</p>
              )}
              <p className="form-helper">{t(fmt === 'decimal' ? 'durationEntry.minutesFtd' : 'form.minutesFtd')}</p>
            </div>
          </div>
        </fieldset>
      )}

      {/* Route & Times */}
      {!isSim && (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('hobbs.method')}</legend>
          <label htmlFor="flightTimeMethod" className="sr-only">{t('hobbs.method')}</label>
          <Controller name="flightTimeMethod" control={control} render={({ field }) => (
            <select id="flightTimeMethod" {...field} onChange={(event) => {
              if (event.target.value !== 'manual' && !Number.isFinite(getValues('manualTotalTime'))) {
                setValue('manualTotalTime', undefined); clearErrors('manualTotalTime');
              }
              // Discard only generated new-flight clock defaults, never pilot-entered clocks.
              if (!isEditing && field.value === 'block' && event.target.value !== 'block' && !dirtyFields.offBlockTime && !dirtyFields.onBlockTime) {
                setValue('offBlockTime', ''); setValue('onBlockTime', '');
              }
              if (event.target.value === 'manual' && !getValues('manualTotalTime') && currentBlockMinutes) setValue('manualTotalTime', currentBlockMinutes);
              if (field.value === 'manual' && event.target.value !== 'manual') setValue('totalTimeOverride', Number.isFinite(getValues('manualTotalTime')) && !!getValues('manualTotalTime'));
              field.onChange(event);
            }} aria-describedby="flightTimeMethodHelp durationFormatHelp" className="input w-full">
              <option value="block">{t('hobbs.block')}</option>
              <option value="hobbs">{t('hobbs.hobbs')}</option>
              <option value="manual">{t('durationEntry.manual')}</option>
            </select>
          )} />
          <p id="flightTimeMethodHelp" className="form-helper mt-2">{t(`timeSource.${flightTimeMethod}Help`)}</p>
          <p id="durationFormatHelp" className="form-helper">{t(fmt === 'decimal' ? 'timeSource.decimalHelp' : 'timeSource.minutesHelp', { example: decimalSeparator === 'comma' ? '1,5' : '1.5' })}</p>
          {(flightTimeMethod === 'hobbs' || watchedHobbsStart || watchedHobbsEnd) && (
            flightTimeMethod === 'hobbs' ? <div className="mt-4 space-y-3">{hobbsInputs}</div> : (
              <details className="mt-4" open={errors.hobbsStart || errors.hobbsEnd ? true : undefined}>
                <summary className="cursor-pointer text-sm font-medium min-h-11">{t('timeSource.referenceReadings')}</summary>
                <div className="space-y-3">{hobbsInputs}</div>
              </details>
            )
          )}
          {flightTimeMethod !== 'manual' && (currentBlockMinutes !== null || isEditing) && (
            <p role="status" className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
              {t(totalTimeOverride ? 'timeSource.overriddenTotal' : 'hobbs.total')}: <span className="font-mono tabular-nums">{currentBlockMinutes === null ? '—' : formatDuration(currentBlockMinutes, fmt, decimalSeparator)}</span>
            </p>
          )}
          {totalTimeOverride && flightTimeMethod !== 'manual' && calculatedMinutes !== null && <p className="form-helper">{t('timeSource.calculatedValue', { value: formatDuration(calculatedMinutes, fmt, decimalSeparator) })}</p>}
          {flightTimeMethod !== 'manual' && (
            <div className="mt-3">
              <button type="button" className="link text-sm min-h-11" onClick={() => {
                setValue('totalTimeOverride', !totalTimeOverride);
                setValue('manualTotalTime', totalTimeOverride ? undefined : currentBlockMinutes ?? undefined);
                clearErrors('manualTotalTime');
              }}>{t(totalTimeOverride ? 'timeSource.useCalculated' : 'timeSource.overrideTotal')}</button>
              {totalTimeOverride && <p className="form-helper">{t('timeSource.overrideHelp')}</p>}
            </div>
          )}
          {(flightTimeMethod === 'manual' || totalTimeOverride) && (
            <div className="mt-4">
              <label htmlFor="manualTotalTime" className="form-label">{t('hobbs.total')} <span className="text-red-500">*</span></label>
              <Controller name="manualTotalTime" control={control} render={({ field }) => (
                <DurationInput id="manualTotalTime" value={field.value} onChange={field.onChange}
                  onEmpty={() => field.onChange(undefined)} onBlur={field.onBlur} inputRef={field.ref}
                  entryFormat={fmt} decimalSeparator={decimalSeparator} invalid={!!errors.manualTotalTime} />
              )} />
              <p className="form-helper">{t(fmt === 'decimal' ? 'durationEntry.hours' : 'common:minutes')}</p>
              {errors.manualTotalTime && <p className="form-error">{t('durationEntry.required')}</p>}
            </div>
          )}

        </fieldset>
      )}

      {!isSim && (
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('form.routeAndTimesUtc')}</legend>

        {/* Departure → Arrival ICAO side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 [&>*]:min-w-0">
          <div>
            <label htmlFor="departureIcao" className="form-label">
              {t('fields.departureIcao')} <span className="text-red-500">*</span>
            </label>
            <Controller
              name="departureIcao"
              control={control}
              render={({ field }) => (
                <AirportInput
                  id="departureIcao"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t('form.locationPlaceholder')}
                  invalid={!!errors.departureIcao}
                />
              )}
            />
            {errors.departureIcao && (
              <p className="form-error">{errors.departureIcao.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="arrivalIcao" className="form-label">
              {t('fields.arrivalIcao')} <span className="text-red-500">*</span>
            </label>
            <Controller
              name="arrivalIcao"
              control={control}
              render={({ field }) => (
                <AirportInput
                  id="arrivalIcao"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t('form.locationPlaceholder')}
                  invalid={!!errors.arrivalIcao}
                />
              )}
            />
            {errors.arrivalIcao && (
              <p className="form-error">{errors.arrivalIcao.message}</p>
            )}
          </div>
        </div>
        <p className="form-helper -mt-2 mb-4">{t('form.locationHelper')}</p>

        <details key={flightTimeMethod === 'block' ? 'block-clocks' : 'optional-clocks'} open={flightTimeMethod === 'block' || !!(watchedOffBlock || watchedOnBlock || watch('departureTime') || watch('arrivalTime') || errors.offBlockTime || errors.onBlockTime || errors.departureTime || errors.arrivalTime)}>
          <summary className="form-label cursor-pointer min-h-11 py-2">{t(flightTimeMethod === 'block' ? 'timeSource.clockTimes' : 'timeSource.optionalClocks')}</summary>
        {/* Off-Block → On-Block → Takeoff → Landing */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 [&>*]:min-w-0">
          <div>
            <label htmlFor="offBlockTime" className="form-label">
              {t('detail.offBlock')} {flightTimeMethod === 'block' && !totalTimeOverride && <span className="text-red-500">*</span>}
            </label>
            <Controller
              control={control}
              name="offBlockTime"
              render={({ field }) => (
                <TimeOfDayInput
                  ref={field.ref}
                  id="offBlockTime"
                  name={field.name}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  clockFormat={clockFormat}
                  invalid={!!errors.offBlockTime}
                  className={cn('input px-1 text-center tabular-nums', errors.offBlockTime && 'input-error')}
                  title={t('form.offBlockTooltip')}
                />
              )}
            />
            {errors.offBlockTime && (
              <p className="form-error">{timeError(errors.offBlockTime.message)}</p>
            )}
          </div>
          <div>
            <label htmlFor="onBlockTime" className="form-label">
              {t('detail.onBlock')} {flightTimeMethod === 'block' && !totalTimeOverride && <span className="text-red-500">*</span>}
            </label>
            <Controller
              control={control}
              name="onBlockTime"
              render={({ field }) => (
                <TimeOfDayInput
                  ref={field.ref}
                  id="onBlockTime"
                  name={field.name}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  clockFormat={clockFormat}
                  invalid={!!errors.onBlockTime}
                  className={cn('input px-1 text-center tabular-nums', errors.onBlockTime && 'input-error')}
                  title={t('form.onBlockTooltip')}
                />
              )}
            />
            {errors.onBlockTime && (
              <p className="form-error">{timeError(errors.onBlockTime.message)}</p>
            )}
          </div>
          <div>
            <label htmlFor="departureTime" className="form-label">
              {t('detail.takeoff')}
            </label>
            <Controller
              control={control}
              name="departureTime"
              render={({ field }) => (
                <TimeOfDayInput
                  ref={field.ref}
                  id="departureTime"
                  name={field.name}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  clockFormat={clockFormat}
                  invalid={!!errors.departureTime}
                  className={cn('input px-1 text-center tabular-nums', errors.departureTime && 'input-error')}
                  title={t('form.takeoffTooltip')}
                />
              )}
            />
            {errors.departureTime && (
              <p className="form-error">{timeError(errors.departureTime.message)}</p>
            )}
          </div>
          <div>
            <label htmlFor="arrivalTime" className="form-label">
              {t('detail.landing')}
            </label>
            <Controller
              control={control}
              name="arrivalTime"
              render={({ field }) => (
                <TimeOfDayInput
                  ref={field.ref}
                  id="arrivalTime"
                  name={field.name}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  clockFormat={clockFormat}
                  invalid={!!errors.arrivalTime}
                  className={cn('input px-1 text-center tabular-nums', errors.arrivalTime && 'input-error')}
                  title={t('form.landingTooltip')}
                />
              )}
            />
            {errors.arrivalTime && (
              <p className="form-error">{timeError(errors.arrivalTime.message)}</p>
            )}
          </div>
        </div>

        </details>
        {flightTimeMethod !== 'block' && !watchedOffBlock && !watchedOnBlock && <p className="form-helper mb-3">{t('timeSource.noClockHelp')}</p>}
        {removingClockEvidence && <div className="mb-4 rounded-lg border border-amber-500 p-3">
          <label htmlFor="clockTimePolicy" className="form-label">{t('timeSource.reviewClocks')}</label>
          <select id="clockTimePolicy" value={clockTimePolicy} onChange={(e) => setClockTimePolicy(e.target.value as typeof clockTimePolicy)} className="input w-full">
            <option value="">{t('timeSource.choose')}</option>
            <option value="preserve">{t('timeSource.keepClockValues')}</option>
            <option value="recalculate">{t('timeSource.resetClockValues')}</option>
          </select>
          <p className="form-helper">{t('timeSource.clockReviewHelp')}</p>
        </div>}
        {/* Route waypoints */}
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
              className={cn('input', errors.takeoffsDay && 'input-error')}
              placeholder={t('form.autoPlaceholder')}
            />
            {overrideError('takeoffsDay')}
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
                className={cn('input', errors.takeoffsNight && 'input-error')}
                placeholder={t('form.autoPlaceholder')}
              />
              {overrideError('takeoffsNight')}
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
          {overrideTimeInput('nightTime', t('fields.nightTime'), t(fmt === 'decimal' ? 'durationEntry.autoNight' : 'form.minutesAutoNight'))}
          {overrideTimeInput('crossCountryTime', t('fields.crossCountryTime'), t(fmt === 'decimal' ? 'durationEntry.autoCrossCountry' : 'form.minutesAutoCrossCountry'))}
        </div>
      </fieldset>
      )}

      {/* Launch Method — shown for glider/TMG aircraft */}
      {showLaunchMethod && (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('fields.launchMethod')}</legend>
          <select {...register('launchMethod')} id="launchMethod" className="input w-auto">
            <option value="">{t('form.notSpecified')}</option>
            <option value="winch">{t('form.winchLaunch')}</option>
            <option value="aerotow">{t('form.aerotow')}</option>
            <option value="self-launch">{t('form.selfLaunch')}</option>
            <option value="car">{t('form.carLaunch')}</option>
            <option value="bungee">{t('form.bungeeLaunch')}</option>
          </select>
          <p className="form-helper mt-1">{t('form.requiredForSpl')}</p>
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

      {!isSim && (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('sections.pilotTime')}</legend>
          <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0 [&_.form-label]:min-h-10 sm:[&_.form-label]:min-h-0">
            {overrideTimeInput('picTime', t('fields.picTime'), t('durationEntry.autoCredit'))}
            {overrideTimeInput('dualTime', t('fields.dualTime'), t('durationEntry.autoCredit'))}
          </div>
          <p className="form-helper mt-2">{t('durationEntry.creditHelp')}</p>
        </fieldset>
      )}

      {/* Instrument / IFR Section (Collapsible) */}
      <fieldset>
        <button
          type="button"
          onClick={() => toggleSection('instrument')}
          aria-expanded={expandedSections.instrument}
          aria-controls={expandedSections.instrument ? 'instrument-fields' : undefined}
          className="flex items-center gap-2 min-h-11 text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1 w-full text-left"
        >
          {expandedSections.instrument ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {t('sections.instrument')}
        </button>
        {expandedSections.instrument && (
          <div id="instrument-fields">
          <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0 [&_.form-label]:min-h-10 sm:[&_.form-label]:min-h-0">
            {!isSim && (
            <div>
              <label htmlFor="ifrTime" className="form-label">{t('fields.ifrTime')}</label>
              <Controller name="ifrTime" control={control} render={({ field }) => (
                <DurationInput id="ifrTime" value={field.value} onChange={field.onChange}
                  onBlur={field.onBlur} inputRef={field.ref} entryFormat={fmt} decimalSeparator={decimalSeparator}
                  invalid={!!errors.ifrTime} />
              )} />
              <p className="form-helper flex flex-wrap items-baseline justify-between gap-x-2">
                <span>{t(fmt === 'decimal' ? 'durationEntry.hours' : 'common:minutes')}</span>
                {blockTimeButton('ifrTime')}
              </p>
            </div>
            )}
            {!isSim && (
            <div>
              <label htmlFor="actualInstrumentTime" className="form-label">{t('fields.actualInstrumentTime')}</label>
              <Controller name="actualInstrumentTime" control={control} render={({ field }) => (
                <DurationInput id="actualInstrumentTime" value={field.value} onChange={field.onChange}
                  onBlur={field.onBlur} inputRef={field.ref} entryFormat={fmt} decimalSeparator={decimalSeparator}
                  invalid={!!errors.actualInstrumentTime} />
              )} />
              <p className="form-helper">{t(fmt === 'decimal' ? 'durationEntry.minutesImc' : 'form.minutesImc')}</p>
            </div>
            )}
            <div>
              <label htmlFor="simulatedInstrumentTime" className="form-label">{t('fields.simulatedInstrumentTime')}</label>
              <Controller name="simulatedInstrumentTime" control={control} render={({ field }) => (
                <DurationInput id="simulatedInstrumentTime" value={field.value} onChange={field.onChange}
                  onBlur={field.onBlur} inputRef={field.ref} entryFormat={fmt} decimalSeparator={decimalSeparator}
                  invalid={!!errors.simulatedInstrumentTime} />
              )} />
              <p className="form-helper">{t(fmt === 'decimal' ? 'durationEntry.minutesHood' : 'form.minutesHood')}</p>
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
                      maxLength={10}
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

          <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer mt-3">
            <input
              {...register('isIpc')}
              type="checkbox"
              id="isIpc"
              className="checkbox"
            />
            {t('form.ipcLabel')}
          </label>
          </div>
        )}
      </fieldset>

      {/* Auto-Calculated Values (edit mode) */}
      {isEditing && existingFlight && !isSim && (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('timeSource.savedCalculations')}</legend>
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
                {formatDuration(existingFlight.soloTime, fmt, decimalSeparator)}
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
            <div>
              <label className="form-label">{t('fields.sicTime')}</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                {formatDuration(existingFlight.sicTime || 0, fmt, decimalSeparator)}
              </div>
              <p className="form-helper">{t('form.autoFromCrew')}</p>
            </div>
            <div>
              <label className="form-label">{t('detail.dualGiven')}</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                {formatDuration(existingFlight.dualGivenTime || 0, fmt, decimalSeparator)}
              </div>
              <p className="form-helper">{t('form.autoFromInstructorRole')}</p>
            </div>
          </div>
        </fieldset>
      )}

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
              <Controller name="groundTrainingTime" control={control} render={({ field }) => (
                <DurationInput id="groundTrainingTime" value={field.value} onChange={field.onChange}
                  onBlur={field.onBlur} inputRef={field.ref} entryFormat={fmt} decimalSeparator={decimalSeparator}
                  invalid={!!errors.groundTrainingTime} />
              )} />
              <p className="form-helper">{t(fmt === 'decimal' ? 'durationEntry.minutes' : 'form.minutes')}</p>
            </div>
            {!isSim && (
            <div>
              <label htmlFor="simulatedFlightTime" className="form-label">{t('fields.simulatedFlightTime')}</label>
              <Controller name="simulatedFlightTime" control={control} render={({ field }) => (
                <DurationInput id="simulatedFlightTime" value={field.value} onChange={field.onChange}
                  onBlur={field.onBlur} inputRef={field.ref} entryFormat={fmt} decimalSeparator={decimalSeparator}
                  invalid={!!errors.simulatedFlightTime} />
              )} />
              <p className="form-helper">{t(fmt === 'decimal' ? 'durationEntry.minutesFtd' : 'form.minutesFtd')}</p>
            </div>
            )}
            {!isSim && overrideTimeInput(
              'multiPilotTime',
              t('fields.multiPilotTime'),
              crewMembers.some((m) => m.role === 'PIC' || m.role === 'SIC')
                ? t('form.multiPilotAutoHelper')
                : t('form.multiPilotHelper'),
            )}
            {!isSim && (
            <div>
              <label htmlFor="picusTime" className="form-label">{t('fields.picusTime')}</label>
              <Controller name="picusTime" control={control} render={({ field }) => (
                <DurationInput id="picusTime" value={field.value} onChange={field.onChange}
                  onBlur={field.onBlur} inputRef={field.ref} entryFormat={fmt} decimalSeparator={decimalSeparator}
                  invalid={!!errors.picusTime} />
              )} />
              <p className="form-helper flex flex-wrap items-baseline justify-between gap-x-2">
                <span>{t('form.picusHelper')}</span>
                {blockTimeButton('picusTime')}
              </p>
            </div>
            )}
            {!isSim && (
            <div>
              <label htmlFor="spicTime" className="form-label">{t('fields.spicTime')}</label>
              <Controller name="spicTime" control={control} render={({ field }) => (
                <DurationInput id="spicTime" value={field.value} onChange={field.onChange}
                  onBlur={field.onBlur} inputRef={field.ref} entryFormat={fmt} decimalSeparator={decimalSeparator}
                  invalid={!!errors.spicTime} />
              )} />
              <p className="form-helper">{t('form.spicHelper')}</p>
            </div>
            )}
            {!isSim && (
            <div>
              <label htmlFor="examinerTime" className="form-label">{t('fields.examinerTime')}</label>
              <Controller name="examinerTime" control={control} render={({ field }) => (
                <DurationInput id="examinerTime" value={field.value} onChange={field.onChange}
                  onBlur={field.onBlur} inputRef={field.ref} entryFormat={fmt} decimalSeparator={decimalSeparator}
                  invalid={!!errors.examinerTime} />
              )} />
              <p className="form-helper">{t('form.examinerHelper')}</p>
            </div>
            )}
            {!isSim && (
            <div>
              <label htmlFor="reliefTime" className="form-label">{t('fields.reliefTime')}</label>
              <Controller name="reliefTime" control={control} render={({ field }) => (
                <DurationInput id="reliefTime" value={field.value} onChange={field.onChange}
                  onBlur={field.onBlur} inputRef={field.ref} entryFormat={fmt} decimalSeparator={decimalSeparator}
                  invalid={!!errors.reliefTime} />
              )} />
              <p className="form-helper">{t('form.reliefHelper')}</p>
            </div>
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
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

      {correctable.dialog}
    </form>
  );
}
