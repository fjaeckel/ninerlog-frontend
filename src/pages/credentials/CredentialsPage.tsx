import { useState } from 'react';
import { format } from 'date-fns';
import { useCredentials, useDeleteCredential } from '../../hooks/useCredentials';
import CredentialForm from '../../components/credentials/CredentialForm';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SkeletonGrid } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';

const CREDENTIAL_LABELS: Record<string, string> = {
  EASA_CLASS1_MEDICAL: 'EASA Class 1 Medical',
  EASA_CLASS2_MEDICAL: 'EASA Class 2 Medical',
  EASA_LAPL_MEDICAL: 'EASA LAPL Medical',
  FAA_CLASS1_MEDICAL: 'FAA Class 1 Medical',
  FAA_CLASS2_MEDICAL: 'FAA Class 2 Medical',
  FAA_CLASS3_MEDICAL: 'FAA Class 3 Medical',
  LANG_ICAO_LEVEL4: 'Language ICAO Level 4',
  LANG_ICAO_LEVEL5: 'Language ICAO Level 5',
  LANG_ICAO_LEVEL6: 'Language ICAO Level 6 (Expert)',
  SEC_CLEARANCE_ZUP: 'Security Clearance ZÜP',
  SEC_CLEARANCE_ZUBB: 'Security Clearance ZüBB',
  OTHER: 'Other',
};

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
      <div className="mx-auto max-w-[960px] py-6">
        <SkeletonGrid count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[960px] py-6">
        <ErrorState
          title="Failed to load credentials"
          message="An error occurred while loading your credentials. Please try again."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[960px] py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Credentials</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Medicals, language proficiency, and security clearances
          </p>
        </div>
        <button onClick={() => { setEditingId(null); setShowForm(true); }} className="btn-primary">
          + Add Credential
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="credential-form-title">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 id="credential-form-title" className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                  {editingId ? 'Edit Credential' : 'Add Credential'}
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
        title="Delete credential?"
        description="This credential will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteCredential.isPending}
      />

      {/* Credentials List */}
      {!credentials || credentials.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-500 dark:text-slate-400 mb-4">No credentials added yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Add Your First Credential
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {credentials.map((cred) => {
            const status = getExpiryStatus(cred.expiryDate);
            return (
              <div key={cred.id} className="card">
                <div className="flex justify-between items-start mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {CREDENTIAL_LABELS[cred.credentialType] || cred.credentialType}
                    </h3>
                    {cred.credentialNumber && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cred.credentialNumber}</p>
                    )}
                  </div>
                  <span className={`badge text-xs shrink-0 ml-2 ${status.class}`}>
                    {status.label}
                  </span>
                </div>

                <dl className="text-sm space-y-1.5 mb-4">
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Issued</dt>
                    <dd className="text-slate-700 dark:text-slate-300">{format(new Date(cred.issueDate), 'dd MMM yyyy')}</dd>
                  </div>
                  {cred.expiryDate && (
                    <div className="flex justify-between">
                      <dt className="text-slate-500 dark:text-slate-400">Expires</dt>
                      <dd className="text-slate-700 dark:text-slate-300">{format(new Date(cred.expiryDate), 'dd MMM yyyy')}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Authority</dt>
                    <dd className="text-slate-700 dark:text-slate-300">{cred.issuingAuthority}</dd>
                  </div>
                </dl>

                {cred.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-3 truncate">{cred.notes}</p>
                )}

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => { setEditingId(cred.id); setShowForm(true); }}
                    className="btn-ghost btn-sm flex-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cred.id)}
                    className="btn-ghost btn-sm flex-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
