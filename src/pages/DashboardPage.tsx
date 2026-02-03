import { useAuthStore } from '../stores/authStore';
import { useLicenses } from '../hooks/useLicenses';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: licenses } = useLicenses();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Welcome, {user?.name || user?.email}!</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="card">
          <h2 className="text-xl font-semibold mb-2">Licenses</h2>
          <p className="text-3xl font-bold text-primary-600">{licenses?.length || 0}</p>
          <p className="text-sm text-gray-600">Total licenses</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-2">Flight Hours</h2>
          <p className="text-3xl font-bold text-primary-600">0.0</p>
          <p className="text-sm text-gray-600">Total hours</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-2">Recent Flights</h2>
          <p className="text-3xl font-bold text-primary-600">0</p>
          <p className="text-sm text-gray-600">Last 30 days</p>
        </div>
      </div>

      <div className="mt-8 card">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="space-y-2">
          <button className="btn-primary w-full">Log New Flight</button>
          <button className="btn-secondary w-full">View All Flights</button>
        </div>
      </div>
    </div>
  );
}
