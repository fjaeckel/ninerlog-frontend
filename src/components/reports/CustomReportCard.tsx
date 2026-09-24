import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  ArrowDown,
  ArrowUp,
  FileSpreadsheet,
  FileText,
  List,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useCustomReportResult, useExportCustomReport } from '../../hooks/useCustomReports';
import { flightSearchParamsFor, type CustomReport } from '../../lib/customReports';
import { cn } from '../../lib/cn';
import { ReportCard } from './primitives';
import { CustomReportChart, OtherGroupsNote } from './CustomReportChart';
import {
  tableRowsOf,
  useCustomReportColumns,
  useCustomReportFormat,
  useLogbookLabel,
} from './customReportFormat';

interface CustomReportCardProps {
  report: CustomReport;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (report: CustomReport) => void;
  onMove: (report: CustomReport, direction: -1 | 1) => void;
  onDelete: (report: CustomReport) => void;
}

/** A saved custom report: chart/table of its result plus an actions menu. */
export function CustomReportCard({ report, isFirst, isLast, onEdit, onMove, onDelete }: CustomReportCardProps) {
  const { t } = useTranslation('reports');
  const navigate = useNavigate();
  const { data: result, isLoading, error } = useCustomReportResult(report.id);
  const exportReport = useExportCustomReport();
  const { summary } = useCustomReportFormat();
  const logbookLabel = useLogbookLabel();
  const columns = useCustomReportColumns(result);

  const showFlights = () => {
    const params = flightSearchParamsFor(
      report.definition,
      result ? { startDate: result.startDate, endDate: result.endDate } : undefined
    );
    const qs = params.toString();
    navigate(qs ? `/flights?${qs}` : '/flights');
  };

  const items: MenuItem[] = [
    {
      key: 'csv',
      label: t('custom.actions.exportCsv'),
      icon: <FileSpreadsheet className="w-4 h-4" />,
      onSelect: () => exportReport.mutate({ id: report.id, name: report.name, format: 'csv' }),
      disabled: exportReport.isPending,
    },
    {
      key: 'pdf',
      label: t('custom.actions.exportPdf'),
      icon: <FileText className="w-4 h-4" />,
      onSelect: () => exportReport.mutate({ id: report.id, name: report.name, format: 'pdf' }),
      disabled: exportReport.isPending,
    },
    { key: 'edit', label: t('custom.actions.edit'), icon: <Pencil className="w-4 h-4" />, onSelect: () => onEdit(report) },
    { key: 'flights', label: t('custom.actions.showFlights'), icon: <List className="w-4 h-4" />, onSelect: showFlights },
    {
      key: 'up',
      label: t('custom.actions.moveUp'),
      icon: <ArrowUp className="w-4 h-4" />,
      onSelect: () => onMove(report, -1),
      disabled: isFirst,
    },
    {
      key: 'down',
      label: t('custom.actions.moveDown'),
      icon: <ArrowDown className="w-4 h-4" />,
      onSelect: () => onMove(report, 1),
      disabled: isLast,
    },
    {
      key: 'delete',
      label: t('custom.actions.delete'),
      icon: <Trash2 className="w-4 h-4" />,
      onSelect: () => onDelete(report),
      danger: true,
    },
  ];

  return (
    <ReportCard
      title={report.name}
      hint={summary(report.definition, logbookLabel)}
      table={{ rows: tableRowsOf(result), columns }}
      action={<ActionsMenu label={t('custom.actions.menu', { name: report.name })} items={items} />}
    >
      <div data-testid={`custom-report-${report.id}`}>
        {isLoading ? (
          <div className="h-64 animate-pulse rounded-md bg-slate-100 dark:bg-slate-700/50" aria-hidden="true" />
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400 py-6 text-center" role="alert">
            {error.message || t('custom.resultFailed')}
          </p>
        ) : result ? (
          <>
            <CustomReportChart result={result} />
            <OtherGroupsNote count={result.otherGroups} />
          </>
        ) : null}
        {exportReport.error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-3" role="alert">
            {t('custom.exportFailed', { message: exportReport.error.message })}
          </p>
        )}
      </div>
    </ReportCard>
  );
}

interface MenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
}

/** Disclosure menu of card actions; closes on outside click, Escape or selection. */
function ActionsMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  useEffect(() => {
    if (open) rootRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])')?.focus();
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const enabled = Array.from(
      rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? []
    );
    if (enabled.length === 0) return;
    e.preventDefault();
    const idx = enabled.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown' ? (idx + 1) % enabled.length : (idx - 1 + enabled.length) % enabled.length;
    enabled[next].focus();
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={label}
        className="inline-flex items-center justify-center w-11 h-11 -my-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full z-30 mt-2 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 min-h-[44px] sm:min-h-[36px] text-left text-sm transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                item.danger
                  ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60'
              )}
            >
              <span aria-hidden="true" className="shrink-0">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
