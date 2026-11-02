import { format, startOfToday } from 'date-fns';
import { supabase } from './supabase.js';

// Columns returned for session queries. The subject details come from a join with the subjects table.
const SESSION_COLUMNS =
  'id, subject_id, topic, notes, session_date, start_time, end_time, duration, session_type, status, actual_minutes, subjects ( subject_name, exam_date )';

// Get the student's sessions from today onward, in time order
export async function listUpcomingSessions(userId) {
  const today = format(startOfToday(), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('study_sessions')
    .select(SESSION_COLUMNS)
    .eq('user_id', userId)
    .gte('session_date', today)
    .order('session_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data;
}

// Get every session for the student, past and future, in time order
export async function listAllSessions(userId) {
  const { data, error } = await supabase
    .from('study_sessions')
    .select(SESSION_COLUMNS)
    .eq('user_id', userId)
    .order('session_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data;
}

// Replace the student's unfinished timetable with a new one
export async function saveTimetable(userId, sessions) {
  const today = format(startOfToday(), 'yyyy-MM-dd');

  // 1. Remove planned sessions from today onward. Completed sessions are kept as history.
  const { error: deleteError } = await supabase
    .from('study_sessions')
    .delete()
    .eq('user_id', userId)
    .eq('status', 'Planned')
    .gte('session_date', today);
  if (deleteError) throw deleteError;

  // 2. Insert the new sessions. Only database columns are sent, so the display-only subject_name is dropped.
  const rows = sessions.map((session) => ({
    user_id: userId,
    subject_id: session.subject_id,
    topic: session.topic,
    session_date: session.session_date,
    start_time: session.start_time,
    end_time: session.end_time,
    duration: session.duration,
    session_type: session.session_type,
    status: session.status,
  }));

  const BATCH_SIZE = 200;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const { error } = await supabase.from('study_sessions').insert(rows.slice(i, i + BATCH_SIZE));
    if (error) throw error;
  }

  // 3. Recalculate progress for every subject
  await refreshProgress(userId);

  return rows.length;
}

// Add a single new session (used when a missed topic is moved to a free slot)
export async function insertSession(userId, row) {
  const { data, error } = await supabase
    .from('study_sessions')
    .insert({ ...row, user_id: userId })
    .select(SESSION_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

// Change one session: status, date, time, topic, notes or tracked minutes
export async function updateSession(sessionId, changes) {
  const { data, error } = await supabase
    .from('study_sessions')
    .update(changes)
    .eq('id', sessionId)
    .select(SESSION_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

// Recalculate the study_progress table from the study_sessions table.
// Skipped sessions are not counted in the total.
export async function refreshProgress(userId) {
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id')
    .eq('user_id', userId);
  if (subjectsError) throw subjectsError;

  const { data: sessions, error: sessionsError } = await supabase
    .from('study_sessions')
    .select('subject_id, status')
    .eq('user_id', userId);
  if (sessionsError) throw sessionsError;

  const rows = subjects.map((subject) => {
    const mine = sessions.filter((s) => s.subject_id === subject.id && s.status !== 'Skipped');
    const total = mine.length;
    const completed = mine.filter((s) => s.status === 'Completed').length;

    return {
      user_id: userId,
      subject_id: subject.id,
      total_sessions: total,
      completed_sessions: completed,
      progress_percentage: total > 0 ? Math.round((completed / total) * 10000) / 100 : 0,
    };
  });

  if (rows.length > 0) {
    const { error } = await supabase
      .from('study_progress')
      .upsert(rows, { onConflict: 'user_id,subject_id' });
    if (error) throw error;
  }
}