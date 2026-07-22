import { Clock, Filter, Target, Plus, Trash2, ChevronUp, ChevronDown, Info } from 'lucide-react';
import type { CustomRuleInput, CurrencyFilter, CurrencyRequirementDef, FilterOp, WindowUnit } from '../../types/customCurrency';
import {
  METRIC_OPTIONS, FILTER_FIELD_OPTIONS, CLASS_TYPE_OPTIONS, LAUNCH_METHOD_OPTIONS,
} from '../../types/customCurrency';

/**
 * Visual, no-code editor for a custom currency rule. It renders the rule as a
 * stack of blocks (metadata, timeframe, filters, requirements) and emits an
 * updated CustomRuleInput on every change. It is a controlled component: the
 * parent owns the draft and decides how to persist it.
 */

const WINDOW_UNITS: WindowUnit[] = ['days', 'weeks', 'months', 'years'];

function fieldMeta(field: string) {
  return FILTER_FIELD_OPTIONS.find((f) => f.value === field) ?? FILTER_FIELD_OPTIONS[0];
}

function metricMeta(metric: string) {
  return METRIC_OPTIONS.find((m) => m.value === metric);
}

/** Move an item within an array immutably. */
function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

interface BlockProps {
  icon: React.ReactNode;
  title: string;
  accent: string;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}

function Block({ icon, title, accent, children, onAdd, addLabel }: BlockProps) {
  return (
    <div className={`rounded-xl border ${accent} p-3 space-y-3`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wide font-semibold inline-flex items-center gap-1.5">
          {icon} {title}
        </h3>
        {onAdd && (
          <button type="button" onClick={onAdd} className="btn-ghost text-xs inline-flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> {addLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/** Row controls: move up/down and delete. */
function RowControls({ onUp, onDown, onRemove }: { onUp: () => void; onDown: () => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button type="button" onClick={onUp} className="btn-ghost p-1" aria-label="Move up"><ChevronUp className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={onDown} className="btn-ghost p-1" aria-label="Move down"><ChevronDown className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={onRemove} className="btn-ghost p-1 text-red-600" aria-label="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  );
}

interface Props {
  value: CustomRuleInput;
  onChange: (next: CustomRuleInput) => void;
}

export function CustomCurrencyBlockEditor({ value, onChange }: Props) {
  const def = value.definition;

  const patch = (partial: Partial<CustomRuleInput>) => onChange({ ...value, ...partial });
  const patchDef = (partial: Partial<CustomRuleInput['definition']>) =>
    onChange({ ...value, definition: { ...def, ...partial } });

  // --- Filters ---
  const filters = def.filters ?? [];
  const setFilters = (next: CurrencyFilter[]) => patchDef({ filters: next });
  const addFilter = () => setFilters([...filters, { field: 'aircraft_class', op: 'eq', value: '' }]);
  const updateFilter = (i: number, next: CurrencyFilter) => setFilters(filters.map((f, idx) => (idx === i ? next : f)));
  const removeFilter = (i: number) => setFilters(filters.filter((_, idx) => idx !== i));

  const onFilterFieldChange = (i: number, field: string) => {
    const meta = fieldMeta(field);
    const op: FilterOp = meta.ops[0];
    const next: CurrencyFilter = { field, op };
    if (op === 'eq') next.value = '';
    updateFilter(i, next);
  };

  const onFilterOpChange = (i: number, op: FilterOp) => {
    const f = filters[i];
    const next: CurrencyFilter = { field: f.field, op };
    if (op === 'eq') next.value = f.value ?? (f.values?.[0] ?? '');
    if (op === 'in') next.values = f.values ?? (f.value ? [f.value] : []);
    updateFilter(i, next);
  };

  // --- Requirements ---
  const reqs = def.requirements ?? [];
  const setReqs = (next: CurrencyRequirementDef[]) => patchDef({ requirements: next });
  const addReq = () => setReqs([...reqs, { metric: 'landings', min: 1 }]);
  const updateReq = (i: number, next: CurrencyRequirementDef) => setReqs(reqs.map((r, idx) => (idx === i ? next : r)));
  const removeReq = (i: number) => setReqs(reqs.filter((_, idx) => idx !== i));

  const onReqMetricChange = (i: number, metric: string) => {
    const meta = metricMeta(metric);
    const next: CurrencyRequirementDef = { ...reqs[i], metric };
    if (!meta?.time) delete next.unit;
    else if (!next.unit) next.unit = 'hours';
    updateReq(i, next);
  };

  const valuePicker = (f: CurrencyFilter, i: number) => {
    // eq: dropdown for known enums, else free text.
    if (f.field === 'aircraft_class') {
      return (
        <select className="input text-sm flex-1" value={f.value ?? ''} onChange={(e) => updateFilter(i, { ...f, value: e.target.value })}>
          <option value="">Choose class…</option>
          {CLASS_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    if (f.field === 'launch_method') {
      return (
        <select className="input text-sm flex-1" value={f.value ?? ''} onChange={(e) => updateFilter(i, { ...f, value: e.target.value })}>
          <option value="">Choose method…</option>
          {LAUNCH_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    return (
      <input
        className="input text-sm flex-1"
        value={f.value ?? ''}
        placeholder={f.field === 'aircraft_type' ? 'e.g. C172' : f.field === 'aircraft_registration' ? 'e.g. D-EABC' : 'value'}
        onChange={(e) => updateFilter(i, { ...f, value: e.target.value })}
      />
    );
  };

  return (
    <div className="space-y-3" data-testid="block-editor">
      {/* Metadata */}
      <Block icon={<Info className="w-3.5 h-3.5 text-slate-500" />} title="About this rule" accent="border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/40">
        <div className="flex gap-2">
          <input
            className="input text-sm w-16 text-center"
            value={value.emoji ?? ''}
            placeholder="🙂"
            aria-label="Emoji"
            onChange={(e) => patch({ emoji: e.target.value || null })}
          />
          <input
            className="input text-sm flex-1"
            value={value.name}
            placeholder="Rule name"
            aria-label="Rule name"
            data-testid="block-name"
            onChange={(e) => patch({ name: e.target.value })}
          />
        </div>
        <textarea
          className="input text-sm w-full"
          rows={2}
          value={value.description ?? ''}
          placeholder="What is this rule for? (optional)"
          aria-label="Description"
          onChange={(e) => patch({ description: e.target.value || null })}
        />
      </Block>

      {/* Timeframe */}
      <Block icon={<Clock className="w-3.5 h-3.5 text-sky-500" />} title="Timeframe" accent="border-sky-200 bg-sky-50/60 dark:border-sky-800/50 dark:bg-sky-900/15">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-600 dark:text-slate-300">Look back over the last</span>
          <input
            type="number"
            min={1}
            className="input text-sm w-20"
            value={def.window?.amount ?? 0}
            aria-label="Window amount"
            data-testid="block-window-amount"
            onChange={(e) => patchDef({ window: { ...def.window, amount: Number(e.target.value) } })}
          />
          <select
            className="input text-sm w-32"
            value={def.window?.unit ?? 'days'}
            aria-label="Window unit"
            onChange={(e) => patchDef({ window: { ...def.window, unit: e.target.value as WindowUnit } })}
          >
            {WINDOW_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </Block>

      {/* Filters */}
      <Block icon={<Filter className="w-3.5 h-3.5 text-violet-500" />} title="Only these flights" accent="border-violet-200 bg-violet-50/60 dark:border-violet-800/50 dark:bg-violet-900/15" onAdd={addFilter} addLabel="Add filter">
        {filters.length === 0 && <p className="text-xs text-slate-400">No filters — every flight counts. Add one to narrow it down.</p>}
        <div className="space-y-2">
          {filters.map((f, i) => {
            const meta = fieldMeta(f.field);
            return (
              <div key={i} className="flex items-start gap-2" data-testid={`filter-row-${i}`}>
                <div className="flex-1 flex flex-wrap items-center gap-2">
                  <select className="input text-sm" value={f.field} onChange={(e) => onFilterFieldChange(i, e.target.value)} aria-label="Filter field">
                    {FILTER_FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {meta.ops.length > 1 && (
                    <select className="input text-sm w-20" value={f.op} onChange={(e) => onFilterOpChange(i, e.target.value as FilterOp)} aria-label="Filter operator">
                      <option value="eq">is</option>
                      <option value="in">is any of</option>
                    </select>
                  )}
                  {f.op === 'eq' && valuePicker(f, i)}
                  {f.op === 'in' && (
                    <input
                      className="input text-sm flex-1"
                      value={(f.values ?? []).join(', ')}
                      placeholder="comma-separated, e.g. C172, PA28"
                      onChange={(e) => updateFilter(i, { ...f, values: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })}
                    />
                  )}
                  {f.op === 'is_true' && <span className="text-sm text-slate-500 dark:text-slate-400">is true</span>}
                </div>
                <RowControls onUp={() => setFilters(move(filters, i, i - 1))} onDown={() => setFilters(move(filters, i, i + 1))} onRemove={() => removeFilter(i)} />
              </div>
            );
          })}
        </div>
      </Block>

      {/* Requirements */}
      <Block icon={<Target className="w-3.5 h-3.5 text-emerald-500" />} title="You need" accent="border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-900/15" onAdd={addReq} addLabel="Add requirement">
        {reqs.length === 0 && <p className="text-xs text-amber-600">Add at least one requirement.</p>}
        <div className="space-y-2">
          {reqs.map((r, i) => {
            const meta = metricMeta(r.metric);
            return (
              <div key={i} className="flex items-start gap-2" data-testid={`requirement-row-${i}`}>
                <div className="flex-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-300">at least</span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className="input text-sm w-20"
                    value={r.min}
                    aria-label="Minimum"
                    data-testid={`requirement-min-${i}`}
                    onChange={(e) => updateReq(i, { ...r, min: Number(e.target.value) })}
                  />
                  <select className="input text-sm" value={r.metric} onChange={(e) => onReqMetricChange(i, e.target.value)} aria-label="Metric">
                    {METRIC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {meta?.time && (
                    <select className="input text-sm w-24" value={r.unit ?? 'hours'} onChange={(e) => updateReq(i, { ...r, unit: e.target.value as 'hours' | 'minutes' })} aria-label="Unit">
                      <option value="hours">hours</option>
                      <option value="minutes">minutes</option>
                    </select>
                  )}
                </div>
                <RowControls onUp={() => setReqs(move(reqs, i, i - 1))} onDown={() => setReqs(move(reqs, i, i + 1))} onRemove={() => removeReq(i)} />
              </div>
            );
          })}
        </div>
      </Block>
    </div>
  );
}
