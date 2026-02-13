import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/cn';
import type { Theme } from '../../stores/themeStore';

const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
  { value: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
];

interface ThemeSwitcherProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function ThemeSwitcher({ variant = 'compact', className }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();

  if (variant === 'full') {
    return (
      <div className={cn('space-y-2', className)}>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Appearance</span>
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
                theme === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              )}
              aria-pressed={theme === opt.value}
              aria-label={`${opt.label} theme`}
            >
              {opt.icon}
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Compact: cycle through themes on click
  const currentIndex = options.findIndex((o) => o.value === theme);
  const currentOpt = options[currentIndex];

  return (
    <button
      onClick={() => {
        const next = options[(currentIndex + 1) % options.length];
        setTheme(next.value);
      }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
        className
      )}
      aria-label={`Theme: ${currentOpt.label}. Click to change.`}
      title={`Theme: ${currentOpt.label}`}
    >
      {currentOpt.icon}
      <span className="hidden lg:inline">{currentOpt.label}</span>
    </button>
  );
}
