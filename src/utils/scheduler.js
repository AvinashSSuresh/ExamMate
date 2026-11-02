import { addDays, differenceInCalendarDays, format, parseISO, startOfToday } from 'date-fns';
import { calculatePriorityScores, DEFAULT_WEIGHTS } from './priorityCalculator.js';
import { minutesAfterWake, timeToMinutes } from './availabilityUtils.js';

// ---------------------------------------------------------------------
// Tuning constants. Adjust these to change how the timetable is built.
// ---------------------------------------------------------------------

// Never plan further than this many days ahead
const MAX_HORIZON_DAYS = 120;

// Free gaps shorter than this (in minutes) are ignored
const MIN_FREE_BLOCK = 30;

// Estimated learning time per chapter, by difficulty
const HOURS_PER_CHAPTER = { Easy: 1, Medium: 1.5, Hard: 2.5 };

// Share of the material still left to learn, by preparation level
const REMAINING_SHARE = { 'Not Started': 1, Beginner: 0.8, Intermediate: 0.5, 'Well Prepared': 0.2 };

// Days before the exam reserved for revision and practice, by difficulty
const REVISION_WINDOW_DAYS = { Easy: 2, Medium: 3, Hard: 4 };

// Revision and practice sessions as a share of the learning sessions
const REVISION_RATIO = 0.25;

// After this many new-topic sessions, a short recap session is inserted
const RECAP_EVERY = 3;

// ---------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------

// Formats minutes after midnight as "HH:MM"
function toHHMM(totalMinutes) {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Which part of the day an absolute time (minutes after midnight) falls in
function bandOf(absoluteMinutes) {
  const minutes = ((absoluteMinutes % 1440) + 1440) % 1440;
  if (minutes >= 300 && minutes < 720) return 'Morning';
  if (minutes >= 720 && minutes < 1020) return 'Afternoon';
  if (minutes >= 1020 && minutes < 1260) return 'Evening';
  return 'Night';
}

// Splits the topics text box into a clean list
function parseTopics(text) {
  return (text || '')
    .split(/[,\n]/)
    .map((topic) => topic.trim())
    .filter(Boolean);
}

// Work out the free study ranges for one day, measured in minutes after wake-up.
// Study hours are the window, and any college or work hours are cut out of it.
export function getFreeIntervals(availability) {
  const wake = availability.wake_up_time;
  const studyStart = minutesAfterWake(availability.study_start_time, wake);
  const studyEnd = minutesAfterWake(availability.study_end_time, wake);

  let intervals = studyEnd > studyStart ? [[studyStart, studyEnd]] : [];

  if (availability.college_start_time && availability.college_end_time) {
    const collegeStart = minutesAfterWake(availability.college_start_time, wake);
    const collegeEnd = minutesAfterWake(availability.college_end_time, wake);

    intervals = intervals.flatMap(([start, end]) => {
      const parts = [];
      if (collegeStart > start) parts.push([start, Math.min(collegeStart, end)]);
      if (collegeEnd < end) parts.push([Math.max(collegeEnd, start), end]);
      return parts;
    });
  }

  return intervals.filter(([start, end]) => end - start >= MIN_FREE_BLOCK);
}

// Cuts each free range into session-sized slots, with a break between slots.
// Every slot returned is non-overlapping.
function buildDaySlots(intervals, sessionMinutes, breakMinutes) {
  const slots = [];

  for (const [start, end] of intervals) {
    let cursor = start;
    while (end - cursor >= sessionMinutes) {
      slots.push({ startRel: cursor, endRel: cursor + sessionMinutes });
      cursor += sessionMinutes + breakMinutes;
    }
  }

  return slots;
}

// Which chapter a given learning session belongs to, spreading all chapters across the sessions
function chapterIndex(learnedSoFar, learningTotal, chapterCount) {
  if (learningTotal <= 1) return 0;
  return Math.min(chapterCount - 1, Math.floor((learnedSoFar * chapterCount) / learningTotal));
}

// Topic label: the student's own topic name if they gave one, otherwise "Chapter N"
function topicLabel(state, index) {
  return state.topics[index] || `Chapter ${index + 1}`;
}

// Builds the planning state for one subject
function createSubjectState(subject, score, sessionMinutes) {
  const chapterCount = Math.max(1, subject.chapters_count);
  const learningMinutes =
    chapterCount *
    HOURS_PER_CHAPTER[subject.difficulty] *
    60 *
    REMAINING_SHARE[subject.preparation_level];

  const learningTotal = Math.max(1, Math.ceil(learningMinutes / sessionMinutes));
  const revisionTotal = Math.max(1, Math.ceil(learningTotal * REVISION_RATIO));

  return {
    id: subject.id,
    name: subject.subject_name,
    examDate: parseISO(subject.exam_date),
    chapterCount,
    topics: parseTopics(subject.important_topics),
    revisionWindow: REVISION_WINDOW_DAYS[subject.difficulty],
    weight: 0.5 + score, // Higher score means the subject is picked more often

    learningTotal,
    learningLeft: learningTotal,
    learningDone: 0,
    learnedSinceRecap: 0,

    revisionTotal,
    revisionLeft: revisionTotal,
    revisionCount: 0,
    mockDone: false,

    eligibleAfter: [], // Slots from this point onward that this subject may use
    revAfter: [],      // Slots from this point onward that fall in the revision window
    eligibleTotal: 0,
  };
}

// ---------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------

// Generates the timetable. Returns { sessions, warnings, summary }.
// Nothing is saved here. The caller decides what to store.
export function generateTimetable({ subjects = [], availability = null, weights = DEFAULT_WEIGHTS, now = new Date() }) {
  const warnings = [];
  const emptySummary = { totalSessions: 0, totalMinutes: 0, studyDays: 0, totalAvailableHours: 0, perSubject: [] };

  if (subjects.length === 0) {
    return { sessions: [], warnings: ['Add at least one subject before generating a timetable.'], summary: emptySummary };
  }
  if (!availability) {
    return { sessions: [], warnings: ['Save your availability before generating a timetable.'], summary: emptySummary };
  }

  const today = startOfToday();
  const sessionMinutes = Number(availability.session_duration);
  const breakMinutes = Number(availability.break_duration);
  const budgetMinutes = Math.round(Number(availability.daily_study_hours) * 60);
  const wakeMinutes = timeToMinutes(availability.wake_up_time);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Step 1: priority scores for every subject
  const scores = calculatePriorityScores(subjects, weights);

  // Step 2: skip subjects whose exam is today or has passed
  const schedulable = subjects.filter((subject) => {
    const gap = differenceInCalendarDays(parseISO(subject.exam_date), today);
    if (gap < 1) {
      warnings.push(`${subject.subject_name}: the exam is today or has already passed, so no sessions were scheduled.`);
    }
    return gap >= 1;
  });

  if (schedulable.length === 0) {
    return { sessions: [], warnings, summary: emptySummary };
  }

  const states = schedulable.map((subject) => createSubjectState(subject, scores[subject.id], sessionMinutes));

  // Step 3: find the free study slots on every allowed day, up to the day before the last exam
  const dailyCandidates = buildDaySlots(getFreeIntervals(availability), sessionMinutes, breakMinutes);

  if (dailyCandidates.length === 0) {
    warnings.push('Your study window is too short to fit one session. Widen the window or shorten the session length.');
    return { sessions: [], warnings, summary: emptySummary };
  }

  const latestExam = new Date(Math.max(...states.map((st) => st.examDate.getTime())));
  const horizonDays = Math.min(differenceInCalendarDays(addDays(latestExam, -1), today), MAX_HORIZON_DAYS);

  const horizon = [];
  let totalAvailableSlots = 0;

  for (let offset = 0; offset <= horizonDays; offset++) {
    const date = addDays(today, offset);
    const dayName = format(date, 'EEE'); // "Mon", "Tue", ...

    if (!availability.available_days.includes(dayName)) continue;

    // Count every slot that exists on this day, before picking the daily budget
    let usable = dailyCandidates;

    // On today, skip slots that have already started
    if (offset === 0) {
      usable = usable.filter((slot) => (wakeMinutes + slot.startRel) % 1440 >= nowMinutes + 5);
    }

    totalAvailableSlots += usable.length;

    // Step 4: fill the daily budget, preferred time of day first, then earlier slots
    const count = Math.min(usable.length, Math.floor(budgetMinutes / sessionMinutes));
    const preferred = availability.preferred_slots || [];

    const picked = [...usable]
      .sort((a, b) => {
        const prefA = preferred.includes(bandOf(wakeMinutes + a.startRel)) ? 0 : 1;
        const prefB = preferred.includes(bandOf(wakeMinutes + b.startRel)) ? 0 : 1;
        if (prefA !== prefB) return prefA - prefB;
        return a.startRel - b.startRel;
      })
      .slice(0, count)
      .sort((a, b) => a.startRel - b.startRel);

    for (const slot of picked) {
      horizon.push({
        date,
        startAbs: (wakeMinutes + slot.startRel) % 1440,
        endAbs: (wakeMinutes + slot.endRel) % 1440,
      });
    }
  }

  if (horizon.length === 0) {
    warnings.push('No study slots fall on your chosen study days before the exams. Add more study days or check your study hours.');
    return { sessions: [], warnings, summary: emptySummary };
  }

  // Step 5: for each subject, count the eligible slots from every point onward.
  // A subject is eligible on a day only if that day is before its exam.
  const H = horizon.length;
  for (const st of states) {
    st.eligibleAfter = new Array(H + 1).fill(0);
    st.revAfter = new Array(H + 1).fill(0);

    for (let i = H - 1; i >= 0; i--) {
      const gap = differenceInCalendarDays(st.examDate, horizon[i].date);
      const eligible = gap >= 1;
      const inWindow = eligible && gap <= st.revisionWindow;

      st.eligibleAfter[i] = st.eligibleAfter[i + 1] + (eligible ? 1 : 0);
      st.revAfter[i] = st.revAfter[i + 1] + (inWindow ? 1 : 0);
    }

    st.eligibleTotal = st.eligibleAfter[0];
  }

  // Step 6: walk through every slot in date order and give it to the most under-scheduled subject
  const sessions = [];
  let lastSubjectId = null;

  horizon.forEach((slot, i) => {
    let best = null;
    let bestScore = 0;

    for (const st of states) {
      const gap = differenceInCalendarDays(st.examDate, slot.date);
      if (gap < 1) continue;

      const inWindow = gap <= st.revisionWindow;
      let pool;
      let remaining;
      let slotsLeft;

      if (inWindow && st.revisionLeft > 0) {
        // Inside the revision window, revision is the priority
        pool = 'revision';
        remaining = st.revisionLeft;
        slotsLeft = st.revAfter[i];
      } else if (st.learningLeft > 0) {
        // Outside the window, learn new material but keep future revision slots free
        pool = 'learning';
        remaining = st.learningLeft;
        slotsLeft = st.eligibleAfter[i] - (st.revisionLeft > 0 ? st.revAfter[i] : 0);
      } else {
        continue;
      }

      // Pressure is how much of the remaining slots this subject needs.
      // 1.0 or more means it must take this slot or fall behind.
      const pressure = remaining / Math.max(1, slotsLeft);
      let score = pressure * st.weight;

      // Small penalty so the same subject is not picked back to back
      if (st.id === lastSubjectId) score *= 0.8;

      if (score > bestScore) {
        bestScore = score;
        best = { st, pool, gap };
      }
    }

    if (!best) return; // Nothing needs this slot, so it stays free

    const { st, pool, gap } = best;
    let sessionType;
    let topic;

    if (pool === 'revision') {
      st.revisionLeft -= 1;

      if (gap === 1 && !st.mockDone) {
        // The day before the exam is a full mock test
        sessionType = 'Mock Test';
        topic = 'Full mock examination';
        st.mockDone = true;
      } else if (st.revisionCount % 2 === 0) {
        sessionType = 'Revision';
        topic = 'Revise all studied chapters';
      } else {
        sessionType = 'Practice';
        topic = 'Practice questions and past papers';
      }
      st.revisionCount += 1;
    } else if (st.learnedSinceRecap >= RECAP_EVERY) {
      // Short recap of earlier material, so studied topics are not forgotten
      st.learnedSinceRecap = 0;
      sessionType = 'Revision';
      const lastIndex = chapterIndex(Math.max(0, st.learningDone - 1), st.learningTotal, st.chapterCount);
      topic = `Recap: ${topicLabel(st, lastIndex)}`;
    } else {
      // New material
      const index = chapterIndex(st.learningDone, st.learningTotal, st.chapterCount);
      sessionType = 'Study';
      topic = topicLabel(st, index);
      st.learningDone += 1;
      st.learningLeft -= 1;
      st.learnedSinceRecap += 1;
    }

    sessions.push({
      subject_id: st.id,
      subject_name: st.name, // Used for display only. It is not saved to the database.
      topic,
      session_date: format(slot.date, 'yyyy-MM-dd'),
      start_time: toHHMM(slot.startAbs),
      end_time: toHHMM(slot.endAbs),
      duration: sessionMinutes,
      session_type: sessionType,
      status: 'Planned',
    });

    lastSubjectId = st.id;
  });

  // Step 7: report anything that did not fit
  for (const st of states) {
    if (st.eligibleTotal === 0) {
      warnings.push(`${st.name}: there are no free study days before the exam. Widen your availability or check the exam date.`);
      continue;
    }
    if (st.learningLeft > 0) {
      warnings.push(
        `${st.name}: only ${st.learningDone} of ${st.learningTotal} study sessions fit before the exam. Add study hours, widen the study window or reduce the chapter count.`
      );
    }
    const revisionScheduled = st.revisionTotal - st.revisionLeft;
    if (st.revisionLeft > 0) {
      warnings.push(
        `${st.name}: only ${revisionScheduled} of ${st.revisionTotal} revision sessions fit. Leave a few more free days before the exam.`
      );
    }
  }

  // Step 8: summary for the UI
  const summary = {
    totalSessions: sessions.length,
    totalMinutes: sessions.length * sessionMinutes,
    studyDays: new Set(sessions.map((s) => s.session_date)).size,
    totalAvailableHours: Math.round((totalAvailableSlots * sessionMinutes) / 60),
    perSubject: states.map((st) => ({
      id: st.id,
      name: st.name,
      learningDone: st.learningDone,
      learningTotal: st.learningTotal,
      revisionDone: st.revisionTotal - st.revisionLeft,
      revisionTotal: st.revisionTotal,
    })),
  };

  return { sessions, warnings, summary };
}