import { useState } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Plane, FileText, PlaneTakeoff, BarChart3, Map,
  Award, User, Upload, Download, Shield, LogOut, Menu, Plus, ShieldCheck, HelpCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLogout } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';
import AnnouncementBanner from '../ui/AnnouncementBanner';
import { LogoMark } from '../ui/Logo';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
import { APP_NAME } from '../../lib/config';

export default function Layout() {
  const { user } = useAuthStore();
  const logout = useLogout();
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const { t } = useTranslation(['nav', 'common']);

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Skip to content link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md"
      >
        {t('common:skipToContent')}
      </a>

      {/* ── App Header ── */}
      <header
        className="fixed top-0 inset-x-0 h-14 lg:h-16 surface-glass border-b z-[1010] flex items-center justify-between px-4 lg:px-6 pt-safe-top tap-none"
        role="banner"
      >
        <Link to="/dashboard" className="flex items-center gap-2.5 group" aria-label={APP_NAME}>
          <LogoMark size={32} decorative className="drop-shadow-sm transition-transform group-hover:scale-[1.04] group-active:scale-95" />
          <span className="text-lg font-bold tracking-tight text-gradient-brand">{APP_NAME}</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeSwitcher className="hidden sm:flex" />
          {/* User avatar */}
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 px-1.5 sm:px-2 h-11 rounded-full text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors tap-none"
            aria-label={t('common:profileAlt')}
          >
            <span className="hidden sm:inline max-w-[160px] truncate">{user?.name || user?.email}</span>
            <span className="w-9 h-9 rounded-full gradient-brand text-white flex items-center justify-center text-xs font-semibold ring-2 ring-white/60 dark:ring-slate-800 shadow-sm">
              {initials}
            </span>
          </button>
          <button
            onClick={handleLogout}
            className="hidden lg:inline-flex btn-ghost btn-sm min-h-[44px] text-slate-500 hover:text-red-600 dark:text-slate-400"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            {t('common:logout')}
          </button>
        </div>
      </header>

      {/* ── Desktop Sidebar ── */}
      <aside
        className="fixed left-0 top-16 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden lg:flex lg:flex-col z-30"
        aria-label="Desktop navigation"
      >
        <div className="p-4">
          <Link
            to="/flights"
            state={{ openForm: true }}
            className="btn-primary w-full justify-center hover-lift"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t('nav:addFlight')}
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5" aria-label="Main">
          <SidebarItem to="/dashboard" label={t('nav:dashboard')} icon={<LayoutDashboard className="w-5 h-5" />} />
          <SidebarItem to="/flights" label={t('nav:flights')} icon={<Plane className="w-5 h-5" />} />
          <SidebarItem to="/aircraft" label={t('nav:aircraft')} icon={<PlaneTakeoff className="w-5 h-5" />} />
          <SidebarItem to="/currency" label={t('nav:currency')} icon={<Shield className="w-5 h-5" />} />

          <SidebarGroup label={t('nav:licenses')} />
          <SidebarItem to="/licenses" label={t('nav:licenses')} icon={<Award className="w-5 h-5" />} />
          <SidebarItem to="/credentials" label={t('nav:credentials')} icon={<FileText className="w-5 h-5" />} />

          <SidebarGroup label={t('nav:reports')} />
          <SidebarItem to="/reports" label={t('nav:reports')} icon={<BarChart3 className="w-5 h-5" />} />
          <SidebarItem to="/map" label={t('nav:map')} icon={<Map className="w-5 h-5" />} />
          <SidebarItem to="/import" label={t('nav:import')} icon={<Upload className="w-5 h-5" />} />
          <SidebarItem to="/export" label={t('nav:export')} icon={<Download className="w-5 h-5" />} />
        </nav>
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-0.5">
          {user?.isAdmin && (
            <SidebarItem to="/admin" label={t('nav:admin')} icon={<ShieldCheck className="w-5 h-5" />} />
          )}
          <SidebarItem to="/help" label={t('nav:help')} icon={<HelpCircle className="w-5 h-5" />} />
          <SidebarItem to="/profile" label={t('nav:profileSettings')} icon={<User className="w-5 h-5" />} />
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main id="main-content" className="pt-14 lg:pt-16 pb-24 lg:pb-4 lg:ml-64 px-4 lg:px-8 overflow-x-hidden max-w-full">
        <AnnouncementBanner />
        <Outlet />
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav
        className="fixed bottom-0 inset-x-0 surface-glass border-t z-[1010] lg:hidden tap-none"
        aria-label="Mobile navigation"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="h-14 flex items-center justify-around">
        <BottomNavItem to="/dashboard" label={t('nav:home')} icon={<LayoutDashboard className="w-5 h-5" />} />
        <BottomNavItem to="/flights" label={t('nav:flights')} icon={<Plane className="w-5 h-5" />} />
        <Link
          to="/flights"
          state={{ openForm: true }}
          className="flex flex-col items-center justify-center -mt-6 active:scale-95 transition-transform tap-none"
          aria-label={t('nav:addFlight')}
        >
          <span className="w-14 h-14 gradient-brand text-white rounded-full flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-slate-900">
            <Plus className="w-6 h-6" />
          </span>
        </Link>
        <BottomNavItem to="/reports" label={t('nav:reports')} icon={<BarChart3 className="w-5 h-5" />} />
        <button
          onClick={() => setShowMoreMenu(true)}
          className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors tap-none"
          aria-label="More menu"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>{t('nav:more')}</span>
        </button>
        </div>
      </nav>

      {/* ── Mobile "More" Menu Sheet ── */}
      {showMoreMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[1020] lg:hidden"
            onClick={() => setShowMoreMenu(false)}
            aria-hidden="true"
          />
          <div className="fixed bottom-0 inset-x-0 z-[1020] lg:hidden bg-white dark:bg-slate-800 rounded-t-xl shadow-2xl pb-safe animate-sheet-up">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>
            <nav className="px-4 pb-4 space-y-1" aria-label="More navigation">
              <MoreMenuItem to="/aircraft" label={t('nav:aircraft')} icon={<PlaneTakeoff className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              <MoreMenuItem to="/currency" label={t('nav:currency')} icon={<Shield className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              <MoreMenuItem to="/licenses" label={t('nav:licenses')} icon={<Award className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              <MoreMenuItem to="/credentials" label={t('nav:credentials')} icon={<FileText className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              <MoreMenuItem to="/map" label={t('nav:map')} icon={<Map className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              <MoreMenuItem to="/import" label={t('nav:import')} icon={<Upload className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              <MoreMenuItem to="/export" label={t('nav:export')} icon={<Download className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              <MoreMenuItem to="/profile" label={t('nav:profileSettings')} icon={<User className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              <MoreMenuItem to="/help" label={t('nav:help')} icon={<HelpCircle className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              {user?.isAdmin && (
                <MoreMenuItem to="/admin" label={t('nav:admin')} icon={<ShieldCheck className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              )}
              <div className="border-t border-slate-100 dark:border-slate-700 my-2" />
              <button
                onClick={() => { setShowMoreMenu(false); handleLogout(); }}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                {t('common:logout')}
              </button>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}

function SidebarItem({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors tap-none ${
          isActive
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/25 dark:text-blue-300 nav-active-rail'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
        }`
      }
    >
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      {label}
    </NavLink>
  );
}

function SidebarGroup({ label }: { label: string }) {
  return (
    <div className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {label}
    </div>
  );
}

function BottomNavItem({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 text-xs font-medium transition-colors tap-none ${
          isActive
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`absolute top-1 h-1 w-6 rounded-full transition-opacity ${
              isActive ? 'opacity-100 bg-blue-600 dark:bg-blue-400' : 'opacity-0'
            }`}
            aria-hidden="true"
          />
          <span className="mt-1 mb-0.5" aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

function MoreMenuItem({ to, label, icon, onClick }: { to: string; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
        }`
      }
    >
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      {label}
    </NavLink>
  );
}
