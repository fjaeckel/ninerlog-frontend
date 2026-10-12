import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatDateLong, formatClockTime } from '../../lib/dateFormat';

describe('formatDate', () => {
  const date = new Date(Date.UTC(2026, 2, 15));

  it('formats as DD.MM.YYYY (European default)', () => {
    expect(formatDate(date, 'DD.MM.YYYY')).toBe('15.03.2026');
  });

  it('formats as MM/DD/YYYY (US)', () => {
    expect(formatDate(date, 'MM/DD/YYYY')).toBe('03/15/2026');
  });

  it('formats as YYYY-MM-DD (ISO)', () => {
    expect(formatDate(date, 'YYYY-MM-DD')).toBe('2026-03-15');
  });

  it('defaults to DD.MM.YYYY when no format provided', () => {
    expect(formatDate(date)).toBe('15.03.2026');
  });

  it('accepts string dates', () => {
    expect(formatDate('2026-03-15T00:00:00Z', 'YYYY-MM-DD')).toBe('2026-03-15');
  });

  it('renders a bare YYYY-MM-DD as that calendar day', () => {
    expect(formatDate('2006-08-15', 'DD.MM.YYYY')).toBe('15.08.2006');
  });

  it('renders the UTC day of an instant', () => {
    expect(formatDate('2026-03-15T23:30:00Z', 'YYYY-MM-DD')).toBe('2026-03-15');
    expect(formatDate('2026-03-16T00:30:00Z', 'YYYY-MM-DD')).toBe('2026-03-16');
  });
});

describe('formatDateTime', () => {
  const date = new Date(Date.UTC(2026, 2, 15, 14, 30));

  it('formats as DD.MM.YYYY HH:mm', () => {
    expect(formatDateTime(date, 'DD.MM.YYYY')).toBe('15.03.2026 14:30');
  });

  it('formats as MM/DD/YYYY HH:mm', () => {
    expect(formatDateTime(date, 'MM/DD/YYYY')).toBe('03/15/2026 14:30');
  });

  it('formats as YYYY-MM-DD HH:mm', () => {
    expect(formatDateTime(date, 'YYYY-MM-DD')).toBe('2026-03-15 14:30');
  });

  it('formats the time in 12-hour clock when requested', () => {
    expect(formatDateTime(date, 'MM/DD/YYYY', '12h')).toBe('03/15/2026 2:30 PM');
  });

  it('formats an ISO instant in UTC', () => {
    expect(formatDateTime('2026-03-15T23:45:00Z', 'YYYY-MM-DD')).toBe('2026-03-15 23:45');
  });
});

describe('formatClockTime', () => {
  it('formats 24-hour by default', () => {
    expect(formatClockTime(new Date(Date.UTC(2026, 2, 15, 9, 5)))).toBe('09:05');
  });

  it('formats 12-hour', () => {
    expect(formatClockTime(new Date(Date.UTC(2026, 2, 15, 0, 5)), '12h')).toBe('12:05 AM');
  });
});

describe('formatDateLong', () => {
  const date = new Date(Date.UTC(2026, 2, 15));

  it('formats long European style', () => {
    const result = formatDateLong(date, 'DD.MM.YYYY');
    expect(result).toContain('2026');
    expect(result).toContain('15');
  });

  it('formats long US style', () => {
    const result = formatDateLong(date, 'MM/DD/YYYY');
    expect(result).toContain('2026');
    expect(result).toContain('15');
  });

  it('formats long ISO style', () => {
    const result = formatDateLong(date, 'YYYY-MM-DD');
    expect(result).toContain('2026-03-15');
  });

  it('renders a bare YYYY-MM-DD as that calendar day', () => {
    expect(formatDateLong('2006-08-15', 'YYYY-MM-DD')).toBe('Tuesday, 2006-08-15');
  });
});
