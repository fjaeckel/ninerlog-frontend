import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Pencil, Plus, X } from 'lucide-react';
import { useSearchContacts } from '../../hooks/useContacts';
import type { Contact, CrewRole, FlightCrewMemberInput } from '../../types/api';
import { cn } from '../../lib/cn';
import { CREW_ROLES, CREW_ROLE_TONE } from './crewRoles';

interface CrewEditorProps {
  crew: FlightCrewMemberInput[];
  onChange: (next: FlightCrewMemberInput[]) => void;
  /** Called with the name of a person added through the add row. */
  onPersonAdded?: (name: string) => void;
  disabled?: boolean;
  /** Role preselected in the add row. */
  defaultRole?: CrewRole;
}

/** Crew list with in-place role and name editing, plus an add row. */
export function CrewEditor({ crew, onChange, onPersonAdded, disabled, defaultRole = 'Passenger' }: CrewEditorProps) {
  const { t } = useTranslation('flights');
  const [name, setName] = useState('');
  const [contactId, setContactId] = useState<string | null>(null);
  const [role, setRole] = useState<CrewRole>(defaultRole);

  const replaceAt = (idx: number, patch: Partial<FlightCrewMemberInput>) =>
    onChange(crew.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onChange([...crew, { name: trimmed, role, contactId }]);
    onPersonAdded?.(trimmed);
    setName('');
    setContactId(null);
  };

  return (
    <div className="@container space-y-2">
      {crew.length > 0 && (
        <ul className="space-y-2">
          {crew.map((member, idx) => (
            <CrewRow
              key={`${idx}-${member.name}`}
              member={member}
              disabled={disabled}
              onRoleChange={(next) => replaceAt(idx, { role: next })}
              onRename={(nextName, nextContactId) => replaceAt(idx, { name: nextName, contactId: nextContactId })}
              onRemove={() => onChange(crew.filter((_, i) => i !== idx))}
            />
          ))}
        </ul>
      )}

      {!disabled && (
        <div className="flex flex-col gap-2 @md:flex-row">
          <PersonNameInput
            value={name}
            onChange={(v) => { setName(v); setContactId(null); }}
            onPick={(c) => { setName(c.name); setContactId(c.id); }}
            onEnter={add}
            placeholder={t('form.personName')}
            ariaLabel={t('crewEditor.newPersonName')}
            className="flex-1 min-w-0"
          />
          <div className="flex gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as CrewRole)}
              className="input text-sm flex-1 @md:w-auto @md:flex-none"
              aria-label={t('crewEditor.newPersonRole')}
            >
              {CREW_ROLES.map((r) => (
                <option key={r} value={r}>{t(`crewRoles.${r}`)}</option>
              ))}
            </select>
            <button type="button" disabled={!name.trim()} onClick={add} className="btn-secondary shrink-0">
              <Plus className="w-4 h-4" /> {t('common:add')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface CrewRowProps {
  member: FlightCrewMemberInput;
  disabled?: boolean;
  onRoleChange: (role: CrewRole) => void;
  onRename: (name: string, contactId: string | null) => void;
  onRemove: () => void;
}

function CrewRow({ member, disabled, onRoleChange, onRename, onRemove }: CrewRowProps) {
  const { t } = useTranslation('flights');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(member.name);
  const [draftContactId, setDraftContactId] = useState<string | null>(member.contactId ?? null);

  const startEdit = () => {
    setDraft(member.name);
    setDraftContactId(member.contactId ?? null);
    setEditing(true);
  };
  const commit = () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== member.name) onRename(trimmed, draftContactId);
  };

  return (
    <li className="flex items-center gap-2 rounded-lg bg-slate-50 p-1.5 pl-2 text-sm dark:bg-slate-700/40">
      {editing ? null : disabled ? (
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', CREW_ROLE_TONE[member.role])}>
          {t(`crewRoles.${member.role}`)}
        </span>
      ) : (
        <RolePill role={member.role} onChange={onRoleChange} label={t('crewEditor.roleOf', { name: member.name })} />
      )}

      {editing ? (
        <div className="flex flex-1 items-center gap-1 min-w-0 py-0.5">
          <PersonNameInput
            value={draft}
            onChange={(v) => { setDraft(v); setDraftContactId(null); }}
            onPick={(c) => { setDraft(c.name); setDraftContactId(c.id); }}
            onEnter={commit}
            onEscape={() => setEditing(false)}
            ariaLabel={t('crewEditor.nameOf', { name: member.name })}
            autoFocus
            className="flex-1 min-w-0"
          />
          <button
            type="button"
            onClick={commit}
            disabled={!draft.trim()}
            className="btn-ghost btn-sm px-2 text-green-700 dark:text-green-400"
            aria-label={t('crewEditor.saveName')}
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="btn-ghost btn-sm px-2"
            aria-label={t('crewEditor.cancelEdit')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : disabled ? (
        <span className="flex-1 truncate font-medium text-slate-700 dark:text-slate-200">{member.name}</span>
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="group flex min-h-[36px] flex-1 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left font-medium text-slate-700 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-200 dark:hover:bg-slate-700 [@media(pointer:coarse)]:min-h-[44px]"
          aria-label={t('crewEditor.editName', { name: member.name })}
        >
          <span className="truncate">{member.name}</span>
          <Pencil
            className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-60 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 dark:text-slate-500"
            aria-hidden="true"
          />
        </button>
      )}

      {!disabled && !editing && (
        <button
          type="button"
          onClick={onRemove}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
          aria-label={t('crewEditor.remove', { name: member.name })}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

function RolePill({ role, onChange, label }: { role: CrewRole; onChange: (r: CrewRole) => void; label: string }) {
  const { t } = useTranslation('flights');
  return (
    <span className="relative inline-flex shrink-0">
      <select
        value={role}
        onChange={(e) => onChange(e.target.value as CrewRole)}
        aria-label={label}
        className={cn(
          'field-sizing-content min-h-[36px] cursor-pointer appearance-none rounded-full py-1 pl-3 pr-7 text-xs font-semibold ring-1 ring-inset transition-shadow',
          'hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [@media(pointer:coarse)]:min-h-[44px]',
          CREW_ROLE_TONE[role],
        )}
      >
        {CREW_ROLES.map((r) => (
          <option key={r} value={r}>{t(`crewRoles.${r}`)}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-70" aria-hidden="true" />
    </span>
  );
}

interface PersonNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onPick: (contact: Contact) => void;
  onEnter: () => void;
  onEscape?: () => void;
  placeholder?: string;
  ariaLabel: string;
  autoFocus?: boolean;
  className?: string;
}

/** Name input with contact suggestions. */
function PersonNameInput({ value, onChange, onPick, onEnter, onEscape, placeholder, ariaLabel, autoFocus, className }: PersonNameInputProps) {
  const [query, setQuery] = useState('');
  const { data: suggestions } = useSearchContacts(query);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const open = !!suggestions && suggestions.length > 0 && query.length >= 2;

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setQuery('');
      onEnter();
    } else if (e.key === 'Escape') {
      if (open) {
        e.stopPropagation();
        setQuery('');
      } else if (onEscape) {
        e.stopPropagation();
        onEscape();
      }
    }
  };

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setQuery(e.target.value); }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        role="combobox"
        autoFocus={autoFocus}
        className="input text-sm"
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          {suggestions.map((c) => (
            <li key={c.id} role="option" aria-selected={false}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-blue-900/20"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onPick(c); setQuery(''); inputRef.current?.focus(); }}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
