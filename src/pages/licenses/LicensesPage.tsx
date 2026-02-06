import { useState } from 'react';
import { useLicenses, useDeleteLicense } from '../../hooks/useLicenses';
import { useLicenseStore } from '../../stores/licenseStore';
import LicenseForm from '../../components/licenses/LicenseForm';
import LicenseCard from '../../components/licenses/LicenseCard';
import LicenseSwitcher from '../../components/licenses/LicenseSwitcher';

export default function LicensesPage() {
  const { data: licenses, isLoading, error } = useLicenses();
  const { activeLicense } = useLicenseStore();
  const deleteLicense = useDeleteLicense();
  const [showForm, setShowForm] = useState(false);
  const [editingLicense, setEditingLicense] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this license?')) {
      await deleteLicense.mutateAsync(id);
    }
  };

  const handleEdit = (id: string) => {
    setEditingLicense(id);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingLicense(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading licenses...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error loading licenses. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Licenses</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          Add License
        </button>
      </div>

      {licenses && licenses.length > 1 && (
        <div className="mb-6">
          <LicenseSwitcher />
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {editingLicense ? 'Edit License' : 'Add License'}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <LicenseForm licenseId={editingLicense} onClose={handleCloseForm} />
            </div>
          </div>
        </div>
      )}

      {licenses && licenses.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">You haven't added any licenses yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Add Your First License
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {licenses?.map((license) => (
            <LicenseCard
              key={license.id}
              license={license}
              isActive={activeLicense?.id === license.id}
              onEdit={() => handleEdit(license.id)}
              onDelete={() => handleDelete(license.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
