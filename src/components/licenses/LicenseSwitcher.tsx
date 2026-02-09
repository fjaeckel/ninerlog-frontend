import { useLicenseStore } from '../../stores/licenseStore';

export default function LicenseSwitcher() {
  const { licenses, activeLicense, setActiveLicense } = useLicenseStore();

  if (licenses.length === 0) return null;

  return (
    <div>
      <label htmlFor="license-select" className="form-label">
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
            {license.licenseType.replace('_', ' ')} — {license.licenseNumber}
          </option>
        ))}
      </select>
      {activeLicense && (
        <p className="form-helper">
          Flight logs will be associated with this license
        </p>
      )}
    </div>
  );
}
