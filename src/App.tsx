import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/layout/Layout';

// Lazy-loaded pages for code splitting
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LicensesPage = lazy(() => import('./pages/licenses/LicensesPage'));
const FlightsPage = lazy(() => import('./pages/flights/FlightsPage'));
const FlightDetailPage = lazy(() => import('./pages/flights/FlightDetailPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const CredentialsPage = lazy(() => import('./pages/credentials/CredentialsPage'));
const AircraftPage = lazy(() => import('./pages/aircraft/AircraftPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-slate-400 dark:text-slate-500">Loading...</div>
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />} />
          <Route path="/licenses" element={isAuthenticated ? <LicensesPage /> : <Navigate to="/login" />} />
          <Route path="/flights" element={isAuthenticated ? <FlightsPage /> : <Navigate to="/login" />} />
          <Route path="/flights/:flightId" element={isAuthenticated ? <FlightDetailPage /> : <Navigate to="/login" />} />
          <Route path="/profile" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route path="/credentials" element={isAuthenticated ? <CredentialsPage /> : <Navigate to="/login" />} />
          <Route path="/aircraft" element={isAuthenticated ? <AircraftPage /> : <Navigate to="/login" />} />
        </Route>

        {/* Redirect root to dashboard or login */}
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </Suspense>
  );
}

export default App;
