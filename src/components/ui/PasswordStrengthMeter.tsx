import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import {
  evaluatePasswordStrength,
  PASSWORD_RULE_IDS,
  type PasswordStrengthLevel,
} from '../../lib/passwordStrength';

interface PasswordStrengthMeterProps {
  password: string;
  /** Wire to the input's `aria-describedby` so the rules are announced with it. */
  id?: string;
  className?: string;
}

/** Segments lit, and the colors used, per level — red, amber, green. */
const LEVEL_STYLES: Record<
  PasswordStrengthLevel,
  { segments: number; bar: string; text: string }
> = {
  weak: {
    segments: 1,
    bar: 'bg-expired-500 dark:bg-expired-500',
    text: 'text-expired-600 dark:text-expired-500',
  },
  fair: {
    segments: 2,
    bar: 'bg-expiring-500 dark:bg-expiring-500',
    text: 'text-expiring-700 dark:text-expiring-500',
  },
  strong: {
    segments: 3,
    bar: 'bg-current-500 dark:bg-current-500',
    text: 'text-current-700 dark:text-current-500',
  },
};

/**
 * Live feedback on a password being chosen: a three-step red/amber/green bar
 * plus the individual rules, so a user who is stuck can see exactly which one
 * they are failing. Colour is never the only signal — the level is spelled out
 * and every rule carries a ✓ / ✗ glyph.
 *
 * Renders nothing for an empty field, so an untouched form stays quiet.
 */
export function PasswordStrengthMeter({
  password,
  id,
  className,
}: PasswordStrengthMeterProps) {
  const { t } = useTranslation('auth');
  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);

  if (!password) return null;

  const style = LEVEL_STYLES[strength.level];

  return (
    <div id={id} className={cn('mt-2', className)} data-testid="password-strength">
      <div className="flex items-center gap-2">
        <div
          className="flex flex-1 gap-1"
          role="meter"
          aria-valuenow={strength.satisfiedCount}
          aria-valuemin={0}
          aria-valuemax={PASSWORD_RULE_IDS.length}
          aria-label={t('auth:passwordStrength.label')}
        >
          {[0, 1, 2].map((segment) => (
            <span
              key={segment}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                segment < style.segments
                  ? style.bar
                  : 'bg-slate-200 dark:bg-slate-700',
              )}
            />
          ))}
        </div>
        <span
          className={cn('text-xs font-medium', style.text)}
          data-testid="password-strength-level"
          data-level={strength.level}
          role="status"
        >
          {t(`auth:passwordStrength.levels.${strength.level}`)}
        </span>
      </div>

      <ul className="mt-2 space-y-0.5">
        {PASSWORD_RULE_IDS.map((rule) => {
          const met = strength.rules[rule];
          return (
            <li
              key={rule}
              data-testid={`password-rule-${rule}`}
              data-met={met}
              className={cn(
                'flex items-center gap-1.5 text-xs',
                met
                  ? 'text-current-700 dark:text-current-500'
                  : 'text-slate-500 dark:text-slate-400',
              )}
            >
              <span aria-hidden="true" className="w-3 text-center">
                {met ? '✓' : '✗'}
              </span>
              <span>
                {t(`auth:passwordStrength.rules.${rule}`)}
                <span className="sr-only">
                  {' '}
                  {met
                    ? t('auth:passwordStrength.ruleMet')
                    : t('auth:passwordStrength.ruleUnmet')}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
