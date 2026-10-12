import { describe, it, expect } from 'vitest';
import { flightListQueryFromSearch } from '../../pages/flights/flightListQuery';

describe('flightListQueryFromSearch', () => {
  it('defaults to newest first with no filters', () => {
    expect(flightListQueryFromSearch('')).toEqual({ sortBy: 'date', sortOrder: 'desc' });
  });

  it('maps the list URL onto API parameters', () => {
    const query = flightListQueryFromSearch(
      '?q=night%3E0&sortBy=totalTime&sortOrder=asc&departureIcao=eddf&function=pic&logbook=lic-1&page=3'
    );

    expect(query).toEqual({
      q: 'night>0',
      sortBy: 'totalTime',
      sortOrder: 'asc',
      departureIcao: 'EDDF',
      isPic: true,
      logbookLicenseId: 'lic-1',
    });
  });

  it('drops an unknown sort field', () => {
    expect(flightListQueryFromSearch('?sortBy=bogus').sortBy).toBe('date');
  });
});
