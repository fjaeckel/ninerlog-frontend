import { ShieldCheck, ShieldX, Shield, Share2, Pencil, Trash2, CalendarClock, Pause, Play } from 'lucide-react';
import type { CurrencyRequirement, CurrencyStatus } from '../../types/api';
import type { CustomRuleWithStatus } from '../../types/customCurrency';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';

const STATUS_CONFIG: Record<CurrencyStatus, { bg: string; border: string; iconWrap: string; badge: string; label: string; Icon: typeof Shield }> = {
  current: {
    bg: 'bg-gradient-to-br from-green-50/70 via-white to-green-50/30 dark:from-green-900/15 dark:via-slate-800 dark:to-slate-800',
    border: 'border-l-4 border-l-green-500',
    iconWrap: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 ring-2 ring-green-500/15',
    badge: 'badge-current',
    label: 'CURRENT',
    Icon: ShieldCheck,
  },
  expiring: {
    bg: 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 dark:from-amber-900/15 dark:via-slate-800 dark:to-slate-800',
    border: 'border-l-4 border-l-amber-500',
    iconWrap: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ring-2 ring-amber-500/15',
    badge: 'badge-expiring',
    label: 'ATTENTION',
    Icon: ShieldCheck,
  },
  expired: {
    bg: 'bg-gradient-to-br from-red-50/70 via-white to-red-50/30 dark:from-red-900/15 dark:via-slate-800 dark:to-slate-800',
    border: 'border-l-4 border-l-red-500',
    iconWrap: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 ring-2 ring-red-500/15',
    badge: 'badge-expired',
    label: 'NOT CURRENT',
    Icon: ShieldX,
  },
  unknown: {
    bg: 'bg-white dark:bg-slate-800',
    border: 'border-l-4 border-l-slate-300 dark:border-l-slate-600',
    iconWrap: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
    badge: 'badge-neutral',
    label: 'UNKNOWN',
    Icon: Shield,
  },
};

function RequirementBar({ req }: { req: CurrencyRequirement }) {
  const { fmtDuration } = useFormatPrefs();
  const pct = req.required > 0 ? Math.min((req.current / req.required) * 100, 100) : 0;
  const barColor = req.met ? 'bg-green-500 dark:bg-green-400' : pct >= 50 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-red-500 dark:bg-red-400';
  const displayMessage = req.unit === 'minutes' ? `${fmtDuration(req.current)} / ${fmtDuration(req.required)}` : req.message;

  return (
    <div className="space-y-1" data-testid={`custom-requirement-${req.name}`}>
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium text-slate-700 dark:text-slate-300 inline-flex items-center gap-1">
          <span aria-hidden="true" className={req.met ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>
            {req.met ? '✓' : '○'}
          </span>
          {req.name}
        </span>
        <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">{displayMessage}</span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface Props {
  item: CustomRuleWithStatus;
  onEdit?: (id: string) => void;
  onShare?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleEnabled?: (id: string, enabled: boolean) => void;
}

export function CustomCurrencyCard({ item, onEdit, onShare, onDelete, onToggleEnabled }: Props) {
  const { rule, evaluation } = item;
  const { fmtDate } = useFormatPrefs();
  const paused = !rule.enabled;
  const config = paused ? STATUS_CONFIG.unknown : (STATUS_CONFIG[evaluation.status] ?? STATUS_CONFIG.unknown);
  const StatusIcon = config.Icon;

  return (
    <div
      className={`card hover-lift ${config.border} ${config.bg} ${paused ? 'opacity-60' : ''}`}
      data-testid={`custom-currency-card-${rule.id}`}
      data-paused={paused ? 'true' : 'false'}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg ${config.iconWrap} text-lg ${paused ? 'grayscale' : ''}`} aria-hidden="true">
            {rule.emoji ? <span>{rule.emoji}</span> : <StatusIcon className="w-5 h-5" />}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{rule.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 capitalize">{evaluation.windowLabel}</p>
          </div>
        </div>
        <span className={`${paused ? 'badge-neutral' : config.badge} shrink-0`}>{paused ? 'PAUSED' : config.label}</span>
      </div>

      {rule.description && <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{rule.description}</p>}

      {!paused && evaluation.requirements.length > 0 && (
        <div className="space-y-2">
          {evaluation.requirements.map((req, i) => (
            <RequirementBar key={`${req.name}-${i}`} req={req} />
          ))}
        </div>
      )}

      {paused && (
        <p className="text-xs text-slate-400 dark:text-slate-500">Paused — not currently tracked. Resume to evaluate again.</p>
      )}

      {!paused && evaluation.expiresOn && evaluation.status !== 'expired' && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 text-right inline-flex items-center gap-1 justify-end w-full">
          <CalendarClock className="w-3 h-3" aria-hidden="true" />
          Current until {fmtDate(evaluation.expiresOn)}
        </p>
      )}

      {(onEdit || onShare || onDelete || onToggleEnabled) && (
        <div className="flex items-center justify-end gap-1 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
          {onToggleEnabled && (
            <button
              type="button"
              onClick={() => onToggleEnabled(rule.id, paused)}
              className={`btn-ghost p-1.5 mr-auto ${paused ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
              title={paused ? 'Resume rule' : 'Pause rule'}
              aria-label={paused ? 'Resume rule' : 'Pause rule'}
              data-testid={`toggle-enabled-custom-${rule.id}`}
            >
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(rule.id)}
              className="btn-ghost p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              title="Edit rule"
              aria-label="Edit rule"
              data-testid={`edit-custom-${rule.id}`}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {onShare && (
            <button
              type="button"
              onClick={() => onShare(rule.id)}
              className={`btn-ghost p-1.5 ${rule.isShared ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
              title={rule.isShared ? 'Shared — manage link' : 'Share rule'}
              aria-label={rule.isShared ? 'Shared — manage link' : 'Share rule'}
              data-testid={`share-custom-${rule.id}`}
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(rule.id)}
              className="btn-ghost p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
              title="Delete rule"
              aria-label="Delete rule"
              data-testid={`delete-custom-${rule.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
