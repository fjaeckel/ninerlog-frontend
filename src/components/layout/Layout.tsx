import { useState } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Plane, FileText, PlaneTakeoff, BarChart3, Map,
  Award, User, Upload, Download, Shield, LogOut, Menu, Plus
} from 'lucide-react';
import { useLogout } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';

export default function Layout() {
  const { user } = useAuthStore();
  const logout = useLogout();
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

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
        Skip to content
      </a>

      {/* ── App Header ── */}
      <header className="fixed top-0 inset-x-0 h-14 lg:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-40 flex items-center justify-between px-4 lg:px-6" role="banner">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-brand-600" aria-hidden="true" />
          <span className="text-lg font-bold text-brand-800 dark:text-blue-400">PilotLog</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* User avatar */}
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label="Profile"
          >
            <span className="hidden sm:inline">{user?.name || user?.email}</span>
            <span className="w-9 h-9 min-w-[44px] min-h-[44px] rounded-full bg-brand-800 text-white flex items-center justify-center text-xs font-medium">
              {initials}
            </span>
          </button>
          <button
            onClick={handleLogout}
            className="btn-ghost btn-sm min-h-[44px] text-slate-500 hover:text-red-600 dark:text-slate-400"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── Desktop Sidebar ── */}
      <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 hidden lg:flex lg:flex-col z-30" aria-label="Desktop navigation">
        <nav className="flex-1 space-y-1" aria-label="Main">
          <SidebarItem to="/dashboard" label="Dashboard" icon={<LayoutDashboard className="w-5 h-5" />} />
          <SidebarItem to="/flights" label="Flights" icon={<Plane className="w-5 h-5" />} />
          <SidebarItem to="/aircraft" label="Aircraft" icon={<PlaneTakeoff className="w-5 h-5" />} />
          <SidebarItem to="/currency" label="Currency" icon={<Shield className="w-5 h-5" />} />
          <SidebarItem to="/licenses" label="Licenses" icon={<Award className="w-5 h-5" />} />
          <SidebarItem to="/credentials" label="Credentials" icon={<FileText className="w-5 h-5" />} />
          <SidebarItem to="/reports" label="Reports" icon={<BarChart3 className="w-5 h-5" />} />
          <SidebarItem to="/map" label="Map" icon={<Map className="w-5 h-5" />} />
          <SidebarItem to="/import" label="Import" icon={<Upload className="w-5 h-5" />} />
          <SidebarItem to="/export" label="Export" icon={<Download className="w-5 h-5" />} />
        </nav>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-1">
          <SidebarItem to="/profile" label="Profile & Settings" icon={<User className="w-5 h-5" />} />
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main id="main-content" className="pt-14 lg:pt-16 pb-16 lg:pb-4 lg:ml-64 px-4 lg:px-8">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="fixed bottom-0 inset-x-0 h-14 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-40 flex items-center justify-around lg:hidden pb-safe" aria-label="Mobile navigation">
        <BottomNavItem to="/dashboard" label="Home" icon={<LayoutDashboard className="w-5 h-5" />} />
        <BottomNavItem to="/flights" label="Flights" icon={<Plane className="w-5 h-5" />} />
        <Link
          to="/flights"
          state={{ openForm: true }}
          className="flex flex-col items-center justify-center -mt-3"
          aria-label="Add Flight"
        >
          <span className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-6 h-6" />
          </span>
        </Link>
        <BottomNavItem to="/reports" label="Reports" icon={<BarChart3 className="w-5 h-5" />} />
        <button
          onClick={() => setShowMoreMenu(true)}
          className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] text-xs text-slate-400 dark:text-slate-500 transition-colors"
          aria-label="More menu"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </nav>

      {/* ── Mobile "More" Menu Sheet ── */}
      {showMoreMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50 lg:hidden"
            onClick={() => setShowMoreMenu(false)}
            aria-hidden="true"
          />
          <div className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl pb-safe animate-sheet-up">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>
            <nav className="px-4 pb-4 space-y-1" aria-label="More navigation">
              <MoreMenuItem to="/aircraft" label="Aircraft" icon={<PlaneTakeoff className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              <MoreMenuItem to="/currency" label="Currency" icon={<Shield className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              <MoreMenuItem to="/licenses" label="Licenses" icon={<Award className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              <MoreMenuItem to="/credentials" label="Credentials" icon={<FileText className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              <MoreMenuItem to="/map" label="Map" icon={<Map className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              <MoreMenuItem to="/import" label="Import" icon={<Upload className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              <MoreMenuItem to="/export" label="Export" icon={<Download className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              <MoreMenuItem to="/profile" label="Profile & Settings" icon={<User className="w-5 h-5" />} onClick={() => setShowMoreMenu(false)} />
              <div className="border-t border-slate-100 dark:border-slate-700 my-2" />
              <button
                onClick={() => { setShowMoreMenu(false); handleLogout(); }}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Logout
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
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`
      }
    >
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      {label}
    </NavLink>
  );
}

function BottomNavItem({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center min-w-[44px] min-h-[44px] text-xs transition-colors ${
          isActive
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-slate-400 dark:text-slate-500'
        }`
      }
    >
      <span className="mb-0.5" aria-hidden="true">{icon}</span>
      <span>{label}</span>
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
