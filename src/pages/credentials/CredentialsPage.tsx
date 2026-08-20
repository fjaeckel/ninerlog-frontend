import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Plus } from 'lucide-react';
import { useCredentials, useDeleteCredential } from '../../hooks/useCredentials';
import CredentialForm from '../../components/credentials/CredentialForm';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { FormModal } from '../../components/ui/FormModal';
import { PageHeader, PageWrapper } from '../../components/ui/PageWrapper';
import { SkeletonList } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import HelpLink from '../../components/ui/HelpLink';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { DocumentFileStrip } from '../../components/documents/DocumentFileStrip';

type ExpiryStatus = { key: 'noExpiry' | 'expired' | 'expiringInDays' | 'valid'; days: number; class: string };

/** Status of a credential's expiry, as a translation key. */
function getExpiryStatus(expiryDate: string | null | undefined): ExpiryStatus {
  if (!expiryDate) return { key: 'noExpiry', days: 0, class: 'badge-neutral' };
  const daysLeft = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { key: 'expired', days: daysLeft, class: 'badge-expired' };
  if (daysLeft <= 90) return { key: 'expiringInDays', days: daysLeft, class: 'badge-expiring' };
  return { key: 'valid', days: daysLeft, class: 'badge-current' };
}

export default function CredentialsPage() {
  const { data: credentials, isLoading, error } = useCredentials();
  const deleteCredential = useDeleteCredential();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { t } = useTranslation('credentials');
  const { fmtDate } = useFormatPrefs();

  const handleDelete = async (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteCredential.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
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
        <ErrorState title={t('errorTitle')} message={t('errorMessage')} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper maxWidth="list">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        titleAdornment={<HelpLink topic="credentials" />}
        action={
          <button
            onClick={() => { setEditingId(null); setShowForm(true); }}
            className="btn-primary whitespace-nowrap"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t('addCredential')}
          </button>
        }
      />

      {/* Form Modal */}
      <FormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? t('editCredential') : t('addCredential')}
        size="md"
      >
        <CredentialForm credentialId={editingId} onClose={() => setShowForm(false)} />
      </FormModal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        title={t('deleteCredential')}
        description={t('deleteConfirm')}
        confirmLabel={t('deleteCredential')}
        variant="danger"
        isLoading={deleteCredential.isPending}
      />

      {/* Credentials List */}
      {!credentials || credentials.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('noCredentials')}
          description={t('addFirst')}
          action={{ label: t('addCredential'), onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {credentials.map((cred) => {
            const status = getExpiryStatus(cred.expiryDate);
            return (
              <div key={cred.id} className="card">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
                  {/* Identity */}
                  <div className="lg:w-60 lg:shrink-0">
                    <div className="flex items-start gap-3 flex-wrap">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                          {t(`types.${cred.credentialType}`, { defaultValue: cred.credentialType.replace(/_/g, ' ') })}
                        </h3>
                        {cred.credentialNumber && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                            {cred.credentialNumber}
                          </p>
                        )}
                      </div>
                      <span className={status.class}>
                        {t(`status.${status.key}`, { days: Math.abs(status.days) })}
                      </span>
                    </div>
                    <DocumentFileStrip subject="credential" subjectId={cred.id} />
                  </div>

                  {/* Details grid */}
                  <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-x-6 gap-y-3 flex-1 text-sm min-w-0">
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('issued')}
                      </dt>
                      <dd className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">
                        {fmtDate(cred.issueDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('expires')}
                      </dt>
                      <dd className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">
                        {cred.expiryDate ? fmtDate(cred.expiryDate) : '—'}
                      </dd>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('authority')}
                      </dt>
                      <dd className="mt-0.5 font-medium text-slate-700 dark:text-slate-200 break-words">
                        {cred.issuingAuthority}
                      </dd>
                    </div>
                    {cred.notes && (
                      <div className="col-span-2 sm:col-span-3">
                        <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {t('fields.notes')}
                        </dt>
                        <dd className="mt-0.5 text-slate-600 dark:text-slate-300 italic break-words">
                          {cred.notes}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {/* Actions */}
                  <div className="flex lg:flex-col gap-2 lg:w-28 lg:shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => { setEditingId(cred.id); setShowForm(true); }}
                      className="btn-ghost btn-sm flex-1 lg:w-full lg:flex-none"
                    >
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(cred.id)}
                      className="btn-ghost btn-sm flex-1 lg:w-full lg:flex-none text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
