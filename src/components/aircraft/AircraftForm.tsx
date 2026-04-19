import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateAircraft, useUpdateAircraft, useAircraftById } from '../../hooks/useAircraft';
import { extractApiError } from '../../lib/errors';

const AIRCRAFT_CLASSES = [
  'SEP_LAND', 'SEP_SEA', 'MEP_LAND', 'MEP_SEA',
  'SET_LAND', 'SET_SEA', 'TMG',
] as const;

const aircraftSchema = z.object({
  registration: z.string().min(1, 'Registration is required').max(20),
  type: z.string().min(1, 'Type is required').max(50),
  make: z.string().min(1, 'Make is required').max(100),
  model: z.string().min(1, 'Model is required').max(100),
  aircraftClass: z.string().optional().or(z.literal('')),
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
  const { t } = useTranslation('aircraft');
  const createAircraft = useCreateAircraft();
  const updateAircraft = useUpdateAircraft();
  const { data: existingAircraft } = useAircraftById(aircraftId || '');
  const isEditing = !!aircraftId;

  const [isCustomClass, setIsCustomClass] = useState(() => {
    if (existingAircraft && isEditing) {
      const acClass = existingAircraft.aircraftClass || '';
      return acClass !== '' && !AIRCRAFT_CLASSES.some((c) => c === acClass);
    }
    return false;
  });
  const [apiError, setApiError] = useState<string | null>(null);
  const [prevAircraft, setPrevAircraft] = useState<typeof existingAircraft>(undefined);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<AircraftFormData>({
    resolver: zodResolver(aircraftSchema),
    defaultValues: {
      registration: '',
      type: '',
      make: '',
      model: '',
      aircraftClass: '',
      isComplex: false,
      isHighPerformance: false,
      isTailwheel: false,
      notes: '',
      isActive: true,
    },
  });

  if (existingAircraft && isEditing && existingAircraft !== prevAircraft) {
    setPrevAircraft(existingAircraft);
    const acClass = existingAircraft.aircraftClass || '';
    const isKnown = AIRCRAFT_CLASSES.some((c) => c === acClass);
    setIsCustomClass(acClass !== '' && !isKnown);

    reset({
      registration: existingAircraft.registration,
      type: existingAircraft.type,
      make: existingAircraft.make,
      model: existingAircraft.model,
      aircraftClass: acClass,
      isComplex: existingAircraft.isComplex ?? false,
      isHighPerformance: existingAircraft.isHighPerformance ?? false,
      isTailwheel: existingAircraft.isTailwheel ?? false,
      notes: existingAircraft.notes || '',
      isActive: existingAircraft.isActive ?? true,
    });
  }

  const onSubmit = async (data: AircraftFormData) => {
    try {
      const payload = {
        registration: data.registration,
        type: data.type,
        make: data.make,
        model: data.model,
        aircraftClass: (data.aircraftClass || null) as any,
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
      setApiError(extractApiError(error, t('form.failedToSave')));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {apiError}
        </div>
      )}
      {/* Registration & Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="registration" className="form-label">
            {t('fields.registration')} <span className="text-red-500">*</span>
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
            {t('fields.type')} <span className="text-red-500">*</span>
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
            {t('fields.make')} <span className="text-red-500">*</span>
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
            {t('fields.model')} <span className="text-red-500">*</span>
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

      {/* Aircraft Class */}
      <div>
        <label htmlFor="aircraftClass" className="form-label">
          {t('fields.aircraftClass')}
        </label>
        {isCustomClass ? (
          <div className="flex gap-2">
            <input
              {...register('aircraftClass')}
              type="text"
              id="aircraftClass"
              className="input flex-1"
              placeholder="e.g. ULTRALIGHT, GLIDER, GYROPLANE"
            />
            <button
              type="button"
              onClick={() => { setIsCustomClass(false); setValue('aircraftClass', ''); }}
              className="btn-ghost btn-sm text-xs whitespace-nowrap"
            >
              {t('form.pickFromList')}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <select
              {...register('aircraftClass')}
              id="aircraftClass"
              className="input flex-1"
              onChange={(e) => {
                register('aircraftClass').onChange(e);
              }}
            >
              <option value="">{t('form.selectClass')}</option>
              {AIRCRAFT_CLASSES.map((cr) => (
                <option key={cr} value={cr}>{t(`classOptions.${cr}`)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => { setIsCustomClass(true); setValue('aircraftClass', ''); }}
              className="btn-ghost btn-sm text-xs whitespace-nowrap"
            >
              {t('form.customClass')}
            </button>
          </div>
        )}
        <p className="form-helper">{t('form.classHelper')}</p>
      </div>

      {/* Boolean Flags */}
      <div className="space-y-3">
        <label className="form-label">{t('form.characteristics')}</label>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input {...register('isComplex')} type="checkbox" className="rounded border-slate-300 dark:border-slate-600" />
            {t('fields.isComplex')}
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input {...register('isHighPerformance')} type="checkbox" className="rounded border-slate-300 dark:border-slate-600" />
            {t('fields.isHighPerformance')}
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input {...register('isTailwheel')} type="checkbox" className="rounded border-slate-300 dark:border-slate-600" />
            {t('fields.isTailwheel')}
          </label>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="form-label">{t('common:notes', { defaultValue: 'Notes' })}</label>
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
            {t('form.activeInFleet')}
          </label>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting ? t('common:saving') : isEditing ? t('updateAircraft') : t('addAircraft')}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1">
          {t('common:cancel')}
        </button>
      </div>
    </form>
  );
}
