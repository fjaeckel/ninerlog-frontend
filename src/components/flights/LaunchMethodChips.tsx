import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import { LAUNCH_METHODS, type LaunchMethod } from '../../lib/launchMethod';

const LABEL_KEY: Record<LaunchMethod, string> = {
  winch: 'winch',
  aerotow: 'aerotow',
  'self-launch': 'selfLaunch',
  car: 'car',
  bungee: 'bungee',
};

interface LaunchMethodChipsProps {
  value: LaunchMethod | '';
  /** Called with the tapped method, or `''` when the selected chip is tapped again. */
  onChange: (value: LaunchMethod | '') => void;
  label: string;
  disabled?: boolean;
}

/** Single-choice launch method chips. */
export function LaunchMethodChips({ value, onChange, label, disabled }: LaunchMethodChipsProps) {
  const { t } = useTranslation('flights');
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {LAUNCH_METHODS.map((m) => {
        const selected = value === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(selected ? '' : m)}
            className={cn(
              'min-h-11 rounded-full border px-4 text-sm font-medium transition-colors disabled:opacity-50',
              selected
                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/50',
            )}
          >
            {t(`launchMethods.${LABEL_KEY[m]}`)}
          </button>
        );
      })}
    </div>
  );
}
