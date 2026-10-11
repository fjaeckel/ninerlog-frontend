import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useFlightNeighbors } from '../../hooks/useFlights';
import { flightListQueryFromSearch } from '../../pages/flights/flightListQuery';

interface FlightNeighborNavProps {
  flightId: string;
  /** The flights list's query string, e.g. `?q=night%3E0&sortBy=date`. */
  listSearch: string;
  /** Arrow keys are ignored while false, e.g. while a dialog is open. */
  keyboard: boolean;
}

/** Whether a key press belongs to a text field or another control. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Previous/next buttons and a position readout for stepping through the
 * flights list in its current order and filters. Left and right arrow keys
 * do the same.
 */
export default function FlightNeighborNav({ flightId, listSearch, keyboard }: FlightNeighborNavProps) {
  const { t } = useTranslation('flights');
  const navigate = useNavigate();
  const { data } = useFlightNeighbors(flightId, flightListQueryFromSearch(listSearch));

  const previousId = data?.previousId ?? null;
  const nextId = data?.nextId ?? null;

  useEffect(() => {
    if (!keyboard) return;
    const go = (id: string) => navigate(`/flights/${id}`, { replace: true, state: { listSearch } });
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === 'ArrowLeft' && previousId) {
        e.preventDefault();
        go(previousId);
      } else if (e.key === 'ArrowRight' && nextId) {
        e.preventDefault();
        go(nextId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [keyboard, previousId, nextId, navigate, listSearch]);

  if (!data || data.position == null) return null;

  const button =
    'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-200';

  return (
    <nav className="flex items-center gap-1" aria-label={t('detail.neighborNav')} data-testid="flight-neighbor-nav">
      <button
        type="button"
        className={button}
        disabled={!previousId}
        onClick={() => previousId && navigate(`/flights/${previousId}`, { replace: true, state: { listSearch } })}
        aria-label={t('detail.previousFlight')}
        title={`${t('detail.previousFlight')} (←)`}
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-slate-500 dark:text-slate-400">
        {t('detail.position', { position: data.position, total: data.total })}
      </span>
      <button
        type="button"
        className={button}
        disabled={!nextId}
        onClick={() => nextId && navigate(`/flights/${nextId}`, { replace: true, state: { listSearch } })}
        aria-label={t('detail.nextFlight')}
        title={`${t('detail.nextFlight')} (→)`}
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </nav>
  );
}
