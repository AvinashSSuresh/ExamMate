import { differenceInCalendarDays, format, isValid, parseISO, startOfToday } from 'date-fns';

// True when the date string is valid and falls today or later
export function isValidExamDate(dateString) {
  if (!dateString) return false;
  const date = parseISO(dateString);
  return isValid(date) && differenceInCalendarDays(date, startOfToday()) >= 0;
}

// Number of calendar days from today until the given date (negative means it has passed)
export function daysUntil(dateString) {
  return differenceInCalendarDays(parseISO(dateString), startOfToday());
}

// Converts "2026-11-09" into "09 Nov 2026"
export function formatDisplayDate(dateString) {
  if (!dateString) return '—';
  return format(parseISO(dateString), 'dd MMM yyyy');
}

// Converts "14:30:00" from the database into "2:30 PM"
export function formatDisplayTime(timeString) {
  if (!timeString) return 'Not set';
  const [hours, minutes] = timeString.split(':').map(Number);
  return format(new Date(2000, 0, 1, hours, minutes), 'h:mm a');
}

// Converts "14:30:00" from the database into "14:30" for <input type="time">
export function toInputTime(timeString) {
  return timeString ? timeString.slice(0, 5) : '';
}