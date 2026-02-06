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
  departureIcao: z.string().max(4).optional().or(z.literal('')),
  arrivalIcao: z.string().max(4).optional().or(z.literal('')),
  offBlockTime: z.string().optional().or(z.literal('')),
  onBlockTime: z.string().optional().or(z.literal('')),
  departureTime: z.string().optional().or(z.literal('')),
  arrivalTime: z.string().optional().or(z.literal('')),
  totalTime: z.number().min(0, 'Must be 0 or greater'),
  picTime: z.number().min(0),
  dualTime: z.number().min(0),
  soloTime: z.number().min(0),
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
      totalTime: 0,
      picTime: 0,
      dualTime: 0,
      soloTime: 0,
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
        totalTime: existingFlight.totalTime,
        picTime: existingFlight.picTime,
        dualTime: existingFlight.dualTime,
        soloTime: existingFlight.soloTime,
        nightTime: existingFlight.nightTime,
        ifrTime: existingFlight.ifrTime,
        landingsDay: existingFlight.landingsDay,
        landingsNight: existingFlight.landingsNight,
        remarks: existingFlight.remarks || '',
      });
    }
  }, [existingFlight, isEditing, reset]);

  const totalTime = watch('totalTime');

  const onSubmit = async (data: FlightFormData) => {
    try {
      const payload = {
        licenseId: data.licenseId,
        date: data.date,
        aircraftReg: data.aircraftReg.toUpperCase(),
        aircraftType: data.aircraftType.toUpperCase(),
        departureIcao: data.departureIcao?.toUpperCase() || null,
        arrivalIcao: data.arrivalIcao?.toUpperCase() || null,
        offBlockTime: data.offBlockTime ? data.offBlockTime + ':00' : null,
        onBlockTime: data.onBlockTime ? data.onBlockTime + ':00' : null,
        departureTime: data.departureTime ? data.departureTime + ':00' : null,
        arrivalTime: data.arrivalTime ? data.arrivalTime + ':00' : null,
        totalTime: data.totalTime,
        picTime: data.picTime,
        dualTime: data.dualTime,
        soloTime: data.soloTime,
        nightTime: data.nightTime,
        ifrTime: data.ifrTime,
        landingsDay: data.landingsDay,
        landingsNight: data.landingsNight,
        remarks: data.remarks || null,
      };

      if (isEditing && flightId) {
        await updateFlight.mutateAsync({ id: flightId, data: payload });
      } else {
        await createFlight.mutateAsync(payload);
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
              Departure ICAO
            </label>
            <input
              {...register('departureIcao')}
              type="text"
              id="departureIcao"
              className="input mt-1 uppercase"
              placeholder="EDDF"
              maxLength={4}
            />
          </div>
          <div>
            <label htmlFor="offBlockTime" className="block text-sm font-medium text-gray-700">
              Off-Block
            </label>
            <input
              {...register('offBlockTime')}
              type="time"
              id="offBlockTime"
              className="input mt-1"
              title="Chocks off / engine start (UTC)"
            />
          </div>
          <div>
            <label htmlFor="departureTime" className="block text-sm font-medium text-gray-700">
              Takeoff
            </label>
            <input
              {...register('departureTime')}
              type="time"
              id="departureTime"
              className="input mt-1"
              title="Takeoff time (UTC)"
            />
          </div>
          <div className="hidden sm:block" />
          <div>
            <label htmlFor="arrivalIcao" className="block text-sm font-medium text-gray-700">
              Arrival ICAO
            </label>
            <input
              {...register('arrivalIcao')}
              type="text"
              id="arrivalIcao"
              className="input mt-1 uppercase"
              placeholder="EDDH"
              maxLength={4}
            />
          </div>
          <div>
            <label htmlFor="onBlockTime" className="block text-sm font-medium text-gray-700">
              On-Block
            </label>
            <input
              {...register('onBlockTime')}
              type="time"
              id="onBlockTime"
              className="input mt-1"
              title="Chocks on / engine shutdown (UTC)"
            />
          </div>
          <div>
            <label htmlFor="arrivalTime" className="block text-sm font-medium text-gray-700">
              Landing
            </label>
            <input
              {...register('arrivalTime')}
              type="time"
              id="arrivalTime"
              className="input mt-1"
              title="Landing time (UTC)"
            />
          </div>
        </div>
      </fieldset>

      {/* Flight Times */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-900 mb-3">Flight Times (hours)</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="totalTime" className="block text-sm font-medium text-gray-700">
              Total Time *
            </label>
            <input
              {...register('totalTime', { valueAsNumber: true })}
              type="number"
              id="totalTime"
              step="0.1"
              min="0"
              className="input mt-1"
            />
            {errors.totalTime && (
              <p className="mt-1 text-sm text-red-600">{errors.totalTime.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="picTime" className="block text-sm font-medium text-gray-700">
              PIC Time
            </label>
            <input
              {...register('picTime', { valueAsNumber: true })}
              type="number"
              id="picTime"
              step="0.1"
              min="0"
              max={totalTime || undefined}
              className="input mt-1"
            />
          </div>
          <div>
            <label htmlFor="dualTime" className="block text-sm font-medium text-gray-700">
              Dual Time
            </label>
            <input
              {...register('dualTime', { valueAsNumber: true })}
              type="number"
              id="dualTime"
              step="0.1"
              min="0"
              max={totalTime || undefined}
              className="input mt-1"
            />
          </div>
          <div>
            <label htmlFor="soloTime" className="block text-sm font-medium text-gray-700">
              Solo Time
            </label>
            <input
              {...register('soloTime', { valueAsNumber: true })}
              type="number"
              id="soloTime"
              step="0.1"
              min="0"
              max={totalTime || undefined}
              className="input mt-1"
            />
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
              max={totalTime || undefined}
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
              max={totalTime || undefined}
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
