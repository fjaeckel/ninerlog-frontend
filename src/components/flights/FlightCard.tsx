import { Pencil, Trash2, ShieldCheck, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { components } from '../../api/schema';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { splitAirportLabel } from '../../lib/airport';
import { cn } from '../../lib/cn';

type Flight = components['schemas']['Flight'];

interface FlightCardProps {
  flight: Flight;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}

/** One column of the card's readout row. */
interface Cell {
  key: string;
  label: string;
  value: string;
}

/**
 * The optional time columns a card may show, in the order they earn their spot.
 *
 * Night and IFR come first because they are the ones a pilot scans a logbook
 * for; the training times come last because a flight that has them usually has
 * little else. PIC and dual time are deliberately absent — the API computes
 * them from the function flag and the block time, so they would only repeat the
 * badge in the header.
 */
const OPTIONAL_TIMES: { key: string; labelKey: string; minutes: (f: Flight) => number }[] = [
  { key: 'night', labelKey: 'tableNight', minutes: (f) => f.nightTime },
  { key: 'ifr', labelKey: 'tableIfr', minutes: (f) => f.ifrTime },
  { key: 'xc', labelKey: 'tableXc', minutes: (f) => f.crossCountryTime },
  { key: 'sim', labelKey: 'tableSim', minutes: (f) => f.simulatedFlightTime ?? 0 },
  { key: 'ground', labelKey: 'tableGround', minutes: (f) => f.groundTrainingTime ?? 0 },
  { key: 'dualGiven', labelKey: 'tableDualGiven', minutes: (f) => f.dualGivenTime ?? 0 },
  { key: 'sic', labelKey: 'tableSic', minutes: (f) => f.sicTime ?? 0 },
  { key: 'multiPilot', labelKey: 'tableMultiPilot', minutes: (f) => f.multiPilotTime ?? 0 },
  { key: 'solo', labelKey: 'tableSolo', minutes: (f) => f.soloTime },
];

/** How many optional time columns fit next to the fixed ones on a phone. */
const MAX_OPTIONAL_CELLS = 3;

/**
 * One logbook entry as a phone-sized card.
 *
 * Below `lg` the flights table needs a horizontal scroll to reach even the
 * total time, so this takes its place: a header carrying what identifies the
 * entry — route, date, aircraft, block time, function — over a row of numeric
 * columns that reads like the table it replaces. The columns are chosen per
 * flight, so a night IFR leg and a circuit session each show their own figures
 * instead of a shared row of zeros. Everything else lives one tap away on the
 * detail page.
 */
export default function FlightCard({ flight, onEdit, onDelete, onClick }: FlightCardProps) {
  const { t, i18n } = useTranslation('flights');
  const { fmtDuration, fmtDate } = useFormatPrefs();

  const departure = splitAirportLabel(flight.departureIcao, flight.departureAirportName);
  const arrival = splitAirportLabel(flight.arrivalIcao, flight.arrivalAirportName);
  // A free-text site ("Meadow strip near Kassel") has no code and needs the
  // room to wrap; two ICAO codes always fit on one line.
  const routeIsCodes = !!departure.code && !!arrival.code;
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
      label: flight.landingsNight > 0 ? t('tableLdgSplit') : t('tableLdg'),
      value:
        flight.landingsNight > 0
          ? `${flight.landingsDay}/${flight.landingsNight}`
          : String(flight.allLandings),
    },
    ...OPTIONAL_TIMES.filter((col) => col.minutes(flight) > 0)
      .slice(0, MAX_OPTIONAL_CELLS)
      .map((col) => ({ key: col.key, label: t(col.labelKey), value: fmtDuration(col.minutes(flight)) })),
  ];

  return (
    <article
      className={cn(
        'tap-none overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm',
        'dark:border-slate-700 dark:bg-slate-800',
        'transition-[transform,box-shadow,border-color] duration-200 ease-out',
        'hover:border-slate-300 hover:shadow-md dark:hover:border-slate-600',
        'focus-within:border-blue-300 dark:focus-within:border-blue-700',
        'active:scale-[0.995]'
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
      {/* Header — the entry's identity, on a rail that anchors the card */}
      <div className="flex items-center gap-3 border-l-4 border-blue-600 bg-slate-50 px-3 py-2.5 dark:border-blue-500 dark:bg-slate-700/40">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'flex items-baseline gap-1.5 font-mono font-bold leading-tight tracking-tight text-slate-800 dark:text-slate-100',
              routeIsCodes ? 'text-lg' : 'flex-wrap text-base'
            )}
          >
            <span className={cn(routeIsCodes ? 'truncate' : 'min-w-0 break-words')}>
              {departure.code ?? departure.name ?? '—'}
            </span>
            <span className="text-blue-500 dark:text-blue-400" aria-hidden="true">
              →
            </span>
            <span className={cn(routeIsCodes ? 'truncate' : 'min-w-0 break-words')}>
              {arrival.code ?? arrival.name ?? '—'}
            </span>
            {flight.signatureId && (
              <>
                <ShieldCheck
                  className="h-3.5 w-3.5 shrink-0 self-center text-green-600 dark:text-green-400"
                  aria-hidden="true"
                />
                <span className="sr-only">{t('signed')}</span>
              </>
            )}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            {weekday} <span className="font-mono tabular-nums">{fmtDate(flight.date)}</span>
            {' · '}
            <span className="font-mono font-medium text-slate-600 dark:text-slate-300">{flight.aircraftReg}</span>{' '}
            {flight.aircraftType}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-mono text-lg font-bold leading-none tabular-nums text-slate-800 dark:text-slate-100">
            {fmtDuration(flight.totalTime)}
          </p>
          <span
            className={cn(
              'mt-1 inline-flex text-[10px] font-semibold',
              flight.isPic ? 'badge-info' : flight.isDual ? 'badge-expiring' : 'badge-neutral'
            )}
          >
            {flight.isPic ? 'PIC' : flight.isDual ? 'DUAL' : (flight.sicTime || 0) > 0 ? 'SIC' : '—'}
          </span>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />
      </div>

      {/* Readout — the table's columns, picked for this flight */}
      <dl className="flex divide-x divide-slate-100 dark:divide-slate-700/60">
        {cells.map((cell) => (
          <div key={cell.key} className="min-w-0 flex-1 px-1 py-2 text-center">
            <dt className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {cell.label}
            </dt>
            <dd className="truncate font-mono text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {cell.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Remarks share the line with the actions, so they cost no extra height */}
      <div className="flex items-center gap-2 border-t border-slate-100 pl-3 dark:border-slate-700/60">
        <p className="min-w-0 flex-1 truncate text-xs italic text-slate-500 dark:text-slate-400">
          {flight.remarks}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="tap-none inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-700 dark:hover:text-blue-400"
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
          className="tap-none inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          aria-label={t('deleteFlightAriaLabel', {
            departure: flight.departureIcao || '',
            arrival: flight.arrivalIcao || '',
          })}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
