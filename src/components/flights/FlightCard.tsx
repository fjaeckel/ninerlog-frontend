import { Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { components } from '../../api/schema';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { splitAirportLabel } from '../../lib/airport';
import { cn } from '../../lib/cn';
import FlightRouteHeading from './FlightRouteHeading';
import type { FlightCardColumns } from './flightTableColumns';

type Flight = components['schemas']['Flight'];

interface FlightCardProps {
  flight: Flight;
  /**
   * The readout columns every card on this page shows, from
   * `selectFlightCardColumns`. Passed in rather than derived per flight so the
   * whole list keeps one set of headings at one width.
   */
  columns: FlightCardColumns;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}

/** One column of the card's readout row. */
interface Cell {
  key: string;
  label: string;
  value: string;
  /** A column this flight logged nothing in — shown, but dimmed. */
  empty?: boolean;
}

/**
 * One logbook entry as a phone-sized card.
 *
 * Below `lg` the flights table needs a horizontal scroll to reach even the
 * total time, so this takes its place: a header carrying what identifies the
 * entry — route, date, aircraft, block time, function — over a row of numeric
 * columns that reads like the table it replaces. Both stay on their own single
 * line: a logbook is read by scrolling, and a card that grows a line for a long
 * airfield name pushes every flight below it further away. Which time columns
 * those are
 * is decided once for the whole page (see `selectFlightCardColumns`), so the
 * headings and their widths hold still while the list scrolls and a flight that
 * logged none of a column shows a dash. Everything else lives one tap away on
 * the detail page.
 */
export default function FlightCard({ flight, columns, onEdit, onDelete, onClick }: FlightCardProps) {
  const { t, i18n } = useTranslation('flights');
  const { fmtDuration, fmtDate } = useFormatPrefs();

  const departure = splitAirportLabel(flight.departureIcao, flight.departureAirportName);
  const arrival = splitAirportLabel(flight.arrivalIcao, flight.arrivalAirportName);
  const routeLabel = `${departure.code ?? departure.name ?? '—'} → ${arrival.code ?? arrival.name ?? '—'}`;

  // The weekday is what makes a date read as a day rather than a record key —
  // it follows the reader's locale, the date itself their format preference.
  const weekday = new Date(`${flight.date}T00:00:00`).toLocaleDateString(i18n.language, { weekday: 'short' });

  const cells: Cell[] = [
    { key: 'off', label: t('tableOff'), value: (flight.offBlockTime || flight.departureTime)?.slice(0, 5) || '—' },
    { key: 'on', label: t('tableOn'), value: (flight.onBlockTime || flight.arrivalTime)?.slice(0, 5) || '—' },
    {
      key: 'ldg',
      // Six columns leave ~55px each, so the day/night split drops its letters
      // and moves them into the heading rather than truncating.
      label: columns.landingsSplit ? t('tableLdgSplit') : t('tableLdg'),
      value: columns.landingsSplit
        ? `${flight.landingsDay}/${flight.landingsNight}`
        : String(flight.allLandings),
    },
    ...columns.time.map((column) => {
      const minutes = column.minutes(flight);
      return {
        key: column.key,
        label: t(column.labelKey),
        value: minutes > 0 ? fmtDuration(minutes) : '—',
        empty: minutes <= 0,
      };
    }),
  ];

  return (
    <article
      className={cn(
        // A row in a grouped list, not a card of its own: the surrounding list
        // owns the border and the corners, so rows can sit flush together
        // without doubling a border between every pair.
        'tap-none relative bg-white transition-colors dark:bg-slate-800',
        'hover:bg-slate-50 dark:hover:bg-slate-700/20',
        'active:bg-slate-100 dark:active:bg-slate-700/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500'
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={t('cardAriaLabel', {
        route: routeLabel,
        date: fmtDate(flight.date),
        duration: fmtDuration(flight.totalTime),
      })}
    >
      {/* The rail runs the full height of the row, so where one entry ends and
          the next begins stays obvious once the rows sit flush. Drawn as an
          overlay rather than a left border, which would tint the hairline the
          list draws between rows. */}
      <span
        className="absolute inset-y-0 left-0 w-1 bg-blue-600 dark:bg-blue-500"
        aria-hidden="true"
      />

      {/* Header — the entry's identity.
          The actions sit on the first line rather than in a row of their own:
          a 44px target already fits inside the height that line needs, so
          keeping them costs the list nothing. */}
      <div className="bg-slate-50 pl-4 pr-3 py-1.5 dark:bg-slate-700/40">
        <div className="flex items-center gap-2">
          <FlightRouteHeading className="min-w-0 flex-1" departure={departure} arrival={arrival} />
          <p className="shrink-0 font-mono text-base font-bold tabular-nums text-slate-800 dark:text-slate-100">
            {fmtDuration(flight.totalTime)}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="tap-none -mr-1 inline-flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-blue-600 dark:hover:bg-slate-600/50 dark:hover:text-blue-400"
            aria-label={t('editFlightAriaLabel', {
              departure: flight.departureIcao || '',
              arrival: flight.arrivalIcao || '',
            })}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="tap-none -mr-2 inline-flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            aria-label={t('deleteFlightAriaLabel', {
              departure: flight.departureIcao || '',
              arrival: flight.arrivalIcao || '',
            })}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Everything that qualifies the entry, on one line that gives up its
            tail before it gives up a second line */}
        <p className="-mt-0.5 flex items-baseline gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span
            className={cn(
              'shrink-0 rounded px-1 text-[10px] font-bold uppercase',
              flight.isPic
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : flight.isDual
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
            )}
          >
            {flight.isPic ? 'PIC' : flight.isDual ? 'DUAL' : (flight.sicTime || 0) > 0 ? 'SIC' : '—'}
          </span>
          {flight.signatureId && (
            <>
              <ShieldCheck
                className="h-3 w-3 shrink-0 self-center text-green-600 dark:text-green-400"
                aria-hidden="true"
              />
              <span className="sr-only">{t('signed')}</span>
            </>
          )}
          {/* Remarks are deliberately not here: they are a sentence, and a
              sentence clipped to a list row's leftover width says nothing. */}
          <span className="min-w-0 truncate">
            {weekday} <span className="font-mono tabular-nums">{fmtDate(flight.date)}</span>
            {' · '}
            <span className="font-mono font-medium text-slate-600 dark:text-slate-300">{flight.aircraftReg}</span>{' '}
            {flight.aircraftType}
          </span>
        </p>
      </div>

      {/* Readout — the table's columns, picked once for the page */}
      <dl className="flex divide-x divide-slate-100 dark:divide-slate-700/60">
        {cells.map((cell) => (
          <div key={cell.key} className="min-w-0 flex-1 px-1 py-1.5 text-center">
            <dt className="truncate text-[10px] font-medium uppercase leading-tight tracking-wider text-slate-400 dark:text-slate-500">
              {cell.label}
            </dt>
            <dd
              className={cn(
                'truncate font-mono text-xs font-semibold leading-tight tabular-nums',
                cell.empty ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-200'
              )}
            >
              {cell.value}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
