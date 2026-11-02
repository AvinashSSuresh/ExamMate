import { supabase } from './supabase.js';

// Create a new student account. The name is stored in user metadata, and the
// database trigger from Phase 2 creates the matching row in the profiles table.
export async function registerUser({ fullName, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });
  if (error) throw error;
  return data;
}

// Log in with email and password
export async function loginUser({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// End the current session
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Send a password reset link to the given email
export async function sendPasswordResetEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

// Set a new password for the currently signed-in user (used after a reset link)
export async function updateAccountPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// Read the logged-in student's profile row
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, created_at')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// Save a new display name in both the profiles table and the auth metadata
export async function saveProfileName(userId, fullName) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', userId)
    .select('id, full_name, email, created_at')
    .single();
  if (error) throw error;

  const { error: metaError } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  });
  if (metaError) throw metaError;

  return data;
}