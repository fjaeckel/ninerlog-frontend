import type { ReactNode } from 'react';
import { abbreviateSiteName, type AirportParts } from '../../lib/airport';
import { cn } from '../../lib/cn';
import { ArrowRight } from 'lucide-react';

/** How much of a site name a list row keeps. */
const CARD_NAME_CHARS = 11;

interface FlightRouteHeadingProps {
  departure: AirportParts;
  arrival: AirportParts;
  /** The detail page needs a real heading; the list card is not one. */
  as?: 'p' | 'h1';
  /** `card` sits in a list row, `page` is the detail page's headline. */
  size?: 'card' | 'page';
  /** Trailing content on the last line — the signed badge. */
  children?: ReactNode;
  title?: string;
  className?: string;
}

/**
 * A flight's route as a heading — "EDDF → EDDH", or free-text site names.
 * Codes use the tabular face; names use the UI face and wrap, with the arrow
 * bound to the arrival.
 */
export default function FlightRouteHeading({
  departure,
  arrival,
  as: Element = 'p',
  size = 'card',
  children,
  title,
  className,
}: FlightRouteHeadingProps) {
  const isCodes = !!departure.code && !!arrival.code;
  // List rows abbreviate; the detail page shows names in full.
  const oneLine = size === 'card';

  const arrow = <ArrowRight className="w-4 h-4 shrink-0 text-blue-500 dark:text-blue-400" aria-hidden="true" />;

  if (isCodes || oneLine) {
    return (
      <Element
        title={title}
        className={cn(
          'flex items-baseline gap-x-1.5 font-bold leading-tight tracking-tight',
          'text-slate-800 dark:text-slate-100',
          size === 'page' ? 'text-2xl sm:text-3xl' : 'text-base',
          className
        )}
      >
        <End part={departure} truncate />
        {arrow}
        <End part={arrival} truncate />
        {children}
      </Element>
    );
  }

  return (
    <Element
      title={title}
      className={cn(
        'font-bold leading-snug text-slate-800 dark:text-slate-100',
        'text-xl sm:text-2xl',
        className
      )}
    >
      <End part={departure} />
      <span className="block">
        {arrow} <End part={arrival} />
        {children}
      </span>
    </Element>
  );
}

/** One end of the route: a code keeps the tabular face, a place name does not. */
function End({ part, truncate }: { part: AirportParts; truncate?: boolean }) {
  const code = part.code;
  const name = part.name;
  return (
    <span
      title={truncate && name ? name : undefined}
      className={cn(
        code ? 'font-mono tracking-tight tabular-nums' : 'font-sans font-semibold',
        // Codes never shrink; a name is a step smaller, does not grow, and
        // is capped at just under half the line.
        truncate && !code && 'text-sm',
        truncate ? (code ? 'shrink-0' : 'min-w-0 max-w-[48%] truncate') : 'break-words'
      )}
    >
      {code ?? (name && truncate ? abbreviateSiteName(name, CARD_NAME_CHARS) : name) ?? '—'}
    </span>
  );
}
