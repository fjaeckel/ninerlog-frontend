import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Plane, PlaneTakeoff, PlaneLanding } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { components } from '../../api/schema';
import { splitAirportLabel } from '../../lib/airport';
import { cn } from '../../lib/cn';

type Flight = components['schemas']['Flight'];

interface TimeEntry {
  label: string;
  value: string;
}

/**
 * Aircraft and route summary of a flight, laid out as a departure → arrival
 * timeline.
 *
 * Airport names run long ("Jena-Schöngleina Airfield") and a label/value row
 * has nowhere to put them on a phone. Here the code, the name and the times get
 * their own lines under a shared marker, so a name simply wraps into the width
 * it has instead of colliding with its label.
 */
export default function FlightRouteCard({ flight }: { flight: Flight }) {
  const { t } = useTranslation('flights');

  const departure = splitAirportLabel(flight.departureIcao, flight.departureAirportName);
  const arrival = splitAirportLabel(flight.arrivalIcao, flight.arrivalAirportName);

  const departureTimes = [
    ...timeEntry(t('detail.offBlock'), flight.offBlockTime),
    ...timeEntry(t('detail.takeoff'), flight.departureTime),
  ];
  const arrivalTimes = [
    ...timeEntry(t('detail.landing'), flight.arrivalTime),
    ...timeEntry(t('detail.onBlock'), flight.onBlockTime),
  ];

  const meta: { label: string; value: string; mono?: boolean }[] = [];
  if (flight.route) {
    meta.push({ label: t('fields.route'), value: flight.route, mono: true });
  }
  if (flight.launchMethod) {
    meta.push({
      label: t('fields.launchMethod'),
      value: t(
        `launchMethods.${flight.launchMethod === 'self-launch' ? 'selfLaunch' : flight.launchMethod}`,
        { defaultValue: flight.launchMethod }
      ),
    });
  }

  return (
    <div className="card">
      <h2 className="section-title mb-4">{t('detail.aircraftAndRoute')}</h2>

      {/* Aircraft */}
      <div className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-700/40 px-3 py-2.5 mb-5">
        <span
          className="flex w-9 h-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
          aria-hidden="true"
        >
          <Plane className="w-[18px] h-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {t('detail.aircraft')}
          </p>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-100 break-all">
              {flight.aircraftReg}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400 break-words">
              {flight.aircraftType}
            </span>
          </p>
        </div>
      </div>

      {/* Route */}
      <ol>
        <RouteStop
          icon={PlaneTakeoff}
          eyebrow={t('detail.departure')}
          code={departure.code}
          name={departure.name}
          times={departureTimes}
          utcLabel={t('detail.utc')}
        >
          {flight.distance > 0 && (
            <p className="mt-3 text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500">
              <span className="sr-only">{t('fields.distance')}: </span>
              {flight.distance.toFixed(1)} NM
            </p>
          )}
        </RouteStop>
        <RouteStop
          icon={PlaneLanding}
          eyebrow={t('detail.arrival')}
          code={arrival.code}
          name={arrival.name}
          times={arrivalTimes}
          utcLabel={t('detail.utc')}
          isLast
        />
      </ol>

      {meta.length > 0 && (
        <dl className="grid gap-3 sm:grid-cols-2 mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
          {meta.map(({ label, value, mono }) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {label}
              </dt>
              <dd
                className={cn(
                  'mt-0.5 text-sm text-slate-700 dark:text-slate-200 break-words',
                  mono && 'font-mono tabular-nums'
                )}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** One end of the route: marker, code, airport name and the times recorded there. */
function RouteStop({
  icon: Icon,
  eyebrow,
  code,
  name,
  times,
  utcLabel,
  isLast,
  children,
}: {
  icon: LucideIcon;
  eyebrow: string;
  code: string | null;
  name: string | null;
  times: TimeEntry[];
  utcLabel: string;
  isLast?: boolean;
  children?: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[1.25rem_1fr] gap-x-3">
      {/* Marker column — the connector stretches to the next stop's marker */}
      <div className="flex flex-col items-center" aria-hidden="true">
        <span className="flex w-5 h-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
          <Icon className="w-3 h-3" />
        </span>
        {!isLast && <span className="w-px flex-1 mt-1 bg-slate-200 dark:bg-slate-700" />}
      </div>

      <div className={cn('min-w-0', !isLast && 'pb-5')}>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {eyebrow}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-2">
          {code && (
            <span className="text-lg font-semibold font-mono tabular-nums tracking-tight text-slate-800 dark:text-slate-100">
              {code}
            </span>
          )}
          {name && (
            <span
              className={cn(
                'break-words',
                code
                  ? 'text-sm text-slate-600 dark:text-slate-300'
                  : 'text-base font-semibold text-slate-800 dark:text-slate-100'
              )}
            >
              {name}
            </span>
          )}
        </div>
        {times.length > 0 && (
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {times.map(({ label, value }) => (
              <span key={label} className="inline-flex items-baseline gap-1.5">
                {label}
                <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200">
                  {value}
                </span>
              </span>
            ))}
            <span className="text-slate-400 dark:text-slate-500">{utcLabel}</span>
          </p>
        )}
        {children}
      </div>
    </li>
  );
}

/** Times arrive as HH:MM:SS and are optional — a missing one drops its entry. */
function timeEntry(label: string, value: string | null | undefined): TimeEntry[] {
  return value ? [{ label, value: value.slice(0, 5) }] : [];
}
