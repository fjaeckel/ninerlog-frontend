import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { useContacts, useUpdateContact, useDeleteContact } from '../../hooks/useContacts';
import type { Contact } from '../../types/api';
import { extractApiError } from '../../lib/errors';

/**
 * Crew contact management. Contacts are auto-created from crew names typed
 * into the flight form and by CSV imports; this is the one place they can be
 * corrected (typo in a name, adding an email) or removed.
 */
export function ContactsSection() {
  const { t } = useTranslation('settings');
  const { data: contacts, isLoading } = useContacts();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [message, setMessage] = useState<string | null>(null);

  const startEdit = (c: Contact) => {
    setEditingId(c.id);
    setConfirmDeleteId(null);
    setMessage(null);
    setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', notes: c.notes ?? '' });
  };

  const handleSave = async () => {
    if (!editingId || !form.name.trim()) return;
    setMessage(null);
    try {
      await updateContact.mutateAsync({
        id: editingId,
        data: {
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          notes: form.notes.trim() || null,
        },
      });
      setEditingId(null);
    } catch (err) {
      setMessage(extractApiError(err, t('contacts.saveFailed')));
    }
  };

  const handleDelete = async (id: string) => {
    setMessage(null);
    try {
      await deleteContact.mutateAsync(id);
      setConfirmDeleteId(null);
    } catch (err) {
      setMessage(extractApiError(err, t('contacts.deleteFailed')));
    }
  };

  if (isLoading) return null;

  return (
    <div className="card" data-testid="contacts-section">
      <h2 className="section-title mb-1">{t('contacts.title')}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t('contacts.description')}</p>

      {message && (
        <div className="mb-3 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {message}
        </div>
      )}

      {!contacts || contacts.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">{t('contacts.empty')}</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {contacts.map((c) =>
            editingId === c.id ? (
              <div key={c.id} className="py-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`contact-name-${c.id}`} className="form-label">{t('contacts.name')}</label>
                    <input
                      id={`contact-name-${c.id}`}
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor={`contact-email-${c.id}`} className="form-label">{t('contacts.email')}</label>
                    <input
                      id={`contact-email-${c.id}`}
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor={`contact-phone-${c.id}`} className="form-label">{t('contacts.phone')}</label>
                    <input
                      id={`contact-phone-${c.id}`}
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor={`contact-notes-${c.id}`} className="form-label">{t('contacts.notes')}</label>
                    <input
                      id={`contact-notes-${c.id}`}
                      type="text"
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      className="input w-full"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={updateContact.isPending || !form.name.trim()}
                    className="btn-primary btn-sm"
                  >
                    {updateContact.isPending ? t('contacts.saving') : t('contacts.save')}
                  </button>
                  <button onClick={() => setEditingId(null)} className="btn-ghost btn-sm">
                    {t('contacts.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {[c.email, c.phone, c.notes].filter(Boolean).join(' · ') || t('contacts.noDetails')}
                  </p>
                </div>
                {confirmDeleteId === c.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deleteContact.isPending}
                      className="btn-danger btn-sm"
                    >
                      {deleteContact.isPending ? t('contacts.deleting') : t('contacts.confirmDelete')}
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className="btn-ghost btn-sm">
                      {t('contacts.cancel')}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(c)}
                      className="btn-ghost btn-sm min-h-[44px] min-w-[44px]"
                      aria-label={t('contacts.edit', { name: c.name })}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setConfirmDeleteId(c.id); setEditingId(null); }}
                      className="btn-ghost btn-sm min-h-[44px] min-w-[44px] text-red-600 dark:text-red-400"
                      aria-label={t('contacts.delete', { name: c.name })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
