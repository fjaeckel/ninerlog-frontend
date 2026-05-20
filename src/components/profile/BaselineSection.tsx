import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useDeleteBaseline,
  useMyBaseline,
  useUpsertBaseline,
  type FlightBaseline,
  type FlightBaselineInput,
} from '../../hooks/useBaseline';

// Shape used by the form. We track minutes as user-friendly hour strings (e.g.
// "74", "74.5") and convert to integer minutes on submit. Landings are kept
// as strings so the input can be cleared while typing.
type FormState = {
  baselineDate: string;
  totalFlights: string;
  totalHours: string;
  picHours: string;
  sicHours: string;
  dualHours: string;
  dualGivenHours: string;
  multiPilotHours: string;
  nightHours: string;
  ifrHours: string;
  soloHours: string;
  crossCountryHours: string;
  landingsDay: string;
  landingsNight: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  baselineDate: new Date().toISOString().slice(0, 10),
  totalFlights: '',
  totalHours: '',
  picHours: '',
  sicHours: '',
  dualHours: '',
  dualGivenHours: '',
  multiPilotHours: '',
  nightHours: '',
  ifrHours: '',
  soloHours: '',
  crossCountryHours: '',
  landingsDay: '',
  landingsNight: '',
  notes: '',
};

function minutesToHours(min: number | undefined): string {
  if (!min) return '';
  // Show one decimal when not an integer count of hours.
  const h = min / 60;
  return Number.isInteger(h) ? String(h) : h.toFixed(2).replace(/\.?0+$/, '');
}

function hoursToMinutes(value: string): number {
  if (!value.trim()) return 0;
  const n = Number(value.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 60);
}

function intOrZero(value: string): number {
  if (!value.trim()) return 0;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function baselineToForm(b: FlightBaseline): FormState {
  return {
    baselineDate: typeof b.baselineDate === 'string' ? b.baselineDate : EMPTY_FORM.baselineDate,
    totalFlights: b.totalFlights ? String(b.totalFlights) : '',
    totalHours: minutesToHours(b.totalMinutes),
    picHours: minutesToHours(b.picMinutes),
    sicHours: minutesToHours(b.sicMinutes),
    dualHours: minutesToHours(b.dualMinutes),
    dualGivenHours: minutesToHours(b.dualGivenMinutes),
    multiPilotHours: minutesToHours(b.multiPilotMinutes),
    nightHours: minutesToHours(b.nightMinutes),
    ifrHours: minutesToHours(b.ifrMinutes),
    soloHours: minutesToHours(b.soloMinutes),
    crossCountryHours: minutesToHours(b.crossCountryMinutes),
    landingsDay: b.landingsDay ? String(b.landingsDay) : '',
    landingsNight: b.landingsNight ? String(b.landingsNight) : '',
    notes: b.notes ?? '',
  };
}

function formToInput(form: FormState): FlightBaselineInput {
  return {
    baselineDate: form.baselineDate,
    totalFlights: intOrZero(form.totalFlights),
    totalMinutes: hoursToMinutes(form.totalHours),
    picMinutes: hoursToMinutes(form.picHours),
    sicMinutes: hoursToMinutes(form.sicHours),
    dualMinutes: hoursToMinutes(form.dualHours),
    dualGivenMinutes: hoursToMinutes(form.dualGivenHours),
    multiPilotMinutes: hoursToMinutes(form.multiPilotHours),
    nightMinutes: hoursToMinutes(form.nightHours),
    ifrMinutes: hoursToMinutes(form.ifrHours),
    soloMinutes: hoursToMinutes(form.soloHours),
    crossCountryMinutes: hoursToMinutes(form.crossCountryHours),
    landingsDay: intOrZero(form.landingsDay),
    landingsNight: intOrZero(form.landingsNight),
    notes: form.notes.trim() ? form.notes.trim() : null,
  };
}

export function BaselineSection() {
  const { t } = useTranslation('settings');
  const { data: baseline, isLoading } = useMyBaseline();
  const upsert = useUpsertBaseline();
  const remove = useDeleteBaseline();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Sync form with server state when the snapshot changes.
  useEffect(() => {
    if (baseline) {
      setForm(baselineToForm(baseline));
    }
  }, [baseline]);

  const hasBaseline = Boolean(baseline);
  const headerSummary = useMemo(() => {
    if (!baseline) return null;
    const hours = ((baseline.totalMinutes ?? 0) / 60).toFixed(1);
    const pic = ((baseline.picMinutes ?? 0) / 60).toFixed(1);
    return t('baseline.summary', {
      hours,
      pic,
      landings: (baseline.landingsDay ?? 0) + (baseline.landingsNight ?? 0),
      date: baseline.baselineDate,
    });
  }, [baseline, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await upsert.mutateAsync(formToInput(form));
      setMessage({ kind: 'ok', text: t('baseline.saveSuccess') });
      setShowForm(false);
    } catch (err) {
      setMessage({
        kind: 'err',
        text: err instanceof Error ? err.message : t('baseline.saveFailed'),
      });
    }
  };

  const handleDelete = async () => {
    setMessage(null);
    try {
      await remove.mutateAsync();
      setForm(EMPTY_FORM);
      setShowForm(false);
      setShowDeleteConfirm(false);
      setMessage({ kind: 'ok', text: t('baseline.deleteSuccess') });
    } catch (err) {
      setMessage({
        kind: 'err',
        text: err instanceof Error ? err.message : t('baseline.deleteFailed'),
      });
    }
  };

  return (
    <div className="card" data-testid="baseline-section">
      <h2 className="section-title mb-2">{t('baseline.title')}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        {t('baseline.description')}
      </p>

      {isLoading ? (
        <p className="text-sm text-slate-500">{t('baseline.loading')}</p>
      ) : (
        <>
          {hasBaseline && !showForm && (
            <div className="space-y-3">
              <p className="text-sm text-slate-700 dark:text-slate-200">{headerSummary}</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(true)} className="btn-secondary">
                  {t('baseline.edit')}
                </button>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn-secondary text-red-700 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    {t('baseline.delete')}
                  </button>
                ) : null}
              </div>
              {showDeleteConfirm && (
                <div className="space-y-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-300">{t('baseline.deleteConfirm')}</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={remove.isPending}
                      className="btn-danger"
                    >
                      {remove.isPending ? t('common:deleting') : t('baseline.deleteButton')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="btn-secondary text-sm"
                    >
                      {t('common:cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!hasBaseline && !showForm && (
            <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
              {t('baseline.create')}
            </button>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t('baseline.fields.baselineDate')} required>
                  <input
                    type="date"
                    required
                    value={form.baselineDate}
                    onChange={(e) => setForm((s) => ({ ...s, baselineDate: e.target.value }))}
                    className="input"
                  />
                </Field>
                <Field label={t('baseline.fields.totalFlights')}>
                  <NumberInput value={form.totalFlights} onChange={(v) => setForm((s) => ({ ...s, totalFlights: v }))} integer />
                </Field>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <HoursField label={t('baseline.fields.totalHours')} value={form.totalHours} onChange={(v) => setForm((s) => ({ ...s, totalHours: v }))} />
                <HoursField label={t('baseline.fields.picHours')} value={form.picHours} onChange={(v) => setForm((s) => ({ ...s, picHours: v }))} />
                <HoursField label={t('baseline.fields.sicHours')} value={form.sicHours} onChange={(v) => setForm((s) => ({ ...s, sicHours: v }))} />
                <HoursField label={t('baseline.fields.dualHours')} value={form.dualHours} onChange={(v) => setForm((s) => ({ ...s, dualHours: v }))} />
                <HoursField label={t('baseline.fields.dualGivenHours')} value={form.dualGivenHours} onChange={(v) => setForm((s) => ({ ...s, dualGivenHours: v }))} />
                <HoursField label={t('baseline.fields.multiPilotHours')} value={form.multiPilotHours} onChange={(v) => setForm((s) => ({ ...s, multiPilotHours: v }))} />
                <HoursField label={t('baseline.fields.soloHours')} value={form.soloHours} onChange={(v) => setForm((s) => ({ ...s, soloHours: v }))} />
                <HoursField label={t('baseline.fields.crossCountryHours')} value={form.crossCountryHours} onChange={(v) => setForm((s) => ({ ...s, crossCountryHours: v }))} />
                <HoursField label={t('baseline.fields.nightHours')} value={form.nightHours} onChange={(v) => setForm((s) => ({ ...s, nightHours: v }))} />
                <HoursField label={t('baseline.fields.ifrHours')} value={form.ifrHours} onChange={(v) => setForm((s) => ({ ...s, ifrHours: v }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t('baseline.fields.landingsDay')}>
                  <NumberInput value={form.landingsDay} onChange={(v) => setForm((s) => ({ ...s, landingsDay: v }))} integer />
                </Field>
                <Field label={t('baseline.fields.landingsNight')}>
                  <NumberInput value={form.landingsNight} onChange={(v) => setForm((s) => ({ ...s, landingsNight: v }))} integer />
                </Field>
              </div>

              <Field label={t('baseline.fields.notes')}>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={form.notes}
                  onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                  className="input"
                  placeholder={t('baseline.fields.notesPlaceholder') ?? ''}
                />
              </Field>

              <div className="flex gap-3">
                <button type="submit" disabled={upsert.isPending} className="btn-primary">
                  {upsert.isPending ? t('common:saving') : t('baseline.save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setMessage(null);
                    if (baseline) setForm(baselineToForm(baseline));
                  }}
                  className="btn-secondary"
                >
                  {t('common:cancel')}
                </button>
              </div>
            </form>
          )}

          {message && (
            <p
              className={`text-sm mt-3 ${
                message.kind === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
              role="status"
            >
              {message.text}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="block mb-1 text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function HoursField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <NumberInput value={value} onChange={onChange} step="0.1" />
    </Field>
  );
}

function NumberInput({
  value,
  onChange,
  integer,
  step,
}: {
  value: string;
  onChange: (v: string) => void;
  integer?: boolean;
  step?: string;
}) {
  return (
    <input
      type="number"
      inputMode={integer ? 'numeric' : 'decimal'}
      min={0}
      step={integer ? 1 : step ?? '0.1'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input"
    />
  );
}
