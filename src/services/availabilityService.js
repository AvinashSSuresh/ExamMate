import { supabase } from './supabase.js';

// Columns returned for the availability query
const AVAILABILITY_COLUMNS =
  'user_id, wake_up_time, sleep_time, study_start_time, study_end_time, college_start_time, college_end_time, daily_study_hours, break_duration, session_duration, available_days, preferred_slots, updated_at';

// Convert form values into the exact column names used in the availability table
function toAvailabilityRow(values) {
  return {
    wake_up_time: values.wake_up_time,
    sleep_time: values.sleep_time,
    study_start_time: values.study_start_time,
    study_end_time: values.study_end_time,
    college_start_time: values.college_start_time || null,
    college_end_time: values.college_end_time || null,
    daily_study_hours: Number(values.daily_study_hours),
    break_duration: Number(values.break_duration),
    session_duration: Number(values.session_duration),
    available_days: values.available_days,
    preferred_slots: values.preferred_slots,
  };
}

// Get the logged-in student's availability. Returns null if none has been saved yet.
export async function getAvailability(userId) {
  const { data, error } = await supabase
    .from('availability')
    .select(AVAILABILITY_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Create or update the student's availability (one row per student)
export async function saveAvailability(userId, values) {
  const { data, error } = await supabase
    .from('availability')
    .upsert({ ...toAvailabilityRow(values), user_id: userId }, { onConflict: 'user_id' })
    .select(AVAILABILITY_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}