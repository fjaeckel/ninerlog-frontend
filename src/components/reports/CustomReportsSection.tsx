import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { SlidersHorizontal } from 'lucide-react';
import {
  useCustomReports,
  useDeleteCustomReport,
  useReorderCustomReports,
} from '../../hooks/useCustomReports';
import type { CustomReport } from '../../lib/customReports';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState } from '../ui/EmptyState';
import { ReportSectionBlock } from './SectionNav';
import { CustomReportCard } from './CustomReportCard';
import { CustomReportDialog } from './CustomReportDialog';

export const CUSTOM_SECTION_ID = 'custom';

/** The Reports page's saved custom reports, in the user's order. */
export function CustomReportsSection() {
  const { t } = useTranslation('reports');
  const navigate = useNavigate();
  const { data: reports, isLoading, error } = useCustomReports();
  const reorder = useReorderCustomReports();
  const remove = useDeleteCustomReport();
  const [editing, setEditing] = useState<CustomReport | null>(null);
  const [deleting, setDeleting] = useState<CustomReport | null>(null);

  const move = (report: CustomReport, direction: -1 | 1) => {
    if (!reports) return;
    const ids = reports.map((r) => r.id);
    const from = ids.indexOf(report.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    reorder.mutate(ids);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      setDeleting(null);
    } catch {
      // Shown from the mutation's error state.
    }
  };

  return (
    <ReportSectionBlock id={CUSTOM_SECTION_ID} title={t('sections.custom')} description={t('sections.customHint')}>
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" aria-hidden="true" />
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {t('custom.listFailed')}
        </p>
      ) : !reports || reports.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title={t('custom.empty.title')}
          description={t('custom.empty.description')}
          action={{ label: t('custom.empty.action'), onClick: () => navigate('/flights'), variant: 'secondary' }}
          className="py-8"
        />
      ) : (
        <>
          {(reorder.error || remove.error) && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-3" role="alert">
              {(reorder.error ?? remove.error)?.message}
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {reports.map((report, i) => (
              <CustomReportCard
                key={report.id}
                report={report}
                isFirst={i === 0}
                isLast={i === reports.length - 1}
                onEdit={setEditing}
                onMove={move}
                onDelete={setDeleting}
              />
            ))}
          </div>
        </>
      )}

      <CustomReportDialog open={!!editing} onClose={() => setEditing(null)} report={editing ?? undefined} />

      <ConfirmDialog
        open={!!deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        title={t('custom.deleteTitle')}
        description={t('custom.deleteDescription', { name: deleting?.name ?? '' })}
        confirmLabel={t('custom.actions.delete')}
        variant="danger"
        isLoading={remove.isPending}
      />
    </ReportSectionBlock>
  );
}
