import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateCredential, useUpdateCredential, useCredential } from '../../hooks/useCredentials';
import { extractApiError } from '../../lib/errors';

const CREDENTIAL_TYPES = [
  { value: 'EASA_CLASS1_MEDICAL', label: 'EASA Class 1 Medical' },
  { value: 'EASA_CLASS2_MEDICAL', label: 'EASA Class 2 Medical' },
  { value: 'EASA_LAPL_MEDICAL', label: 'EASA LAPL Medical' },
  { value: 'FAA_CLASS1_MEDICAL', label: 'FAA Class 1 Medical' },
  { value: 'FAA_CLASS2_MEDICAL', label: 'FAA Class 2 Medical' },
  { value: 'FAA_CLASS3_MEDICAL', label: 'FAA Class 3 Medical' },
  { value: 'LANG_ICAO_LEVEL4', label: 'Language Proficiency ICAO Level 4' },
  { value: 'LANG_ICAO_LEVEL5', label: 'Language Proficiency ICAO Level 5' },
  { value: 'LANG_ICAO_LEVEL6', label: 'Language Proficiency ICAO Level 6 (Expert)' },
  { value: 'SEC_CLEARANCE_ZUP', label: 'Security Clearance ZÜP (Germany)' },
  { value: 'SEC_CLEARANCE_ZUBB', label: 'Security Clearance ZüBB (Germany)' },
  { value: 'OTHER', label: 'Other' },
];

const credentialSchema = z.object({
  credentialType: z.string().min(1, 'Credential type is required'),
  credentialNumber: z.string().optional().or(z.literal('')),
  issueDate: z.string().min(1, 'Issue date is required'),
  expiryDate: z.string().optional().or(z.literal('')),
  issuingAuthority: z.string().min(1, 'Issuing authority is required'),
  notes: z.string().optional().or(z.literal('')),
}).refine(
  (data) => {
    if (data.expiryDate && data.issueDate) {
      return new Date(data.expiryDate) > new Date(data.issueDate);
    }
    return true;
  },
  { message: 'Expiry date must be after issue date', path: ['expiryDate'] }
);

type CredentialFormData = z.infer<typeof credentialSchema>;

interface CredentialFormProps {
  credentialId?: string | null;
  onClose: () => void;
}

export default function CredentialForm({ credentialId, onClose }: CredentialFormProps) {
  const { t } = useTranslation('credentials');
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();
  const { data: existingCredential } = useCredential(credentialId || '');
  const isEditing = !!credentialId;
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<CredentialFormData>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      credentialType: '',
      credentialNumber: '',
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      issuingAuthority: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (existingCredential && isEditing) {
      reset({
        credentialType: existingCredential.credentialType,
        credentialNumber: existingCredential.credentialNumber || '',
        issueDate: existingCredential.issueDate,
        expiryDate: existingCredential.expiryDate || '',
        issuingAuthority: existingCredential.issuingAuthority,
        notes: existingCredential.notes || '',
      });
    }
  }, [existingCredential, isEditing, reset]);

  // Clear API error when user modifies any field
  const watchedFields = watch();
  useEffect(() => {
    if (apiError) setApiError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedFields]);

  const onSubmit = async (data: CredentialFormData) => {
    try {
      setApiError(null);
      const payload = {
        credentialType: data.credentialType as any,
        credentialNumber: data.credentialNumber || null,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate || null,
        issuingAuthority: data.issuingAuthority,
        notes: data.notes || null,
      };

      if (isEditing && credentialId) {
        await updateCredential.mutateAsync({ id: credentialId, data: payload });
      } else {
        await createCredential.mutateAsync(payload);
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
      <div>
        <label htmlFor="credentialType" className="form-label">
          {t('fields.credentialType')} <span className="text-red-500">*</span>
        </label>
        <select {...register('credentialType')} id="credentialType" className={`input ${errors.credentialType ? 'input-error' : ''}`}
          aria-invalid={!!errors.credentialType}
          aria-describedby={errors.credentialType ? 'err-credentialType' : undefined}
        >
          <option value="">{t('form.selectType')}</option>
          {CREDENTIAL_TYPES.map((type) => (
            <option key={type.value} value={type.value}>{t(`types.${type.value}`)}</option>
          ))}
        </select>
        {errors.credentialType && (
          <p id="err-credentialType" className="form-error">{errors.credentialType.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="credentialNumber" className="form-label">
          {t('form.numberReference')}
        </label>
        <input
          {...register('credentialNumber')}
          type="text"
          id="credentialNumber"
          className="input"
          placeholder="MED-2026-001"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="issueDate" className="form-label">
            {t('fields.issueDate')} <span className="text-red-500">*</span>
          </label>
          <input {...register('issueDate')} type="date" id="issueDate" className={`input ${errors.issueDate ? 'input-error' : ''}`}
            aria-invalid={!!errors.issueDate}
            aria-describedby={errors.issueDate ? 'err-issueDate' : undefined}
          />
          {errors.issueDate && (
            <p id="err-issueDate" className="form-error">{errors.issueDate.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="expiryDate" className="form-label">
            {t('fields.expiryDate')}
          </label>
          <input {...register('expiryDate')} type="date" id="expiryDate" className="input" />
        </div>
      </div>

      <div>
        <label htmlFor="issuingAuthority" className="form-label">
          {t('fields.issuingAuthority')} <span className="text-red-500">*</span>
        </label>
        <input
          {...register('issuingAuthority')}
          type="text"
          id="issuingAuthority"
          className="input"
          placeholder="EASA AME, FAA, etc."
          aria-invalid={!!errors.issuingAuthority}
          aria-describedby={errors.issuingAuthority ? 'err-issuingAuthority' : undefined}
        />
        {errors.issuingAuthority && (
          <p id="err-issuingAuthority" className="form-error">{errors.issuingAuthority.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="form-label">{t('fields.notes')}</label>
        <textarea
          {...register('notes')}
          id="notes"
          rows={2}
          className="input"
          placeholder="Additional notes..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting ? t('common:saving') : isEditing ? t('form.update') : t('addCredential')}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1">
          {t('common:cancel')}
        </button>
      </div>
    </form>
  );
}
