import { useLicenseStore } from '../../stores/licenseStore';

export default function LicenseSwitcher() {
  const { licenses, activeLicense, setActiveLicense } = useLicenseStore();

  if (licenses.length === 0) return null;

  return (
    <div className="card">
      <label htmlFor="license-select" className="block text-sm font-medium text-gray-700 mb-2">
        Active License
      </label>
      <select
        id="license-select"
        value={activeLicense?.id || ''}
        onChange={(e) => {
          const license = licenses.find((l) => l.id === e.target.value);
          setActiveLicense(license || null);
        }}
        className="input"
      >
        <option value="">Select a license</option>
        {licenses.map((license) => (
          <option key={license.id} value={license.id}>
            {license.licenseType.replace('_', ' ')} - {license.licenseNumber}
          </option>
        ))}
      </select>
      {activeLicense && (
        <p className="mt-2 text-sm text-gray-600">
          Flight logs will be associated with this license
        </p>
      )}
    </div>
  );
}
