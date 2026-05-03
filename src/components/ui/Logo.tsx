import { cn } from '../../lib/cn';

/**
 * NinerLog brandmark — wing + horizon over an aviation-blue gradient badge.
 *
 * Use <LogoMark/> for icon-only contexts (favicons, headers at small sizes,
 * loaders) and <Logo/> when you want the wordmark next to the mark.
 */

interface LogoMarkProps {
  className?: string;
  /** Pixel size; default 32 (matches mobile header height comfortably). */
  size?: number;
  /** Hide from screen readers (when paired with a wordmark). */
  decorative?: boolean;
}

export function LogoMark({ className, size = 32, decorative = false }: LogoMarkProps) {
  const a11y = decorative
    ? { 'aria-hidden': true as const, focusable: false as const }
    : { role: 'img' as const, 'aria-label': 'NinerLog' };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      {...a11y}
    >
      <defs>
        <linearGradient id="nl-mark-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1E3A5F" />
          <stop offset="55%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="nl-mark-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="512" height="512" rx="112" ry="112" fill="url(#nl-mark-bg)" />
      <rect x="0" y="0" width="512" height="512" rx="112" ry="112" fill="url(#nl-mark-shine)" />
      <rect x="80" y="320" width="352" height="10" rx="5" fill="#FFFFFF" opacity="0.55" />
      <path d="M96 280 L256 144 L416 280 L376 280 L256 196 L136 280 Z" fill="#FFFFFF" />
      <path d="M196 256 L256 212 L316 256 L292 256 L256 232 L220 256 Z" fill="#FFFFFF" opacity="0.55" />
      <circle cx="256" cy="372" r="10" fill="#FFFFFF" opacity="0.85" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  /** Pixel size of the mark; the wordmark scales with it. */
  size?: number;
  wordmark?: string;
  /** Visual emphasis. `hero` is for splash/login, `inline` for headers. */
  variant?: 'inline' | 'hero';
}

export function Logo({
  className,
  size = 32,
  wordmark = 'NinerLog',
  variant = 'inline',
}: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={size} decorative />
      <span
        className={cn(
          'font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 dark:from-blue-300 dark:via-blue-300 dark:to-blue-400',
          variant === 'hero' ? 'text-3xl sm:text-4xl' : 'text-lg',
        )}
      >
        {wordmark}
      </span>
    </span>
  );
}
