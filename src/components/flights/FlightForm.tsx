import { useEffect, useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { useCreateFlight, useUpdateFlight, useFlight } from '../../hooks/useFlights';
import { useLicenses } from '../../hooks/useLicenses';
import { useLicenseStore } from '../../stores/licenseStore';
import { useAircraft, useCreateAircraft } from '../../hooks/useAircraft';
import { useSearchContacts, useCreateContact } from '../../hooks/useContacts';
import type { Aircraft } from '../../hooks/useAircraft';
import type { CrewRole, FlightCrewMemberInput } from '../../types/api';

const flightSchema = z.object({
  licenseId: z.string().min(1, 'License is required'),
  date: z.string().min(1, 'Date is required'),
  aircraftReg: z.string().min(1, 'Aircraft registration is required'),
  aircraftType: z.string().min(1, 'Aircraft type is required'),
  departureIcao: z.string().min(1, 'Departure ICAO is required').max(4),
  arrivalIcao: z.string().min(1, 'Arrival ICAO is required').max(4),
  offBlockTime: z.string().min(1, 'Off-block time is required'),
  onBlockTime: z.string().min(1, 'On-block time is required'),
  departureTime: z.string().min(1, 'Takeoff time is required'),
  arrivalTime: z.string().min(1, 'Landing time is required'),
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
});

type FlightFormData = z.infer<typeof flightSchema>;

interface FlightFormProps {
  flightId?: string | null;
  onClose: () => void;
}

export default function FlightForm({ flightId, onClose }: FlightFormProps) {
  const createFlight = useCreateFlight();
  const updateFlight = useUpdateFlight();
  const { data: licenses } = useLicenses();
  const { activeLicense } = useLicenseStore();
  const { data: existingFlight } = useFlight(flightId || '');
  const { data: aircraftList } = useAircraft();
  const createAircraft = useCreateAircraft();

  const isEditing = !!flightId;

  // Aircraft autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddMake, setQuickAddMake] = useState('');
  const [quickAddModel, setQuickAddModel] = useState('');
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Collapsible section state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    route: true,
    times: true,
    landings: true,
    people: false,
    license: false,
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
      licenseId: activeLicense?.id || '',
      date: new Date().toISOString().split('T')[0],
      aircraftReg: '',
      aircraftType: '',
      departureIcao: '',
      arrivalIcao: '',
      offBlockTime: '',
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
    },
  });

  useEffect(() => {
    if (existingFlight && isEditing) {
      reset({
        licenseId: existingFlight.licenseId,
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
      });
      // Load existing crew members
      if (existingFlight.crewMembers) {
        setCrewMembers(existingFlight.crewMembers.map((m: { contactId?: string | null; name: string; role: string }) => ({
          contactId: m.contactId || null,
          name: m.name,
          role: m.role as CrewRole,
        })));
      }
    }
  }, [existingFlight, isEditing, reset]);

  // Determine if active license is SPL/Sport (no night flying allowed)
  const selectedLicenseId = watch('licenseId');
  const isSPL = (() => {
    const lic = licenses?.find((l) => l.id === selectedLicenseId);
    return lic?.licenseType === 'EASA_SPL' || lic?.licenseType === 'FAA_SPORT';
  })();



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
      console.error('Failed to quick-add aircraft:', error);
    }
  };

  const onSubmit = async (data: FlightFormData) => {
    try {
      const basePayload = {
        licenseId: data.licenseId,
        date: data.date,
        aircraftReg: data.aircraftReg.toUpperCase(),
        aircraftType: data.aircraftType.toUpperCase(),
        departureIcao: data.departureIcao.toUpperCase(),
        arrivalIcao: data.arrivalIcao.toUpperCase(),
        offBlockTime: data.offBlockTime + ':00',
        onBlockTime: data.onBlockTime + ':00',
        departureTime: data.departureTime + ':00',
        arrivalTime: data.arrivalTime + ':00',
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
        crewMembers: crewMembers.length > 0 ? crewMembers : undefined,
      };

      if (isEditing && flightId) {
        await updateFlight.mutateAsync({ id: flightId, data: basePayload });
      } else {
        await createFlight.mutateAsync(basePayload);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save flight:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Basic Information</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="form-label">
              Date <span className="text-red-500">*</span>
            </label>
            <input {...register('date')} type="date" id="date" className="input" />
            {errors.date && (
              <p className="form-error">{errors.date.message}</p>
            )}
          </div>

          <div className="relative" ref={suggestionsRef}>
            <label htmlFor="aircraftReg" className="form-label">
              Aircraft Registration <span className="text-red-500">*</span>
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
                className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                onClick={() => setShowQuickAdd(true)}
              >
                New aircraft? Save "{regUppercase}" to your fleet →
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
              Quick-add "{regUppercase}" to your aircraft fleet
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
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={!quickAddMake || !quickAddModel || createAircraft.isPending}
                className="btn-primary btn-sm text-xs"
              >
                {createAircraft.isPending ? 'Saving...' : 'Save Aircraft'}
              </button>
              <button
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="btn-ghost btn-sm text-xs"
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </fieldset>

      {/* Route & Times */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Route & Times (UTC)</legend>

        {/* Departure → Arrival ICAO side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="departureIcao" className="form-label">
              Departure ICAO <span className="text-red-500">*</span>
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
              Arrival ICAO <span className="text-red-500">*</span>
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

        {/* Off-Block → Takeoff → Landing → On-Block in a row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <label htmlFor="offBlockTime" className="form-label">
              Off-Block <span className="text-red-500">*</span>
            </label>
            <input
              {...register('offBlockTime')}
              type="time"
              id="offBlockTime"
              className="input"
              title="Chocks off / engine start (UTC)"
            />
            {errors.offBlockTime && (
              <p className="form-error">{errors.offBlockTime.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="departureTime" className="form-label">
              Takeoff <span className="text-red-500">*</span>
            </label>
            <input
              {...register('departureTime')}
              type="time"
              id="departureTime"
              className="input"
              title="Takeoff time (UTC)"
            />
            {errors.departureTime && (
              <p className="form-error">{errors.departureTime.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="arrivalTime" className="form-label">
              Landing <span className="text-red-500">*</span>
            </label>
            <input
              {...register('arrivalTime')}
              type="time"
              id="arrivalTime"
              className="input"
              title="Landing time (UTC)"
            />
            {errors.arrivalTime && (
              <p className="form-error">{errors.arrivalTime.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="onBlockTime" className="form-label">
              On-Block <span className="text-red-500">*</span>
            </label>
            <input
              {...register('onBlockTime')}
              type="time"
              id="onBlockTime"
              className="input"
              title="Chocks on / engine shutdown (UTC)"
            />
            {errors.onBlockTime && (
              <p className="form-error">{errors.onBlockTime.message}</p>
            )}
          </div>
        </div>

        {/* Route waypoints */}
        <div>
          <label htmlFor="route" className="form-label">
            Route (waypoints)
          </label>
          <input
            {...register('route')}
            type="text"
            id="route"
            className="input uppercase"
            placeholder="EDDF,EDDS,EDDM"
          />
          <p className="form-helper">Comma-separated ICAO codes for VFR/IFR flight plans</p>
        </div>
      </fieldset>

      {/* Takeoffs & Landings — right after route */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Takeoffs & Landings</legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label htmlFor="takeoffsDay" className="form-label">
              Day Takeoffs
            </label>
            <input
              {...register('takeoffsDay', { setValueAs: (v: string) => (v === '' ? undefined : Number(v)) })}
              type="number"
              id="takeoffsDay"
              min="0"
              className="input"
              placeholder="Auto"
            />
            <p className="form-helper">Auto-calculated if empty</p>
          </div>
          {!isSPL && (
            <div>
              <label htmlFor="takeoffsNight" className="form-label">
                Night Takeoffs
              </label>
              <input
                {...register('takeoffsNight', { setValueAs: (v: string) => (v === '' ? undefined : Number(v)) })}
                type="number"
                id="takeoffsNight"
                min="0"
                className="input"
                placeholder="Auto"
              />
              <p className="form-helper">Auto-calculated if empty</p>
            </div>
          )}
          <div>
            <label htmlFor="landings" className="form-label">
              Total Landings
            </label>
            <input
              {...register('landings', { valueAsNumber: true })}
              type="number"
              id="landings"
              min="0"
              className="input"
            />
            <p className="form-helper">Day/night split auto-calculated</p>
          </div>
        </div>
      </fieldset>

      {/* People & Crew Section (Collapsible) — right after route */}
      <fieldset>
        <button
          type="button"
          onClick={() => toggleSection('people')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 w-full text-left"
        >
          {expandedSections.people ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          People on Board
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
                  className="text-slate-400 hover:text-red-500"
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
                  placeholder="Person name"
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
                <option value="PIC">PIC</option>
                <option value="SIC">SIC</option>
                <option value="Instructor">Instructor</option>
                <option value="Student">Student</option>
                <option value="Passenger">Passenger</option>
                <option value="SafetyPilot">Safety Pilot</option>
                <option value="Examiner">Examiner</option>
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
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {/* Instructor fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label htmlFor="instructorName" className="form-label">Instructor Name</label>
                <input {...register('instructorName')} id="instructorName" className="input text-sm" placeholder="Instructor name" />
              </div>
              <div>
                <label htmlFor="instructorComments" className="form-label">Instructor Comments</label>
                <input {...register('instructorComments')} id="instructorComments" className="input text-sm" placeholder="Instructor remarks" />
              </div>
            </div>
          </div>
        )}
      </fieldset>

      {/* License (Collapsible drawer — defaults to user's default license) */}
      <fieldset>
        <button
          type="button"
          onClick={() => toggleSection('license')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 w-full text-left"
        >
          {expandedSections.license ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          License
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">
            {licenses?.find((l) => l.id === watch('licenseId'))?.licenseType.replace('_', ' ') || 'Default'}
          </span>
        </button>
        {expandedSections.license && (
          <div>
            <select {...register('licenseId')} id="licenseId" className="input">
              <option value="">Select license</option>
              {licenses?.map((lic) => (
                <option key={lic.id} value={lic.id}>
                  {lic.licenseType.replace('_', ' ')} — {lic.licenseNumber}
                </option>
              ))}
            </select>
            {errors.licenseId && (
              <p className="form-error">{errors.licenseId.message}</p>
            )}
          </div>
        )}
      </fieldset>

      {/* Total block time (edit mode only) */}
      {isEditing && existingFlight && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label">
              Total Block Time
            </label>
            <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
              {existingFlight.totalTime.toFixed(1)}h
            </div>
            <p className="form-helper">Computed from block times</p>
          </div>
        </div>
      )}

      {/* Takeoffs & Landings — old location removed, now after route */}

      {/* Auto-Calculated Values (edit mode) */}
      {isEditing && existingFlight && (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Auto-Calculated Values</legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="form-label">All Landings</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                {existingFlight.allLandings}
              </div>
            </div>
            <div>
              <label className="form-label">Solo Time</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                {existingFlight.soloTime.toFixed(1)}h
              </div>
            </div>
            <div>
              <label className="form-label">Cross-Country</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                {existingFlight.crossCountryTime.toFixed(1)}h
              </div>
            </div>
            <div>
              <label className="form-label">Distance</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                {existingFlight.distance.toFixed(1)} NM
              </div>
            </div>
            <div>
              <label className="form-label">Night Time</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                {existingFlight.nightTime.toFixed(1)}h
              </div>
            </div>
            <div>
              <label className="form-label">Function</label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                {existingFlight.isPic ? 'PIC' : existingFlight.isDual ? 'Dual' : '—'}
              </div>
              <p className="form-helper">Auto from crew</p>
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
          Advanced Times
        </button>
        {expandedSections.advanced && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="ifrTime" className="form-label">IFR Time</label>
              <input
                {...register('ifrTime', { valueAsNumber: true })}
                type="number"
                id="ifrTime"
                step="0.1"
                min="0"
                className="input"
              />
              <p className="form-helper">Hours</p>
            </div>
            <div>
              <label htmlFor="simulatedFlightTime" className="form-label">Simulated Flight</label>
              <input
                {...register('simulatedFlightTime', { valueAsNumber: true })}
                type="number"
                id="simulatedFlightTime"
                step="0.1"
                min="0"
                className="input"
              />
              <p className="form-helper">Hours (FTD/FSTD)</p>
            </div>
            <div>
              <label htmlFor="groundTrainingTime" className="form-label">Ground Training</label>
              <input
                {...register('groundTrainingTime', { valueAsNumber: true })}
                type="number"
                id="groundTrainingTime"
                step="0.1"
                min="0"
                className="input"
              />
              <p className="form-helper">Hours</p>
            </div>
            {isEditing && existingFlight && (
              <>
                <div>
                  <label className="form-label">SIC Time</label>
                  <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                    {existingFlight.sicTime?.toFixed(1) || '0.0'}h
                  </div>
                  <p className="form-helper">Auto from crew roles</p>
                </div>
                <div>
                  <label className="form-label">Dual Given</label>
                  <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                    {existingFlight.dualGivenTime?.toFixed(1) || '0.0'}h
                  </div>
                  <p className="form-helper">Auto from instructor role</p>
                </div>
              </>
            )}
          </div>
        )}
      </fieldset>

      {/* Remarks & Comments */}
      <div className="space-y-4">
        <div>
          <label htmlFor="remarks" className="form-label">
            Remarks
          </label>
          <textarea
            {...register('remarks')}
            id="remarks"
            rows={2}
            className="input"
            placeholder="Training flight, touch and go practice, etc."
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Flight' : 'Log Flight'}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1">
          Cancel
        </button>
      </div>
    </form>
  );
}
