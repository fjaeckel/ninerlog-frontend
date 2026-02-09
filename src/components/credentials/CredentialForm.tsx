import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateCredential, useUpdateCredential, useCredential } from '../../hooks/useCredentials';

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
});

type CredentialFormData = z.infer<typeof credentialSchema>;

interface CredentialFormProps {
  credentialId?: string | null;
  onClose: () => void;
}

export default function CredentialForm({ credentialId, onClose }: CredentialFormProps) {
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();
  const { data: existingCredential } = useCredential(credentialId || '');
  const isEditing = !!credentialId;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
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

  const onSubmit = async (data: CredentialFormData) => {
    try {
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
      console.error('Failed to save credential:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="credentialType" className="form-label">
          Type <span className="text-red-500">*</span>
        </label>
        <select {...register('credentialType')} id="credentialType" className="input">
          <option value="">Select type</option>
          {CREDENTIAL_TYPES.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
        {errors.credentialType && (
          <p className="mt-1 text-sm text-red-600">{errors.credentialType.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="credentialNumber" className="form-label">
          Number / Reference
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
            Issue Date <span className="text-red-500">*</span>
          </label>
          <input {...register('issueDate')} type="date" id="issueDate" className="input" />
          {errors.issueDate && (
            <p className="mt-1 text-sm text-red-600">{errors.issueDate.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="expiryDate" className="form-label">
            Expiry Date
          </label>
          <input {...register('expiryDate')} type="date" id="expiryDate" className="input" />
        </div>
      </div>

      <div>
        <label htmlFor="issuingAuthority" className="form-label">
          Issuing Authority <span className="text-red-500">*</span>
        </label>
        <input
          {...register('issuingAuthority')}
          type="text"
          id="issuingAuthority"
          className="input"
          placeholder="EASA AME, FAA, etc."
        />
        {errors.issuingAuthority && (
          <p className="mt-1 text-sm text-red-600">{errors.issuingAuthority.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="form-label">Notes</label>
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
          {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Add Credential'}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1">
          Cancel
        </button>
      </div>
    </form>
  );
}
