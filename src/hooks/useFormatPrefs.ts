import { useAuthStore } from '../stores/authStore';
import { formatDuration as rawFormatDuration, type TimeDisplayFormat, type DecimalSeparator } from '../lib/duration';
import { formatDate as rawFormatDate, formatDateTime as rawFormatDateTime, formatDateLong as rawFormatDateLong, formatClockTime, type DateFormatPref } from '../lib/dateFormat';
import { formatTimeOfDay, type ClockFormat } from '../lib/timeOfDay';

/**
 * Hook providing user-preference-aware date and duration formatting functions.
 * Uses the current user's dateFormat, clockFormat, timeDisplayFormat, and decimalSeparator settings.
 */
export function useFormatPrefs() {
  const user = useAuthStore((s) => s.user);
  const timeFormat = (user?.timeDisplayFormat as TimeDisplayFormat) ?? 'hm';
  const dateFormatPref = (user?.dateFormat as DateFormatPref) ?? 'DD.MM.YYYY';
  const decSep = (user?.decimalSeparator as DecimalSeparator) ?? 'comma';
  const clockFormat = (user?.clockFormat as ClockFormat) ?? '24h';

  return {
    /** Format a duration in minutes using user's time display + decimal separator prefs */
    fmtDuration: (minutes: number) => rawFormatDuration(minutes, timeFormat, decSep),
    /** Format a date using user's date format pref */
    fmtDate: (date: Date | string) => rawFormatDate(date, dateFormatPref),
    /** Format a date+time using user's date and clock format prefs */
    fmtDateTime: (date: Date | string) => rawFormatDateTime(date, dateFormatPref, clockFormat),
    /** Format the local time of an instant using user's clock format pref */
    fmtClock: (date: Date | string) => formatClockTime(date, clockFormat),
    /** Format a stored `HH:MM[:SS]` time of day using user's clock format pref */
    fmtTimeOfDay: (value: string | null | undefined) => formatTimeOfDay(value, clockFormat),
    /** Format a date in long form (detail pages) */
    fmtDateLong: (date: Date | string) => rawFormatDateLong(date, dateFormatPref),
    /** Raw preferences for edge cases */
    timeFormat,
    dateFormatPref,
    clockFormat,
    decSep,
  };
}
