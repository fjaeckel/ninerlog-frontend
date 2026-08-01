import type { ReactNode } from 'react';
import type { AirportParts } from '../../lib/airport';
import { cn } from '../../lib/cn';

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
 * A flight's route as a heading — "EDDF → EDDH", or the two places it actually
 * went.
 *
 * Departure and arrival are not always ICAO codes: glider and helicopter
 * pilots log free-text sites ("Meadow strip near Kassel"), and a code the
 * airport database does not carry resolves to no name at all. Two codes fit on
 * one line and belong in the tabular face; a free-text name is prose, needs the
 * UI face, and needs the full width to wrap into — with the arrow bound to the
 * arrival so it can never end up stranded on a line of its own.
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

  const arrow = (
    <span className="text-blue-500 dark:text-blue-400" aria-hidden="true">
      →
    </span>
  );

  if (isCodes) {
    return (
      <Element
        title={title}
        className={cn(
          'flex items-baseline gap-x-1.5 font-mono font-bold leading-tight tracking-tight tabular-nums',
          'text-slate-800 dark:text-slate-100',
          size === 'page' ? 'text-2xl sm:text-3xl' : 'text-lg',
          className
        )}
      >
        <span className="truncate">{departure.code}</span>
        {arrow}
        <span className="truncate">{arrival.code}</span>
        {children}
      </Element>
    );
  }

  return (
    <Element
      title={title}
      className={cn(
        'font-bold leading-snug text-slate-800 dark:text-slate-100',
        size === 'page' ? 'text-xl sm:text-2xl' : 'text-base',
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
function End({ part }: { part: AirportParts }) {
  const code = part.code;
  return (
    <span
      className={cn(
        'break-words',
        code ? 'font-mono tracking-tight tabular-nums' : 'font-sans',
        !code && 'font-semibold'
      )}
    >
      {code ?? part.name ?? '—'}
    </span>
  );
}
