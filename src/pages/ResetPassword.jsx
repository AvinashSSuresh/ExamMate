import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout, { FormMessage } from '../components/AuthLayout.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { updateAccountPassword } from '../services/authService.js';

export default function ResetPassword() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await updateAccountPassword(password);
      setMessage('Your password has been updated. Redirecting to your dashboard...');
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Opened without a valid reset link: no session exists
  if (!loading && !user) {
    return (
      <AuthLayout
        title="Link expired"
        subtitle="This reset link is invalid or has expired."
        footer={
          <Link to="/forgot-password" className="text-purple-400 hover:text-purple-300 font-medium">
            Request a new link
          </Link>
        }
      >
        <p className="text-sm text-slate-400 text-center">
          Reset links can only be used once and expire after a short time.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Enter and confirm your new password">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="password" className="block text-sm text-slate-300 mb-2">New password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm text-slate-300 mb-2">Confirm new password</label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field"
            placeholder="Re-enter your new password"
          />
        </div>

        <FormMessage type="error">{error}</FormMessage>
        <FormMessage type="success">{message}</FormMessage>

        <button type="submit" disabled={submitting || loading} className="btn-gradient mt-2">
          {submitting ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </AuthLayout>
  );
}