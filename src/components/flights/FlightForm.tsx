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
        <legend className="text-sm font-semibold text-gray-900 mb-3">Basic Information</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="licenseId" className="block text-sm font-medium text-gray-700">
              License *
            </label>
            <select {...register('licenseId')} id="licenseId" className="input mt-1">
              <option value="">Select license</option>
              {licenses?.map((lic) => (
                <option key={lic.id} value={lic.id}>
                  {lic.licenseType.replace('_', ' ')} — {lic.licenseNumber}
                </option>
              ))}
            </select>
            {errors.licenseId && (
              <p className="mt-1 text-sm text-red-600">{errors.licenseId.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Date *
            </label>
            <input {...register('date')} type="date" id="date" className="input mt-1" />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="aircraftReg" className="block text-sm font-medium text-gray-700">
              Aircraft Registration *
            </label>
            <input
              {...register('aircraftReg')}
              type="text"
              id="aircraftReg"
              className="input mt-1"
              placeholder="D-EFGH"
            />
            {errors.aircraftReg && (
              <p className="mt-1 text-sm text-red-600">{errors.aircraftReg.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="aircraftType" className="block text-sm font-medium text-gray-700">
              Aircraft Type *
            </label>
            <input
              {...register('aircraftType')}
              type="text"
              id="aircraftType"
              className="input mt-1"
              placeholder="C172"
            />
            {errors.aircraftType && (
              <p className="mt-1 text-sm text-red-600">{errors.aircraftType.message}</p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Route & Times */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-900 mb-3">Route & Times (UTC)</legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label htmlFor="departureIcao" className="block text-sm font-medium text-gray-700">
              Departure ICAO *
            </label>
            <input
              {...register('departureIcao')}
              type="text"
              id="departureIcao"
              className="input mt-1 uppercase"
              placeholder="EDDF"
              maxLength={4}
            />
            {errors.departureIcao && (
              <p className="mt-1 text-sm text-red-600">{errors.departureIcao.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="offBlockTime" className="block text-sm font-medium text-gray-700">
              Off-Block *
            </label>
            <input
              {...register('offBlockTime')}
              type="time"
              id="offBlockTime"
              className="input mt-1"
              title="Chocks off / engine start (UTC)"
            />
            {errors.offBlockTime && (
              <p className="mt-1 text-sm text-red-600">{errors.offBlockTime.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="departureTime" className="block text-sm font-medium text-gray-700">
              Takeoff *
            </label>
            <input
              {...register('departureTime')}
              type="time"
              id="departureTime"
              className="input mt-1"
              title="Takeoff time (UTC)"
            />
            {errors.departureTime && (
              <p className="mt-1 text-sm text-red-600">{errors.departureTime.message}</p>
            )}
          </div>
          <div className="hidden sm:block" />
          <div>
            <label htmlFor="arrivalIcao" className="block text-sm font-medium text-gray-700">
              Arrival ICAO *
            </label>
            <input
              {...register('arrivalIcao')}
              type="text"
              id="arrivalIcao"
              className="input mt-1 uppercase"
              placeholder="EDDH"
              maxLength={4}
            />
            {errors.arrivalIcao && (
              <p className="mt-1 text-sm text-red-600">{errors.arrivalIcao.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="onBlockTime" className="block text-sm font-medium text-gray-700">
              On-Block *
            </label>
            <input
              {...register('onBlockTime')}
              type="time"
              id="onBlockTime"
              className="input mt-1"
              title="Chocks on / engine shutdown (UTC)"
            />
            {errors.onBlockTime && (
              <p className="mt-1 text-sm text-red-600">{errors.onBlockTime.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="arrivalTime" className="block text-sm font-medium text-gray-700">
              Landing *
            </label>
            <input
              {...register('arrivalTime')}
              type="time"
              id="arrivalTime"
              className="input mt-1"
              title="Landing time (UTC)"
            />
            {errors.arrivalTime && (
              <p className="mt-1 text-sm text-red-600">{errors.arrivalTime.message}</p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Flight Times */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-900 mb-3">Flight Times</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {isEditing && existingFlight && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total Time
              </label>
              <div className="input mt-1 bg-gray-50 text-gray-700">
                {existingFlight.totalTime.toFixed(1)}h
              </div>
              <p className="mt-1 text-xs text-gray-500">Computed from block times</p>
            </div>
          )}
          <div className="flex items-center gap-6 sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                {...register('isPic')}
                type="checkbox"
                id="isPic"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">PIC</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                {...register('isDual')}
                type="checkbox"
                id="isDual"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Dual (instruction received)</span>
            </label>
          </div>
          <div>
            <label htmlFor="nightTime" className="block text-sm font-medium text-gray-700">
              Night Time
            </label>
            <input
              {...register('nightTime', { valueAsNumber: true })}
              type="number"
              id="nightTime"
              step="0.1"
              min="0"
              className="input mt-1"
            />
          </div>
          <div>
            <label htmlFor="ifrTime" className="block text-sm font-medium text-gray-700">
              IFR Time
            </label>
            <input
              {...register('ifrTime', { valueAsNumber: true })}
              type="number"
              id="ifrTime"
              step="0.1"
              min="0"
              className="input mt-1"
            />
          </div>
        </div>
      </fieldset>

      {/* Landings */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-900 mb-3">Landings</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="landingsDay" className="block text-sm font-medium text-gray-700">
              Day Landings
            </label>
            <input
              {...register('landingsDay', { valueAsNumber: true })}
              type="number"
              id="landingsDay"
              min="0"
              className="input mt-1"
            />
          </div>
          <div>
            <label htmlFor="landingsNight" className="block text-sm font-medium text-gray-700">
              Night Landings
            </label>
            <input
              {...register('landingsNight', { valueAsNumber: true })}
              type="number"
              id="landingsNight"
              min="0"
              className="input mt-1"
            />
          </div>
        </div>
      </fieldset>

      {/* Remarks */}
      <div>
        <label htmlFor="remarks" className="block text-sm font-medium text-gray-700">
          Remarks
        </label>
        <textarea
          {...register('remarks')}
          id="remarks"
          rows={3}
          className="input mt-1"
          placeholder="Training flight, touch and go practice, etc."
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4">
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
