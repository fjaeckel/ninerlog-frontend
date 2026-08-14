import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, Pencil, Trash2, Search } from 'lucide-react';
import { PageWrapper, PageHeader } from '../../components/ui';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from '../../hooks/useContacts';
import type { Contact } from '../../types/api';
import { extractApiError } from '../../lib/errors';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'nameRequired').max(255, 'nameTooLong'),
  email: z.string().trim().email('invalidEmail').or(z.literal('')),
  phone: z.string().trim().max(50, 'phoneTooLong'),
  notes: z.string().trim().max(500, 'notesTooLong'),
});
type ContactFormData = z.infer<typeof contactSchema>;

const EMPTY_FORM: ContactFormData = { name: '', email: '', phone: '', notes: '' };

/**
 * People — the pilot's address book. Contacts are auto-created from crew
 * names typed into the flight form and by CSV imports; this page is where
 * they are curated: fix a typo'd name, attach an email or phone number,
 * or remove someone who never belonged in the log.
 */
export default function PeoplePage() {
  const { t } = useTranslation('people');
  const { fmtDate } = useFormatPrefs();
  const { data: contacts, isLoading, error } = useContacts();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const [filter, setFilter] = useState('');
  // null = form closed, 'new' = creating, otherwise the contact being edited
  const [editing, setEditing] = useState<Contact | 'new' | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({ resolver: zodResolver(contactSchema), defaultValues: EMPTY_FORM });

  const openCreate = () => {
    setEditing('new');
    setConfirmDeleteId(null);
    setApiError(null);
    reset(EMPTY_FORM);
  };

  const openEdit = (c: Contact) => {
    setEditing(c);
    setConfirmDeleteId(null);
    setApiError(null);
    reset({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', notes: c.notes ?? '' });
  };

  const closeForm = () => {
    setEditing(null);
    setApiError(null);
    reset(EMPTY_FORM);
  };

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);
    const body = {
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      notes: values.notes || null,
    };
    try {
      if (editing === 'new') {
        await createContact.mutateAsync(body);
      } else if (editing) {
        await updateContact.mutateAsync({ id: editing.id, data: body });
      }
      closeForm();
    } catch (err) {
      setApiError(extractApiError(err, t('saveFailed')));
    }
  });

  const handleDelete = async (id: string) => {
    setApiError(null);
    try {
      await deleteContact.mutateAsync(id);
      setConfirmDeleteId(null);
    } catch (err) {
      setApiError(extractApiError(err, t('deleteFailed')));
    }
  };

  const filtered = useMemo(() => {
    const list = contacts ?? [];
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      [c.name, c.email, c.phone, c.notes].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [contacts, filter]);

  const saving = createContact.isPending || updateContact.isPending;

  if (isLoading) {
    return (
      <PageWrapper>
        <SkeletonList rows={4} />
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <ErrorState title={t('failedToLoad')} message={t('failedToLoadMessage')} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <button onClick={openCreate} className="btn-primary whitespace-nowrap">
            + {t('addPerson')}
          </button>
        }
      />

      {apiError && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {apiError}
        </div>
      )}

      {editing !== null && (
        <form onSubmit={onSubmit} className="card mb-4" aria-label={editing === 'new' ? t('addPerson') : t('editPerson')}>
          <h2 className="section-title mb-4">
            {editing === 'new' ? t('addPerson') : t('editingName', { name: editing.name })}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="person-name" className="form-label">
                {t('fields.name')}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input id="person-name" type="text" {...register('name')} className={errors.name ? 'input-error w-full' : 'input w-full'} />
              {errors.name && <p className="form-error">{t(`errors.${errors.name.message}`)}</p>}
            </div>
            <div>
              <label htmlFor="person-email" className="form-label">{t('fields.email')}</label>
              <input id="person-email" type="email" {...register('email')} className={errors.email ? 'input-error w-full' : 'input w-full'} />
              {errors.email && <p className="form-error">{t(`errors.${errors.email.message}`)}</p>}
            </div>
            <div>
              <label htmlFor="person-phone" className="form-label">{t('fields.phone')}</label>
              <input id="person-phone" type="tel" {...register('phone')} className={errors.phone ? 'input-error w-full' : 'input w-full'} />
              {errors.phone && <p className="form-error">{t(`errors.${errors.phone.message}`)}</p>}
            </div>
            <div>
              <label htmlFor="person-notes" className="form-label">{t('fields.notes')}</label>
              <input id="person-notes" type="text" {...register('notes')} placeholder={t('fields.notesPlaceholder')} className={errors.notes ? 'input-error w-full' : 'input w-full'} />
              {errors.notes && <p className="form-error">{t(`errors.${errors.notes.message}`)}</p>}
            </div>
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? t('saving') : editing === 'new' ? t('create') : t('save')}
            </button>
            <button type="button" onClick={closeForm} className="btn-ghost">
              {t('cancel')}
            </button>
          </div>
        </form>
      )}

      {(contacts?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />}
          title={t('empty.title')}
          description={t('empty.description')}
        />
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchLabel')}
              className="input w-full pl-9"
            />
          </div>

          <div className="card">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">
                {t('noMatches', { query: filter })}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((c) => (
                  <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {[c.email, c.phone, c.notes].filter(Boolean).join(' · ') || t('noDetails')}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {t('addedOn', { date: fmtDate(c.createdAt) })}
                      </p>
                    </div>
                    {confirmDeleteId === c.id ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deleteContact.isPending}
                          className="btn-danger btn-sm"
                        >
                          {deleteContact.isPending ? t('deleting') : t('confirmDelete')}
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} className="btn-ghost btn-sm">
                          {t('cancel')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(c)}
                          className="btn-ghost btn-sm min-h-[44px] min-w-[44px]"
                          aria-label={t('editAria', { name: c.name })}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setConfirmDeleteId(c.id); closeForm(); }}
                          className="btn-ghost btn-sm min-h-[44px] min-w-[44px] text-red-600 dark:text-red-400"
                          aria-label={t('deleteAria', { name: c.name })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">{t('autoCreateHint')}</p>
        </>
      )}
    </PageWrapper>
  );
}
