import { useFlights } from './useFlights';
import { FLIGHT_LIST_PAGE_SIZE, flightListQueryFromSearch } from '../pages/flights/flightListQuery';

export interface FlightListNeighbors {
  /** The flight above in the list; null at its start, undefined while loading. */
  previousId: string | null | undefined;
  /** The flight below in the list; null at its end, undefined while loading. */
  nextId: string | null | undefined;
  /** 1-based position in the list. */
  position: number;
  total: number;
}

const pageOf = (index: number) => Math.floor(index / FLIGHT_LIST_PAGE_SIZE) + 1;

/**
 * The flights either side of one flight in the flights list it was opened
 * from, read from the same `GET /flights` pages the list uses. `listIndex` is
 * the flight's 0-based position in that list. Returns null without a
 * position, or when the list no longer has this flight there.
 */
export function useFlightListNeighbors(
  flightId: string,
  listSearch: string,
  listIndex: number | undefined
): FlightListNeighbors | null {
  const query = flightListQueryFromSearch(listSearch);
  const known = typeof listIndex === 'number' && Number.isInteger(listIndex) && listIndex >= 0;
  const index = known ? listIndex : 0;
  const page = pageOf(index);

  const current = useFlights({ ...query, page, pageSize: FLIGHT_LIST_PAGE_SIZE }, { enabled: known });
  const total = current.data?.pagination.total ?? 0;

  const previousPage = index > 0 ? pageOf(index - 1) : page;
  const nextPage = pageOf(index + 1);
  const previous = useFlights(
    { ...query, page: previousPage, pageSize: FLIGHT_LIST_PAGE_SIZE },
    { enabled: known && previousPage !== page }
  );
  const next = useFlights(
    { ...query, page: nextPage, pageSize: FLIGHT_LIST_PAGE_SIZE },
    { enabled: known && nextPage !== page && index + 1 < total }
  );

  const rows = (q: typeof current) => (q.data && !q.isPlaceholderData ? q.data.data : undefined);
  const at = (q: typeof current, i: number) => rows(q)?.[i % FLIGHT_LIST_PAGE_SIZE]?.id;

  if (!known || !rows(current) || at(current, index) !== flightId) return null;

  return {
    previousId: index === 0 ? null : previousPage === page ? at(current, index - 1) : at(previous, index - 1),
    nextId: index + 1 >= total ? null : nextPage === page ? at(current, index + 1) : at(next, index + 1),
    position: index + 1,
    total,
  };
}
