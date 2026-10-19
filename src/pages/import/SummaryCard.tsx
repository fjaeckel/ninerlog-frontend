/** A single count tile in an import or restore summary. */
export function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const colorClass = color === 'green' ? 'text-green-600 dark:text-green-400' :
    color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
    color === 'red' ? 'text-red-600 dark:text-red-400' :
    'text-slate-800 dark:text-slate-100';
  return (
    <div className="card text-center py-3">
      <div className={`text-2xl font-bold font-mono tabular-nums ${colorClass}`}>{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
    </div>
  );
}
