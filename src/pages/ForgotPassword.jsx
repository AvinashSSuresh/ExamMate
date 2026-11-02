import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout, { FormMessage } from '../components/AuthLayout.jsx';
import { sendPasswordResetEmail } from '../services/authService.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setSubmitting(true);
    try {
      await sendPasswordResetEmail(email.trim());
      // Same message whether or not the account exists, so emails cannot be probed
      setMessage('If an account exists for this email, a password reset link is on its way.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link"
      footer={
        <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="email" className="block text-sm text-slate-300 mb-2">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="you@example.com"
          />
        </div>

        <FormMessage type="error">{error}</FormMessage>
        <FormMessage type="success">{message}</FormMessage>

        <button type="submit" disabled={submitting} className="btn-gradient mt-2">
          {submitting ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
    </AuthLayout>
  );
}