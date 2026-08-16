import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Table2 } from 'lucide-react';
import { cn } from '../../lib/cn';

/** A column in a card's table-view twin. */
export interface TableColumn<T> {
  key: string;
  header: string;
  /** Right-aligned monospace by default; set to false for text columns. */
  numeric?: boolean;
  render: (row: T) => ReactNode;
}

interface ReportCardProps<T> {
  title: string;
  /** Short line under the title explaining what the reader is looking at. */
  hint?: string;
  children: ReactNode;
  className?: string;
  /**
   * Table-view twin. Every chart offers one so no value is reachable by
   * colour or hover alone.
   */
  table?: { rows: T[]; columns: TableColumn<T>[] };
  /** Rendered at the top-right, before the table toggle. */
  action?: ReactNode;
}

export function ReportCard<T>({ title, hint, children, className, table, action }: ReportCardProps<T>) {
  const { t } = useTranslation('reports');
  const [showTable, setShowTable] = useState(false);
  const panelId = useId();

  return (
    // min-w-0 stops the card, as a grid item, from being widened past the
    // viewport by long unwrappable labels (airport names, registrations) —
    // grid items default to min-width:auto, which is their min-content width.
    <section className={cn('card flex flex-col min-w-0', className)} aria-labelledby={`${panelId}-title`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 id={`${panelId}-title`} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h3>
          {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hint}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {action}
          {table && (
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              aria-pressed={showTable}
              aria-controls={panelId}
              title={showTable ? t('view.showChart') : t('view.showTable')}
              className="inline-flex items-center justify-center w-11 h-11 -my-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {showTable ? <BarChart3 className="w-4 h-4" /> : <Table2 className="w-4 h-4" />}
              <span className="sr-only">{showTable ? t('view.showChart') : t('view.showTable')}</span>
            </button>
          )}
        </div>
      </div>

      <div id={panelId} className="flex-1 min-w-0">
        {showTable && table ? <ReportTable rows={table.rows} columns={table.columns} /> : children}
      </div>
    </section>
  );
}

export function ReportTable<T>({ rows, columns }: { rows: T[]; columns: TableColumn<T>[] }) {
  const { t } = useTranslation('reports');
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">{t('noData')}</p>;
  }
  return (
    <div className="overflow-x-auto -mx-1 px-1 max-h-80 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white dark:bg-slate-800">
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'py-2 px-2 font-medium text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap',
                  col.numeric === false ? 'text-left' : 'text-right'
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'py-2 px-2 whitespace-nowrap',
                    col.numeric === false
                      ? 'text-left text-slate-700 dark:text-slate-300'
                      : 'text-right font-mono tabular-nums text-slate-600 dark:text-slate-400'
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A headline number. Proportional figures on purpose — tabular digits make a
 * large standalone value look loose.
 */
export function StatTile({
  label,
  value,
  detail,
  icon,
  accent = 'slate',
}: {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
  accent?: 'blue' | 'green' | 'amber' | 'violet' | 'slate';
}) {
  const halo: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };
  return (
    <div className="card hover-lift">
      <div className="flex items-center gap-2 mb-2">
        {icon && (
          <span
            className={cn('inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0', halo[accent])}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-none">{value}</p>
      {detail && <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 truncate">{detail}</p>}
    </div>
  );
}

/**
 * A single ratio against a total. The unfilled track is a lighter step of the
 * fill's own ramp so the state reads across the whole bar.
 */
export function Meter({
  label,
  value,
  total,
  formatted,
  color,
}: {
  label: string;
  value: number;
  total: number;
  formatted: string;
  color?: string;
}) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{label}</span>
        <span className="text-sm font-mono tabular-nums text-slate-800 dark:text-slate-100 shrink-0">
          {formatted}
          <span className="text-slate-400 dark:text-slate-500 ml-1.5 text-xs">{pct.toFixed(0)}%</span>
        </span>
      </div>
      <div
        className="h-1.5 rounded-full bg-blue-100 dark:bg-blue-500/20 overflow-hidden"
        role="meter"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

/**
 * Horizontal ranked bars — the workhorse for "compare magnitude" lists
 * (aircraft, airports, approach types). One hue for every bar: the length
 * already encodes the value, so hue stays free.
 */
export function RankedBars({
  rows,
  color,
  emptyLabel,
}: {
  rows: { key: string; label: string; subLabel?: string | null; value: number; formatted: string; meta?: string }[];
  color: string;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">{emptyLabel}</p>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-sm text-slate-700 dark:text-slate-200 truncate min-w-0">
              {row.label}
              {row.subLabel && (
                <span className="text-slate-400 dark:text-slate-500 ml-1.5 text-xs">{row.subLabel}</span>
              )}
            </span>
            <span className="text-sm font-mono tabular-nums text-slate-700 dark:text-slate-200 shrink-0">
              {row.formatted}
              {row.meta && <span className="text-slate-400 dark:text-slate-500 ml-1.5 text-xs">{row.meta}</span>}
            </span>
          </div>
          <div className="h-2 rounded-r-[4px] bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
            <div
              className="h-full rounded-r-[4px] transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max((row.value / max) * 100, row.value > 0 ? 2 : 0)}%`, backgroundColor: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Shown in place of a chart when the timeframe holds no qualifying data. */
export function NoData({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[8rem] text-sm text-slate-400 dark:text-slate-500">
      {label}
    </div>
  );
}
