import type { operations } from '../../api/schema';

type ListFlightsParams = NonNullable<operations['listFlights']['parameters']['query']>;

/** The flights list's filters and sort, without paging. */
export type FlightListQuery = Omit<ListFlightsParams, 'page' | 'pageSize' | 'updatedSince'>;

/** Flights per page in the flights list, table and card list alike. */
export const FLIGHT_LIST_PAGE_SIZE = 20;

export type FlightSortField = 'date' | 'totalTime' | 'createdAt';

export const FLIGHT_SORT_FIELDS: FlightSortField[] = ['date', 'totalTime', 'createdAt'];

/**
 * Reads the flights list's filters and sort from its URL query string — the
 * one mapping shared by the list and anything that follows its order.
 */
export function flightListQueryFromSearch(search: URLSearchParams | string): FlightListQuery {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const param = (key: string) => params.get(key) ?? '';

  const sortByParam = param('sortBy') as FlightSortField;
  const sortBy: FlightSortField = FLIGHT_SORT_FIELDS.includes(sortByParam) ? sortByParam : 'date';
  const sortOrder: 'asc' | 'desc' = param('sortOrder') === 'asc' ? 'asc' : 'desc';
  const fn = param('function');

  return {
    sortBy,
    sortOrder,
    ...(param('q') ? { q: param('q') } : {}),
    ...(param('startDate') ? { startDate: param('startDate') } : {}),
    ...(param('endDate') ? { endDate: param('endDate') } : {}),
    ...(param('aircraftReg') ? { aircraftReg: param('aircraftReg') } : {}),
    ...(param('departureIcao') ? { departureIcao: param('departureIcao').toUpperCase() } : {}),
    ...(param('arrivalIcao') ? { arrivalIcao: param('arrivalIcao').toUpperCase() } : {}),
    ...(fn === 'pic' ? { isPic: true } : {}),
    ...(fn === 'dual' ? { isDual: true } : {}),
    ...(param('logbook') ? { logbookLicenseId: param('logbook') } : {}),
  };
}
