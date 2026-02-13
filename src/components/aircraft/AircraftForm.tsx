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

const aircraftSchema = z.object({
  registration: z.string().min(1, 'Registration is required').max(20),
  type: z.string().min(1, 'Type is required').max(50),
  make: z.string().min(1, 'Make is required').max(100),
  model: z.string().min(1, 'Model is required').max(100),
  category: z.string().optional().or(z.literal('')),
  engineType: z.string().optional().or(z.literal('')),
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
      category: '',
      engineType: '',
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
        category: existingAircraft.category || '',
        engineType: existingAircraft.engineType || '',
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
        category: data.category || null,
        engineType: (data.engineType || null) as any,
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
          />
          {errors.registration && (
            <p className="mt-1 text-sm text-red-600">{errors.registration.message}</p>
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
          />
          {errors.type && (
            <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
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
          />
          {errors.make && (
            <p className="mt-1 text-sm text-red-600">{errors.make.message}</p>
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
          />
          {errors.model && (
            <p className="mt-1 text-sm text-red-600">{errors.model.message}</p>
          )}
        </div>
      </div>

      {/* Category & Engine Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="form-label">
            Category
          </label>
          <input
            {...register('category')}
            type="text"
            id="category"
            className="input"
            placeholder="SEP, MEP, TMG, ..."
          />
        </div>
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
