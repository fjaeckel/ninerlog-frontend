import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateFlight, useUpdateFlight, useFlight } from '../../hooks/useFlights';
import { useLicenses } from '../../hooks/useLicenses';
import { useLicenseStore } from '../../stores/licenseStore';

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
  isPic: z.boolean(),
  isDual: z.boolean(),
  nightTime: z.number().min(0),
  ifrTime: z.number().min(0),
  landingsDay: z.number().int().min(0),
  landingsNight: z.number().int().min(0),
  remarks: z.string().optional().or(z.literal('')),
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

  const isEditing = !!flightId;

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
      isPic: true,
      isDual: false,
      nightTime: 0,
      ifrTime: 0,
      landingsDay: 1,
      landingsNight: 0,
      remarks: '',
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
        isPic: existingFlight.isPic,
        isDual: existingFlight.isDual,
        nightTime: existingFlight.nightTime,
        ifrTime: existingFlight.ifrTime,
        landingsDay: existingFlight.landingsDay,
        landingsNight: existingFlight.landingsNight,
        remarks: existingFlight.remarks || '',
      });
    }
  }, [existingFlight, isEditing, reset]);

  // Determine if active license is SPL/Sport (no night flying allowed)
  const selectedLicenseId = watch('licenseId');
  const isSPL = (() => {
    const lic = licenses?.find((l) => l.id === selectedLicenseId);
    return lic?.licenseType === 'EASA_SPL' || lic?.licenseType === 'FAA_SPORT';
  })();

  // Force night fields to 0 when SPL is selected
  useEffect(() => {
    if (isSPL) {
      setValue('nightTime', 0);
      setValue('landingsNight', 0);
    }
  }, [isSPL, setValue]);

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
        isPic: data.isPic,
        isDual: data.isDual,
        nightTime: data.nightTime,
        ifrTime: data.ifrTime,
        landingsDay: data.landingsDay,
        landingsNight: data.landingsNight,
        remarks: data.remarks || null,
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
            <label htmlFor="licenseId" className="form-label">
              License <span className="text-red-500">*</span>
            </label>
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

          <div>
            <label htmlFor="date" className="form-label">
              Date <span className="text-red-500">*</span>
            </label>
            <input {...register('date')} type="date" id="date" className="input" />
            {errors.date && (
              <p className="form-error">{errors.date.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="aircraftReg" className="form-label">
              Aircraft Registration <span className="text-red-500">*</span>
            </label>
            <input
              {...register('aircraftReg')}
              type="text"
              id="aircraftReg"
              className="input"
              placeholder="D-EFGH"
            />
            {errors.aircraftReg && (
              <p className="form-error">{errors.aircraftReg.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="aircraftType" className="form-label">
              Aircraft Type <span className="text-red-500">*</span>
            </label>
            <input
              {...register('aircraftType')}
              type="text"
              id="aircraftType"
              className="input"
              placeholder="C172"
            />
            {errors.aircraftType && (
              <p className="form-error">{errors.aircraftType.message}</p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Route & Times */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Route & Times (UTC)</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="hidden sm:block" />
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
        </div>
      </fieldset>

      {/* Block Times */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Block Times</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {isEditing && existingFlight && (
            <div>
              <label className="form-label">
                Total Block Time
              </label>
              <div className="input bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                {existingFlight.totalTime.toFixed(1)}h
              </div>
              <p className="form-helper">Computed from block times</p>
            </div>
          )}
          <div className="flex items-center gap-6 sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                {...register('isPic')}
                type="checkbox"
                id="isPic"
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">PIC</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                {...register('isDual')}
                type="checkbox"
                id="isDual"
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Dual (instruction received)</span>
            </label>
          </div>
          {!isSPL && (
            <div>
              <label htmlFor="nightTime" className="form-label">
                Night Time
              </label>
              <input
                {...register('nightTime', { valueAsNumber: true })}
                type="number"
                id="nightTime"
                step="0.1"
                min="0"
                className="input"
              />
            </div>
          )}
          <div>
            <label htmlFor="ifrTime" className="form-label">
              IFR Time
            </label>
            <input
              {...register('ifrTime', { valueAsNumber: true })}
              type="number"
              id="ifrTime"
              step="0.1"
              min="0"
              className="input"
            />
          </div>
        </div>
      </fieldset>

      {/* Landings */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Landings</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="landingsDay" className="form-label">
              Day Landings
            </label>
            <input
              {...register('landingsDay', { valueAsNumber: true })}
              type="number"
              id="landingsDay"
              min="0"
              className="input"
            />
          </div>
          {!isSPL && (
            <div>
              <label htmlFor="landingsNight" className="form-label">
                Night Landings
              </label>
              <input
                {...register('landingsNight', { valueAsNumber: true })}
                type="number"
                id="landingsNight"
                min="0"
                className="input"
              />
            </div>
          )}
        </div>
      </fieldset>

      {/* Remarks */}
      <div>
        <label htmlFor="remarks" className="form-label">
          Remarks
        </label>
        <textarea
          {...register('remarks')}
          id="remarks"
          rows={3}
          className="input"
          placeholder="Training flight, touch and go practice, etc."
        />
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
