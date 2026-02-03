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

  return (
    <div
      className={`card ${
        isActive ? 'ring-2 ring-primary-500' : ''
      } ${isExpired ? 'opacity-60' : ''}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold">{license.licenseType.replace('_', ' ')}</h3>
          <p className="text-sm text-gray-600">{license.licenseNumber}</p>
        </div>
        {isActive && (
          <span className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
            Active
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-600">Authority:</span>
          <span className="ml-2 font-medium">{license.issuingAuthority}</span>
        </div>
        <div>
          <span className="text-gray-600">Issued:</span>
          <span className="ml-2">{format(new Date(license.issueDate), 'MMM dd, yyyy')}</span>
        </div>
        {license.expiryDate && (
          <div>
            <span className="text-gray-600">Expires:</span>
            <span
              className={`ml-2 ${
                isExpired ? 'text-red-600 font-semibold' : isExpiringSoon ? 'text-orange-600' : ''
              }`}
            >
              {format(new Date(license.expiryDate), 'MMM dd, yyyy')}
              {isExpired && ' (Expired)'}
              {isExpiringSoon && !isExpired && ' (Expires soon)'}
            </span>
          </div>
        )}
        <div>
          <span className="text-gray-600">Status:</span>
          <span
            className={`ml-2 ${
              license.isActive && !isExpired ? 'text-green-600' : 'text-gray-500'
            }`}
          >
            {license.isActive && !isExpired ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
        <button onClick={onEdit} className="btn-secondary flex-1 text-sm py-1">
          Edit
        </button>
        <button
          onClick={onDelete}
          className="btn-secondary flex-1 text-sm py-1 hover:bg-red-50 hover:text-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
