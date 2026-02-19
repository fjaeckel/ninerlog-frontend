import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { ShieldCheck, Search, Ban, CheckCircle, Unlock, KeyRound, Users, BarChart3, Wrench, ScrollText, Settings2, Megaphone, Trash2 } from 'lucide-react';
import {
  useAdminUsers, useDisableUser, useEnableUser, useUnlockUser, useResetUser2fa,
  useAdminStats, useAdminAuditLog, useCleanupTokens, useSmtpTest, useAdminConfig,
} from '../../hooks/useAdmin';
import { useCreateAnnouncement, useDeleteAnnouncement, useAnnouncements } from '../../hooks/useAnnouncements';
import type { AdminUser } from '../../hooks/useAdmin';

type Tab = 'dashboard' | 'users' | 'audit' | 'maintenance' | 'announcements' | 'config';

export default function AdminPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('dashboard');

  if (!user?.isAdmin) {
    return (
      <div className="mx-auto max-w-[960px] py-6">
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">{'\uD83D\uDD12'}</div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Access Denied</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">You do not have admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          <h1 className="page-title">Admin Console</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Platform management — privacy-preserving.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-700">
        {([
          { id: 'dashboard' as Tab, label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'users' as Tab, label: 'Users', icon: <Users className="w-4 h-4" /> },
          { id: 'audit' as Tab, label: 'Audit Log', icon: <ScrollText className="w-4 h-4" /> },
          { id: 'maintenance' as Tab, label: 'Maintenance', icon: <Wrench className="w-4 h-4" /> },
          { id: 'announcements' as Tab, label: 'Announcements', icon: <Megaphone className="w-4 h-4" /> },
          { id: 'config' as Tab, label: 'Config', icon: <Settings2 className="w-4 h-4" /> },
        ]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
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
  const { data, isLoading } = useAdminStats();

  if (isLoading) return <div className="text-slate-400 text-sm">Loading stats...</div>;
  if (!data) return null;

  const stats = [
    { label: 'Total Users', value: data.totalUsers },
    { label: 'Total Flights', value: data.totalFlights },
    { label: 'Total Aircraft', value: data.totalAircraft },
    { label: 'Total Credentials', value: data.totalCredentials },
    { label: 'Total Imports', value: data.totalImports },
    { label: 'Flights This Month', value: data.flightsThisMonth },
    { label: 'New Users (7d)', value: data.newUsersThisWeek },
    { label: 'Locked Accounts', value: data.lockedAccounts, warn: data.lockedAccounts > 0 },
    { label: 'Disabled Accounts', value: data.disabledAccounts, warn: data.disabledAccounts > 0 },
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
  const actionLabel = (type: string) => type === 'disable' ? 'Disable' : type === 'enable' ? 'Enable' : type === 'unlock' ? 'Unlock' : 'Reset 2FA';

  return (
    <>
      {actionMessage && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${actionMessage.includes('Failed') ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'}`}>{actionMessage}</div>
      )}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by email or name..." className="input pl-10" aria-label="Search users" />
        </div>
        <button type="submit" className="btn-primary">Search</button>
        {search && <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} className="btn-secondary">Clear</button>}
      </form>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 dark:border-slate-700 text-left">
              <th className="px-4 py-3 font-medium text-slate-500">User</th>
              <th className="px-4 py-3 font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 font-medium text-slate-500">2FA</th>
              <th className="px-4 py-3 font-medium text-slate-500">Flights</th>
              <th className="px-4 py-3 font-medium text-slate-500">Aircraft</th>
              <th className="px-4 py-3 font-medium text-slate-500">Last Login</th>
              <th className="px-4 py-3 font-medium text-slate-500">Actions</th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>}
              {data?.data?.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3"><div className="font-medium text-slate-700 dark:text-slate-200">{u.name}</div><div className="text-xs text-slate-400">{u.email}</div></td>
                  <td className="px-4 py-3">{u.disabled ? <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">Disabled</span> : u.locked ? <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">Locked</span> : <span className="badge badge-current text-xs">Active</span>}</td>
                  <td className="px-4 py-3">{u.twoFactorEnabled ? <span className="text-green-600 dark:text-green-400 text-xs font-medium">Enabled</span> : <span className="text-slate-400 text-xs">Off</span>}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.flightCount}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.aircraftCount}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '\u2014'}</td>
                  <td className="px-4 py-3"><div className="flex gap-1 flex-wrap">
                    {u.disabled
                      ? <button onClick={() => setConfirmAction({ type: 'enable', user: u })} className="btn-ghost btn-sm text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" title="Enable account"><CheckCircle className="w-3.5 h-3.5" /></button>
                      : <button onClick={() => setConfirmAction({ type: 'disable', user: u })} className="btn-ghost btn-sm text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Disable account"><Ban className="w-3.5 h-3.5" /></button>}
                    {u.locked && <button onClick={() => setConfirmAction({ type: 'unlock', user: u })} className="btn-ghost btn-sm text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" title="Unlock account"><Unlock className="w-3.5 h-3.5" /></button>}
                    {u.twoFactorEnabled && <button onClick={() => setConfirmAction({ type: 'reset-2fa', user: u })} className="btn-ghost btn-sm text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Reset 2FA"><KeyRound className="w-3.5 h-3.5" /></button>}
                  </div></td>
                </tr>
              ))}
              {!isLoading && data?.data?.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No users found</td></tr>}
            </tbody>
          </table>
        </div>
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-400">Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} users)</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm text-xs">Previous</button>
              <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm text-xs">Next</button>
            </div>
          </div>)}
      </div>
      {confirmAction && (<>
        <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setConfirmAction(null)} />
        <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Confirm: {actionLabel(confirmAction.type)} User</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
            {confirmAction.type === 'disable' && `Disable account for ${confirmAction.user.email}? They will not be able to log in.`}
            {confirmAction.type === 'enable' && `Re-enable account for ${confirmAction.user.email}?`}
            {confirmAction.type === 'unlock' && `Unlock account for ${confirmAction.user.email}?`}
            {confirmAction.type === 'reset-2fa' && `Reset 2FA for ${confirmAction.user.email}?`}
          </p>
          <p className="text-xs text-slate-400 mb-4">This action will be logged to the admin audit trail.</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setConfirmAction(null)} className="btn-secondary text-sm">Cancel</button>
            <button onClick={handleAction} className={confirmAction.type === 'disable' ? 'btn-danger' : 'btn-primary'}>{actionLabel(confirmAction.type)}</button>
          </div>
        </div>
      </>)}
    </>
  );
}

function AuditLogTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminAuditLog(page, 20);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 dark:border-slate-700 text-left">
            <th className="px-4 py-3 font-medium text-slate-500">Timestamp</th>
            <th className="px-4 py-3 font-medium text-slate-500">Action</th>
            <th className="px-4 py-3 font-medium text-slate-500">Admin</th>
            <th className="px-4 py-3 font-medium text-slate-500">Target User</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>}
            {data?.data?.map((entry) => (
              <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3"><span className="badge badge-current text-xs">{entry.action}</span></td>
                <td className="px-4 py-3 text-xs text-slate-400 font-mono">{entry.adminUserId.slice(0, 8)}...</td>
                <td className="px-4 py-3 text-xs text-slate-400 font-mono">{entry.targetUserId ? `${entry.targetUserId.slice(0, 8)}...` : '\u2014'}</td>
              </tr>
            ))}
            {!isLoading && data?.data?.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No audit log entries</td></tr>}
          </tbody>
        </table>
      </div>
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-400">Page {data.pagination.page} of {data.pagination.totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm text-xs">Previous</button>
            <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm text-xs">Next</button>
          </div>
        </div>)}
    </div>
  );
}

function MaintenanceTab() {
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
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Token Cleanup</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Delete expired and revoked refresh tokens and used password reset tokens from the database.</p>
        <button onClick={handleCleanup} disabled={cleanupTokens.isPending} className="btn-primary">
          {cleanupTokens.isPending ? 'Cleaning...' : 'Clean Up Expired Tokens'}
        </button>
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">SMTP Test</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Send a test email to your admin email address to verify SMTP configuration is working.</p>
        <button onClick={handleSmtpTest} disabled={smtpTest.isPending} className="btn-primary">
          {smtpTest.isPending ? 'Sending...' : 'Send Test Email'}
        </button>
      </div>
    </div>
  );
}

function ConfigTab() {
  const { data, isLoading } = useAdminConfig();

  if (isLoading) return <div className="text-slate-400 text-sm">Loading configuration...</div>;
  if (!data) return null;

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Go Version', value: data.goVersion },
    { label: 'Server Uptime', value: data.serverUptime },
    { label: 'Migration Version', value: data.migrationVersion },
    { label: 'Airport Database', value: `${data.airportDatabaseSize.toLocaleString()} airports` },
    { label: 'CORS Origins', value: data.corsOrigins.join(', ') },
    { label: 'Rate Limit (Auth)', value: data.rateLimitAuth },
    { label: 'Rate Limit (Admin)', value: data.rateLimitAdmin },
    {
      label: 'SMTP',
      value: data.smtpConfigured
        ? <span className="text-green-600 dark:text-green-400 font-medium">Configured</span>
        : <span className="text-amber-600 dark:text-amber-400 font-medium">Not configured</span>,
    },
    {
      label: 'Admin Email',
      value: data.adminEmailConfigured
        ? <span className="text-green-600 dark:text-green-400 font-medium">Configured</span>
        : <span className="text-amber-600 dark:text-amber-400 font-medium">Not configured</span>,
    },
  ];

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Runtime Configuration</h3>
      <p className="text-xs text-slate-400 mb-4">Non-secret server configuration. Secrets are never exposed.</p>
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
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Create Announcement</h3>
        <p className="text-xs text-slate-400 mb-4">Announcements appear as banners for all users. Auto-hints (2FA, first flight) are system-generated.</p>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="form-label" htmlFor="ann-message">Message</label>
            <textarea id="ann-message" value={message} onChange={(e) => setMessage(e.target.value)} className="input mt-1" rows={2} placeholder="e.g. Scheduled maintenance on Tuesday at 8pm UTC" required />
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="form-label" htmlFor="ann-severity">Severity</label>
              <select id="ann-severity" value={severity} onChange={(e) => setSeverity(e.target.value)} className="input mt-1">
                {severityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="form-label" htmlFor="ann-expires">Auto-expire after (hours)</label>
              <input id="ann-expires" type="number" min="1" value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)} className="input mt-1" placeholder="Leave empty for permanent" />
            </div>
          </div>
          <button type="submit" disabled={createAnnouncement.isPending || !message.trim()} className="btn-primary">
            {createAnnouncement.isPending ? 'Creating...' : 'Publish Announcement'}
          </button>
        </form>
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Active Announcements</h3>
        {isLoading && <p className="text-slate-400 text-sm">Loading...</p>}
        {data?.announcements?.length === 0 && !isLoading && <p className="text-slate-400 text-sm">No active announcements.</p>}
        <div className="space-y-2">
          {data?.announcements?.map((a) => {
            const sc = severityOptions.find((s) => s.value === a.severity);
            return (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className={`badge text-xs ${sc?.color || 'bg-slate-100 text-slate-700'}`}>{a.severity}</span>
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{a.message}</span>
                {a.expiresAt && <span className="text-xs text-slate-400">expires {new Date(a.expiresAt).toLocaleString()}</span>}
                <button onClick={() => handleDelete(a.id)} className="btn-ghost btn-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
