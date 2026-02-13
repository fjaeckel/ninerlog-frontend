import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateLicense, useUpdateLicense, useLicenses } from '../../hooks/useLicenses';
import type { LicenseType, LicenseCreate, LicenseUpdate } from '../../types/api';

const licenseSchema = z.object({
  licenseType: z.enum([
    'EASA_PPL',
    'FAA_PPL',
    'EASA_SPL',
    'FAA_SPORT',
    'EASA_CPL',
    'FAA_CPL',
    'EASA_ATPL',
    'FAA_ATPL',
    'EASA_IR',
    'FAA_IR',
  ]),
  licenseNumber: z.string().min(1, 'License number is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  expiryDate: z.string().optional(),
  issuingAuthority: z.string().min(1, 'Issuing authority is required'),
  isActive: z.boolean(),
});

type LicenseFormData = z.infer<typeof licenseSchema>;

const LICENSE_TYPES = [
  { value: 'EASA_PPL', label: 'EASA PPL - Private Pilot License' },
  { value: 'FAA_PPL', label: 'FAA PPL - Private Pilot Certificate' },
  { value: 'EASA_SPL', label: 'EASA SPL - Sailplane Pilot License' },
  { value: 'FAA_SPORT', label: 'FAA Sport Pilot Certificate' },
  { value: 'EASA_CPL', label: 'EASA CPL - Commercial Pilot License' },
  { value: 'FAA_CPL', label: 'FAA CPL - Commercial Pilot Certificate' },
  { value: 'EASA_ATPL', label: 'EASA ATPL - Airline Transport Pilot License' },
  { value: 'FAA_ATPL', label: 'FAA ATPL - Airline Transport Pilot Certificate' },
  { value: 'EASA_IR', label: 'EASA IR - Instrument Rating' },
  { value: 'FAA_IR', label: 'FAA IR - Instrument Rating' },
];

interface LicenseFormProps {
  licenseId?: string | null;
  onClose: () => void;
}

export default function LicenseForm({ licenseId, onClose }: LicenseFormProps) {
  const createLicense = useCreateLicense();
  const updateLicense = useUpdateLicense();
  const { data: licenses } = useLicenses();

  const isEditing = !!licenseId;
  const existingLicense = licenses?.find((l) => l.id === licenseId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LicenseFormData>({
    resolver: zodResolver(licenseSchema),
    defaultValues: existingLicense ? {
      licenseType: existingLicense.licenseType,
      licenseNumber: existingLicense.licenseNumber,
      issueDate: existingLicense.issueDate,
      expiryDate: existingLicense.expiryDate || undefined,
      issuingAuthority: existingLicense.issuingAuthority,
      isActive: existingLicense.isActive,
    } : {
      isActive: true,
    },
  });

  useEffect(() => {
    if (existingLicense) {
      reset({
        licenseType: existingLicense.licenseType,
        licenseNumber: existingLicense.licenseNumber,
        issueDate: existingLicense.issueDate,
        expiryDate: existingLicense.expiryDate || undefined,
        issuingAuthority: existingLicense.issuingAuthority,
        isActive: existingLicense.isActive,
      });
    }
  }, [existingLicense, reset]);

  const onSubmit = async (data: LicenseFormData) => {
    try {
      if (isEditing && licenseId) {
        const updateData: LicenseUpdate = {
          expiryDate: data.expiryDate || null,
          isActive: data.isActive,
        };
        await updateLicense.mutateAsync({ id: licenseId, data: updateData });
      } else {
        const createData: LicenseCreate = {
          licenseType: data.licenseType as LicenseType,
          licenseNumber: data.licenseNumber,
          issueDate: data.issueDate,
          expiryDate: data.expiryDate || null,
          issuingAuthority: data.issuingAuthority,
        };
        await createLicense.mutateAsync(createData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save license:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label htmlFor="licenseType" className="form-label">
          License Type <span className="text-red-500">*</span>
        </label>
        <select {...register('licenseType')} id="licenseType" className={`input ${errors.licenseType ? 'input-error' : ''}`}>
          <option value="">Select a license type</option>
          {LICENSE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {errors.licenseType && (
          <p className="form-error">{errors.licenseType.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="licenseNumber" className="form-label">
          License Number <span className="text-red-500">*</span>
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
          Issuing Authority <span className="text-red-500">*</span>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="issueDate" className="form-label">
            Issue Date <span className="text-red-500">*</span>
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

        <div>
          <label htmlFor="expiryDate" className="form-label">
            Expiry Date
          </label>
          <input
            {...register('expiryDate')}
            type="date"
            id="expiryDate"
            className="input"
          />
          <p className="form-helper">Leave blank if license doesn't expire</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          {...register('isActive')}
          type="checkbox"
          id="isActive"
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
        />
        <label htmlFor="isActive" className="block text-sm text-slate-700 dark:text-slate-300">
          Active license
        </label>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary flex-1"
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update License' : 'Add License'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="btn-secondary flex-1"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
