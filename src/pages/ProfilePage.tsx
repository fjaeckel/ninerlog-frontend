import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUpdateProfile, useChangePassword, useDeleteAccount, useDeleteAllFlights, useDeleteAllUserData } from '../hooks/useProfile';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../hooks/useNotifications';
import { useSetup2FA, useVerify2FA, useDisable2FA } from '../hooks/useTwoFactor';
import { ThemeSwitcher } from '../components/ui/ThemeSwitcher';
import { API_BASE_URL as API_BASE } from '../lib/config';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();
  const deleteAllFlights = useDeleteAllFlights();
  const deleteAllUserData = useDeleteAllUserData();
  const { data: notifPrefs } = useNotificationPreferences();
  const updateNotifPrefs = useUpdateNotificationPreferences();
  const setup2FA = useSetup2FA();
  const verify2FA = useVerify2FA();
  const disable2FA = useDisable2FA();

  // 2FA state
  const [twoFASetupData, setTwoFASetupData] = useState<{ secret: string; qrUri: string } | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [twoFADisablePassword, setTwoFADisablePassword] = useState('');
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [twoFAMessage, setTwoFAMessage] = useState('');

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMessage, setProfileMessage] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  // Delete state
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteFlightsConfirm, setShowDeleteFlightsConfirm] = useState(false);
  const [deleteFlightsMessage, setDeleteFlightsMessage] = useState('');
  const [showDeleteDataConfirm, setShowDeleteDataConfirm] = useState(false);
  const [deleteDataMessage, setDeleteDataMessage] = useState('');

  // Recalculate state
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcMessage, setRecalcMessage] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage('');
    try {
      await updateProfile.mutateAsync({ name, email });
      setProfileMessage('Profile updated successfully.');
    } catch {
      setProfileMessage('Failed to update profile.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');

    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage('New password must be at least 8 characters.');
      return;
    }

    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setPasswordMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordMessage('Failed to change password. Check your current password.');
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    try {
      await deleteAccount.mutateAsync(deletePassword);
      navigate('/login');
    } catch {
      setDeleteError('Failed to delete account. Check your password.');
    }
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setRecalcMessage('');
    try {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${API_BASE}/flights/recalculate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setRecalcMessage(`Recalculated ${data.updated} flight${data.updated !== 1 ? 's' : ''} successfully.${data.errors > 0 ? ` ${data.errors} error(s).` : ''}`);
    } catch {
      setRecalcMessage('Failed to recalculate flights. Please try again.');
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="max-w-[640px] mx-auto px-4 py-8">
      <h1 className="page-title mb-8">Profile Settings</h1>

      {/* Appearance */}
      <div className="card mb-6">
        <ThemeSwitcher variant="full" />
      </div>

      {/* Update Profile */}
      <div className="card mb-6">
        <h2 className="section-title mb-4">Profile Information</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label htmlFor="name" className="form-label">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input mt-1"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1"
              required
            />
          </div>
          {profileMessage && (
            <p className={`text-sm ${profileMessage.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {profileMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="btn-primary"
          >
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card mb-6">
        <h2 className="section-title mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="form-label">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input mt-1"
              required
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="form-label">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input mt-1"
              minLength={8}
              required
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="form-label">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input mt-1"
              minLength={8}
              required
            />
          </div>
          {passwordMessage && (
            <p className={`text-sm ${passwordMessage.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {passwordMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={changePassword.isPending}
            className="btn-primary"
          >
            {changePassword.isPending ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Notification Settings */}
      {notifPrefs && (
        <div className="card mb-6">
          <h2 className="section-title mb-4">Notification Settings</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Notifications</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">Master switch for all email alerts</p>
              </div>
              <input
                type="checkbox"
                checked={notifPrefs.emailEnabled}
                onChange={(e) => updateNotifPrefs.mutate({ emailEnabled: e.target.checked })}
                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Currency Warnings</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">Alerts when landing currency is about to expire</p>
              </div>
              <input
                type="checkbox"
                checked={notifPrefs.currencyWarnings}
                disabled={!notifPrefs.emailEnabled}
                onChange={(e) => updateNotifPrefs.mutate({ currencyWarnings: e.target.checked })}
                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Credential Warnings</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">Alerts when medicals, language certs, or clearances expire</p>
              </div>
              <input
                type="checkbox"
                checked={notifPrefs.credentialWarnings}
                disabled={!notifPrefs.emailEnabled}
                onChange={(e) => updateNotifPrefs.mutate({ credentialWarnings: e.target.checked })}
                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
            </label>

            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Warning Schedule</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Days before expiry to send warnings</p>
              <div className="flex gap-2">
                {[30, 14, 7, 3, 1].map((day) => {
                  const active = notifPrefs.warningDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!notifPrefs.emailEnabled}
                      onClick={() => {
                        const newDays = active
                          ? notifPrefs.warningDays.filter((d) => d !== day)
                          : [...notifPrefs.warningDays, day].sort((a, b) => b - a);
                        updateNotifPrefs.mutate({ warningDays: newDays });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        active
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      } disabled:opacity-50`}
                    >
                      {day}d
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two-Factor Authentication */}
      <div className="card mb-6">
        <h2 className="section-title mb-4">Two-Factor Authentication</h2>

        {recoveryCodes ? (
          // Show recovery codes after enabling
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">2FA Enabled Successfully!</p>
              <p className="text-xs text-green-700 dark:text-green-400 mb-3">
                Save these recovery codes in a safe place. Each can only be used once.
              </p>
              <div className="grid grid-cols-2 gap-1 font-mono text-sm bg-white dark:bg-slate-900 p-3 rounded border">
                {recoveryCodes.map((code, i) => (
                  <div key={i} className="text-slate-700 dark:text-slate-300">{code}</div>
                ))}
              </div>
            </div>
            <button
              onClick={() => { setRecoveryCodes(null); setTwoFASetupData(null); }}
              className="btn-primary w-full"
            >
              I've saved my codes
            </button>
          </div>
        ) : twoFASetupData ? (
          // Setup wizard - verify code
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code below.
            </p>
            <div className="flex justify-center p-4 bg-white dark:bg-slate-900 rounded-lg border">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFASetupData.qrUri)}`}
                alt="2FA QR Code"
                className="w-48 h-48"
              />
            </div>
            <div>
              <label className="form-label">Manual entry key</label>
              <code className="block text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded font-mono break-all select-all">
                {twoFASetupData.secret}
              </code>
            </div>
            <div>
              <label htmlFor="twoFACode" className="form-label">Verification Code</label>
              <input
                id="twoFACode"
                type="text"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input font-mono text-center text-lg tracking-widest"
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
              />
            </div>
            {twoFAMessage && <p className="text-sm text-red-600 dark:text-red-400">{twoFAMessage}</p>}
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setTwoFAMessage('');
                  try {
                    const result = await verify2FA.mutateAsync(twoFACode);
                    setRecoveryCodes(result.recoveryCodes);
                    updateUser({ twoFactorEnabled: true });
                    setTwoFACode('');
                  } catch {
                    setTwoFAMessage('Invalid code. Check your authenticator and try again.');
                  }
                }}
                disabled={twoFACode.length !== 6 || verify2FA.isPending}
                className="btn-primary flex-1"
              >
                {verify2FA.isPending ? 'Verifying...' : 'Verify & Enable'}
              </button>
              <button
                onClick={() => { setTwoFASetupData(null); setTwoFACode(''); setTwoFAMessage(''); }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : user?.twoFactorEnabled ? (
          // 2FA is enabled — show disable option
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-green-600 text-lg">🛡</span>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">2FA is enabled</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Your account is protected with TOTP authentication</p>
              </div>
            </div>
            {!showDisable2FA ? (
              <button
                onClick={() => setShowDisable2FA(true)}
                className="btn-secondary text-sm text-red-600"
              >
                Disable 2FA
              </button>
            ) : (
              <div className="space-y-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-300">Enter your password to disable 2FA:</p>
                <input
                  type="password"
                  value={twoFADisablePassword}
                  onChange={(e) => setTwoFADisablePassword(e.target.value)}
                  className="input"
                  placeholder="Your password"
                />
                {twoFAMessage && <p className="text-sm text-red-600 dark:text-red-400">{twoFAMessage}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      setTwoFAMessage('');
                      try {
                        await disable2FA.mutateAsync(twoFADisablePassword);
                        updateUser({ twoFactorEnabled: false });
                        setShowDisable2FA(false);
                        setTwoFADisablePassword('');
                      } catch {
                        setTwoFAMessage('Incorrect password.');
                      }
                    }}
                    disabled={!twoFADisablePassword || disable2FA.isPending}
                    className="btn-danger"
                  >
                    {disable2FA.isPending ? 'Disabling...' : 'Disable 2FA'}
                  </button>
                  <button
                    onClick={() => { setShowDisable2FA(false); setTwoFADisablePassword(''); setTwoFAMessage(''); }}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // 2FA not enabled — show setup button
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Add an extra layer of security to your account with a time-based one-time password (TOTP) from an authenticator app.
            </p>
            <button
              onClick={async () => {
                try {
                  const data = await setup2FA.mutateAsync();
                  setTwoFASetupData(data);
                } catch {
                  setTwoFAMessage('Failed to start 2FA setup.');
                }
              }}
              disabled={setup2FA.isPending}
              className="btn-primary"
            >
              {setup2FA.isPending ? 'Setting up...' : 'Enable 2FA'}
            </button>
          </div>
        )}
      </div>

      {/* Flight Data Maintenance */}
      <div className="card mb-6">
        <h2 className="section-title mb-4">Flight Data</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Recalculate all auto-computed fields across your flights (solo time, cross-country, distance, night time, day/night landing split, PIC/Dual).
          Useful after importing flights or changing aircraft data.
        </p>
        <button
          onClick={handleRecalculate}
          disabled={isRecalculating}
          className="btn-secondary"
        >
          {isRecalculating ? 'Recalculating...' : 'Recalculate All Flights'}
        </button>
        {recalcMessage && (
          <p className={`text-sm mt-2 ${recalcMessage.includes('error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {recalcMessage}
          </p>
        )}
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200 dark:border-red-800">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-6">Danger Zone</h2>

        {/* Delete All Flights */}
        <div className="mb-6 pb-6 border-b border-red-100 dark:border-red-900/30">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Permanently delete all flight log entries and import history. Your aircraft, licenses, contacts, and account will be preserved.
          </p>
          {!showDeleteFlightsConfirm ? (
            <button
              onClick={() => setShowDeleteFlightsConfirm(true)}
              className="btn-secondary text-red-700 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
            >
              Delete All Flights
            </button>
          ) : (
            <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Are you sure? This will permanently delete all your flights and import history.
              </p>
              {deleteFlightsMessage && (
                <p className={`text-sm ${deleteFlightsMessage.includes('error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {deleteFlightsMessage}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      const result = await deleteAllFlights.mutateAsync();
                      setDeleteFlightsMessage(`Deleted ${result.deleted} flights.`);
                      setShowDeleteFlightsConfirm(false);
                    } catch {
                      setDeleteFlightsMessage('Failed to delete flights — error.');
                    }
                  }}
                  disabled={deleteAllFlights.isPending}
                  className="btn-danger"
                >
                  {deleteAllFlights.isPending ? 'Deleting...' : 'Permanently Delete All Flights'}
                </button>
                <button
                  onClick={() => { setShowDeleteFlightsConfirm(false); setDeleteFlightsMessage(''); }}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {!showDeleteFlightsConfirm && deleteFlightsMessage && (
            <p className={`text-sm mt-2 ${deleteFlightsMessage.includes('error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {deleteFlightsMessage}
            </p>
          )}
        </div>

        {/* Delete All Data */}
        <div className="mb-6 pb-6 border-b border-red-100 dark:border-red-900/30">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Permanently delete all your data including flights, aircraft, licenses, contacts, credentials, and import history. Your account will be preserved but all data will be gone.
          </p>
          {!showDeleteDataConfirm ? (
            <button
              onClick={() => setShowDeleteDataConfirm(true)}
              className="btn-secondary text-red-700 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
            >
              Delete All Data
            </button>
          ) : (
            <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Are you sure? This will permanently delete ALL your data. Only your account login will remain.
              </p>
              {deleteDataMessage && (
                <p className={`text-sm ${deleteDataMessage.includes('error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {deleteDataMessage}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      await deleteAllUserData.mutateAsync();
                      setDeleteDataMessage('All data deleted successfully.');
                      setShowDeleteDataConfirm(false);
                    } catch {
                      setDeleteDataMessage('Failed to delete data — error.');
                    }
                  }}
                  disabled={deleteAllUserData.isPending}
                  className="btn-danger"
                >
                  {deleteAllUserData.isPending ? 'Deleting...' : 'Permanently Delete All Data'}
                </button>
                <button
                  onClick={() => { setShowDeleteDataConfirm(false); setDeleteDataMessage(''); }}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {!showDeleteDataConfirm && deleteDataMessage && (
            <p className={`text-sm mt-2 ${deleteDataMessage.includes('error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {deleteDataMessage}
            </p>
          )}
        </div>

        {/* Delete Account */}
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Permanently delete your account and all associated data including licenses, flights, and tokens. This action cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-secondary text-red-700 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Enter your password to confirm account deletion:
              </p>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="input"
                placeholder="Your password"
                aria-label="Confirm deletion password"
              />
              {deleteError && (
                <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={!deletePassword || deleteAccount.isPending}
                  className="btn-danger"
                >
                  {deleteAccount.isPending ? 'Deleting...' : 'Permanently Delete Account'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(''); }}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
