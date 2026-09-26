import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Check, CheckCircle2, Pencil, Plus, TimerReset, Trash2 } from 'lucide-react';
import {
  useCompleteAircraftReminder,
  useCreateAircraftReminder,
  useDeleteAircraftReminder,
  useUpdateAircraftReminder,
  type AircraftReminder,
  type AircraftReminderKind,
} from '../../hooks/useAircraftReminders';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import {
  MANUFACTURER_INTERVAL_KINDS,
  REMINDER_KINDS,
  SUGGESTED_INTERVAL_MONTHS,
  todayUtc,
} from '../../lib/aircraftReminders';
import { extractApiError } from '../../lib/errors';
import { cn } from '../../lib/cn';
import { useReminderRelative, useReminderTitle } from './reminderText';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FormModal } from '../ui/FormModal';

const STATUS_BADGE: Record<AircraftReminder['status'], { className: string; Icon: typeof CheckCircle2 }> = {
  ok: { className: 'badge-current', Icon: CheckCircle2 },
  due_soon: { className: 'badge-expiring', Icon: TimerReset },
  overdue: { className: 'badge-expired', Icon: AlertTriangle },
};

/** ok / due soon / overdue badge with icon. */
export function ReminderStatusBadge({ status, className }: { status: AircraftReminder['status']; className?: string }) {
  const { t } = useTranslation('aircraft');
  const { className: badge, Icon } = STATUS_BADGE[status];
  return (
    <span className={cn(badge, 'inline-flex items-center gap-1 whitespace-nowrap', className)}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      {t(`reminders.status.${status}`)}
    </span>
  );
}

interface AircraftRemindersSectionProps {
  aircraftId: string;
  registration: string;
  /** The aircraft's reminders, ordered by due date; `undefined` while loading. */
  reminders: AircraftReminder[] | undefined;
  loadError?: boolean;
}

/** Reminders block inside an aircraft card: list, add/edit, mark done, delete. */
export function AircraftRemindersSection({ aircraftId, registration, reminders, loadError }: AircraftRemindersSectionProps) {
  const { t } = useTranslation('aircraft');
  const { fmtDate } = useFormatPrefs();
  const title = useReminderTitle();
  const relative = useReminderRelative();
  const deleteReminder = useDeleteAircraftReminder();
  const [editing, setEditing] = useState<AircraftReminder | 'new' | null>(null);
  const [completing, setCompleting] = useState<AircraftReminder | null>(null);
  const [deleting, setDeleting] = useState<AircraftReminder | null>(null);

  const hasReminders = !!reminders && reminders.length > 0;

  const addButton = (
    <button type="button" onClick={() => setEditing('new')} className="btn-ghost btn-sm">
      <Plus className="w-4 h-4" aria-hidden="true" />
      {t('reminders.add')}
    </button>
  );

  return (
    <section
      aria-label={`${t('reminders.title')} ${registration}`}
      className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700"
    >
      {hasReminders ? (
        <>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('reminders.title')}
            </h4>
            {addButton}
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {reminders.map((r) => (
              <li key={r.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-800 dark:text-slate-100 break-words">{title(r)}</span>
                    <ReminderStatusBadge status={r.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                    <span className="tabular-nums">{t('reminders.dueOn', { date: fmtDate(r.dueDate) })}</span>
                    <span
                      className={cn(
                        'ml-1.5',
                        r.status === 'overdue'
                          ? 'text-red-600 dark:text-red-400'
                          : r.status === 'due_soon'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-500 dark:text-slate-400',
                      )}
                    >
                      · {relative(r)}
                    </span>
                  </p>
                  {(r.intervalMonths || r.lastDoneOn) && (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {[
                        r.intervalMonths ? t('reminders.every', { count: r.intervalMonths }) : null,
                        r.lastDoneOn ? t('reminders.lastDone', { date: fmtDate(r.lastDoneOn) }) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                  {r.notes && (
                    <p className="mt-0.5 text-xs italic text-slate-500 dark:text-slate-400 break-words">{r.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => setCompleting(r)} className="btn-secondary btn-sm">
                    <Check className="w-4 h-4" aria-hidden="true" />
                    {t('reminders.markDone')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(r)}
                    className="btn-ghost btn-sm min-w-11 justify-center"
                    aria-label={t('reminders.edit', { kind: title(r) })}
                    title={t('reminders.edit', { kind: title(r) })}
                  >
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(r)}
                    className="btn-ghost btn-sm min-w-11 justify-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    aria-label={t('reminders.delete', { kind: title(r) })}
                    title={t('reminders.delete', { kind: title(r) })}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          {loadError && <p className="text-xs text-red-600 dark:text-red-400">{t('reminders.loadError')}</p>}
          {reminders !== undefined && addButton}
        </div>
      )}

      <FormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing && editing !== 'new' ? t('reminders.editTitle') : t('reminders.addTitle')}
        size="md"
      >
        {editing !== null && (
          <ReminderForm
            aircraftId={aircraftId}
            reminder={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}
      </FormModal>

      <FormModal
        open={completing !== null}
        onClose={() => setCompleting(null)}
        title={completing ? t('reminders.markDoneTitle', { kind: title(completing) }) : ''}
        size="sm"
      >
        {completing && (
          <MarkDoneForm aircraftId={aircraftId} reminder={completing} onClose={() => setCompleting(null)} />
        )}
      </FormModal>

      <ConfirmDialog
        open={deleting !== null}
        onConfirm={async () => {
          if (!deleting) return;
          await deleteReminder.mutateAsync({ aircraftId, reminderId: deleting.id });
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
        title={t('reminders.deleteTitle')}
        description={deleting ? t('reminders.deleteDescription', { kind: title(deleting), registration }) : ''}
        confirmLabel={t('delete')}
        variant="danger"
        isLoading={deleteReminder.isPending}
      />
    </section>
  );
}

const reminderSchema = z
  .object({
    kind: z.enum(REMINDER_KINDS as [AircraftReminderKind, ...AircraftReminderKind[]]),
    label: z.string().max(100),
    dueDate: z.string().min(1, 'reminders.form.dueDateRequired'),
    intervalMonths: z
      .string()
      .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 240), 'reminders.form.intervalInvalid'),
    lastDoneOn: z.string(),
    notes: z.string().max(1000),
  })
  .refine((v) => v.kind !== 'CUSTOM' || v.label.trim() !== '', {
    path: ['label'],
    message: 'reminders.form.labelRequired',
  });

type ReminderFormData = z.infer<typeof reminderSchema>;

function ReminderForm({
  aircraftId,
  reminder,
  onClose,
}: {
  aircraftId: string;
  reminder: AircraftReminder | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('aircraft');
  const createReminder = useCreateAircraftReminder();
  const updateReminder = useUpdateAircraftReminder();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: reminder
      ? {
          kind: reminder.kind,
          label: reminder.label ?? '',
          dueDate: reminder.dueDate,
          intervalMonths: reminder.intervalMonths ? String(reminder.intervalMonths) : '',
          lastDoneOn: reminder.lastDoneOn ?? '',
          notes: reminder.notes ?? '',
        }
      : {
          kind: 'ANNUAL_INSPECTION',
          label: '',
          dueDate: '',
          intervalMonths: String(SUGGESTED_INTERVAL_MONTHS.ANNUAL_INSPECTION ?? ''),
          lastDoneOn: '',
          notes: '',
        },
  });

  const kind = useWatch({ control, name: 'kind' });
  const kindField = register('kind');

  const onSubmit = async (v: ReminderFormData) => {
    setApiError(null);
    const label = v.label.trim();
    const notes = v.notes.trim();
    const intervalMonths = v.intervalMonths === '' ? null : Number(v.intervalMonths);
    try {
      if (reminder) {
        await updateReminder.mutateAsync({
          aircraftId,
          reminderId: reminder.id,
          data: {
            kind: v.kind,
            label: label || null,
            dueDate: v.dueDate,
            intervalMonths,
            lastDoneOn: v.lastDoneOn || null,
            notes: notes || null,
          },
        });
      } else {
        await createReminder.mutateAsync({
          aircraftId,
          data: {
            kind: v.kind,
            dueDate: v.dueDate,
            ...(label ? { label } : {}),
            ...(intervalMonths !== null ? { intervalMonths } : {}),
            ...(v.lastDoneOn ? { lastDoneOn: v.lastDoneOn } : {}),
            ...(notes ? { notes } : {}),
          },
        });
      }
      onClose();
    } catch (err) {
      setApiError(extractApiError(err, t('reminders.saveError')));
    }
  };

  const intervalHint = MANUFACTURER_INTERVAL_KINDS.has(kind)
    ? t('reminders.form.intervalManufacturer')
    : t('reminders.form.intervalHint');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {apiError && (
        <div role="alert" className="rounded-md p-3 text-sm bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {apiError}
        </div>
      )}

      <div>
        <label htmlFor="reminder-kind" className="form-label">{t('reminders.form.kind')}</label>
        <select
          id="reminder-kind"
          className="input"
          {...kindField}
          onChange={(e) => {
            kindField.onChange(e);
            const next = e.target.value as AircraftReminderKind;
            const suggested = SUGGESTED_INTERVAL_MONTHS[next];
            setValue('intervalMonths', suggested === null ? '' : String(suggested));
          }}
        >
          {REMINDER_KINDS.map((k) => (
            <option key={k} value={k}>{t(`reminders.kinds.${k}`)}</option>
          ))}
        </select>
        {kind === 'ANNUAL_INSPECTION' && (
          <p className="form-helper">{t('reminders.kindHints.ANNUAL_INSPECTION')}</p>
        )}
      </div>

      <div>
        <label htmlFor="reminder-label" className="form-label">
          {t('reminders.form.label')}
          {kind === 'CUSTOM' && <span className="text-red-500"> *</span>}
        </label>
        <input
          id="reminder-label"
          type="text"
          maxLength={100}
          placeholder={t('reminders.form.labelPlaceholder')}
          className={cn('input', errors.label && 'input-error')}
          aria-invalid={!!errors.label}
          {...register('label')}
        />
        {errors.label?.message && <p className="form-error">{t(errors.label.message)}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="reminder-due" className="form-label">{t('reminders.form.dueDate')}</label>
          <input
            id="reminder-due"
            type="date"
            className={cn('input', errors.dueDate && 'input-error')}
            aria-invalid={!!errors.dueDate}
            {...register('dueDate')}
          />
          {errors.dueDate?.message && <p className="form-error">{t(errors.dueDate.message)}</p>}
        </div>
        <div>
          <label htmlFor="reminder-interval" className="form-label">{t('reminders.form.intervalMonths')}</label>
          <input
            id="reminder-interval"
            type="number"
            inputMode="numeric"
            min={1}
            max={240}
            className={cn('input font-mono tabular-nums', errors.intervalMonths && 'input-error')}
            aria-invalid={!!errors.intervalMonths}
            {...register('intervalMonths')}
          />
          {errors.intervalMonths?.message ? (
            <p className="form-error">{t(errors.intervalMonths.message)}</p>
          ) : (
            <p className="form-helper">{intervalHint}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="reminder-last-done" className="form-label">{t('reminders.form.lastDoneOn')}</label>
        <input id="reminder-last-done" type="date" className="input" {...register('lastDoneOn')} />
      </div>

      <div>
        <label htmlFor="reminder-notes" className="form-label">{t('reminders.form.notes')}</label>
        <textarea id="reminder-notes" rows={2} maxLength={1000} className="input" {...register('notes')} />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">{t('common:cancel')}</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">{t('reminders.form.save')}</button>
      </div>
    </form>
  );
}

function MarkDoneForm({
  aircraftId,
  reminder,
  onClose,
}: {
  aircraftId: string;
  reminder: AircraftReminder;
  onClose: () => void;
}) {
  const { t } = useTranslation('aircraft');
  const complete = useCompleteAircraftReminder();
  const [doneOn, setDoneOn] = useState(todayUtc());
  const [apiError, setApiError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    try {
      await complete.mutateAsync({ aircraftId, reminderId: reminder.id, doneOn: doneOn || undefined });
      onClose();
    } catch (err) {
      setApiError(extractApiError(err, t('reminders.saveError')));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {apiError && (
        <div role="alert" className="rounded-md p-3 text-sm bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {apiError}
        </div>
      )}
      <div>
        <label htmlFor="reminder-done-on" className="form-label">{t('reminders.doneOn')}</label>
        <input
          id="reminder-done-on"
          type="date"
          className="input"
          value={doneOn}
          onChange={(e) => setDoneOn(e.target.value)}
        />
        <p className="form-helper">
          {reminder.intervalMonths
            ? t('reminders.markDoneRolls', { count: reminder.intervalMonths })
            : t('reminders.markDoneNoInterval')}
        </p>
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">{t('common:cancel')}</button>
        <button type="submit" disabled={complete.isPending} className="btn-primary">
          <Check className="w-4 h-4" aria-hidden="true" />
          {t('reminders.markDone')}
        </button>
      </div>
    </form>
  );
}
