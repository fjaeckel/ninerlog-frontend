import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  useCreateLicencePrivilege,
  useDeleteLicencePrivilege,
  useUpdateLicencePrivilege,
} from '../../hooks/useLicencePrivileges';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { extractApiError } from '../../lib/errors';
import { launchMethodKey } from '../../lib/currencyMessages';
import { LAUNCH_METHODS } from '../../lib/launchMethod';
import { UL_RATING_KINDS } from '../../lib/ultralight';
import { useRelevanceResolver } from '../../lib/relevance';
import {
  PRIVILEGE_DETAIL_MAX,
  PRIVILEGE_KINDS,
  PRIVILEGE_NOTES_MAX,
  PRIVILEGE_PICKER_FEATURE,
  draftFromPrivilege,
  emptyPrivilegeDraft,
  privilegeCreateBody,
  privilegeDetailKind,
  privilegeUpdateBody,
  validatePrivilegeDraft,
  type LicencePrivilege,
  type LicencePrivilegeKind,
  type PrivilegeDraft,
} from '../../lib/privileges';
import { ExpiryBadge } from './ExpiryBadge';
import { usePrivilegeDetailLabel } from '../../hooks/usePrivilegeDetailLabel';

/** Kinds relevant to the pilot's disciplines first, the rest after; `current` stays relevant. */
function usePrivilegeKindGroups(current?: LicencePrivilegeKind) {
  const resolve = useRelevanceResolver();
  const primary: LicencePrivilegeKind[] = [];
  const more: LicencePrivilegeKind[] = [];
  for (const k of PRIVILEGE_KINDS) {
    (k === current || resolve(PRIVILEGE_PICKER_FEATURE[k]).visible ? primary : more).push(k);
  }
  if (primary.length === 0) return { primary: more, more: [] as LicencePrivilegeKind[] };
  return { primary, more };
}

interface PrivilegeFormProps {
  initial: PrivilegeDraft;
  pending: boolean;
  onSave: (draft: PrivilegeDraft) => void;
  onCancel: () => void;
}

function PrivilegeForm({ initial, pending, onSave, onCancel }: PrivilegeFormProps) {
  const { t } = useTranslation(['licenses', 'common', 'flights', 'relevance']);
  const [draft, setDraft] = useState<PrivilegeDraft>(initial);
  const [touched, setTouched] = useState(false);
  const id = useId();
  const { primary, more } = usePrivilegeKindGroups(initial.kind);
  const detailKind = privilegeDetailKind(draft.kind);
  const error = validatePrivilegeDraft(draft);
  const set = (patch: Partial<PrivilegeDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const kindOption = (k: LicencePrivilegeKind) => (
    <option key={k} value={k}>{t(`common:privilegeKinds.${k}`)}</option>
  );

  return (
    <form
      className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-md border border-slate-200 dark:border-slate-600 p-3 bg-slate-50 dark:bg-slate-800/50"
      data-testid="privilege-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!error) onSave(draft);
      }}
    >
      <div className="sm:col-span-3">
        <label htmlFor={`${id}-kind`} className="text-xs text-slate-500 dark:text-slate-400">{t('privileges.kind')}</label>
        <select
          id={`${id}-kind`}
          value={draft.kind}
          onChange={(e) => set({ kind: e.target.value as LicencePrivilegeKind, detail: '' })}
          className="input input-sm mt-0.5"
        >
          {primary.map(kindOption)}
          {more.length > 0 && (
            <optgroup label={t('privileges.moreKinds')} data-testid="more-privilege-kinds">
              {more.map(kindOption)}
            </optgroup>
          )}
        </select>
      </div>

      <div className="sm:col-span-3">
        <label htmlFor={`${id}-detail`} className="text-xs text-slate-500 dark:text-slate-400">
          {t(`privileges.detailLabel.${detailKind}`)}
        </label>
        {detailKind === 'launchMethod' ? (
          <select
            id={`${id}-detail`}
            value={draft.detail}
            onChange={(e) => set({ detail: e.target.value })}
            className="input input-sm mt-0.5"
            required
            aria-invalid={touched && !!error && error.startsWith('detail')}
          >
            <option value="" disabled>{t('privileges.detailPlaceholder.launchMethod')}</option>
            {LAUNCH_METHODS.map((m) => (
              <option key={m} value={m}>{t(launchMethodKey(m), { ns: 'flights' })}</option>
            ))}
          </select>
        ) : detailKind === 'ulKind' ? (
          <select
            id={`${id}-detail`}
            value={draft.detail}
            onChange={(e) => set({ detail: e.target.value })}
            className="input input-sm mt-0.5"
            required
            aria-invalid={touched && !!error && error.startsWith('detail')}
          >
            <option value="" disabled>{t('privileges.detailPlaceholder.ulKind')}</option>
            {UL_RATING_KINDS.map((k) => (
              <option key={k} value={k}>{t(`common:ulKinds.${k}`)}</option>
            ))}
          </select>
        ) : (
          <input
            id={`${id}-detail`}
            type="text"
            value={draft.detail}
            maxLength={PRIVILEGE_DETAIL_MAX}
            onChange={(e) => set({ detail: e.target.value })}
            placeholder={detailKind === 'aircraftType' ? t('privileges.detailPlaceholder.aircraftType') : undefined}
            className="input input-sm mt-0.5"
            required={detailKind === 'aircraftType'}
            aria-invalid={touched && !!error && error.startsWith('detail')}
          />
        )}
      </div>

      <div>
        <label htmlFor={`${id}-issued`} className="text-xs text-slate-500 dark:text-slate-400">{t('privileges.issuedOnOptional')}</label>
        <input id={`${id}-issued`} type="date" value={draft.issuedOn} onChange={(e) => set({ issuedOn: e.target.value })} className="input input-sm mt-0.5" />
      </div>
      <div>
        <label htmlFor={`${id}-expires`} className="text-xs text-slate-500 dark:text-slate-400">{t('privileges.expiresOnOptional')}</label>
        <input
          id={`${id}-expires`}
          type="date"
          value={draft.expiresOn}
          onChange={(e) => set({ expiresOn: e.target.value })}
          className="input input-sm mt-0.5"
          aria-invalid={touched && error === 'expiryBeforeIssue'}
        />
      </div>
      <div className="sm:col-span-3">
        <label htmlFor={`${id}-notes`} className="text-xs text-slate-500 dark:text-slate-400">{t('privileges.notes')}</label>
        <textarea
          id={`${id}-notes`}
          value={draft.notes}
          maxLength={PRIVILEGE_NOTES_MAX}
          rows={2}
          onChange={(e) => set({ notes: e.target.value })}
          className="input input-sm mt-0.5"
        />
      </div>

      {touched && error && (
        <p className="sm:col-span-3 text-xs text-red-600 dark:text-red-400" role="alert" data-testid="privilege-form-error">
          {t(`privileges.errors.${error}`)}
        </p>
      )}

      <div className="sm:col-span-3 flex gap-2 pt-1">
        <button type="submit" disabled={pending} className="btn-primary btn-sm">
          {pending ? t('common:saving') : t('common:save')}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary btn-sm">
          {t('common:cancel')}
        </button>
      </div>
    </form>
  );
}

interface LicencePrivilegesProps {
  licenseId: string;
  privileges: LicencePrivilege[] | undefined;
  isLoading: boolean;
  isError: boolean;
  /** Opens the add form with this kind preselected. */
  initialAddKind?: LicencePrivilegeKind | null;
}

/** The privileges recorded on one licence, with add, edit and delete. */
export function LicencePrivileges({ licenseId, privileges, isLoading, isError, initialAddKind }: LicencePrivilegesProps) {
  const { t } = useTranslation(['licenses', 'common']);
  const { fmtDate } = useFormatPrefs();
  const detailLabel = usePrivilegeDetailLabel();
  const createPrivilege = useCreateLicencePrivilege();
  const updatePrivilege = useUpdateLicencePrivilege();
  const deletePrivilege = useDeleteLicencePrivilege();
  const { primary } = usePrivilegeKindGroups();
  const [adding, setAdding] = useState<PrivilegeDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [openedAddKind, setOpenedAddKind] = useState<LicencePrivilegeKind | null>(null);
  if (initialAddKind && openedAddKind !== initialAddKind) {
    setOpenedAddKind(initialAddKind);
    setAdding(emptyPrivilegeDraft(initialAddKind));
  }

  const handleCreate = async (draft: PrivilegeDraft) => {
    try {
      setSaveError(null);
      await createPrivilege.mutateAsync({ licenseId, data: privilegeCreateBody(draft) });
      setAdding(null);
    } catch (err) {
      setSaveError(extractApiError(err, t('privileges.failedToSave')));
    }
  };

  const handleUpdate = async (privilegeId: string, draft: PrivilegeDraft) => {
    try {
      setSaveError(null);
      await updatePrivilege.mutateAsync({ licenseId, privilegeId, data: privilegeUpdateBody(draft) });
      setEditingId(null);
    } catch (err) {
      setSaveError(extractApiError(err, t('privileges.failedToSave')));
    }
  };

  const handleDelete = async (privilegeId: string) => {
    try {
      setSaveError(null);
      await deletePrivilege.mutateAsync({ licenseId, privilegeId });
    } catch (err) {
      setSaveError(extractApiError(err, t('privileges.failedToDelete')));
    }
  };

  return (
    <div className="pt-3 border-t border-slate-200 dark:border-slate-700" data-testid={`privileges-${licenseId}`}>
      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-3 py-2 rounded-lg text-xs mb-2">
          {saveError}
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {t('privileges.title')}
        </h4>
        {!adding && (
          <button onClick={() => { setEditingId(null); setAdding(emptyPrivilegeDraft(primary[0] ?? PRIVILEGE_KINDS[0])); }} className="btn-ghost btn-sm text-xs">
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            {t('privileges.add')}
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('common:loading')}</p>
      ) : isError ? (
        <p className="text-xs text-red-600 dark:text-red-400">{t('privileges.loadFailed')}</p>
      ) : privileges && privileges.length > 0 ? (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
          <li className="hidden sm:grid grid-cols-[1.2fr_1fr_1.4fr_5rem] gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>{t('privileges.kind')}</span>
            <span>{t('card.issued')}</span>
            <span>{t('classRatingFields.expiryDate')}</span>
            <span className="sr-only">{t('common:actions', { defaultValue: 'Actions' })}</span>
          </li>
          {privileges.map((p) => (
            <li key={p.id} data-testid={`privilege-${p.id}`}>
              {editingId === p.id ? (
                <div className="p-3 bg-blue-50/50 dark:bg-blue-900/20">
                  <PrivilegeForm
                    initial={draftFromPrivilege(p)}
                    pending={updatePrivilege.isPending}
                    onSave={(d) => handleUpdate(p.id, d)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-[1.2fr_1fr_1.4fr_5rem] gap-x-3 gap-y-1 px-3 py-2 items-center text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <span className="font-medium text-slate-700 dark:text-slate-200 col-span-2 sm:col-span-1">
                    {t(`common:privilegeKinds.${p.kind}`, { defaultValue: p.kind })}
                    {p.detail && (
                      <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">{detailLabel(p.kind, p.detail)}</span>
                    )}
                    {p.notes && (
                      <span className="block text-xs font-normal italic text-slate-500 dark:text-slate-400 break-words">{p.notes}</span>
                    )}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    <span className="sm:hidden text-xs text-slate-500 dark:text-slate-400 mr-1">{t('card.issued')}:</span>
                    {p.issuedOn ? fmtDate(p.issuedOn) : '—'}
                  </span>
                  <span>
                    <span className="sm:hidden text-xs text-slate-500 dark:text-slate-400 mr-1">{t('classRatingFields.expiryDate')}:</span>
                    <ExpiryBadge expiryDate={p.expiresOn} />
                  </span>
                  <div className="flex items-center gap-1 justify-end col-span-2 sm:col-span-1">
                    <button
                      onClick={() => { setAdding(null); setEditingId(p.id); }}
                      className="btn-ghost btn-sm min-w-[44px] min-h-[44px] px-0 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                      title={t('privileges.edit')}
                      aria-label={t('privileges.edit')}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="btn-ghost btn-sm min-w-[44px] min-h-[44px] px-0 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                      title={t('privileges.remove')}
                      aria-label={t('privileges.remove')}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic">{t('privileges.none')}</p>
      )}

      {adding && (
        <PrivilegeForm
          key={adding.kind + (initialAddKind ?? '')}
          initial={adding}
          pending={createPrivilege.isPending}
          onSave={handleCreate}
          onCancel={() => setAdding(null)}
        />
      )}
    </div>
  );
}
