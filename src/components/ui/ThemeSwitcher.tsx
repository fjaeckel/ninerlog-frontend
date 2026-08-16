import { Sun, Moon, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/cn';
import type { Theme } from '../../stores/themeStore';

const OPTIONS: { value: Theme; icon: React.ReactNode }[] = [
  { value: 'light', icon: <Sun className="w-4 h-4" aria-hidden="true" /> },
  { value: 'dark', icon: <Moon className="w-4 h-4" aria-hidden="true" /> },
  { value: 'system', icon: <Monitor className="w-4 h-4" aria-hidden="true" /> },
];

interface ThemeSwitcherProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function ThemeSwitcher({ variant = 'compact', className }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation('settings');
  const label = (value: Theme) => t(`theme.${value}`);

  if (variant === 'full') {
    return (
      <div className={cn('space-y-2', className)}>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('theme.label')}</span>
        <div className="segmented w-full" role="group" aria-label={t('theme.label')}>
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className="segment flex-1"
              aria-pressed={theme === opt.value}
            >
              {opt.icon}
              <span className="hidden sm:inline">{label(opt.value)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Compact: cycle through the options on click.
  const currentIndex = OPTIONS.findIndex((o) => o.value === theme);
  const current = OPTIONS[currentIndex];

  return (
    <button
      onClick={() => setTheme(OPTIONS[(currentIndex + 1) % OPTIONS.length].value)}
      className={cn(
        'inline-flex items-center gap-2 min-h-11 px-3 rounded-md text-sm font-medium transition-colors',
        'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
        className
      )}
      aria-label={t('theme.change', { theme: label(current.value) })}
      title={t('theme.change', { theme: label(current.value) })}
    >
      {current.icon}
      <span className="hidden lg:inline">{label(current.value)}</span>
    </button>
  );
}
