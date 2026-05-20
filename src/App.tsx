import { Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useTheme } from './hooks/useTheme';
import { bootstrapPromise } from './api/client';
import Layout from './components/layout/Layout';
import { lazyWithRetry } from './lib/lazyWithRetry';

// Lazy-loaded pages for code splitting (with chunk-load retry + reload fallback
// so a stale PWA deployment never strands the user on a blank screen).
const LoginPage = lazyWithRetry(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazyWithRetry(() => import('./pages/auth/RegisterPage'));
const ResetPasswordPage = lazyWithRetry(() => import('./pages/auth/ResetPasswordPage'));
const NewPasswordPage = lazyWithRetry(() => import('./pages/auth/NewPasswordPage'));
const DashboardPage = lazyWithRetry(() => import('./pages/DashboardPage'));
const LicensesPage = lazyWithRetry(() => import('./pages/licenses/LicensesPage'));
const FlightsPage = lazyWithRetry(() => import('./pages/flights/FlightsPage'));
const FlightDetailPage = lazyWithRetry(() => import('./pages/flights/FlightDetailPage'));
const ProfilePage = lazyWithRetry(() => import('./pages/ProfilePage'));
const CredentialsPage = lazyWithRetry(() => import('./pages/credentials/CredentialsPage'));
const AircraftPage = lazyWithRetry(() => import('./pages/aircraft/AircraftPage'));
const ReportsPage = lazyWithRetry(() => import('./pages/reports/ReportsPage'));
const MapPage = lazyWithRetry(() => import('./pages/maps/MapPage'));
const ImportPage = lazyWithRetry(() => import('./pages/import/ImportPage'));
const ExportPage = lazyWithRetry(() => import('./pages/export/ExportPage'));
const CurrencyPage = lazyWithRetry(() => import('./pages/currency/CurrencyPage'));
const AdminPage = lazyWithRetry(() => import('./pages/admin/AdminPage'));
const HelpPage = lazyWithRetry(() => import('./pages/help/HelpPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-slate-400 dark:text-slate-500">Loading...</div>
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuthStore();
  const [bootReady, setBootReady] = useState(() => !bootstrapPromise);

  // Sync theme preference to document
  useTheme();

  // Wait for the in-flight bootstrap refresh before rendering protected routes,
  // so cold launches of the installed PWA never flash to /login on iOS.
  useEffect(() => {
    if (bootReady) return;
    let cancelled = false;
    bootstrapPromise?.finally(() => {
      if (!cancelled) setBootReady(true);
    });
    return () => { cancelled = true; };
  }, [bootReady]);

  if (!bootReady) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/new-password" element={<NewPasswordPage />} />

        {/* Protected routes */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />} />
          <Route path="/licenses" element={isAuthenticated ? <LicensesPage /> : <Navigate to="/login" />} />
          <Route path="/flights" element={isAuthenticated ? <FlightsPage /> : <Navigate to="/login" />} />
          <Route path="/flights/:flightId" element={isAuthenticated ? <FlightDetailPage /> : <Navigate to="/login" />} />
          <Route path="/profile" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route path="/credentials" element={isAuthenticated ? <CredentialsPage /> : <Navigate to="/login" />} />
          <Route path="/aircraft" element={isAuthenticated ? <AircraftPage /> : <Navigate to="/login" />} />
          <Route path="/reports" element={isAuthenticated ? <ReportsPage /> : <Navigate to="/login" />} />
          <Route path="/map" element={isAuthenticated ? <MapPage /> : <Navigate to="/login" />} />
          <Route path="/import" element={isAuthenticated ? <ImportPage /> : <Navigate to="/login" />} />
          <Route path="/export" element={isAuthenticated ? <ExportPage /> : <Navigate to="/login" />} />
          <Route path="/currency" element={isAuthenticated ? <CurrencyPage /> : <Navigate to="/login" />} />
          <Route path="/admin" element={isAuthenticated ? <AdminPage /> : <Navigate to="/login" />} />
          <Route path="/help" element={isAuthenticated ? <HelpPage /> : <Navigate to="/login" />} />
        </Route>

        {/* Redirect root to dashboard or login */}
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </Suspense>
  );
}

export default App;
