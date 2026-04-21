import { describe, it, expect } from 'vitest';
import { formatDuration, formatColonHM, parseDuration, minutesToDecimalHours, decimalHoursToMinutes } from '../../lib/duration';

describe('formatDuration', () => {
  describe('hm format', () => {
    it('formats zero minutes', () => {
      expect(formatDuration(0, 'hm')).toBe('0h 0m');
    });

    it('formats hours and minutes', () => {
      expect(formatDuration(90, 'hm')).toBe('1h 30m');
    });

    it('formats exact hours', () => {
      expect(formatDuration(120, 'hm')).toBe('2h 0m');
    });

    it('formats minutes only', () => {
      expect(formatDuration(45, 'hm')).toBe('0h 45m');
    });
  });

  describe('decimal format with dot separator', () => {
    it('formats zero minutes', () => {
      expect(formatDuration(0, 'decimal', 'dot')).toBe('0.0h');
    });

    it('formats 90 minutes as 1.5h', () => {
      expect(formatDuration(90, 'decimal', 'dot')).toBe('1.5h');
    });

    it('formats 120 minutes as 2.0h', () => {
      expect(formatDuration(120, 'decimal', 'dot')).toBe('2.0h');
    });

    it('uses dot as default separator', () => {
      expect(formatDuration(90, 'decimal')).toBe('1.5h');
    });
  });

  describe('decimal format with comma separator', () => {
    it('formats 90 minutes as 1,5h', () => {
      expect(formatDuration(90, 'decimal', 'comma')).toBe('1,5h');
    });

    it('formats 120 minutes as 2,0h', () => {
      expect(formatDuration(120, 'decimal', 'comma')).toBe('2,0h');
    });

    it('formats 45 minutes as 0,8h', () => {
      expect(formatDuration(45, 'decimal', 'comma')).toBe('0,8h');
    });
  });
});

describe('formatColonHM', () => {
  it('formats 90 minutes as 1:30', () => {
    expect(formatColonHM(90)).toBe('1:30');
  });

  it('formats 5 minutes as 0:05', () => {
    expect(formatColonHM(5)).toBe('0:05');
  });

  it('formats 120 minutes as 2:00', () => {
    expect(formatColonHM(120)).toBe('2:00');
  });
});

describe('parseDuration', () => {
  it('parses colon format', () => {
    expect(parseDuration('1:30')).toBe(90);
  });

  it('parses h/m format', () => {
    expect(parseDuration('1h 30m')).toBe(90);
  });

  it('parses decimal format', () => {
    expect(parseDuration('1.5')).toBe(90);
  });

  it('parses plain minutes', () => {
    expect(parseDuration('90')).toBe(90);
  });

  it('returns null for empty string', () => {
    expect(parseDuration('')).toBeNull();
  });

  it('rejects minutes >= 60 in colon format', () => {
    expect(parseDuration('1:75')).toBeNull();
  });

  it('rejects negative numbers', () => {
    expect(parseDuration('-5')).toBeNull();
  });
});

describe('minutesToDecimalHours', () => {
  it('converts 90 minutes to 1.5', () => {
    expect(minutesToDecimalHours(90)).toBe(1.5);
  });
});

describe('decimalHoursToMinutes', () => {
  it('converts 1.5 hours to 90 minutes', () => {
    expect(decimalHoursToMinutes(1.5)).toBe(90);
  });
});
