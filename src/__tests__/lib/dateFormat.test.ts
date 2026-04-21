import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatDateLong } from '../../lib/dateFormat';

describe('formatDate', () => {
  // Use a fixed date: 2026-03-15
  const date = new Date(2026, 2, 15); // March 15, 2026

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
});

describe('formatDateTime', () => {
  const date = new Date(2026, 2, 15, 14, 30);

  it('formats as DD.MM.YYYY HH:mm', () => {
    expect(formatDateTime(date, 'DD.MM.YYYY')).toBe('15.03.2026 14:30');
  });

  it('formats as MM/DD/YYYY HH:mm', () => {
    expect(formatDateTime(date, 'MM/DD/YYYY')).toBe('03/15/2026 14:30');
  });

  it('formats as YYYY-MM-DD HH:mm', () => {
    expect(formatDateTime(date, 'YYYY-MM-DD')).toBe('2026-03-15 14:30');
  });
});

describe('formatDateLong', () => {
  const date = new Date(2026, 2, 15); // Sunday, March 15, 2026

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
});
