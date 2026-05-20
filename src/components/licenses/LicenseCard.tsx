import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { License } from '../../stores/licenseStore';
import { isPast, differenceInDays } from 'date-fns';
import { useClassRatings, useCreateClassRating, useDeleteClassRating, useUpdateClassRating } from '../../hooks/useClassRatings';
import { extractApiError } from '../../lib/errors';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';

const CLASS_TYPE_OPTIONS = [
  'SEP_LAND', 'SEP_SEA', 'MEP_LAND', 'MEP_SEA',
  'SET_LAND', 'SET_SEA', 'TMG', 'IR', 'OTHER',
] as const;

function ExpiryBadge({ expiryDate }: { expiryDate?: string | null }) {
  const { t } = useTranslation('licenses');
  const { fmtDate } = useFormatPrefs();
  if (!expiryDate) {
    return <span className="text-xs text-slate-400">{t('card.noExpiry')}</span>;
  }
  const expiry = new Date(expiryDate);
  const expired = isPast(expiry);
  const daysLeft = differenceInDays(expiry, new Date());
  const formatted = fmtDate(expiryDate);

  if (expired) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="font-medium text-red-600 dark:text-red-400">{formatted}</span>
        <span className="badge-expired text-[10px]">{t('card.expired')}</span>
      </span>
    );
  }
  if (daysLeft <= 30) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="font-medium text-amber-600 dark:text-amber-400">{formatted}</span>
        <span className="badge-expiring text-[10px]">{t('card.expiresInDays', { days: daysLeft })}</span>
      </span>
    );
  }
  return <span className="text-xs font-medium text-green-600 dark:text-green-400">{formatted}</span>;
}

interface LicenseCardProps {
  license: License;
  onEdit: () => void;
  onDelete: () => void;
}

export default function LicenseCard({ license, onEdit, onDelete }: LicenseCardProps) {
  const { t } = useTranslation('licenses');
  const { fmtDate } = useFormatPrefs();
  const { data: classRatings, isLoading: ratingsLoading } = useClassRatings(license.id);
  const createRating = useCreateClassRating();
  const deleteRating = useDeleteClassRating();
  const updateRating = useUpdateClassRating();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null);
  const [newClassType, setNewClassType] = useState<string>(CLASS_TYPE_OPTIONS[0]);
  const [newIssueDate, setNewIssueDate] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [ratingError, setRatingError] = useState<string | null>(null);

  const handleAddRating = async () => {
    if (!newClassType || !newIssueDate) return;
    try {
      await createRating.mutateAsync({
        licenseId: license.id,
        data: {
          classType: newClassType as any,
          issueDate: newIssueDate,
          expiryDate: newExpiryDate || null,
        },
      });
      setShowAddForm(false);
      setNewClassType(CLASS_TYPE_OPTIONS[0]);
      setNewIssueDate('');
      setNewExpiryDate('');
    } catch (err) {
      setRatingError(extractApiError(err, t('card.failedToAdd')));
    }
  };

  const handleDeleteRating = async (ratingId: string) => {
    try {
      setRatingError(null);
      await deleteRating.mutateAsync({ licenseId: license.id, ratingId });
    } catch (err) {
      setRatingError(extractApiError(err, t('card.failedToDelete')));
    }
  };

  const startEditRating = (rating: { id: string; issueDate: string; expiryDate?: string | null }) => {
    setEditingRatingId(rating.id);
    setNewIssueDate(rating.issueDate?.split('T')[0] || '');
    setNewExpiryDate(rating.expiryDate?.split('T')[0] || '');
  };

  const handleUpdateRating = async () => {
    if (!editingRatingId || !newIssueDate) return;
    try {
      await updateRating.mutateAsync({
        licenseId: license.id,
        ratingId: editingRatingId,
        data: {
          issueDate: newIssueDate,
          expiryDate: newExpiryDate || null,
        },
      });
      setEditingRatingId(null);
      setNewIssueDate('');
      setNewExpiryDate('');
    } catch (err) {
      setRatingError(extractApiError(err, t('card.failedToUpdate')));
    }
  };

  return (
    <div className="card transition-shadow hover:shadow-md">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
        {/* Identity */}
        <div className="lg:w-72 lg:shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="badge-info font-semibold">{license.licenseType}</span>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {license.regulatoryAuthority} {license.licenseType}
            </h3>
          </div>
          <p className="data-sm text-slate-500 dark:text-slate-400 mt-1 font-mono text-xs">
            {license.licenseNumber}
          </p>
          {license.requiresSeparateLogbook && (
            <div className="mt-2">
              <span className="badge-info text-[10px]">YES</span>
              <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">
                {t('card.separateLogbook')}
              </span>
            </div>
          )}
        </div>

        {/* Details + Class Ratings */}
        <div className="flex-1 min-w-0 space-y-4">
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('card.regulatoryAuthority')}
              </dt>
              <dd className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">
                {license.regulatoryAuthority}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('card.issuingAuthority')}
              </dt>
              <dd className="mt-0.5 font-medium text-slate-700 dark:text-slate-200 break-words">
                {license.issuingAuthority}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('card.issued')}
              </dt>
              <dd className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">
                {fmtDate(license.issueDate)}
              </dd>
            </div>
          </dl>

          {/* Class Ratings */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            {ratingError && (
              <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-3 py-2 rounded-lg text-xs mb-2">
                {ratingError}
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('classRatings')}
              </h4>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t('card.addRating')}
                </button>
              )}
            </div>

            {ratingsLoading ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">{t('common:loading')}</p>
            ) : classRatings && classRatings.length > 0 ? (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Header row (desktop only) */}
                <li className="hidden sm:grid grid-cols-[1.2fr_1fr_1.4fr_5rem] gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <span>{t('classRatingFields.classType')}</span>
                  <span>{t('card.issued')}</span>
                  <span>{t('classRatingFields.expiryDate')}</span>
                  <span className="sr-only">{t('common:actions', { defaultValue: 'Actions' })}</span>
                </li>
                {classRatings.map((rating) => (
                  <li key={rating.id}>
                    {editingRatingId === rating.id ? (
                      <div className="space-y-2 p-3 bg-blue-50/50 dark:bg-blue-900/20">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {t(`classTypeLabels.${rating.classType}`, { defaultValue: rating.classType })}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400">{t('fields.issueDate')}</label>
                            <input type="date" value={newIssueDate} onChange={(e) => setNewIssueDate(e.target.value)} className="input input-sm mt-0.5" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400">{t('classRatingFields.expiryDate')}</label>
                            <input type="date" value={newExpiryDate} onChange={(e) => setNewExpiryDate(e.target.value)} className="input input-sm mt-0.5" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleUpdateRating} disabled={!newIssueDate || updateRating.isPending} className="btn-primary btn-sm text-xs">
                            {updateRating.isPending ? t('common:saving') : t('common:save')}
                          </button>
                          <button onClick={() => setEditingRatingId(null)} className="btn-secondary btn-sm text-xs">{t('common:cancel')}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-[1.2fr_1fr_1.4fr_5rem] gap-x-3 gap-y-1 px-3 py-2 items-center text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <span className="font-medium text-slate-700 dark:text-slate-200 col-span-2 sm:col-span-1">
                          {t(`classTypeLabels.${rating.classType}`, { defaultValue: rating.classType })}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">
                          <span className="sm:hidden text-xs text-slate-400 mr-1">{t('card.issued')}:</span>
                          {fmtDate(rating.issueDate)}
                        </span>
                        <span>
                          <span className="sm:hidden text-xs text-slate-400 mr-1">{t('classRatingFields.expiryDate')}:</span>
                          <ExpiryBadge expiryDate={rating.expiryDate} />
                        </span>
                        <div className="flex items-center gap-1 justify-end col-span-2 sm:col-span-1">
                          <button
                            onClick={() => startEditRating(rating)}
                            className="min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-xs"
                            title={t('card.editRating')}
                            aria-label={t('card.editRating')}
                          >
                            ✏
                          </button>
                          <button
                            onClick={() => handleDeleteRating(rating.id)}
                            className="min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors text-xs font-bold leading-none"
                            title={t('card.removeRating')}
                            aria-label={t('card.removeRating')}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">{t('card.noClassRatings')}</p>
            )}

            {/* Add Rating */}
            {showAddForm && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-md border border-slate-200 dark:border-slate-600 p-3 bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">{t('card.classType')}</label>
                  <select
                    value={newClassType}
                    onChange={(e) => setNewClassType(e.target.value)}
                    className="input input-sm mt-0.5"
                  >
                    {CLASS_TYPE_OPTIONS.map((ct) => (
                      <option key={ct} value={ct}>{t(`classTypeLabels.${ct}`, { defaultValue: ct })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">{t('fields.issueDate')}</label>
                  <input
                    type="date"
                    value={newIssueDate}
                    onChange={(e) => setNewIssueDate(e.target.value)}
                    className="input input-sm mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">{t('card.expiryDateOptional')}</label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="input input-sm mt-0.5"
                  />
                </div>
                <div className="sm:col-span-3 flex gap-2 pt-1">
                  <button
                    onClick={handleAddRating}
                    disabled={!newIssueDate || createRating.isPending}
                    className="btn-primary btn-sm"
                  >
                    {createRating.isPending ? t('common:saving') : t('common:save')}
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="btn-secondary btn-sm"
                  >
                    {t('common:cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex lg:flex-col gap-2 lg:w-28 lg:shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-700">
          <button onClick={onEdit} className="btn-secondary btn-sm flex-1">
            {t('common:edit')}
          </button>
          <button
            onClick={onDelete}
            className="btn-secondary btn-sm flex-1 hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            {t('common:delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
