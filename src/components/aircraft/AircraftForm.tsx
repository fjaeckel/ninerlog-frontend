import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateAircraft, useUpdateAircraft, useAircraftById } from '../../hooks/useAircraft';

const ENGINE_TYPES = [
  { value: 'piston', label: 'Piston' },
  { value: 'turboprop', label: 'Turboprop' },
  { value: 'jet', label: 'Jet' },
  { value: 'electric', label: 'Electric' },
];

const AIRCRAFT_CLASSES = [
  { value: 'SEP_LAND', label: 'SEP (Land) — Single Engine Piston' },
  { value: 'SEP_SEA', label: 'SEP (Sea) — Single Engine Piston' },
  { value: 'MEP_LAND', label: 'MEP (Land) — Multi Engine Piston' },
  { value: 'MEP_SEA', label: 'MEP (Sea) — Multi Engine Piston' },
  { value: 'SET_LAND', label: 'SET (Land) — Single Engine Turboprop' },
  { value: 'SET_SEA', label: 'SET (Sea) — Single Engine Turboprop' },
  { value: 'TMG', label: 'TMG — Touring Motor Glider' },
  { value: 'OTHER', label: 'Other' },
];

const aircraftSchema = z.object({
  registration: z.string().min(1, 'Registration is required').max(20),
  type: z.string().min(1, 'Type is required').max(50),
  make: z.string().min(1, 'Make is required').max(100),
  model: z.string().min(1, 'Model is required').max(100),
  engineType: z.string().optional().or(z.literal('')),
  aircraftClass: z.enum(['SEP_LAND', 'SEP_SEA', 'MEP_LAND', 'MEP_SEA', 'SET_LAND', 'SET_SEA', 'TMG', 'IR', 'OTHER', '']).optional(),
  isComplex: z.boolean(),
  isHighPerformance: z.boolean(),
  isTailwheel: z.boolean(),
  notes: z.string().optional().or(z.literal('')),
  isActive: z.boolean(),
});

type AircraftFormData = z.infer<typeof aircraftSchema>;

interface AircraftFormProps {
  aircraftId?: string | null;
  onClose: () => void;
}

export default function AircraftForm({ aircraftId, onClose }: AircraftFormProps) {
  const createAircraft = useCreateAircraft();
  const updateAircraft = useUpdateAircraft();
  const { data: existingAircraft } = useAircraftById(aircraftId || '');
  const isEditing = !!aircraftId;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AircraftFormData>({
    resolver: zodResolver(aircraftSchema),
    defaultValues: {
      registration: '',
      type: '',
      make: '',
      model: '',
      engineType: '',
      aircraftClass: '',
      isComplex: false,
      isHighPerformance: false,
      isTailwheel: false,
      notes: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (existingAircraft && isEditing) {
      reset({
        registration: existingAircraft.registration,
        type: existingAircraft.type,
        make: existingAircraft.make,
        model: existingAircraft.model,
        engineType: existingAircraft.engineType || '',
        aircraftClass: existingAircraft.aircraftClass || '',
        isComplex: existingAircraft.isComplex ?? false,
        isHighPerformance: existingAircraft.isHighPerformance ?? false,
        isTailwheel: existingAircraft.isTailwheel ?? false,
        notes: existingAircraft.notes || '',
        isActive: existingAircraft.isActive ?? true,
      });
    }
  }, [existingAircraft, isEditing, reset]);

  const onSubmit = async (data: AircraftFormData) => {
    try {
      const payload = {
        registration: data.registration,
        type: data.type,
        make: data.make,
        model: data.model,
        engineType: (data.engineType || null) as any,
        aircraftClass: (data.aircraftClass || undefined) as any,
        isComplex: data.isComplex,
        isHighPerformance: data.isHighPerformance,
        isTailwheel: data.isTailwheel,
        notes: data.notes || null,
        ...(isEditing ? { isActive: data.isActive } : {}),
      };

      if (isEditing && aircraftId) {
        await updateAircraft.mutateAsync({ id: aircraftId, data: payload });
      } else {
        await createAircraft.mutateAsync(payload);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save aircraft:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Registration & Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="registration" className="form-label">
            Registration <span className="text-red-500">*</span>
          </label>
          <input
            {...register('registration')}
            type="text"
            id="registration"
            className={`input ${errors.registration ? 'input-error' : ''}`}
            placeholder="D-EFGH"
            aria-invalid={!!errors.registration}
            aria-describedby={errors.registration ? 'err-registration' : undefined}
          />
          {errors.registration && (
            <p id="err-registration" className="form-error">{errors.registration.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="type" className="form-label">
            Type <span className="text-red-500">*</span>
          </label>
          <input
            {...register('type')}
            type="text"
            id="type"
            className={`input ${errors.type ? 'input-error' : ''}`}
            placeholder="C172"
            aria-invalid={!!errors.type}
            aria-describedby={errors.type ? 'err-type' : undefined}
          />
          {errors.type && (
            <p id="err-type" className="form-error">{errors.type.message}</p>
          )}
        </div>
      </div>

      {/* Make & Model */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="make" className="form-label">
            Make <span className="text-red-500">*</span>
          </label>
          <input
            {...register('make')}
            type="text"
            id="make"
            className={`input ${errors.make ? 'input-error' : ''}`}
            placeholder="Cessna"
            aria-invalid={!!errors.make}
            aria-describedby={errors.make ? 'err-make' : undefined}
          />
          {errors.make && (
            <p id="err-make" className="form-error">{errors.make.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="model" className="form-label">
            Model <span className="text-red-500">*</span>
          </label>
          <input
            {...register('model')}
            type="text"
            id="model"
            className={`input ${errors.model ? 'input-error' : ''}`}
            placeholder="172 Skyhawk"
            aria-invalid={!!errors.model}
            aria-describedby={errors.model ? 'err-model' : undefined}
          />
          {errors.model && (
            <p id="err-model" className="form-error">{errors.model.message}</p>
          )}
        </div>
      </div>

      {/* Engine Type */}
      <div>
        <label htmlFor="engineType" className="form-label">
          Engine Type
        </label>
        <select {...register('engineType')} id="engineType" className="input">
          <option value="">Not specified</option>
          {ENGINE_TYPES.map((et) => (
            <option key={et.value} value={et.value}>{et.label}</option>
          ))}
        </select>
      </div>

      {/* Aircraft Class */}
      <div>
        <label htmlFor="aircraftClass" className="form-label">
          Aircraft Class
        </label>
        <select {...register('aircraftClass')} id="aircraftClass" className="input">
          <option value="">Select class</option>
          {AIRCRAFT_CLASSES.map((cr) => (
            <option key={cr.value} value={cr.value}>{cr.label}</option>
          ))}
        </select>
      </div>

      {/* Boolean Flags */}
      <div className="space-y-3">
        <label className="form-label">Characteristics</label>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input {...register('isComplex')} type="checkbox" className="rounded border-slate-300 dark:border-slate-600" />
            Complex
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input {...register('isHighPerformance')} type="checkbox" className="rounded border-slate-300 dark:border-slate-600" />
            High Performance
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input {...register('isTailwheel')} type="checkbox" className="rounded border-slate-300 dark:border-slate-600" />
            Tailwheel
          </label>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="form-label">Notes</label>
        <textarea
          {...register('notes')}
          id="notes"
          rows={2}
          className="input"
          placeholder="Club aircraft, checkout required, etc."
        />
      </div>

      {/* Active toggle (edit only) */}
      {isEditing && (
        <div>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input {...register('isActive')} type="checkbox" className="rounded border-slate-300 dark:border-slate-600" />
            Active in fleet
          </label>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Aircraft' : 'Add Aircraft'}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1">
          Cancel
        </button>
      </div>
    </form>
  );
}
