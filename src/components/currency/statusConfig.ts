import { ShieldCheck, ShieldAlert, ShieldX, Shield } from 'lucide-react';
import type { RatingCurrencyStatus } from '../../types/api';

/** Card styling, badge and icon per currency status. */
export const STATUS_CONFIG: Record<RatingCurrencyStatus, {
  bg: string; border: string; iconWrap: string; badge: string; badgeKey: string; helperKey?: string; Icon: typeof Shield;
}> = {
  current: {
    bg: 'bg-gradient-to-br from-green-50/70 via-white to-green-50/30 dark:from-green-900/15 dark:via-slate-800 dark:to-slate-800',
    border: 'border-l-4 border-l-green-500',
    iconWrap: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 ring-2 ring-green-500/15',
    badge: 'badge-current',
    badgeKey: 'status.current',
    Icon: ShieldCheck,
  },
  expiring: {
    bg: 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 dark:from-amber-900/15 dark:via-slate-800 dark:to-slate-800',
    border: 'border-l-4 border-l-amber-500',
    iconWrap: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ring-2 ring-amber-500/15',
    badge: 'badge-expiring',
    badgeKey: 'status.attention',
    Icon: ShieldAlert,
  },
  expired: {
    bg: 'bg-gradient-to-br from-red-50/70 via-white to-red-50/30 dark:from-red-900/15 dark:via-slate-800 dark:to-slate-800',
    border: 'border-l-4 border-l-red-500',
    iconWrap: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 ring-2 ring-red-500/15',
    badge: 'badge-expired',
    badgeKey: 'status.notCurrent',
    Icon: ShieldX,
  },
  lapsed: {
    bg: 'bg-gradient-to-br from-red-50/70 via-white to-red-50/30 dark:from-red-900/15 dark:via-slate-800 dark:to-slate-800',
    border: 'border-l-4 border-l-red-500',
    iconWrap: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 ring-2 ring-red-500/15',
    badge: 'badge-expired',
    badgeKey: 'status.lapsed',
    helperKey: 'status.lapsedHelper',
    Icon: ShieldX,
  },
  unknown: {
    bg: 'bg-white dark:bg-slate-800',
    border: 'border-l-4 border-l-slate-300 dark:border-l-slate-600',
    iconWrap: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
    badge: 'badge-neutral',
    badgeKey: 'status.unknown',
    Icon: Shield,
  },
};
