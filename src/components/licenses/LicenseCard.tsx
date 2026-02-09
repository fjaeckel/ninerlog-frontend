import { License } from '../../stores/licenseStore';
import { format } from 'date-fns';

interface LicenseCardProps {
  license: License;
  isActive: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export default function LicenseCard({ license, isActive, onEdit, onDelete }: LicenseCardProps) {
  const isExpiringSoon =
    license.expiryDate &&
    new Date(license.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const isExpired = license.expiryDate && new Date(license.expiryDate) < new Date();

  // License type display mapping
  const typeShort = license.licenseType.split('_').pop() || '';
  const authority = license.licenseType.split('_')[0] || '';

  return (
    <div
      className={`card transition-shadow ${
        isActive ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'
      } ${isExpired ? 'opacity-60' : ''}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <span className="badge-info font-semibold">{typeShort}</span>
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {authority} {typeShort === 'SPORT' ? 'Sport Pilot' : typeShort}
            </h3>
            <p className="data-sm text-slate-500 dark:text-slate-400">{license.licenseNumber}</p>
          </div>
        </div>
        {isActive && (
          <span className="badge-info">Active</span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Authority</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">{license.issuingAuthority}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Issued</span>
          <span className="text-slate-700 dark:text-slate-300">{format(new Date(license.issueDate), 'MMM dd, yyyy')}</span>
        </div>
        {license.expiryDate && (
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Expires</span>
            <span
              className={
                isExpired
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : isExpiringSoon
                    ? 'text-amber-600 dark:text-amber-400 font-medium'
                    : 'text-slate-700 dark:text-slate-300'
              }
            >
              {format(new Date(license.expiryDate), 'MMM dd, yyyy')}
              {isExpired && (
                <span className="ml-1.5 badge-expired text-[10px]">EXPIRED</span>
              )}
              {isExpiringSoon && !isExpired && (
                <span className="ml-1.5 badge-expiring text-[10px]">EXPIRING</span>
              )}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Status</span>
          <span className={
            license.isActive && !isExpired
              ? 'badge-current'
              : 'badge-neutral'
          }>
            {license.isActive && !isExpired ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button onClick={onEdit} className="btn-secondary btn-sm flex-1">
          Edit
        </button>
        <button
          onClick={onDelete}
          className="btn-secondary btn-sm flex-1 hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
