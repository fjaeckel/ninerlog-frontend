import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLicenses, useDeleteLicense } from '../../hooks/useLicenses';
import LicenseForm from '../../components/licenses/LicenseForm';
import LicenseCard from '../../components/licenses/LicenseCard';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import HelpLink from '../../components/ui/HelpLink';

export default function LicensesPage() {
  const { data: licenses, isLoading, error } = useLicenses();
  const deleteLicense = useDeleteLicense();
  const [showForm, setShowForm] = useState(false);
  const [editingLicense, setEditingLicense] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { t } = useTranslation('licenses');

  const handleDelete = async (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteLicense.mutateAsync(deleteTarget);
      setDeleteTarget(null);
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
      <div className="mx-auto max-w-[960px] py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-48">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[960px] py-6">
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">⚠</div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('error')}</h2>
          <p className="text-slate-500 dark:text-slate-400">{t('errorLoading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[960px] py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="page-title">{t('title')}</h1>
          <HelpLink topic="licenses" />
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          {t('addLicense')}
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="license-form-title">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-[560px] w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 id="license-form-title" className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                  {editingLicense ? t('editLicense') : t('addLicense')}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <LicenseForm licenseId={editingLicense} onClose={handleCloseForm} />
            </div>
          </div>
        </div>
      )}

      {licenses && licenses.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">🏅</div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('addFirst')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            {t('noLicenses')}
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            {t('addLicense')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {licenses?.map((license) => (
            <LicenseCard
              key={license.id}
              license={license}
              onEdit={() => handleEdit(license.id)}
              onDelete={() => handleDelete(license.id)}
            />
          ))}
        </div>
      )}
      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        title={t('deleteLicense')}
        description={t('deleteConfirm')}
        confirmLabel={t('deleteLicense')}
        variant="danger"
        isLoading={deleteLicense.isPending}
      />    </div>
  );
}
