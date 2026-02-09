import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useLogout } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';

export default function Layout() {
  const { user } = useAuthStore();
  const logout = useLogout();
  const navigate = useNavigate();

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
          <span className="text-lg">✈</span>
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
          <SidebarItem to="/dashboard" label="Dashboard" icon="🏠" />
          <SidebarItem to="/flights" label="Flights" icon="✈" />
          <SidebarItem to="/statistics" label="Statistics" icon="📊" />
          <SidebarItem to="/licenses" label="Licenses" icon="🏅" />
        </nav>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-1">
          <SidebarItem to="/settings" label="Settings" icon="⚙" />
          <SidebarItem to="/profile" label="Profile" icon="👤" />
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main id="main-content" className="pt-14 lg:pt-16 pb-16 lg:pb-4 lg:pl-64 px-4 lg:px-8">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="fixed bottom-0 inset-x-0 h-14 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-40 flex items-center justify-around lg:hidden pb-safe" aria-label="Mobile navigation">
        <BottomNavItem to="/dashboard" label="Home" icon="🏠" />
        <BottomNavItem to="/flights" label="Flights" icon="✈" />
        <Link
          to="/flights"
          state={{ openForm: true }}
          className="flex flex-col items-center justify-center -mt-3"
          aria-label="Add Flight"
        >
          <span className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl shadow-lg hover:bg-blue-700 transition-colors">
            +
          </span>
        </Link>
        <BottomNavItem to="/statistics" label="Stats" icon="📊" />
        <BottomNavItem to="/licenses" label="More" icon="☰" />
      </nav>
    </div>
  );
}

function SidebarItem({ to, label, icon }: { to: string; label: string; icon: string }) {
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
      <span className="w-5 text-center">{icon}</span>
      {label}
    </NavLink>
  );
}

function BottomNavItem({ to, label, icon }: { to: string; label: string; icon: string }) {
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
      <span className="text-lg mb-0.5">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}
