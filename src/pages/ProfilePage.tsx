import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUpdateProfile, useChangePassword, useDeleteAccount } from '../hooks/useProfile';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../hooks/useNotifications';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();
  const { data: notifPrefs } = useNotificationPreferences();
  const updateNotifPrefs = useUpdateNotificationPreferences();

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

      {/* Update Profile */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
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
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
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
            <p className={`text-sm ${profileMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
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
        <h2 className="text-lg font-semibold mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
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
            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
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
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
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
            <p className={`text-sm ${passwordMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
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
          <h2 className="text-lg font-semibold mb-4">Notification Settings</h2>
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

      {/* Delete Account */}
      <div className="card border-red-200">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4">Danger Zone</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Permanently delete your account and all associated data including licenses, flights, and tokens.
          This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-secondary text-red-700 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20 border-red-300"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200">
            <p className="text-sm font-medium text-red-800">
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
              <p className="text-sm text-red-600">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={!deletePassword || deleteAccount.isPending}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
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
  );
}
