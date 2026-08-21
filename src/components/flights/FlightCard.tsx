import { ChevronRight, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { components } from '../../api/schema';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { splitAirportLabel } from '../../lib/airport';
import { cn } from '../../lib/cn';
import FlightRouteHeading from './FlightRouteHeading';
import {
  flightFunctionKind,
  flightFunctionLabel,
  type FlightCardColumns,
} from './flightTableColumns';

type Flight = components['schemas']['Flight'];

interface FlightCardProps {
  flight: Flight;
  /** The readout columns every card on this page shows, from `selectFlightCardColumns`. */
  columns: FlightCardColumns;
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
 * One logbook entry as a phone-sized card: a header (route, date, aircraft,
 * block time, function) over a row of numeric columns. Time columns are
 * decided once per page (`selectFlightCardColumns`); a flight that logged
 * none of a column shows a dash.
 */
export default function FlightCard({ flight, columns, onClick }: FlightCardProps) {
  const { t, i18n } = useTranslation('flights');
  const { fmtDuration, fmtDate } = useFormatPrefs();

  const functionKind = flightFunctionKind(flight);

  const departure = splitAirportLabel(flight.departureIcao, flight.departureAirportName);
  const arrival = splitAirportLabel(flight.arrivalIcao, flight.arrivalAirportName);
  const routeLabel = `${departure.code ?? departure.name ?? '—'} → ${arrival.code ?? arrival.name ?? '—'}`;

  // Weekday follows the reader's locale; the date their format preference.
  const weekday = new Date(`${flight.date}T00:00:00`).toLocaleDateString(i18n.language, { weekday: 'short' });

  // Cells honour the flights-list column setting, as the table's do.
  const offOnCells: Cell[] = columns.offOnBlock
    ? [
        { key: 'off', label: t('tableOff'), value: (flight.offBlockTime || flight.departureTime)?.slice(0, 5) || '—' },
        { key: 'on', label: t('tableOn'), value: (flight.onBlockTime || flight.arrivalTime)?.slice(0, 5) || '—' },
      ]
    : [];

  const landingCells: Cell[] = columns.landings
    ? [
        {
          key: 'ldg',
          // At six columns the day/night split moves its letters into the heading.
          label: columns.landingsSplit ? t('tableLdgSplit') : t('tableLdg'),
          value: columns.landingsSplit
            ? `${flight.landingsDay}/${flight.landingsNight}`
            : String(flight.allLandings),
        },
      ]
    : [];

  const cells: Cell[] = [
    ...offOnCells,
    ...landingCells,
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
        // A row in a grouped list; the surrounding list owns border and corners.
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
      {/* Full-height rail, drawn as an overlay */}
      <span
        className="absolute inset-y-0 left-0 w-1 bg-blue-600 dark:bg-blue-500"
        aria-hidden="true"
      />

      {/* Header — the entry's identity. The row only navigates. */}
      <div className="bg-slate-50 pl-4 pr-3 py-2.5 dark:bg-slate-700/40">
        <div className="flex items-center gap-2">
          {flight.isSimulator ? (
            <p className="min-w-0 flex-1 truncate text-base font-bold leading-tight tracking-tight text-slate-800 dark:text-slate-100">
              {flight.fstdType || t('simulatorEntry')}
            </p>
          ) : (
            <FlightRouteHeading className="min-w-0 flex-1" departure={departure} arrival={arrival} />
          )}
          <p className="shrink-0 font-mono text-base font-bold tabular-nums text-slate-800 dark:text-slate-100">
            {fmtDuration(flight.totalTime)}
          </p>
          <ChevronRight
            className="-mr-1 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600"
            aria-hidden="true"
          />
        </div>

        {/* Qualifying details, one truncating line */}
        <p className="-mt-0.5 flex items-baseline gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          {columns.function && (
            <span
              className={cn(
                'shrink-0 rounded px-1 text-xs font-bold uppercase',
                functionKind === 'pic' || functionKind === 'sim'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : functionKind === 'dual'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
              )}
            >
              {flightFunctionLabel(functionKind, t)}
            </span>
          )}
          {flight.signatureId && (
            <>
              <ShieldCheck
                className="h-3 w-3 shrink-0 self-center text-green-600 dark:text-green-400"
                aria-hidden="true"
              />
              <span className="sr-only">{t('signed')}</span>
            </>
          )}
          <span className="min-w-0 truncate">
            {weekday} <span className="font-mono tabular-nums">{fmtDate(flight.date)}</span>
            {' · '}
            <span className="font-mono font-medium text-slate-600 dark:text-slate-300">{flight.aircraftReg}</span>{' '}
            {flight.aircraftType}
          </span>
        </p>
      </div>

      {/* Readout — the table's columns, picked once for the page */}
      {cells.length > 0 && (
        <dl className="flex divide-x divide-slate-100 dark:divide-slate-700/60">
          {cells.map((cell) => (
            <div key={cell.key} className="min-w-0 flex-1 px-1 py-1.5 text-center">
              <dt className="truncate text-xs font-medium uppercase leading-tight tracking-wider text-slate-400 dark:text-slate-500">
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
      )}
    </article>
  );
}
