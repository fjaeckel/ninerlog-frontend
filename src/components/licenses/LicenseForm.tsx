import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateLicense, useUpdateLicense, useLicenses } from '../../hooks/useLicenses';
import { extractApiError } from '../../lib/errors';
import type { LicenseCreate, LicenseUpdate } from '../../types/api';

const licenseSchema = z.object({
  regulatoryAuthority: z.string().min(1, 'Regulatory authority is required'),
  licenseType: z.string().min(1, 'License type is required'),
  licenseNumber: z.string().min(1, 'License number is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  issuingAuthority: z.string().min(1, 'Issuing authority is required'),
  requiresSeparateLogbook: z.boolean(),
});

type LicenseFormData = z.infer<typeof licenseSchema>;

interface LicenseFormProps {
  licenseId?: string | null;
  onClose: () => void;
}

export default function LicenseForm({ licenseId, onClose }: LicenseFormProps) {
  const { t } = useTranslation('licenses');
  const createLicense = useCreateLicense();
  const updateLicense = useUpdateLicense();
  const { data: licenses } = useLicenses();
  const [apiError, setApiError] = useState<string | null>(null);

  const isEditing = !!licenseId;
  const existingLicense = licenses?.find((l) => l.id === licenseId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<LicenseFormData>({
    resolver: zodResolver(licenseSchema),
    defaultValues: existingLicense ? {
      regulatoryAuthority: existingLicense.regulatoryAuthority,
      licenseType: existingLicense.licenseType,
      licenseNumber: existingLicense.licenseNumber,
      issueDate: existingLicense.issueDate,
      issuingAuthority: existingLicense.issuingAuthority,
      requiresSeparateLogbook: existingLicense.requiresSeparateLogbook,
    } : {
      requiresSeparateLogbook: false,
    },
  });

  useEffect(() => {
    if (existingLicense) {
      reset({
        regulatoryAuthority: existingLicense.regulatoryAuthority,
        licenseType: existingLicense.licenseType,
        licenseNumber: existingLicense.licenseNumber,
        issueDate: existingLicense.issueDate,
        issuingAuthority: existingLicense.issuingAuthority,
        requiresSeparateLogbook: existingLicense.requiresSeparateLogbook,
      });
    }
  }, [existingLicense, reset]);

  // Clear API error when user modifies any field
  const watchedFields = watch();
  useEffect(() => {
    if (apiError) setApiError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedFields]);

  const onSubmit = async (data: LicenseFormData) => {
    try {
      setApiError(null);
      if (isEditing && licenseId) {
        const updateData: LicenseUpdate = {
          regulatoryAuthority: data.regulatoryAuthority,
          licenseType: data.licenseType,
          licenseNumber: data.licenseNumber,
          issuingAuthority: data.issuingAuthority,
          requiresSeparateLogbook: data.requiresSeparateLogbook,
        };
        await updateLicense.mutateAsync({ id: licenseId, data: updateData });
      } else {
        const createData: LicenseCreate = {
          regulatoryAuthority: data.regulatoryAuthority,
          licenseType: data.licenseType,
          licenseNumber: data.licenseNumber,
          issueDate: data.issueDate,
          issuingAuthority: data.issuingAuthority,
          requiresSeparateLogbook: data.requiresSeparateLogbook,
        };
        await createLicense.mutateAsync(createData);
      }
      onClose();
    } catch (error) {
      setApiError(extractApiError(error, t('form.failedToSave')));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {apiError}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="regulatoryAuthority" className="form-label">
            {t('fields.regulatoryAuthority')} <span className="text-red-500">*</span>
          </label>
          <input
            {...register('regulatoryAuthority')}
            type="text"
            id="regulatoryAuthority"
            list="regulatoryAuthority-list"
            className={`input ${errors.regulatoryAuthority ? 'input-error' : ''}`}
            placeholder="e.g. EASA"
          />
          <datalist id="regulatoryAuthority-list">
            <option value="EASA" />
            <option value="FAA" />
            <option value="CAA UK" />
            <option value="Transport Canada" />
            <option value="CASA" />
            <option value="DGCA" />
          </datalist>
          {errors.regulatoryAuthority && (
            <p className="form-error">{errors.regulatoryAuthority.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="licenseType" className="form-label">
            {t('fields.licenseType')} <span className="text-red-500">*</span>
          </label>
          <input
            {...register('licenseType')}
            type="text"
            id="licenseType"
            list="licenseType-list"
            className={`input ${errors.licenseType ? 'input-error' : ''}`}
            placeholder="e.g. PPL"
          />
          <datalist id="licenseType-list">
            <option value="PPL" />
            <option value="CPL" />
            <option value="ATPL" />
            <option value="SPL" />
            <option value="LAPL" />
            <option value="UL" />
            <option value="IR" />
          </datalist>
          {errors.licenseType && (
            <p className="form-error">{errors.licenseType.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="licenseNumber" className="form-label">
          {t('fields.licenseNumber')} <span className="text-red-500">*</span>
        </label>
        <input
          {...register('licenseNumber')}
          type="text"
          id="licenseNumber"
          className={`input ${errors.licenseNumber ? 'input-error' : ''}`}
          placeholder="DE.FCL.12345"
        />
        {errors.licenseNumber && (
          <p className="form-error">{errors.licenseNumber.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="issuingAuthority" className="form-label">
          {t('fields.issuingAuthority')} <span className="text-red-500">*</span>
        </label>
        <input
          {...register('issuingAuthority')}
          type="text"
          id="issuingAuthority"
          className={`input ${errors.issuingAuthority ? 'input-error' : ''}`}
          placeholder="LBA (Germany)"
        />
        {errors.issuingAuthority && (
          <p className="form-error">{errors.issuingAuthority.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="issueDate" className="form-label">
          {t('fields.issueDate')} <span className="text-red-500">*</span>
        </label>
        <input
          {...register('issueDate')}
          type="date"
          id="issueDate"
          className={`input ${errors.issueDate ? 'input-error' : ''}`}
        />
        {errors.issueDate && (
          <p className="form-error">{errors.issueDate.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          {...register('requiresSeparateLogbook')}
          type="checkbox"
          id="requiresSeparateLogbook"
          className="rounded border-slate-300 dark:border-slate-600"
        />
        <label htmlFor="requiresSeparateLogbook" className="text-sm text-slate-700 dark:text-slate-300">
          {t('form.requiresSeparateLogbook')}
        </label>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary flex-1"
        >
          {isSubmitting ? t('common:saving') : isEditing ? t('updateLicense') : t('addLicense')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="btn-secondary flex-1"
        >
          {t('common:cancel')}
        </button>
      </div>
    </form>
  );
}
