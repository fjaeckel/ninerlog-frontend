import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { useAuthStore } from '../stores/authStore';
import { useUpdateProfile, useChangePassword, useDeleteAccount, useDeleteAllFlights, useDeleteAllUserData } from '../hooks/useProfile';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../hooks/useNotifications';
import { useSetup2FA, useVerify2FA, useDisable2FA } from '../hooks/useTwoFactor';
import { ThemeSwitcher } from '../components/ui/ThemeSwitcher';
import { API_BASE_URL as API_BASE } from '../lib/config';
import { extractApiError, extractApiStatus } from '../lib/errors';
import { NotificationHistory } from '../components/NotificationHistory';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { PasskeySection } from '../components/auth/PasskeySection';

export default function ProfilePage() {
  const { t } = useTranslation('settings');
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
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

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

  // Tab state
  const [activeTab, setActiveTab] = useState<'preferences' | 'account' | 'notifications' | 'data'>('preferences');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage('');

    // Client-side validation
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName || trimmedName.length < 1) {
      setProfileMessage(t('profileInfo.nameRequired'));
      return;
    }
    if (trimmedName.length > 255) {
      setProfileMessage(t('profileInfo.nameTooLong'));
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setProfileMessage(t('profileInfo.invalidEmail'));
      return;
    }

    try {
      await updateProfile.mutateAsync({ name: trimmedName, email: trimmedEmail });
      setProfileMessage(t('profileInfo.updateSuccess'));
    } catch (err: unknown) {
      const status = extractApiStatus(err);
      if (status === 409) {
        setProfileMessage(t('profileInfo.emailInUse'));
      } else {
        setProfileMessage(extractApiError(err, t('profileInfo.updateFailed')));
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');

    if (newPassword !== confirmPassword) {
      setPasswordMessage(t('changePassword.noMatch'));
      return;
    }
    if (newPassword.length < 12) {
      setPasswordMessage(t('changePassword.tooShort'));
      return;
    }

    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setPasswordMessage(t('changePassword.success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordMessage(t('changePassword.failed'));
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    try {
      await deleteAccount.mutateAsync(deletePassword);
      navigate('/login');
    } catch {
      setDeleteError(t('dangerZone.deleteAccountFailed'));
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


  const tabs = [
    { id: 'preferences' as const, label: t('tabs.preferences') },
    { id: 'account' as const, label: t('tabs.account') },
    { id: 'notifications' as const, label: t('tabs.notifications') },
    { id: 'data' as const, label: t('tabs.data') },
  ];

  return (
    <div className="max-w-[640px] mx-auto px-4 py-8">
      <h1 className="page-title mb-6">{t('title')}</h1>

      {/* Tab Navigation — select on mobile, tabs on sm+ */}
      <div className="sm:hidden mb-6">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as typeof activeTab)}
          className="input w-full"
        >
          {tabs.map(({ id, label }) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </div>
      <div className="hidden sm:flex border-b border-slate-200 dark:border-slate-700 mb-6">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
              activeTab === id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* Preferences Tab: Appearance, Language, Time Display            */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          <div className="card">
            <ThemeSwitcher variant="full" />
          </div>

          <LanguageSwitcher />

          <div className="card">
            <h2 className="section-title mb-4">{t('dateFormat.title')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              {t('dateFormat.description')}
            </p>
            <select
              value={user?.dateFormat || 'DD.MM.YYYY'}
              onChange={async (e) => { const value = e.target.value as 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'; try { await updateProfile.mutateAsync({ dateFormat: value } as any); updateUser({ dateFormat: value }); } catch { /* ignore */ } }}
              className="input w-full"
            >
              <option value="DD.MM.YYYY">14.04.2026 — {t('dateFormat.european')}</option>
              <option value="MM/DD/YYYY">04/14/2026 — {t('dateFormat.us')}</option>
              <option value="YYYY-MM-DD">2026-04-14 — {t('dateFormat.iso')}</option>
            </select>
          </div>

          <div className="card">
            <h2 className="section-title mb-4">{t('decimalSeparator.title')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              {t('decimalSeparator.description')}
            </p>
            <select
              value={user?.decimalSeparator || 'comma'}
              onChange={async (e) => { const value = e.target.value as 'comma' | 'dot'; try { await updateProfile.mutateAsync({ decimalSeparator: value } as any); updateUser({ decimalSeparator: value }); } catch { /* ignore */ } }}
              className="input w-full"
            >
              <option value="comma">{t('decimalSeparator.comma')}</option>
              <option value="dot">{t('decimalSeparator.dot')}</option>
            </select>
          </div>

          <div className="card">
            <h2 className="section-title mb-4">{t('timeDisplay.title')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              {t('timeDisplay.description')}
            </p>
            <select
              value={user?.timeDisplayFormat || 'hm'}
              onChange={async (e) => { const value = e.target.value as 'hm' | 'decimal'; try { await updateProfile.mutateAsync({ timeDisplayFormat: value } as any); updateUser({ timeDisplayFormat: value }); } catch { /* ignore */ } }}
              className="input w-full"
            >
              <option value="hm">{t('timeDisplay.hmExample')} — {t('timeDisplay.hm')}</option>
              <option value="decimal">{t('timeDisplay.decimalExample')} — {t('timeDisplay.decimal')}</option>
            </select>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* Account Tab: Profile Info, Password, Two-Factor                */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Profile Information */}
          <div className="card">
            <h2 className="section-title mb-4">{t('profileInfo.title')}</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label htmlFor="name" className="form-label">{t('profileInfo.name')}</label>
                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" required />
              </div>
              <div>
                <label htmlFor="email" className="form-label">{t('profileInfo.email')}</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" required />
              </div>
              {profileMessage && (
                <p className={`text-sm ${profileMessage.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{profileMessage}</p>
              )}
              <button type="submit" disabled={updateProfile.isPending} className="btn-primary">
                {updateProfile.isPending ? t('profileInfo.saving') : t('profileInfo.saveChanges')}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="card">
            <h2 className="section-title mb-4">{t('changePassword.title')}</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="form-label">{t('changePassword.currentPassword')}</label>
                <input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input mt-1" required />
              </div>
              <div>
                <label htmlFor="newPassword" className="form-label">{t('changePassword.newPassword')}</label>
                <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input mt-1" minLength={12} required />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="form-label">{t('changePassword.confirmNewPassword')}</label>
                <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input mt-1" minLength={12} required />
              </div>
              {passwordMessage && (
                <p className={`text-sm ${passwordMessage.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{passwordMessage}</p>
              )}
              <button type="submit" disabled={changePassword.isPending} className="btn-primary">
                {changePassword.isPending ? t('changePassword.changing') : t('changePassword.change')}
              </button>
            </form>
          </div>

          {/* Two-Factor Authentication */}
          <div className="card">
            <h2 className="section-title mb-4">{t('twoFactor.title')}</h2>
            {recoveryCodes ? (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">{t('twoFactor.enabledSuccess')}</p>
                  <p className="text-xs text-green-700 dark:text-green-400 mb-3">{t('twoFactor.saveRecoveryCodes')}</p>
                  <div className="grid grid-cols-2 gap-1 font-mono text-sm bg-white dark:bg-slate-900 p-3 rounded border">
                    {recoveryCodes.map((code, i) => (<div key={i} className="text-slate-700 dark:text-slate-300">{code}</div>))}
                  </div>
                </div>
                <button onClick={() => { setRecoveryCodes(null); setTwoFASetupData(null); setQrDataUrl(null); }} className="btn-primary w-full">{t('twoFactor.savedCodes')}</button>
              </div>
            ) : twoFASetupData ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">{t('twoFactor.scanQr')}</p>
                <div className="flex justify-center p-4 bg-white dark:bg-slate-900 rounded-lg border">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="2FA QR Code" className="w-48 h-48" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-slate-400">Loading...</div>
                  )}
                </div>
                <div>
                  <label className="form-label">{t('twoFactor.manualKey')}</label>
                  <code className="block text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded font-mono break-all select-all">{twoFASetupData.secret}</code>
                </div>
                <div>
                  <label htmlFor="twoFACode" className="form-label">{t('twoFactor.verificationCode')}</label>
                  <input id="twoFACode" type="text" value={twoFACode} onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="input font-mono text-center text-lg tracking-widest" placeholder="000000" maxLength={6} inputMode="numeric" />
                </div>
                {twoFAMessage && <p className="text-sm text-red-600 dark:text-red-400">{twoFAMessage}</p>}
                <div className="flex gap-3">
                  <button onClick={async () => { setTwoFAMessage(''); try { const result = await verify2FA.mutateAsync(twoFACode); setRecoveryCodes(result.recoveryCodes); updateUser({ twoFactorEnabled: true }); setTwoFACode(''); } catch { setTwoFAMessage(t('twoFactor.invalidCode')); } }} disabled={twoFACode.length !== 6 || verify2FA.isPending} className="btn-primary flex-1">
                    {verify2FA.isPending ? t('twoFactor.verifying') : t('twoFactor.verifyAndEnable')}
                  </button>
                  <button onClick={() => { setTwoFASetupData(null); setQrDataUrl(null); setTwoFACode(''); setTwoFAMessage(''); }} className="btn-secondary flex-1">Cancel</button>
                </div>
              </div>
            ) : user?.twoFactorEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-green-600 text-lg">🛡</span>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('twoFactor.enabled')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('twoFactor.enabledDesc')}</p>
                  </div>
                </div>
                {!showDisable2FA ? (
                  <button onClick={() => setShowDisable2FA(true)} className="btn-secondary text-sm text-red-600">{t('twoFactor.disable')}</button>
                ) : (
                  <div className="space-y-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-800 dark:text-red-300">{t('twoFactor.disablePrompt')}</p>
                    <input type="password" value={twoFADisablePassword} onChange={(e) => setTwoFADisablePassword(e.target.value)} className="input" placeholder="Your password" />
                    {twoFAMessage && <p className="text-sm text-red-600 dark:text-red-400">{twoFAMessage}</p>}
                    <div className="flex gap-3">
                      <button onClick={async () => { setTwoFAMessage(''); try { await disable2FA.mutateAsync(twoFADisablePassword); updateUser({ twoFactorEnabled: false }); setShowDisable2FA(false); setTwoFADisablePassword(''); } catch { setTwoFAMessage(t('twoFactor.incorrectPassword')); } }} disabled={!twoFADisablePassword || disable2FA.isPending} className="btn-danger">
                        {disable2FA.isPending ? t('twoFactor.disabling') : t('twoFactor.disable')}
                      </button>
                      <button onClick={() => { setShowDisable2FA(false); setTwoFADisablePassword(''); setTwoFAMessage(''); }} className="btn-secondary text-sm">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">Add an extra layer of security with a time-based one-time password (TOTP) from an authenticator app.</p>
                <button onClick={async () => { try { const data = await setup2FA.mutateAsync(); setTwoFASetupData(data); QRCode.toDataURL(data.qrUri, { width: 200, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null)); } catch { setTwoFAMessage('Failed to start 2FA setup.'); } }} disabled={setup2FA.isPending} className="btn-primary">
                  {setup2FA.isPending ? t('twoFactor.settingUp') : t('twoFactor.enable')}
                </button>
              </div>
            )}
          </div>

          <PasskeySection />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* Notifications Tab: Email settings, categories, history         */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {notifPrefs && (
            <div className="card">
              <h2 className="section-title mb-4">{t('notifications.title')}</h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.emailNotifications')}</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('notifications.masterSwitch')}</p>
                  </div>
                  <input type="checkbox" checked={notifPrefs.emailEnabled} onChange={(e) => updateNotifPrefs.mutate({ emailEnabled: e.target.checked })} className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                </label>

                {/* Credentials Group */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{t('notifications.credentials')}</h3>
                  <div className="space-y-2">
                    {([
                      { cat: 'credential_medical' as const, label: t('notifications.categories.credential_medical'), desc: t('notifications.categories.credential_medical_desc') },
                      { cat: 'credential_language' as const, label: t('notifications.categories.credential_language'), desc: t('notifications.categories.credential_language_desc') },
                      { cat: 'credential_security' as const, label: t('notifications.categories.credential_security'), desc: t('notifications.categories.credential_security_desc') },
                      { cat: 'credential_other' as const, label: t('notifications.categories.credential_other'), desc: t('notifications.categories.credential_other_desc') },
                    ] as const).map(({ cat, label, desc }) => (
                      <label key={cat} className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                        </div>
                        <input type="checkbox" checked={notifPrefs.enabledCategories.includes(cat)} disabled={!notifPrefs.emailEnabled} onChange={(e) => { const cats = e.target.checked ? [...notifPrefs.enabledCategories, cat] : notifPrefs.enabledCategories.filter((c) => c !== cat); updateNotifPrefs.mutate({ enabledCategories: cats }); }} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50" />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Ratings & Currency Group */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{t('notifications.ratingsAndCurrency')}</h3>
                  <div className="space-y-2">
                    {([
                      { cat: 'rating_expiry' as const, label: t('notifications.categories.rating_expiry'), desc: t('notifications.categories.rating_expiry_desc') },
                      { cat: 'currency_passenger' as const, label: t('notifications.categories.currency_passenger'), desc: t('notifications.categories.currency_passenger_desc') },
                      { cat: 'currency_night' as const, label: t('notifications.categories.currency_night'), desc: t('notifications.categories.currency_night_desc') },
                      { cat: 'currency_instrument' as const, label: t('notifications.categories.currency_instrument'), desc: t('notifications.categories.currency_instrument_desc') },
                      { cat: 'currency_flight_review' as const, label: t('notifications.categories.currency_flight_review'), desc: t('notifications.categories.currency_flight_review_desc') },
                      { cat: 'currency_revalidation' as const, label: t('notifications.categories.currency_revalidation'), desc: t('notifications.categories.currency_revalidation_desc') },
                    ] as const).map(({ cat, label, desc }) => (
                      <label key={cat} className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                        </div>
                        <input type="checkbox" checked={notifPrefs.enabledCategories.includes(cat)} disabled={!notifPrefs.emailEnabled} onChange={(e) => { const cats = e.target.checked ? [...notifPrefs.enabledCategories, cat] : notifPrefs.enabledCategories.filter((c) => c !== cat); updateNotifPrefs.mutate({ enabledCategories: cats }); }} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50" />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Warning Schedule */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.warningSchedule')}</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t('notifications.warningDays')}</p>
                  <div className="flex gap-2">
                    {[30, 14, 7, 3, 1].map((day) => {
                      const active = notifPrefs.warningDays.includes(day);
                      return (
                        <button key={day} type="button" disabled={!notifPrefs.emailEnabled} onClick={() => { const newDays = active ? notifPrefs.warningDays.filter((d: number) => d !== day) : [...notifPrefs.warningDays, day].sort((a: number, b: number) => b - a); updateNotifPrefs.mutate({ warningDays: newDays }); }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'} disabled:opacity-50`}>
                          {day}d
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Check Hour */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.checkHour')}</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('notifications.checkHourDesc')}</p>
                    </div>
                    <select value={notifPrefs.checkHour} disabled={!notifPrefs.emailEnabled} onChange={(e) => updateNotifPrefs.mutate({ checkHour: parseInt(e.target.value, 10) })} className="input w-24 text-sm disabled:opacity-50">
                      {Array.from({ length: 24 }, (_, i) => (<option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>))}
                    </select>
                  </label>
                </div>
              </div>
            </div>
          )}

          <NotificationHistory />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* Data & Security Tab: Recalculate, Danger Zone                  */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          {/* Flight Data Maintenance */}
          <div className="card">
            <h2 className="section-title mb-4">{t('flightData.title')}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {t('flightData.recalculateDesc')}
            </p>
            <button onClick={handleRecalculate} disabled={isRecalculating} className="btn-secondary">
              {isRecalculating ? t('flightData.recalculating') : t('flightData.recalculate')}
            </button>
            {recalcMessage && (
              <p className={`text-sm mt-2 ${recalcMessage.includes('error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{recalcMessage}</p>
            )}
          </div>

          {/* Danger Zone */}
          <div className="card border-red-200 dark:border-red-800">
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-6">{t('dangerZone.title')}</h2>

            {/* Delete All Flights */}
            <div className="mb-6 pb-6 border-b border-red-100 dark:border-red-900/30">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{t('dangerZone.deleteFlightsDesc')}</p>
              {!showDeleteFlightsConfirm ? (
                <button onClick={() => setShowDeleteFlightsConfirm(true)} className="btn-secondary text-red-700 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700">{t('dangerZone.deleteFlights')}</button>
              ) : (
                <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">{t('dangerZone.deleteFlightsConfirm')}</p>
                  {deleteFlightsMessage && <p className={`text-sm ${deleteFlightsMessage.includes('error') ? 'text-red-600' : 'text-green-600'}`}>{deleteFlightsMessage}</p>}
                  <div className="flex gap-3">
                    <button onClick={async () => { try { const result = await deleteAllFlights.mutateAsync(); setDeleteFlightsMessage(`Deleted ${result.deleted} flights.`); setShowDeleteFlightsConfirm(false); } catch { setDeleteFlightsMessage('Failed to delete flights — error.'); } }} disabled={deleteAllFlights.isPending} className="btn-danger">{deleteAllFlights.isPending ? t('common:deleting') : t('dangerZone.deleteFlightsButton')}</button>
                    <button onClick={() => { setShowDeleteFlightsConfirm(false); setDeleteFlightsMessage(''); }} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </div>
              )}
              {!showDeleteFlightsConfirm && deleteFlightsMessage && <p className={`text-sm mt-2 ${deleteFlightsMessage.includes('error') ? 'text-red-600' : 'text-green-600'}`}>{deleteFlightsMessage}</p>}
            </div>

            {/* Delete All Data */}
            <div className="mb-6 pb-6 border-b border-red-100 dark:border-red-900/30">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{t('dangerZone.deleteDataDesc')}</p>
              {!showDeleteDataConfirm ? (
                <button onClick={() => setShowDeleteDataConfirm(true)} className="btn-secondary text-red-700 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700">{t('dangerZone.deleteData')}</button>
              ) : (
                <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">{t('dangerZone.deleteDataConfirm')}</p>
                  {deleteDataMessage && <p className={`text-sm ${deleteDataMessage.includes('error') ? 'text-red-600' : 'text-green-600'}`}>{deleteDataMessage}</p>}
                  <div className="flex gap-3">
                    <button onClick={async () => { try { await deleteAllUserData.mutateAsync(); setDeleteDataMessage('All data deleted successfully.'); setShowDeleteDataConfirm(false); } catch { setDeleteDataMessage('Failed to delete data — error.'); } }} disabled={deleteAllUserData.isPending} className="btn-danger">{deleteAllUserData.isPending ? t('common:deleting') : t('dangerZone.deleteDataButton')}</button>
                    <button onClick={() => { setShowDeleteDataConfirm(false); setDeleteDataMessage(''); }} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </div>
              )}
              {!showDeleteDataConfirm && deleteDataMessage && <p className={`text-sm mt-2 ${deleteDataMessage.includes('error') ? 'text-red-600' : 'text-green-600'}`}>{deleteDataMessage}</p>}
            </div>

            {/* Delete Account */}
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{t('dangerZone.deleteAccountDesc')}</p>
              {!showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)} className="btn-secondary text-red-700 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700">{t('dangerZone.deleteAccount')}</button>
              ) : (
                <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">{t('dangerZone.deleteAccountPrompt')}</p>
                  <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="input" placeholder="Your password" aria-label="Confirm deletion password" />
                  {deleteError && <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
                  <div className="flex gap-3">
                    <button onClick={handleDeleteAccount} disabled={!deletePassword || deleteAccount.isPending} className="btn-danger">{deleteAccount.isPending ? t('common:deleting') : t('dangerZone.deleteAccountButton')}</button>
                    <button onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(''); }} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
