import { useLicenseStore } from '../../stores/licenseStore';
import { useSetDefaultLicense } from '../../hooks/useProfile';

export default function LicenseSwitcher() {
  const { licenses, activeLicense, setActiveLicense } = useLicenseStore();
  const setDefaultLicense = useSetDefaultLicense();

  if (licenses.length === 0) return null;

  return (
    <div>
      <label htmlFor="license-select" className="form-label">
        Default License
      </label>
      <select
        id="license-select"
        value={activeLicense?.id || ''}
        onChange={(e) => {
          const license = licenses.find((l) => l.id === e.target.value);
          if (license) {
            setActiveLicense(license);
            setDefaultLicense.mutate(license.id);
          }
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
          All flights and statistics use this license
        </p>
      )}
    </div>
  );
}
