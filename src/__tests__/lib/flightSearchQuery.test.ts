import { describe, it, expect } from 'vitest';
import { isSearchWorthSending, SEARCH_DEBOUNCE_MS } from '../../lib/flightSearchQuery';

describe('isSearchWorthSending', () => {
  it('always allows an empty query so clearing the box restores the full list', () => {
    expect(isSearchWorthSending('')).toBe(true);
    expect(isSearchWorthSending('   ')).toBe(true);
  });

  it('rejects a single character, which constrains nothing', () => {
    expect(isSearchWorthSending('E')).toBe(false);
    expect(isSearchWorthSending(' f ')).toBe(false);
  });

  it.each([
    ['from:', 'tag with no value'],
    ['departureIcao:', 'canonical tag with no value'],
    ['night>', 'comparison with no value'],
    ['totalTime>=', 'two-character comparison with no value'],
    ['landings =', 'equality with no value'],
    ['EDDF AND', 'trailing AND'],
    ['EDDF and', 'trailing lowercase and'],
    ['EDDF OR', 'trailing OR'],
    ['EDDF NOT', 'trailing NOT'],
    ['EDDF &&', 'trailing symbolic AND'],
    ['EDDF ||', 'trailing symbolic OR'],
    ['(', 'bare open group'],
    ['(from:EDDF OR', 'unclosed group'],
    ['remarks:"check', 'unclosed quote'],
  ])('rejects %j (%s)', (query) => {
    expect(isSearchWorthSending(query)).toBe(false);
  });

  it.each([
    ['EDDF', 'bare term'],
    ['from:EDDF', 'complete tag'],
    ['night>0', 'complete comparison'],
    ['totalTime>=1:30', 'duration comparison'],
    ['(from:EDDF OR to:EDDF)', 'balanced group'],
    ['remarks:"check ride"', 'balanced quotes'],
    ['from:EDDF AND night>0 NOT remarks:cancelled', 'full expression'],
    ['landings>=3', 'int comparison'],
  ])('allows %j (%s)', (query) => {
    expect(isSearchWorthSending(query)).toBe(true);
  });

  it('does not reject terms that merely contain a boolean keyword', () => {
    // "NOTAM" ends in no keyword; "and" here is part of a word, not an operator.
    expect(isSearchWorthSending('remarks:NOTAM')).toBe(true);
    expect(isSearchWorthSending('remarks:Sandhausen')).toBe(true);
  });

  it('waits long enough that a typing hesitation is not a finished query', () => {
    expect(SEARCH_DEBOUNCE_MS).toBeGreaterThanOrEqual(500);
  });
});
