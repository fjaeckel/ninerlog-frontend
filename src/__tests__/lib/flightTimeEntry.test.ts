import { describe, expect, it } from 'vitest';
import { parseFlightTimeEntry, formatFlightTimeEntry } from '../../lib/flightTimeEntry';
describe('flight duration entry', () => {
  it.each([['1.5',90],['.5',30],['1,1',66],['1',60],['0',0],['1.383333',83]])('reads %s as %i minutes', (text, minutes) => {
    expect(parseFlightTimeEntry(text,'decimal')).toBe(minutes);
  });
  it.each(['','1.5abc','-1','Infinity','1e3','1,2.3','999999999'])('rejects %s', text => expect(parseFlightTimeEntry(text,'decimal')).toBeNull());
  it('keeps whole-number minute entry in h/m mode', () => expect(parseFlightTimeEntry('83','hm')).toBe(83));
  it('formats exact-minute records with sufficient precision', () => {
    expect(formatFlightTimeEntry(83,'decimal','dot')).toBe('1.38');
    expect(formatFlightTimeEntry(90,'decimal','comma')).toBe('1,5');
  });
});
