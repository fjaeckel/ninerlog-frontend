import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { useCreateFlight, useUpdateFlight, useFlight, useFlights } from '../../hooks/useFlights';
import { useAircraft, useCreateAircraft } from '../../hooks/useAircraft';
import { useSearchContacts, useCreateContact } from '../../hooks/useContacts';
import { formatDuration, type TimeDisplayFormat } from '../../lib/duration';
import { extractApiError } from '../../lib/errors';
import { useAuthStore } from '../../stores/authStore';
import type { Aircraft } from '../../hooks/useAircraft';
import type { CrewRole, FlightCrewMemberInput } from '../../types/api';

/** Returns the current UTC time as "HH:MM". Used to pre-fill Off-Block on new flights. */
const getCurrentUtcTime = (): string => {
  const now = new Date();
  return `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
};

const flightSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  aircraftReg: z.string().min(1, 'Aircraft registration is required'),
  aircraftType: z.string().min(1, 'Aircraft type is required'),
  departureIcao: z.string().min(1, 'Departure ICAO is required').max(4),
  arrivalIcao: z.string().min(1, 'Arrival ICAO is required').max(4),
  offBlockTime: z.string().min(1, 'Off-block time is required'),
  onBlockTime: z.string().min(1, 'On-block time is required'),
  departureTime: z.string().optional().or(z.literal('')),
  arrivalTime: z.string().optional().or(z.literal('')),
  route: z.string().optional().or(z.literal('')),
  ifrTime: z.number().min(0),
  landings: z.number().int().min(0),
  takeoffsDay: z.number().int().min(0).optional(),
  takeoffsNight: z.number().int().min(0).optional(),
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
  multiPilotTime: z.number().min(0),
  fstdType: z.string().optional().or(z.literal('')),
  endorsements: z.string().optional().or(z.literal('')),
});

type FlightFormData = z.infer<typeof flightSchema>;

interface FlightFormProps {
  flightId?: string | null;
  onClose: () => void;
}

export default function FlightForm({ flightId, onClose }: FlightFormProps) {
  const { t } = useTranslation('flights');
  const createFlight = useCreateFlight();
  const updateFlight = useUpdateFlight();
  const { data: existingFlight } = useFlight(flightId || '');
  const { data: aircraftList } = useAircraft();
  const createAircraft = useCreateAircraft();
  const { data: recentFlightsData } = useFlights({ page: 1, pageSize: 1, sortBy: 'date', sortOrder: 'desc' });
  const { user } = useAuthStore();
  const fmt = (user?.timeDisplayFormat as TimeDisplayFormat) ?? 'hm';

  const isEditing = !!flightId;
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

  // Collapsible section state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    route: true,
    times: true,
    landings: true,
    people: false,
    advanced: false,
    remarks: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Crew members state
  const [crewMembers, setCrewMembers] = useState<FlightCrewMemberInput[]>([]);
  const [crewNameInput, setCrewNameInput] = useState('');
  const [crewRoleInput, setCrewRoleInput] = useState<CrewRole>('Passenger');

  // Structured approaches state
  interface ApproachInput { type: string; airport: string; runway: string }
  const APPROACH_TYPES = ['ILS', 'LOC', 'VOR', 'RNAV/GPS', 'NDB', 'LDA', 'SDF', 'PAR', 'ASR', 'Visual', 'Circling', 'Other'] as const;
  const [approaches, setApproaches] = useState<ApproachInput[]>([]);
  const [crewSearch, setCrewSearch] = useState('');
  const { data: contactResults } = useSearchContacts(crewSearch);
  const createContact = useCreateContact();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<FlightFormData>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      aircraftReg: '',
      aircraftType: '',
      departureIcao: '',
      arrivalIcao: '',
      offBlockTime: isEditing ? '' : getCurrentUtcTime(),
      onBlockTime: '',
      departureTime: '',
      arrivalTime: '',
      route: '',
      ifrTime: 0,
      landings: 1,
      takeoffsDay: undefined,
      takeoffsNight: undefined,
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
      multiPilotTime: 0,
      fstdType: '',
      endorsements: '',
    },
  });

  useEffect(() => {
    if (existingFlight && isEditing) {
      reset({
        date: existingFlight.date,
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
        takeoffsDay: existingFlight.takeoffsDay,
        takeoffsNight: existingFlight.takeoffsNight,
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
        multiPilotTime: existingFlight.multiPilotTime || 0,
        fstdType: existingFlight.fstdType || '',
        endorsements: existingFlight.endorsements || '',
      });
      // Load existing crew members
      if (existingFlight.crewMembers) {
        setCrewMembers(existingFlight.crewMembers.map((m: { contactId?: string | null; name: string; role: string }) => ({
          contactId: m.contactId || null,
          name: m.name,
          role: m.role as CrewRole,
        })));
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



  // Aircraft autocomplete: filter suggestions based on typed registration
  const watchedReg = watch('aircraftReg');
  const filteredAircraft = (aircraftList ?? []).filter(
    (ac) =>
      ac.isActive &&
      ac.registration.toUpperCase().includes((watchedReg || '').toUpperCase()) &&
      (watchedReg || '').length > 0
  );

  // Auto-fill aircraft type when registration matches a known aircraft
  const selectAircraft = useCallback(
    (ac: Aircraft) => {
      setValue('aircraftReg', ac.registration, { shouldValidate: true });
      setValue('aircraftType', ac.type, { shouldValidate: true });
      setShowSuggestions(false);
      setShowQuickAdd(false);
    },
    [setValue]
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
    }
  }, [matchedAircraft, setValue, isEditing]);

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

  // Determine if current aircraft is a glider/TMG (show launch method)
  const currentAircraftClass = (aircraftList ?? []).find(
    (ac) => ac.registration.toUpperCase() === (watch('aircraftReg') || '').toUpperCase()
  )?.aircraftClass;
  const showLaunchMethod = currentAircraftClass === 'TMG' || currentAircraftClass === 'GLIDER' ||
    (currentAircraftClass && currentAircraftClass.toLowerCase().includes('glider'));

  const onSubmit = async (data: FlightFormData) => {
    try {
      const basePayload = {
        date: data.date,
        aircraftReg: data.aircraftReg.toUpperCase(),
        aircraftType: data.aircraftType.toUpperCase(),
        departureIcao: data.departureIcao.toUpperCase(),
        arrivalIcao: data.arrivalIcao.toUpperCase(),
        offBlockTime: data.offBlockTime + ':00',
        onBlockTime: data.onBlockTime + ':00',
        departureTime: data.departureTime ? data.departureTime + ':00' : undefined,
        arrivalTime: data.arrivalTime ? data.arrivalTime + ':00' : undefined,
        route: data.route || null,
        ifrTime: data.ifrTime,
        landings: data.landings,
        ...(data.takeoffsDay !== undefined && { takeoffsDay: data.takeoffsDay }),
        ...(data.takeoffsNight !== undefined && { takeoffsNight: data.takeoffsNight }),
        remarks: data.remarks || null,
        instructorName: data.instructorName || null,
        instructorComments: data.instructorComments || null,
        simulatedFlightTime: data.simulatedFlightTime,
        groundTrainingTime: data.groundTrainingTime,
        actualInstrumentTime: data.actualInstrumentTime,
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
        launchMethod: (data.launchMethod || null) as any,
        picName: data.picName || null,
        multiPilotTime: data.multiPilotTime,
        fstdType: data.fstdType || null,
        endorsements: data.endorsements || null,
        crewMembers: crewMembers.length > 0 ? crewMembers : undefined,
      };

      if (isEditing && flightId) {
        await updateFlight.mutateAsync({ id: flightId, data: basePayload });
      } else {
        await createFlight.mutateAsync(basePayload);
      }
      onClose();
    } catch (error) {
      setApiError(extractApiError(error, t('form.failedToSave')));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {apiError}
        </div>
      )}
      {/* Auto-fill from last flight — prominent banner */}
      {!isEditing && lastFlight && (
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
            className="btn-primary btn-sm text-xs shrink-0"
          >
            {t('form.fill')}
          </button>
        </div>
      )}

      {/* Basic Info */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('sections.basic')}</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="form-label">
              {t('fields.date')} <span className="text-red-500">*</span>
            </label>
            <input {...register('date')} type="date" id="date" className="input" />
            {errors.date && (
              <p className="form-error">{errors.date.message}</p>
            )}
          </div>

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
        </div>

        {/* Hidden aircraft type — auto-filled from aircraft selection */}
        <input {...register('aircraftType')} type="hidden" />

        {/* Quick-add aircraft inline form */}
        {showQuickAdd && (
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
                placeholder="Type (e.g. C172)"
              />
              <input
                type="text"
                value={quickAddMake}
                onChange={(e) => setQuickAddMake(e.target.value)}
                className="input text-sm"
                placeholder="Make (e.g. Cessna)"
              />
              <input
                type="text"
                value={quickAddModel}
                onChange={(e) => setQuickAddModel(e.target.value)}
                className="input text-sm"
                placeholder="Model (e.g. 172 Skyhawk)"
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

      {/* Route & Times */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('form.routeAndTimesUtc')}</legend>

        {/* Departure → Arrival ICAO side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="departureIcao" className="form-label">
              {t('fields.departureIcao')} <span className="text-red-500">*</span>
            </label>
            <input
              {...register('departureIcao')}
              type="text"
              id="departureIcao"
              className="input uppercase"
              placeholder="EDDF"
              maxLength={4}
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
              className="input uppercase"
              placeholder="EDDH"
              maxLength={4}
            />
            {errors.arrivalIcao && (
              <p className="form-error">{errors.arrivalIcao.message}</p>
            )}
          </div>
        </div>

        {/* Off-Block → On-Block → Takeoff → Landing */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <label htmlFor="offBlockTime" className="form-label">
              {t('detail.offBlock')} <span className="text-red-500">*</span>
            </label>
            <input
              {...register('offBlockTime')}
              type="time"
              id="offBlockTime"
              className="input"
              title={t('form.offBlockTooltip')}
            />
            {errors.offBlockTime && (
              <p className="form-error">{errors.offBlockTime.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="onBlockTime" className="form-label">
              {t('detail.onBlock')} <span className="text-red-500">*</span>
            </label>
            <input
              {...register('onBlockTime')}
              type="time"
              id="onBlockTime"
              className="input"
              title={t('form.onBlockTooltip')}
            />
            {errors.onBlockTime && (
              <p className="form-error">{errors.onBlockTime.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="departureTime" className="form-label">
              {t('detail.takeoff')}
            </label>
            <input
              {...register('departureTime')}
              type="time"
              id="departureTime"
              className="input"
              title={t('form.takeoffTooltip')}
            />
          </div>
          <div>
            <label htmlFor="arrivalTime" className="form-label">
              {t('detail.landing')}
            </label>
            <input
              {...register('arrivalTime')}
              type="time"
              id="arrivalTime"
              className="input"
              title={t('form.landingTooltip')}
            />
          </div>
        </div>

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

      {/* Takeoffs & Landings — right after route */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('form.takeoffsAndLandings')}</legend>
        <div className="grid grid-cols-3 gap-3">
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
              placeholder="Auto"
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
                placeholder="Auto"
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
      </fieldset>

      {/* Launch Method — shown for glider/TMG aircraft */}
      {showLaunchMethod && (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('fields.launchMethod')}</legend>
          <select {...register('launchMethod')} id="launchMethod" className="input w-auto">
            <option value="">{t('form.notSpecified')}</option>
            <option value="winch">{t('form.winchLaunch')}</option>
            <option value="aerotow">{t('form.aerotow')}</option>
            <option value="self-launch">{t('form.selfLaunch')}</option>
          </select>
          <p className="form-helper mt-1">{t('form.requiredForSpl')}</p>
        </fieldset>
      )}

      {/* People & Crew Section (Collapsible) — right after route */}
      <fieldset>
        <button
          type="button"
          onClick={() => toggleSection('people')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 w-full text-left"
        >
          {expandedSections.people ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {t('form.peopleOnBoard')}
          {crewMembers.length > 0 && <span className="badge-info text-xs ml-2">{crewMembers.length}</span>}
        </button>
        {expandedSections.people && (
          <div className="space-y-3">
            {/* Crew list */}
            {crewMembers.map((member, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                <span className="badge-info text-xs">{member.role}</span>
                <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">{member.name}</span>
                <button
                  type="button"
                  onClick={() => setCrewMembers((prev) => prev.filter((_, i) => i !== idx))}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-red-500"
                  aria-label={`Remove ${member.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Add crew member */}
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-[150px] relative">
                <input
                  type="text"
                  value={crewNameInput}
                  onChange={(e) => { setCrewNameInput(e.target.value); setCrewSearch(e.target.value); }}
                  placeholder={t('form.personName')}
                  className="input text-sm"
                />
                {contactResults && contactResults.length > 0 && crewNameInput.length >= 2 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-32 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                    {contactResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={() => { setCrewNameInput(c.name); setCrewSearch(''); }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <select
                value={crewRoleInput}
                onChange={(e) => setCrewRoleInput(e.target.value as CrewRole)}
                className="input text-sm w-auto"
              >
                <option value="PIC">{t('crewRoles.PIC')}</option>
                <option value="SIC">{t('crewRoles.SIC')}</option>
                <option value="Instructor">{t('crewRoles.Instructor')}</option>
                <option value="Student">{t('crewRoles.Student')}</option>
                <option value="Passenger">{t('crewRoles.Passenger')}</option>
                <option value="SafetyPilot">{t('crewRoles.SafetyPilot')}</option>
                <option value="Examiner">{t('crewRoles.Examiner')}</option>
              </select>
              <button
                type="button"
                disabled={!crewNameInput.trim()}
                onClick={() => {
                  if (crewNameInput.trim()) {
                    setCrewMembers((prev) => [...prev, { name: crewNameInput.trim(), role: crewRoleInput, contactId: null }]);
                    createContact.mutate({ name: crewNameInput.trim() });
                    setCrewNameInput('');
                    setCrewSearch('');
                  }
                }}
                className="btn-secondary btn-sm text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> {t('common:add')}
              </button>
            </div>

            {/* Instructor fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label htmlFor="instructorName" className="form-label">{t('fields.instructorName')}</label>
                <input {...register('instructorName')} id="instructorName" className="input text-sm" placeholder={t('fields.instructorName')} />
              </div>
              <div>
                <label htmlFor="instructorComments" className="form-label">{t('fields.instructorComments', { defaultValue: 'Instructor Comments' })}</label>
                <input {...register('instructorComments')} id="instructorComments" className="input text-sm" placeholder={t('form.instructorRemarks')} />
              </div>
            </div>
          </div>
        )}
      </fieldset>

      {/* Total block time (edit mode only) */}
      {isEditing && existingFlight && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label">
              {t('detail.totalBlockTime')}
            </label>
            <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
              {formatDuration(existingFlight.totalTime, fmt)}
            </div>
            <p className="form-helper">{t('form.computedFromBlockTimes')}</p>
          </div>
        </div>
      )}

      {/* Takeoffs & Landings — old location removed, now after route */}

      {/* Auto-Calculated Values (edit mode) */}
      {isEditing && existingFlight && (
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
              <label className="form-label">{t('fields.crossCountryTime')}</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                {formatDuration(existingFlight.crossCountryTime, fmt)}h
              </div>
            </div>
            <div>
              <label className="form-label">{t('fields.distance')}</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                {existingFlight.distance.toFixed(1)} NM
              </div>
            </div>
            <div>
              <label className="form-label">{t('fields.nightTime')}</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                {formatDuration(existingFlight.nightTime, fmt)}h
              </div>
            </div>
            <div>
              <label className="form-label">{t('form.function')}</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                {existingFlight.isPic ? 'PIC' : existingFlight.isDual ? 'Dual' : '—'}
              </div>
              <p className="form-helper">{t('form.autoFromCrew')}</p>
            </div>
          </div>
        </fieldset>
      )}

      {/* Advanced Times Section (Collapsible) */}
      <fieldset>
        <button
          type="button"
          onClick={() => toggleSection('advanced')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 w-full text-left"
        >
          {expandedSections.advanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {t('sections.advancedTimes')}
        </button>
        {expandedSections.advanced && (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              <p className="form-helper">Minutes</p>
            </div>
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
            {isEditing && existingFlight && (
              <>
                <div>
                  <label className="form-label">{t('fields.sicTime')}</label>
                  <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                    {formatDuration(existingFlight.sicTime || 0, fmt)}h
                  </div>
                  <p className="form-helper">{t('form.autoFromCrew', { defaultValue: 'Auto from crew roles' })}</p>
                </div>
                <div>
                  <label className="form-label">{t('detail.dualGiven')}</label>
                  <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                    {formatDuration(existingFlight.dualGivenTime || 0, fmt)}h
                  </div>
                  <p className="form-helper">{t('form.autoFromInstructorRole')}</p>
                </div>
              </>
            )}
          </div>

          {/* Instrument Tracking */}
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t('form.instrumentTracking')}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

            <div className="grid grid-cols-2 gap-4 mt-3">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  {...register('isIpc')}
                  type="checkbox"
                  id="isIpc"
                  className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                {t('form.ipcLabel')}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  {...register('isFlightReview')}
                  type="checkbox"
                  id="isFlightReview"
                  className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                {t('form.flightReviewLabel')}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  {...register('isProficiencyCheck')}
                  type="checkbox"
                  id="isProficiencyCheck"
                  className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                {t('form.proficiencyCheckLabel')}
              </label>
            </div>

            {/* FSTD Type — shown when simulated flight time > 0 */}
            {(watch('simulatedFlightTime') > 0 || watch('fstdType')) && (
              <div className="mt-3">
                <label htmlFor="fstdType" className="form-label">{t('fields.fstdType')}</label>
                <input
                  {...register('fstdType')}
                  id="fstdType"
                  className="input"
                  placeholder="e.g. FNPT II, FFS A320, BATD"
                />
                <p className="form-helper">{t('form.fstdHelper')}</p>
              </div>
            )}

            {/* Multi-Pilot Time */}
            <div className="mt-3">
              <label htmlFor="multiPilotTime" className="form-label">{t('fields.multiPilotTime')}</label>
              <input
                {...register('multiPilotTime', { valueAsNumber: true })}
                type="number"
                id="multiPilotTime"
                step="1"
                min="0"
                className="input"
              />
              <p className="form-helper">{t('form.multiPilotHelper')}</p>
            </div>
          </div>
          </>
        )}
      </fieldset>

      {/* PIC Name, Remarks & Endorsements */}
      <div className="space-y-4">
        <div>
          <label htmlFor="picName" className="form-label">
            {t('fields.picName')}
          </label>
          <input
            {...register('picName')}
            id="picName"
            className="input"
            placeholder={t('form.picNamePlaceholder')}
          />
          <p className="form-helper">{t('form.picNameHelper')}</p>
        </div>
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

      {/* Submit */}
      <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting ? t('saving') : isEditing ? t('updateFlight') : t('logFlight')}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1">
          {t('common:cancel')}
        </button>
      </div>
    </form>
  );
}
