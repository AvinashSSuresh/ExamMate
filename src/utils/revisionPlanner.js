import { addDays, format, parseISO, startOfToday } from 'date-fns';
import { insertSession, refreshProgress, updateSession } from '../services/timetableService.js';
import { addMinutesToTime, findFreeSlot, loadScheduleContext } from './rescheduleUtils.js';

// Days after a study session on which its topic is revised (spaced repetition)
export const REVISION_INTERVALS = [1, 3, 7];

// Builds the database row for a session placed in a free slot
function buildRow({ subjectId, topic, sessionType, duration, slot }) {
  return {
    subject_id: subjectId,
    topic,
    notes: null,
    session_date: slot.dateKey,
    start_time: slot.startTime,
    end_time: slot.endTime,
    duration,
    session_type: sessionType,
    status: 'Planned',
  };
}

// After a study session is completed, plan revision sessions 1, 3 and 7 days later.
// Revisions that already exist are not duplicated, and days after the exam are skipped.
export async function planSpacedRevisions({ userId, session }) {
  if (session.session_type !== 'Study') return { added: 0 };

  const examKey = session.subjects?.exam_date || null;
  const topicName = session.topic || 'Studied topic';
  const { availability, sessions } = await loadScheduleContext(userId);
  const today = startOfToday();

  // Titles of revisions already planned for this subject
  const existingTitles = new Set(
    sessions
      .filter((s) => s.subject_id === session.subject_id && s.session_type === 'Revision' && s.status !== 'Skipped')
      .map((s) => s.topic)
  );

  let added = 0;

  for (const interval of REVISION_INTERVALS) {
    const title = `Spaced revision: ${topicName} (day ${interval})`;
    if (existingTitles.has(title)) continue;

    const targetKey = format(addDays(today, interval), 'yyyy-MM-dd');
    const slot = findFreeSlot({
      availability,
      sessions,
      duration: session.duration,
      examKey,
      fromKey: targetKey,
    });
    if (!slot) continue;

    const inserted = await insertSession(
      userId,
      buildRow({
        subjectId: session.subject_id,
        topic: title,
        sessionType: 'Revision',
        duration: session.duration,
        slot,
      })
    );

    sessions.push(inserted);
    existingTitles.add(title);
    added += 1;
  }

  return { added };
}

// Adds a full mock test for a subject. It is placed close to the exam where possible.
export async function addMockTest({ userId, subjectId, subjectName, examKey, duration }) {
  const { availability, sessions } = await loadScheduleContext(userId);
  const today = startOfToday();

  // Aim for the three days before the exam, falling back to any free slot from today
  const examDate = parseISO(examKey);
  const threeDaysBefore = addDays(examDate, -3);
  const preferredFrom = threeDaysBefore > today ? threeDaysBefore : today;

  const slot =
    findFreeSlot({ availability, sessions, duration, examKey, fromKey: format(preferredFrom, 'yyyy-MM-dd') }) ||
    findFreeSlot({ availability, sessions, duration, examKey, fromKey: format(today, 'yyyy-MM-dd') });

  if (!slot) {
    throw new Error(`No free slot is left before the ${subjectName} exam for a mock test.`);
  }

  return insertSession(
    userId,
    buildRow({
      subjectId,
      topic: `Mock test: ${subjectName}`,
      sessionType: 'Mock Test',
      duration,
      slot,
    })
  );
}

// Moves every unfinished (Planned) session on a given date into the next free slots.
// Each original is marked Skipped and a new Planned session is created in a free slot.
export async function moveUnfinishedSessions({ userId, dateKey }) {
  const { availability, sessions } = await loadScheduleContext(userId);

  const unfinished = sessions
    .filter((s) => s.session_date === dateKey && s.status === 'Planned')
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  let moved = 0;
  let failed = 0;

  for (const original of unfinished) {
    const examKey = original.subjects?.exam_date || null;

    // Close the original first, so its own time is not treated as a clash
    await updateSession(original.id, { status: 'Skipped' });
    original.status = 'Skipped';

    const slot = findFreeSlot({
      availability,
      sessions,
      duration: original.duration,
      examKey,
      fromKey: dateKey,
    });

    if (!slot) {
      // Nothing free: restore the original so it is not lost
      await updateSession(original.id, { status: 'Planned' });
      original.status = 'Planned';
      failed += 1;
      continue;
    }

    const inserted = await insertSession(
      userId,
      buildRow({
        subjectId: original.subject_id,
        topic: original.topic,
        sessionType: original.session_type,
        duration: original.duration,
        slot,
      })
    );

    sessions.push(inserted);
    moved += 1;
  }

  await refreshProgress(userId);
  return { moved, failed };
}

export { addMinutesToTime };