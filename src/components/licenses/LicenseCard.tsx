import { useState } from 'react';
import { License } from '../../stores/licenseStore';
import { format, isPast, differenceInDays } from 'date-fns';
import { useClassRatings, useCreateClassRating, useDeleteClassRating, useUpdateClassRating } from '../../hooks/useClassRatings';

const CLASS_TYPE_OPTIONS = [
  'SEP_LAND', 'SEP_SEA', 'MEP_LAND', 'MEP_SEA',
  'SET_LAND', 'SET_SEA', 'TMG', 'IR', 'OTHER',
] as const;

const CLASS_TYPE_LABELS: Record<string, string> = {
  SEP_LAND: 'SEP (Land)',
  SEP_SEA: 'SEP (Sea)',
  MEP_LAND: 'MEP (Land)',
  MEP_SEA: 'MEP (Sea)',
  SET_LAND: 'SET (Land)',
  SET_SEA: 'SET (Sea)',
  TMG: 'TMG',
  IR: 'IR',
  OTHER: 'Other',
};

function ExpiryBadge({ expiryDate }: { expiryDate?: string | null }) {
  if (!expiryDate) {
    return <span className="text-xs text-slate-400">No expiry</span>;
  }
  const expiry = new Date(expiryDate);
  const expired = isPast(expiry);
  const daysLeft = differenceInDays(expiry, new Date());

  if (expired) {
    return <span className="text-xs font-medium text-red-600 dark:text-red-400">Expired</span>;
  }
  if (daysLeft <= 30) {
    return <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Expires in {daysLeft}d</span>;
  }
  return <span className="text-xs text-green-600 dark:text-green-400">{format(expiry, 'MMM dd, yyyy')}</span>;
}

interface LicenseCardProps {
  license: License;
  onEdit: () => void;
  onDelete: () => void;
}

export default function LicenseCard({ license, onEdit, onDelete }: LicenseCardProps) {
  const { data: classRatings, isLoading: ratingsLoading } = useClassRatings(license.id);
  const createRating = useCreateClassRating();
  const deleteRating = useDeleteClassRating();
  const updateRating = useUpdateClassRating();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null);
  const [newClassType, setNewClassType] = useState<string>(CLASS_TYPE_OPTIONS[0]);
  const [newIssueDate, setNewIssueDate] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');

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
      console.error('Failed to add class rating:', err);
    }
  };

  const handleDeleteRating = async (ratingId: string) => {
    try {
      await deleteRating.mutateAsync({ licenseId: license.id, ratingId });
    } catch (err) {
      console.error('Failed to delete class rating:', err);
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
      console.error('Failed to update class rating:', err);
    }
  };

  return (
    <div className="card transition-shadow hover:shadow-md">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <span className="badge-info font-semibold">{license.licenseType}</span>
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {license.regulatoryAuthority} {license.licenseType}
            </h3>
            <p className="data-sm text-slate-500 dark:text-slate-400">{license.licenseNumber}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Regulatory Authority</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">{license.regulatoryAuthority}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Issuing Authority</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">{license.issuingAuthority}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Issued</span>
          <span className="text-slate-700 dark:text-slate-300">{format(new Date(license.issueDate), 'MMM dd, yyyy')}</span>
        </div>
        {license.requiresSeparateLogbook && (
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Separate Logbook</span>
            <span className="badge-info text-[10px]">YES</span>
          </div>
        )}
      </div>

      {/* Class Ratings */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Class Ratings
        </h4>
        {ratingsLoading ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">Loading...</p>
        ) : classRatings && classRatings.length > 0 ? (
          <div className="space-y-1.5">
            {classRatings.map((rating) => (
              <div key={rating.id}>
                {editingRatingId === rating.id ? (
                  <div className="space-y-2 rounded-md border border-blue-200 dark:border-blue-700 p-2 bg-blue-50/50 dark:bg-blue-900/20">
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {CLASS_TYPE_LABELS[rating.classType] || rating.classType}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400">Issue Date</label>
                        <input type="date" value={newIssueDate} onChange={(e) => setNewIssueDate(e.target.value)} className="input input-sm mt-0.5" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400">Expiry Date</label>
                        <input type="date" value={newExpiryDate} onChange={(e) => setNewExpiryDate(e.target.value)} className="input input-sm mt-0.5" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleUpdateRating} disabled={!newIssueDate || updateRating.isPending} className="btn-primary btn-sm flex-1 text-xs">
                        {updateRating.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setEditingRatingId(null)} className="btn-secondary btn-sm flex-1 text-xs">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {CLASS_TYPE_LABELS[rating.classType] || rating.classType}
                    </span>
                    <div className="flex items-center gap-2">
                      <ExpiryBadge expiryDate={rating.expiryDate} />
                      <button
                        onClick={() => startEditRating(rating)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-xs"
                        title="Edit class rating"
                      >
                        ✏
                      </button>
                      <button
                        onClick={() => handleDeleteRating(rating.id)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors text-xs font-bold leading-none"
                        title="Remove class rating"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">No class ratings</p>
        )}

        {/* Add Rating */}
        {showAddForm ? (
          <div className="mt-3 space-y-2 rounded-md border border-slate-200 dark:border-slate-600 p-3 bg-slate-50 dark:bg-slate-800/50">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Class Type</label>
              <select
                value={newClassType}
                onChange={(e) => setNewClassType(e.target.value)}
                className="input input-sm mt-0.5"
              >
                {CLASS_TYPE_OPTIONS.map((ct) => (
                  <option key={ct} value={ct}>{CLASS_TYPE_LABELS[ct]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Issue Date</label>
              <input
                type="date"
                value={newIssueDate}
                onChange={(e) => setNewIssueDate(e.target.value)}
                className="input input-sm mt-0.5"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Expiry Date (optional)</label>
              <input
                type="date"
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
                className="input input-sm mt-0.5"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAddRating}
                disabled={!newIssueDate || createRating.isPending}
                className="btn-primary btn-sm flex-1"
              >
                {createRating.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="btn-secondary btn-sm flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline min-h-[44px] flex items-center"
          >
            + Add Rating
          </button>
        )}
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button onClick={onEdit} className="btn-secondary btn-sm flex-1">
          Edit
        </button>
        <button
          onClick={onDelete}
          className="btn-secondary btn-sm flex-1 hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
