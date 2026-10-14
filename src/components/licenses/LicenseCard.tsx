import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { License } from '../../stores/licenseStore';
import { useClassRatings, useCreateClassRating, useDeleteClassRating, useUpdateClassRating } from '../../hooks/useClassRatings';
import { extractApiError } from '../../lib/errors';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { DocumentFileStrip } from '../documents/DocumentFileStrip';
import { isGermanULAuthority, UL_RATING_KINDS, type ULRatingKind } from '../../lib/ultralight';
import { ULAuthorityHint } from './ULAuthorityHint';
import { ClassOptions, FoldDrawer, Folded, useClassGroups } from '../relevance';
import { useRelevance } from '../../lib/relevance';
import { useLicencePrivileges } from '../../hooks/useLicencePrivileges';
import type { LicencePrivilegeKind } from '../../lib/privileges';
import { ExpiryBadge } from './ExpiryBadge';
import { LicencePrivileges } from './LicencePrivileges';

const CLASS_TYPE_OPTIONS = [
  'SEP_LAND', 'SEP_SEA', 'MEP_LAND', 'MEP_SEA',
  'SET_LAND', 'SET_SEA', 'TMG', 'GLIDER', 'ULTRALIGHT', 'GYROPLANE', 'IR', 'OTHER',
] as const;

function ULKindSelect({ value, onChange }: { value: ULRatingKind | ''; onChange: (k: ULRatingKind | '') => void }) {
  const { t } = useTranslation('licenses');
  return (
    <div>
      <label htmlFor="rating-ul-kind" className="text-xs text-slate-500 dark:text-slate-400">{t('card.ulKind')}</label>
      <select
        id="rating-ul-kind"
        value={value}
        onChange={(e) => onChange(e.target.value as ULRatingKind | '')}
        className="input input-sm mt-0.5"
        required
        aria-invalid={value === ''}
      >
        <option value="" disabled>{t('card.ulKindPlaceholder')}</option>
        {UL_RATING_KINDS.map((k) => (
          <option key={k} value={k}>{t(`common:ulKinds.${k}`)}</option>
        ))}
      </select>
    </div>
  );
}

interface LicenseCardProps {
  license: License;
  onEdit: () => void;
  onDelete: () => void;
  /** Class rating to open in edit mode once ratings load. */
  editRatingId?: string | null;
  /** Opens the privilege form with this kind preselected. */
  addPrivilegeKind?: LicencePrivilegeKind | null;
}

export default function LicenseCard({ license, onEdit, onDelete, editRatingId, addPrivilegeKind }: LicenseCardProps) {
  const { t } = useTranslation('licenses');
  const privilegesQuery = useLicencePrivileges(license.id);
  const privilegeRecord = useMemo(
    () => ({ privileges: privilegesQuery.data?.length ?? 0 }),
    [privilegesQuery.data?.length],
  );
  const privilegesRelevance = useRelevance('license.privileges', { record: privilegeRecord });
  const { fmtDate } = useFormatPrefs();
  const { data: classRatings, isLoading: ratingsLoading } = useClassRatings(license.id);
  const createRating = useCreateClassRating();
  const deleteRating = useDeleteClassRating();
  const updateRating = useUpdateClassRating();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null);
  const [pickedClassType, setNewClassType] = useState<string>('');
  const classOptions = CLASS_TYPE_OPTIONS.map((ct) => ({
    value: ct,
    label: t(`classTypeLabels.${ct}`, { defaultValue: ct }),
  }));
  const { primary: relevantClasses } = useClassGroups(classOptions);
  const newClassType = pickedClassType || relevantClasses[0]?.value || CLASS_TYPE_OPTIONS[0];
  const [newIssueDate, setNewIssueDate] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newULKind, setNewULKind] = useState<ULRatingKind | ''>('');
  const [ratingError, setRatingError] = useState<string | null>(null);

  const handleAddRating = async () => {
    if (!newClassType || !newIssueDate || (newClassType === 'ULTRALIGHT' && !newULKind)) return;
    try {
      await createRating.mutateAsync({
        licenseId: license.id,
        data: {
          classType: newClassType as any,
          ulKind: newClassType === 'ULTRALIGHT' && newULKind ? newULKind : null,
          issueDate: newIssueDate,
          expiryDate: newExpiryDate || null,
        },
      });
      setShowAddForm(false);
      setNewClassType('');
      setNewULKind('');
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

  const startEditRating = (rating: { id: string; issueDate: string; expiryDate?: string | null; ulKind?: ULRatingKind | null }) => {
    setEditingRatingId(rating.id);
    setNewULKind(rating.ulKind ?? '');
    setNewIssueDate(rating.issueDate?.split('T')[0] || '');
    setNewExpiryDate(rating.expiryDate?.split('T')[0] || '');
  };

  const editingRating = classRatings?.find((r) => r.id === editingRatingId);

  // Opens the rating named by editRatingId once.
  const cardRef = useRef<HTMLDivElement>(null);
  const [openedRatingId, setOpenedRatingId] = useState<string | null>(null);
  if (editRatingId && openedRatingId !== editRatingId) {
    const target = classRatings?.find((r) => r.id === editRatingId);
    if (target) {
      setOpenedRatingId(editRatingId);
      startEditRating(target);
    }
  }
  useEffect(() => {
    if (openedRatingId) cardRef.current?.scrollIntoView?.({ block: 'center' });
  }, [openedRatingId]);
  useEffect(() => {
    if (addPrivilegeKind) cardRef.current?.scrollIntoView?.({ block: 'center' });
  }, [addPrivilegeKind]);

  const handleUpdateRating = async () => {
    if (!editingRatingId || !newIssueDate || (editingRating?.classType === 'ULTRALIGHT' && !newULKind)) return;
    try {
      await updateRating.mutateAsync({
        licenseId: license.id,
        ratingId: editingRatingId,
        data: {
          issueDate: newIssueDate,
          expiryDate: newExpiryDate || null,
          ...(editingRating?.classType === 'ULTRALIGHT' && newULKind ? { ulKind: newULKind } : {}),
        },
      });
      setEditingRatingId(null);
      setNewIssueDate('');
      setNewExpiryDate('');
    } catch (err) {
      setRatingError(extractApiError(err, t('card.failedToUpdate')));
    }
  };

  const privilegesSection = (
    <LicencePrivileges
      licenseId={license.id}
      privileges={privilegesQuery.data}
      isLoading={privilegesQuery.isLoading}
      isError={privilegesQuery.isError}
      initialAddKind={addPrivilegeKind}
    />
  );

  return (
    <div ref={cardRef} className="card transition-shadow hover:shadow-md">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
        {/* Identity */}
        <div className="lg:w-52 lg:shrink-0">
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
              <span className="badge-neutral">
                <BookOpen className="w-3 h-3 mr-1" aria-hidden="true" />
                {t('card.separateLogbook')}
              </span>
            </div>
          )}
          <DocumentFileStrip subject="license" subjectId={license.id} />
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
                <button onClick={() => setShowAddForm(true)} className="btn-ghost btn-sm text-xs">
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('card.addRating')}
                </button>
              )}
            </div>

            {ratingsLoading ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('common:loading')}</p>
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
                          {rating.classType === 'ULTRALIGHT' && (
                            <div className="sm:col-span-2">
                              <ULKindSelect value={newULKind} onChange={setNewULKind} />
                            </div>
                          )}
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
                          <button onClick={handleUpdateRating} disabled={!newIssueDate || (editingRating?.classType === 'ULTRALIGHT' && !newULKind) || updateRating.isPending} className="btn-primary btn-sm text-xs">
                            {updateRating.isPending ? t('common:saving') : t('common:save')}
                          </button>
                          <button onClick={() => setEditingRatingId(null)} className="btn-secondary btn-sm text-xs">{t('common:cancel')}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-[1.2fr_1fr_1.4fr_5rem] gap-x-3 gap-y-1 px-3 py-2 items-center text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <span className="font-medium text-slate-700 dark:text-slate-200 col-span-2 sm:col-span-1">
                          {t(`classTypeLabels.${rating.classType}`, { defaultValue: rating.classType })}
                          {rating.classType === 'ULTRALIGHT' && (
                            <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                              {rating.ulKind ? t(`common:ulKinds.${rating.ulKind}`) : t('card.ulKindNotSet')}
                            </span>
                          )}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">
                          <span className="sm:hidden text-xs text-slate-500 dark:text-slate-400 mr-1">{t('card.issued')}:</span>
                          {fmtDate(rating.issueDate)}
                        </span>
                        <span>
                          <span className="sm:hidden text-xs text-slate-500 dark:text-slate-400 mr-1">{t('classRatingFields.expiryDate')}:</span>
                          <ExpiryBadge expiryDate={rating.expiryDate} />
                        </span>
                        <div className="flex items-center gap-1 justify-end col-span-2 sm:col-span-1">
                          <button
                            onClick={() => startEditRating(rating)}
                            className="btn-ghost btn-sm min-w-[44px] min-h-[44px] px-0 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
                            title={t('card.editRating')}
                            aria-label={t('card.editRating')}
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => handleDeleteRating(rating.id)}
                            className="btn-ghost btn-sm min-w-[44px] min-h-[44px] px-0 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                            title={t('card.removeRating')}
                            aria-label={t('card.removeRating')}
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
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 italic">{t('card.noClassRatings')}</p>
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
                    <ClassOptions options={classOptions} current={newClassType} />
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
                {newClassType === 'ULTRALIGHT' && (
                  <div className="sm:col-span-3">
                    <ULKindSelect value={newULKind} onChange={setNewULKind} />
                  </div>
                )}
                {newClassType === 'ULTRALIGHT' && !isGermanULAuthority(license.regulatoryAuthority) && (
                  <ULAuthorityHint className="sm:col-span-3" />
                )}
                <div className="sm:col-span-3 flex gap-2 pt-1">
                  <button
                    onClick={handleAddRating}
                    disabled={!newIssueDate || (newClassType === 'ULTRALIGHT' && !newULKind) || createRating.isPending}
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

          {/* Privileges */}
          {privilegesRelevance.visible || addPrivilegeKind ? (
            privilegesSection
          ) : (
            <FoldDrawer label={() => t('privileges.folded')} className="mt-0">
              <Folded reason={privilegesRelevance.reason}>{privilegesSection}</Folded>
            </FoldDrawer>
          )}
        </div>

        {/* Actions */}
        <div className="flex lg:flex-col gap-2 lg:w-28 lg:shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-700">
          <button onClick={onEdit} className="btn-ghost btn-sm flex-1 lg:w-full lg:flex-none">
            {t('common:edit')}
          </button>
          <button
            onClick={onDelete}
            className="btn-ghost btn-sm flex-1 lg:w-full lg:flex-none text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            {t('common:delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
