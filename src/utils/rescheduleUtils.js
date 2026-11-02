import { addDays, differenceInCalendarDays, format, parseISO, startOfToday } from 'date-fns';
import { getAvailability } from '../services/availabilityService.js';
import { listAllSessions } from '../services/timetableService.js';
import { getFreeIntervals } from './scheduler.js';
import { minutesAfterWake, timeToMinutes } from './availabilityUtils.js';

// How far ahead to search for a free slot, and how finely to step through the day
const SEARCH_DAYS = 60;
const STEP_MINUTES = 15;

// Minutes after midnight -> "HH:MM"
export function toHHMM(totalMinutes) {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

// Adds minutes to an "HH:MM" time, wrapping past midnight
export function addMinutesToTime(time, minutes) {
  return toHHMM(timeToMinutes(time) + minutes);
}

// Returns an error message if the slot cannot be used, or null if it is valid.
// examKey is the exam date as "yyyy-MM-dd". ignoreId skips the session being moved.
export function checkSlot({
  availability,
  sessions,
  dateKey,
  startTime,
  duration,
  examKey = null,
  ignoreId = null,
  now = new Date(),
}) {
  const date = parseISO(dateKey);
  const daysFromToday = differenceInCalendarDays(date, startOfToday());

  if (daysFromToday < 0) return 'Choose today or a later date.';

  if (examKey && differenceInCalendarDays(parseISO(examKey), date) < 1) {
    return 'Sessions must be scheduled before the exam day.';
  }

  if (!availability.available_days.includes(format(date, 'EEE'))) {
    return 'That day is not one of your study days.';
  }

  const startMinutes = timeToMinutes(startTime);
  if (daysFromToday === 0 && startMinutes < now.getHours() * 60 + now.getMinutes()) {
    return 'That time has already passed today.';
  }

  // The slot must sit inside one free range (study hours, minus college or work)
  const relStart = minutesAfterWake(startTime, availability.wake_up_time);
  const relEnd = relStart + duration;
  const fitsWindow = getFreeIntervals(availability).some(([start, end]) => relStart >= start && relEnd <= end);
  if (!fitsWindow) {
    return 'That time is outside your study hours or overlaps your college or work hours.';
  }

  // The slot must not overlap another active session on the same day
  const endMinutes = startMinutes + duration;
  const clash = sessions.find(
    (s) =>
      s.id !== ignoreId &&
      s.session_date === dateKey &&
      s.status !== 'Skipped' &&
      startMinutes < timeToMinutes(s.end_time) &&
      endMinutes > timeToMinutes(s.start_time)
  );
  if (clash) {
    return `That overlaps ${clash.subjects?.subject_name || 'another session'} at ${clash.start_time.slice(0, 5)}.`;
  }

  return null;
}

// Loads the availability settings and all sessions once, for use by several slot searches
export async function loadScheduleContext(userId) {
  const availability = await getAvailability(userId);
  if (!availability) throw new Error('Save your availability before moving sessions.');

  const sessions = await listAllSessions(userId);
  return { availability, sessions };
}

// Synchronous slot search. Starts at fromKey (or today), and never returns a slot on or after the exam.
// Returns { dateKey, startTime, endTime } or null if nothing is free.
export function findFreeSlot({ availability, sessions, duration, examKey = null, fromKey = null }) {
  const wakeMinutes = timeToMinutes(availability.wake_up_time);
  const intervals = getFreeIntervals(availability);
  const today = startOfToday();

  const fromDate = fromKey ? parseISO(fromKey) : today;
  const firstOffset = Math.max(0, differenceInCalendarDays(fromDate, today));

  for (let offset = firstOffset; offset <= firstOffset + SEARCH_DAYS; offset++) {
    const date = addDays(today, offset);
    const dateKey = format(date, 'yyyy-MM-dd');

    if (examKey && differenceInCalendarDays(parseISO(examKey), date) < 1) break;

    for (const [start, end] of intervals) {
      for (let rel = start; rel + duration <= end; rel += STEP_MINUTES) {
        const startTime = toHHMM(wakeMinutes + rel);
        const problem = checkSlot({ availability, sessions, dateKey, startTime, duration, examKey });

        if (!problem) {
          return { dateKey, startTime, endTime: addMinutesToTime(startTime, duration) };
        }
      }
    }
  }

  return null;
}

// Async version that loads the data itself. Used for single-session moves.
export async function findNextFreeSlot({ userId, duration, examKey = null }) {
  const { availability, sessions } = await loadScheduleContext(userId);
  return findFreeSlot({ availability, sessions, duration, examKey });
}