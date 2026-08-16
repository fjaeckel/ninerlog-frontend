import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, Plus } from 'lucide-react';
import { useLicenses, useDeleteLicense } from '../../hooks/useLicenses';
import LicenseForm from '../../components/licenses/LicenseForm';
import LicenseCard from '../../components/licenses/LicenseCard';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { FormModal } from '../../components/ui/FormModal';
import { PageHeader, PageWrapper } from '../../components/ui/PageWrapper';
import { SkeletonList } from '../../components/ui/Skeleton';
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
      <PageWrapper maxWidth="list">
        <SkeletonList rows={3} />
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper maxWidth="list">
        <ErrorState title={t('error')} message={t('errorLoading')} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper maxWidth="list">
      <PageHeader
        title={t('title')}
        titleAdornment={<HelpLink topic="licenses" />}
        action={
          <button onClick={() => setShowForm(true)} className="btn-primary whitespace-nowrap">
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t('addLicense')}
          </button>
        }
      />

      {/* Modal */}
      <FormModal
        open={showForm}
        onClose={handleCloseForm}
        title={editingLicense ? t('editLicense') : t('addLicense')}
        size="md"
      >
        <LicenseForm licenseId={editingLicense} onClose={handleCloseForm} />
      </FormModal>

      {licenses && licenses.length === 0 ? (
        <EmptyState
          icon={Award}
          title={t('addFirst')}
          description={t('noLicenses')}
          action={{ label: t('addLicense'), onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="flex flex-col gap-4">
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
      />
    </PageWrapper>
  );
}
