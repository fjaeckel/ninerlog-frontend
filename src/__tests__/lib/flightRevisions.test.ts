import { describe, it, expect } from 'vitest';
import { formatRevisionValue, isSystemRevision, revisionFieldLabelKey } from '../../lib/flightRevisions';

const fmt = {
  duration: (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`,
  date: (d: string) => `D(${d})`,
  yes: 'Yes',
  no: 'No',
  unset: '—',
};

describe('flightRevisions', () => {
  it('labels fields from the flights namespace, falling back to null', () => {
    expect(revisionFieldLabelKey('totalTime')).toBe('fields.totalTime');
    expect(revisionFieldLabelKey('landingsNight')).toBe('fields.nightLandings');
    expect(revisionFieldLabelKey('crewMembers')).toBe('logbook:history.crew');
    expect(revisionFieldLabelKey('nightTimeOverride')).toBeNull();
  });

  it('formats values by type', () => {
    expect(formatRevisionValue('totalTime', 95, fmt)).toBe('1:35');
    expect(formatRevisionValue('landingsDay', 2, fmt)).toBe('2');
    expect(formatRevisionValue('date', '2026-08-14', fmt)).toBe('D(2026-08-14)');
    expect(formatRevisionValue('onBlockTime', '10:45:00', fmt)).toBe('10:45');
    expect(formatRevisionValue('isIpc', true, fmt)).toBe('Yes');
    expect(formatRevisionValue('remarks', null, fmt)).toBe('—');
    expect(formatRevisionValue('remarks', '', fmt)).toBe('—');
    expect(
      formatRevisionValue('crewMembers', [{ name: 'Amelia', role: 'Student' }, { name: 'Bessie' }], fmt)
    ).toBe('Amelia (Student), Bessie');
    expect(formatRevisionValue('crewMembers', [], fmt)).toBe('—');
  });

  it('classifies system sources', () => {
    expect(isSystemRevision({ source: 'recalc' })).toBe(true);
    expect(isSystemRevision({ source: 'aircraft_rename' })).toBe(true);
    expect(isSystemRevision({ source: 'import' })).toBe(true);
    expect(isSystemRevision({ source: 'user_edit' })).toBe(false);
    expect(isSystemRevision({ source: 'unknown' })).toBe(false);
  });
});
