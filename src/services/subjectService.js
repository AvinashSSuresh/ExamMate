import { supabase } from './supabase.js';

// Columns returned for every subject query
const SUBJECT_COLUMNS =
  'id, user_id, subject_name, exam_date, exam_time, difficulty, preparation_level, chapters_count, priority, important_topics, created_at, updated_at';

// Convert form values into the exact column names used in the subjects table
function toSubjectRow(values) {
  return {
    subject_name: values.subject_name.trim(),
    exam_date: values.exam_date,
    exam_time: values.exam_time || null,
    difficulty: values.difficulty,
    preparation_level: values.preparation_level,
    chapters_count: Number(values.chapters_count),
    priority: Number(values.priority),
    important_topics: values.important_topics?.trim() || null,
  };
}

// Get all subjects for the logged-in student, soonest exam first
export async function listSubjects(userId) {
  const { data, error } = await supabase
    .from('subjects')
    .select(SUBJECT_COLUMNS)
    .eq('user_id', userId)
    .order('exam_date', { ascending: true });
  if (error) throw error;
  return data;
}

// Add a new subject for the logged-in student
export async function createSubject(userId, values) {
  const { data, error } = await supabase
    .from('subjects')
    .insert({ ...toSubjectRow(values), user_id: userId })
    .select(SUBJECT_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

// Update an existing subject
export async function updateSubject(subjectId, values) {
  const { data, error } = await supabase
    .from('subjects')
    .update(toSubjectRow(values))
    .eq('id', subjectId)
    .select(SUBJECT_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

// Delete a subject. Its study sessions and progress are removed by the database (ON DELETE CASCADE).
export async function deleteSubject(subjectId) {
  const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
  if (error) throw error;
}