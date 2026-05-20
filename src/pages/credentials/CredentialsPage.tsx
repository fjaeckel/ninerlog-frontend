import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCredentials, useDeleteCredential } from '../../hooks/useCredentials';
import CredentialForm from '../../components/credentials/CredentialForm';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SkeletonGrid } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import HelpLink from '../../components/ui/HelpLink';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';

function getExpiryStatus(expiryDate: string | null | undefined): { label: string; class: string } {
  if (!expiryDate) return { label: 'No expiry', class: 'badge-current' };
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { label: 'EXPIRED', class: 'badge-expired' };
  if (daysLeft <= 30) return { label: `${daysLeft}d left`, class: 'badge-expiring' };
  if (daysLeft <= 90) return { label: `${daysLeft}d left`, class: 'badge-expiring' };
  return { label: 'Valid', class: 'badge-current' };
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
      <div className="mx-auto max-w-7xl py-6">
        <SkeletonGrid count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl py-6">
        <ErrorState
          title="Failed to load credentials"
          message="An error occurred while loading your credentials. Please try again."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            {t('subtitle')}
            <HelpLink topic="credentials" />
          </p>
        </div>
        <button onClick={() => { setEditingId(null); setShowForm(true); }} className="btn-primary self-start sm:self-auto">
          {t('addCredential')}
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[1020]" role="dialog" aria-modal="true" aria-labelledby="credential-form-title">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 id="credential-form-title" className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                  {editingId ? t('editCredential') : t('addCredential')}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <CredentialForm credentialId={editingId} onClose={() => setShowForm(false)} />
            </div>
          </div>
        </div>
      )}

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
        <div className="card text-center py-12">
          <p className="text-slate-500 dark:text-slate-400 mb-4">{t('noCredentials')}</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            {t('addFirst')}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {credentials.map((cred) => {
            const status = getExpiryStatus(cred.expiryDate);
            return (
              <div key={cred.id} className="card">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
                  {/* Identity */}
                  <div className="lg:w-80 lg:shrink-0">
                    <div className="flex items-start gap-3 flex-wrap">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                          {t(`types.${cred.credentialType}`, { defaultValue: cred.credentialType })}
                        </h3>
                        {cred.credentialNumber && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                            {cred.credentialNumber}
                          </p>
                        )}
                      </div>
                      <span className={`badge text-xs ${status.class}`}>
                        {status.label}
                      </span>
                    </div>
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
                      className="btn-ghost btn-sm flex-1"
                    >
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(cred.id)}
                      className="btn-ghost btn-sm flex-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
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
    </div>
  );
}
