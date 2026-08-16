import type { ReactNode } from 'react';
import { abbreviateSiteName, type AirportParts } from '../../lib/airport';
import { cn } from '../../lib/cn';
import { ArrowRight } from 'lucide-react';

/**
 * How much of a site name a list row keeps.
 *
 * Chosen so the abbreviation and the CSS cap agree: at this length the result
 * fits inside the 48% ceiling below, so the cut lands on a word boundary rather
 * than mid-glyph. One number for every case — a name beside a code and two
 * names sharing a line get the same treatment, which is what makes a column of
 * rows look like one list.
 */
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
  // A list row is worth one line: a name that wraps pushes every card below it
  // down and costs more than the tail of the name is worth. The detail page has
  // the width to spare, and shows both names in full in the route card anyway.
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
        // Codes are four characters and never shrink.
        //
        // A name is set a step smaller and, crucially, does not grow: one that
        // filled the leftover width pushed the arrow to the far side of the
        // line and the route stopped reading as one thing. It is also capped at
        // just under half the line, so however long the site is written out, it
        // can never take the route over — the cap is a share of the width
        // rather than a pixel count, so it follows the screen.
        truncate && !code && 'text-sm',
        truncate ? (code ? 'shrink-0' : 'min-w-0 max-w-[48%] truncate') : 'break-words'
      )}
    >
      {code ?? (name && truncate ? abbreviateSiteName(name, CARD_NAME_CHARS) : name) ?? '—'}
    </span>
  );
}
