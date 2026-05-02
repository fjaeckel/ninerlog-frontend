import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { ShieldCheck, Search, Ban, CheckCircle, Unlock, KeyRound, Users, BarChart3, Wrench, ScrollText, Settings2, Megaphone, Trash2 } from 'lucide-react';
import {
  useAdminUsers, useDisableUser, useEnableUser, useUnlockUser, useResetUser2fa,
  useAdminStats, useAdminAuditLog, useCleanupTokens, useSmtpTest, useAdminConfig,
} from '../../hooks/useAdmin';
import { useCreateAnnouncement, useDeleteAnnouncement, useAnnouncements } from '../../hooks/useAnnouncements';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import type { AdminUser } from '../../hooks/useAdmin';

type Tab = 'dashboard' | 'users' | 'audit' | 'maintenance' | 'announcements' | 'config';

export default function AdminPage() {
  const { t } = useTranslation('common');
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('dashboard');

  if (!user?.isAdmin) {
    return (
      <div className="mx-auto max-w-[960px] py-6">
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">{'\uD83D\uDD12'}</div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('admin.accessDenied')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('admin.noPrivileges')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          <h1 className="page-title">{t('admin.title')}</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('admin.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-700 overflow-x-auto -mx-4 px-4 scrollbar-none">
        {([
          { id: 'dashboard' as Tab, label: t('admin.tabs.dashboard'), icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'users' as Tab, label: t('admin.tabs.users'), icon: <Users className="w-4 h-4" /> },
          { id: 'audit' as Tab, label: t('admin.tabs.auditLog'), icon: <ScrollText className="w-4 h-4" /> },
          { id: 'maintenance' as Tab, label: t('admin.tabs.maintenance'), icon: <Wrench className="w-4 h-4" /> },
          { id: 'announcements' as Tab, label: t('admin.tabs.announcements'), icon: <Megaphone className="w-4 h-4" /> },
          { id: 'config' as Tab, label: t('admin.tabs.config'), icon: <Settings2 className="w-4 h-4" /> },
        ]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors shrink-0 ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}>{t.icon} {t.label}</button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'audit' && <AuditLogTab />}
      {tab === 'maintenance' && <MaintenanceTab />}
      {tab === 'announcements' && <AnnouncementsTab />}
      {tab === 'config' && <ConfigTab />}
    </div>
  );
}

function DashboardTab() {
  const { t } = useTranslation('common');
  const { data, isLoading } = useAdminStats();

  if (isLoading) return <div className="text-slate-400 text-sm">{t('admin.dashboard.loadingStats')}</div>;
  if (!data) return null;

  const stats = [
    { label: t('admin.dashboard.totalUsers'), value: data.totalUsers },
    { label: t('admin.dashboard.totalFlights'), value: data.totalFlights },
    { label: t('admin.dashboard.totalAircraft'), value: data.totalAircraft },
    { label: t('admin.dashboard.totalCredentials'), value: data.totalCredentials },
    { label: t('admin.dashboard.totalImports'), value: data.totalImports },
    { label: t('admin.dashboard.flightsThisMonth'), value: data.flightsThisMonth },
    { label: t('admin.dashboard.newUsersWeek'), value: data.newUsersThisWeek },
    { label: t('admin.dashboard.lockedAccounts'), value: data.lockedAccounts, warn: data.lockedAccounts > 0 },
    { label: t('admin.dashboard.disabledAccounts'), value: data.disabledAccounts, warn: data.disabledAccounts > 0 },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="card text-center py-4">
          <div className={`text-2xl font-bold ${s.warn ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}>{s.value}</div>
          <div className="text-xs text-slate-500 mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const { t } = useTranslation('common');
  const { fmtDate } = useFormatPrefs();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: string; user: AdminUser } | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  const { data, isLoading } = useAdminUsers(page, 20, search || undefined);
  const disableUser = useDisableUser();
  const enableUser = useEnableUser();
  const unlockUser = useUnlockUser();
  const resetUser2fa = useResetUser2fa();

  const handleAction = async () => {
    if (!confirmAction) return;
    setActionMessage('');
    try {
      const fns: Record<string, (id: string) => Promise<unknown>> = {
        disable: (id) => disableUser.mutateAsync(id),
        enable: (id) => enableUser.mutateAsync(id),
        unlock: (id) => unlockUser.mutateAsync(id),
        'reset-2fa': (id) => resetUser2fa.mutateAsync(id),
      };
      await fns[confirmAction.type](confirmAction.user.id);
      setActionMessage(`Action "${confirmAction.type}" applied to ${confirmAction.user.email}.`);
    } catch { setActionMessage(`Failed to ${confirmAction.type} user.`); }
    setConfirmAction(null);
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setSearch(searchInput); setPage(1); };
  const actionLabel = (type: string) => type === 'disable' ? t('admin.users.disable') : type === 'enable' ? t('admin.users.enable') : type === 'unlock' ? t('admin.users.unlock') : t('admin.users.reset2fa');

  return (
    <>
      {actionMessage && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${actionMessage.includes('Failed') ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'}`}>{actionMessage}</div>
      )}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t('admin.users.searchPlaceholder')} className="input pl-10" aria-label={t('admin.users.searchAriaLabel')} />
        </div>
        <button type="submit" className="btn-primary">{t('admin.users.search')}</button>
        {search && <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} className="btn-secondary">{t('admin.users.clear')}</button>}
      </form>
      <div className="card overflow-hidden">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 dark:border-slate-700 text-left">
              <th className="px-4 py-3 font-medium text-slate-500">{t('admin.users.user')}</th>
              <th className="px-4 py-3 font-medium text-slate-500">{t('admin.users.status')}</th>
              <th className="px-4 py-3 font-medium text-slate-500">{t('admin.users.twoFA')}</th>
              <th className="px-4 py-3 font-medium text-slate-500">{t('admin.users.flights')}</th>
              <th className="px-4 py-3 font-medium text-slate-500">{t('admin.users.aircraft')}</th>
              <th className="px-4 py-3 font-medium text-slate-500">{t('admin.users.lastLogin')}</th>
              <th className="px-4 py-3 font-medium text-slate-500">{t('admin.users.actions')}</th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">{t('common:loading')}</td></tr>}
              {data?.data?.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3"><div className="font-medium text-slate-700 dark:text-slate-200">{u.name}</div><div className="text-xs text-slate-400">{u.email}</div></td>
                  <td className="px-4 py-3">{u.disabled ? <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">{t('admin.users.disabled')}</span> : u.locked ? <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">{t('admin.users.locked')}</span> : <span className="badge badge-current text-xs">{t('admin.users.active')}</span>}</td>
                  <td className="px-4 py-3">{u.twoFactorEnabled ? <span className="text-green-600 dark:text-green-400 text-xs font-medium">{t('admin.users.enabled')}</span> : <span className="text-slate-400 text-xs">{t('admin.users.off')}</span>}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.flightCount}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.aircraftCount}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{u.lastLoginAt ? fmtDate(u.lastLoginAt) : '—'}</td>
                  <td className="px-4 py-3"><div className="flex gap-1 flex-wrap">
                    {u.disabled
                      ? <button onClick={() => setConfirmAction({ type: 'enable', user: u })} className="btn-ghost btn-sm text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" title="Enable account"><CheckCircle className="w-3.5 h-3.5" /></button>
                      : <button onClick={() => setConfirmAction({ type: 'disable', user: u })} className="btn-ghost btn-sm text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Disable account"><Ban className="w-3.5 h-3.5" /></button>}
                    {u.locked && <button onClick={() => setConfirmAction({ type: 'unlock', user: u })} className="btn-ghost btn-sm text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" title="Unlock account"><Unlock className="w-3.5 h-3.5" /></button>}
                    {u.twoFactorEnabled && <button onClick={() => setConfirmAction({ type: 'reset-2fa', user: u })} className="btn-ghost btn-sm text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Reset 2FA"><KeyRound className="w-3.5 h-3.5" /></button>}
                  </div></td>
                </tr>
              ))}
              {!isLoading && data?.data?.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">{t('admin.users.noUsers')}</td></tr>}
            </tbody>
          </table>
        </div>
        {/* Mobile card layout */}
        <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading && <div className="px-4 py-8 text-center text-slate-400">{t('common:loading')}</div>}
          {data?.data?.map((u) => (
            <div key={u.id} className="px-4 py-3 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-slate-700 dark:text-slate-200">{u.name}</div>
                  <div className="text-xs text-slate-400">{u.email}</div>
                </div>
                <div>{u.disabled ? <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">{t('admin.users.disabled')}</span> : u.locked ? <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">{t('admin.users.locked')}</span> : <span className="badge badge-current text-xs">{t('admin.users.active')}</span>}</div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span>{u.flightCount} {t('admin.users.flights')}</span>
                <span>{u.aircraftCount} {t('admin.users.aircraft')}</span>
                <span>{u.twoFactorEnabled ? '2FA ✓' : ''}</span>
                {u.lastLoginAt && <span>{fmtDate(u.lastLoginAt)}</span>}
              </div>
              <div className="flex gap-1">
                {u.disabled
                  ? <button onClick={() => setConfirmAction({ type: 'enable', user: u })} className="btn-ghost btn-sm text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" title="Enable account"><CheckCircle className="w-3.5 h-3.5" /></button>
                  : <button onClick={() => setConfirmAction({ type: 'disable', user: u })} className="btn-ghost btn-sm text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Disable account"><Ban className="w-3.5 h-3.5" /></button>}
                {u.locked && <button onClick={() => setConfirmAction({ type: 'unlock', user: u })} className="btn-ghost btn-sm text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" title="Unlock account"><Unlock className="w-3.5 h-3.5" /></button>}
                {u.twoFactorEnabled && <button onClick={() => setConfirmAction({ type: 'reset-2fa', user: u })} className="btn-ghost btn-sm text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Reset 2FA"><KeyRound className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
          ))}
          {!isLoading && data?.data?.length === 0 && <div className="px-4 py-8 text-center text-slate-400">{t('admin.users.noUsers')}</div>}
        </div>
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-400">Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} users)</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm text-xs">{t('admin.users.previous')}</button>
              <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm text-xs">{t('admin.users.next')}</button>
            </div>
          </div>)}
      </div>
      {confirmAction && (<>
        <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setConfirmAction(null)} />
        <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('admin.users.confirmAction', { action: actionLabel(confirmAction.type) })}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
            {confirmAction.type === 'disable' && t('admin.users.disableConfirm', { email: confirmAction.user.email })}
            {confirmAction.type === 'enable' && t('admin.users.enableConfirm', { email: confirmAction.user.email })}
            {confirmAction.type === 'unlock' && t('admin.users.unlockConfirm', { email: confirmAction.user.email })}
            {confirmAction.type === 'reset-2fa' && t('admin.users.reset2faConfirm', { email: confirmAction.user.email })}
          </p>
          <p className="text-xs text-slate-400 mb-4">{t('admin.users.auditTrailNote')}</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setConfirmAction(null)} className="btn-secondary text-sm">{t('common:cancel')}</button>
            <button onClick={handleAction} className={confirmAction.type === 'disable' ? 'btn-danger' : 'btn-primary'}>{actionLabel(confirmAction.type)}</button>
          </div>
        </div>
      </>)}
    </>
  );
}

function AuditLogTab() {
  const { t } = useTranslation('common');
  const { fmtDateTime } = useFormatPrefs();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminAuditLog(page, 20);

  return (
    <div className="card overflow-hidden">
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 dark:border-slate-700 text-left">
            <th className="px-4 py-3 font-medium text-slate-500">{t('admin.audit.timestamp')}</th>
            <th className="px-4 py-3 font-medium text-slate-500">{t('admin.audit.action')}</th>
            <th className="px-4 py-3 font-medium text-slate-500">{t('admin.audit.admin')}</th>
            <th className="px-4 py-3 font-medium text-slate-500">{t('admin.audit.targetUser')}</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t('common:loading')}</td></tr>}
            {data?.data?.map((entry) => (
              <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 text-xs text-slate-500">{fmtDateTime(entry.createdAt)}</td>
                <td className="px-4 py-3"><span className="badge badge-current text-xs">{entry.action}</span></td>
                <td className="px-4 py-3 text-xs text-slate-400 font-mono">{entry.adminUserId.slice(0, 8)}...</td>
                <td className="px-4 py-3 text-xs text-slate-400 font-mono">{entry.targetUserId ? `${entry.targetUserId.slice(0, 8)}...` : '\u2014'}</td>
              </tr>
            ))}
            {!isLoading && data?.data?.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t('admin.audit.noEntries')}</td></tr>}
          </tbody>
        </table>
      </div>
      {/* Mobile card layout */}
      <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {isLoading && <div className="px-4 py-8 text-center text-slate-400">{t('common:loading')}</div>}
        {data?.data?.map((entry) => (
          <div key={entry.id} className="px-4 py-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="badge badge-current text-xs">{entry.action}</span>
              <span className="text-xs text-slate-400">{fmtDateTime(entry.createdAt)}</span>
            </div>
            <div className="flex gap-4 text-xs text-slate-400">
              <span className="font-mono">{t('admin.audit.admin')}: {entry.adminUserId.slice(0, 8)}...</span>
              {entry.targetUserId && <span className="font-mono">{t('admin.audit.targetUser')}: {entry.targetUserId.slice(0, 8)}...</span>}
            </div>
          </div>
        ))}
        {!isLoading && data?.data?.length === 0 && <div className="px-4 py-8 text-center text-slate-400">{t('admin.audit.noEntries')}</div>}
      </div>
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-400">Page {data.pagination.page} of {data.pagination.totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm text-xs">{t('admin.users.previous')}</button>
            <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm text-xs">{t('admin.users.next')}</button>
          </div>
        </div>)}
    </div>
  );
}

function MaintenanceTab() {
  const { t } = useTranslation('common');
  const cleanupTokens = useCleanupTokens();
  const smtpTest = useSmtpTest();
  const [message, setMessage] = useState('');

  const handleCleanup = async () => {
    setMessage('');
    try {
      const result = await cleanupTokens.mutateAsync();
      setMessage(result.message);
    } catch { setMessage('Failed to clean up tokens.'); }
  };

  const handleSmtpTest = async () => {
    setMessage('');
    try {
      const result = await smtpTest.mutateAsync();
      setMessage(result.message);
    } catch { setMessage('Failed to send test email.'); }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${message.includes('Failed') ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'}`}>{message}</div>
      )}
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('admin.maintenance.tokenCleanup')}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t('admin.maintenance.tokenCleanupDesc')}</p>
        <button onClick={handleCleanup} disabled={cleanupTokens.isPending} className="btn-primary">
          {cleanupTokens.isPending ? t('admin.maintenance.cleaning') : t('admin.maintenance.cleanUpButton')}
        </button>
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('admin.maintenance.smtpTest')}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t('admin.maintenance.smtpTestDesc')}</p>
        <button onClick={handleSmtpTest} disabled={smtpTest.isPending} className="btn-primary">
          {smtpTest.isPending ? t('admin.maintenance.sending') : t('admin.maintenance.sendTestEmail')}
        </button>
      </div>
    </div>
  );
}

function ConfigTab() {
  const { t } = useTranslation('common');
  const { data, isLoading } = useAdminConfig();

  if (isLoading) return <div className="text-slate-400 text-sm">{t('admin.config.loadingConfig')}</div>;
  if (!data) return null;

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: t('admin.config.goVersion'), value: data.goVersion },
    { label: t('admin.config.serverUptime'), value: data.serverUptime },
    { label: t('admin.config.migrationVersion'), value: data.migrationVersion },
    { label: t('admin.config.airportDatabase'), value: `${data.airportDatabaseSize.toLocaleString()} airports` },
    { label: t('admin.config.corsOrigins'), value: data.corsOrigins.join(', ') },
    { label: t('admin.config.rateLimitAuth'), value: data.rateLimitAuth },
    { label: t('admin.config.rateLimitAdmin'), value: data.rateLimitAdmin },
    {
      label: t('admin.config.smtp'),
      value: data.smtpConfigured
        ? <span className="text-green-600 dark:text-green-400 font-medium">{t('admin.config.configured')}</span>
        : <span className="text-amber-600 dark:text-amber-400 font-medium">{t('admin.config.notConfigured')}</span>,
    },
    {
      label: t('admin.config.adminEmail'),
      value: data.adminEmailConfigured
        ? <span className="text-green-600 dark:text-green-400 font-medium">{t('admin.config.configured')}</span>
        : <span className="text-amber-600 dark:text-amber-400 font-medium">{t('admin.config.notConfigured')}</span>,
    },
  ];

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{t('admin.config.title')}</h3>
      <p className="text-xs text-slate-400 mb-4">{t('admin.config.subtitle')}</p>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between items-center py-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">{row.label}</span>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnouncementsTab() {
  const { t } = useTranslation('common');
  const { fmtDateTime } = useFormatPrefs();
  const { data, isLoading } = useAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<string>('warning');
  const [expiresIn, setExpiresIn] = useState<string>('');
  const [feedback, setFeedback] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setFeedback('');
    try {
      let expiresAt: string | undefined;
      if (expiresIn) {
        const hours = parseInt(expiresIn, 10);
        if (hours > 0) expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      }
      await createAnnouncement.mutateAsync({ message: message.trim(), severity, expiresAt });
      setMessage('');
      setExpiresIn('');
      setFeedback('Announcement created.');
    } catch { setFeedback('Failed to create announcement.'); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteAnnouncement.mutateAsync(id); setFeedback('Announcement deleted.'); }
    catch { setFeedback('Failed to delete announcement.'); }
  };

  const severityOptions = [
    { value: 'info', label: 'Info (blue)', color: 'bg-blue-100 text-blue-700' },
    { value: 'success', label: 'Success (green)', color: 'bg-green-100 text-green-700' },
    { value: 'warning', label: 'Warning (orange)', color: 'bg-amber-100 text-amber-700' },
    { value: 'critical', label: 'Critical (red)', color: 'bg-red-100 text-red-700' },
  ];

  return (
    <div className="space-y-6">
      {feedback && <div className={`px-4 py-3 rounded-lg text-sm ${feedback.includes('Failed') ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'}`}>{feedback}</div>}
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{t('admin.announcements.createTitle')}</h3>
        <p className="text-xs text-slate-400 mb-4">{t('admin.announcements.createDesc')}</p>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="form-label" htmlFor="ann-message">{t('admin.announcements.message')}</label>
            <textarea id="ann-message" value={message} onChange={(e) => setMessage(e.target.value)} className="input mt-1" rows={2} placeholder={t('admin.announcements.messagePlaceholder')} required />
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="form-label" htmlFor="ann-severity">{t('admin.announcements.severity')}</label>
              <select id="ann-severity" value={severity} onChange={(e) => setSeverity(e.target.value)} className="input mt-1">
                {severityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="form-label" htmlFor="ann-expires">{t('admin.announcements.expireAfter')}</label>
              <input id="ann-expires" type="number" min="1" value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)} className="input mt-1" placeholder={t('admin.announcements.expirePlaceholder')} />
            </div>
          </div>
          <button type="submit" disabled={createAnnouncement.isPending || !message.trim()} className="btn-primary">
            {createAnnouncement.isPending ? t('admin.announcements.creating') : t('admin.announcements.publish')}
          </button>
        </form>
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{t('admin.announcements.activeTitle')}</h3>
        {isLoading && <p className="text-slate-400 text-sm">{t('common:loading')}</p>}
        {data?.announcements?.length === 0 && !isLoading && <p className="text-slate-400 text-sm">{t('admin.announcements.noAnnouncements')}</p>}
        <div className="space-y-2">
          {data?.announcements?.map((a) => {
            const sc = severityOptions.find((s) => s.value === a.severity);
            return (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className={`badge text-xs ${sc?.color || 'bg-slate-100 text-slate-700'}`}>{a.severity}</span>
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{a.message}</span>
                {a.expiresAt && <span className="text-xs text-slate-400">{t('admin.announcements.expires')} {fmtDateTime(a.expiresAt)}</span>}
                <button onClick={() => handleDelete(a.id)} className="btn-ghost btn-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
