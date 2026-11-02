// Converts "HH:MM" or "HH:MM:SS" into minutes since midnight
export function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Minutes after the wake-up time. This works for times past midnight,
// for example a sleep time of 01:00 when waking at 07:00.
export function minutesAfterWake(time, wakeUpTime) {
  return (timeToMinutes(time) - timeToMinutes(wakeUpTime) + 1440) % 1440;
}

// Length of the overlap between two ranges of minutes
function overlap(startA, endA, startB, endB) {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

// Minutes available for study each day: the study window minus any college or work hours inside it
export function calculateFreeStudyMinutes(values) {
  const {
    wake_up_time,
    study_start_time,
    study_end_time,
    college_start_time,
    college_end_time,
  } = values;

  if (!wake_up_time || !study_start_time || !study_end_time) return 0;

  const studyStart = minutesAfterWake(study_start_time, wake_up_time);
  const studyEnd = minutesAfterWake(study_end_time, wake_up_time);
  const windowMinutes = Math.max(0, studyEnd - studyStart);

  if (!college_start_time || !college_end_time) return windowMinutes;

  const collegeStart = minutesAfterWake(college_start_time, wake_up_time);
  const collegeEnd = minutesAfterWake(college_end_time, wake_up_time);

  return Math.max(0, windowMinutes - overlap(studyStart, studyEnd, collegeStart, collegeEnd));
}

// Returns an object of field errors. An empty object means the values are valid.
export function validateAvailability(values) {
  const errors = {};

  const {
    wake_up_time,
    sleep_time,
    study_start_time,
    study_end_time,
    college_start_time,
    college_end_time,
    daily_study_hours,
    break_duration,
    session_duration,
    available_days,
    preferred_slots,
  } = values;

  // Wake-up and sleep
  if (!wake_up_time) errors.wake_up_time = 'Wake-up time is required.';
  if (!sleep_time) errors.sleep_time = 'Sleep time is required.';

  const hasDayTimes = wake_up_time && sleep_time;
  const sleepAfterWake = hasDayTimes ? minutesAfterWake(sleep_time, wake_up_time) : 0;

  if (hasDayTimes && sleepAfterWake === 0) {
    errors.sleep_time = 'Sleep time must be different from wake-up time.';
  }

  // Study window
  if (!study_start_time) errors.study_start_time = 'Study start time is required.';
  if (!study_end_time) errors.study_end_time = 'Study end time is required.';

  if (hasDayTimes && sleepAfterWake > 0 && study_start_time && study_end_time) {
    const startRel = minutesAfterWake(study_start_time, wake_up_time);
    const endRel = minutesAfterWake(study_end_time, wake_up_time);

    if (endRel <= startRel) {
      errors.study_end_time = 'Study end must be after study start.';
    } else if (endRel > sleepAfterWake || startRel >= sleepAfterWake) {
      errors.study_end_time = 'Study hours must fall between wake-up and sleep time.';
    }
  }

  // College or work hours: both or neither
  const hasCollegeStart = Boolean(college_start_time);
  const hasCollegeEnd = Boolean(college_end_time);

  if (hasCollegeStart !== hasCollegeEnd) {
    errors.college_end_time = 'Enter both college start and end times, or leave both empty.';
  } else if (hasCollegeStart && hasDayTimes && sleepAfterWake > 0) {
    const collegeStartRel = minutesAfterWake(college_start_time, wake_up_time);
    const collegeEndRel = minutesAfterWake(college_end_time, wake_up_time);

    if (collegeEndRel <= collegeStartRel) {
      errors.college_end_time = 'College end must be after college start.';
    } else if (collegeEndRel > sleepAfterWake || collegeStartRel >= sleepAfterWake) {
      errors.college_end_time = 'College hours must fall between wake-up and sleep time.';
    }
  }

  // Study hours and session settings
  const hours = Number(daily_study_hours);
  if (daily_study_hours === '' || Number.isNaN(hours) || hours <= 0 || hours > 16) {
    errors.daily_study_hours = 'Enter between 0.5 and 16 hours.';
  }

  const breakMinutes = Number(break_duration);
  if (break_duration === '' || !Number.isInteger(breakMinutes) || breakMinutes < 0 || breakMinutes > 60) {
    errors.break_duration = 'Break must be between 0 and 60 minutes.';
  }

  const sessionMinutes = Number(session_duration);
  if (
    session_duration === '' ||
    !Number.isInteger(sessionMinutes) ||
    sessionMinutes < 30 ||
    sessionMinutes > 180
  ) {
    errors.session_duration = 'Session length must be between 30 and 180 minutes.';
  }

  // Check that the requested hours actually fit in the free time
  const windowIsValid = !errors.study_start_time && !errors.study_end_time && !errors.college_end_time;

  if (windowIsValid && !errors.daily_study_hours && hours > 0) {
    const freeMinutes = calculateFreeStudyMinutes(values);
    const requestedMinutes = Math.round(hours * 60);

    if (freeMinutes === 0) {
      errors.study_end_time = 'The study window has no free time after college hours.';
    } else if (requestedMinutes > freeMinutes) {
      errors.daily_study_hours = `Only ${(freeMinutes / 60).toFixed(1)} free hours fit in your study window. Lower this value or widen the window.`;
    } else if (!errors.session_duration && sessionMinutes > freeMinutes) {
      errors.session_duration = `A ${sessionMinutes}-minute session does not fit in the ${(freeMinutes / 60).toFixed(1)} free hours available.`;
    }
  }

  // Days and time-of-day preferences
  if (!available_days || available_days.length === 0) {
    errors.available_days = 'Select at least one study day.';
  }

  if (!preferred_slots || preferred_slots.length === 0) {
    errors.preferred_slots = 'Select at least one preferred study time.';
  }

  return errors;
}