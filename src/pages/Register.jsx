import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import AuthLayout, { FormMessage } from '../components/AuthLayout.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { registerUser } from '../services/authService.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already logged in: go straight to the dashboard
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function validate() {
    if (!form.fullName.trim()) return 'Please enter your full name.';
    if (!EMAIL_PATTERN.test(form.email.trim())) return 'Please enter a valid email address.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const data = await registerUser({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      if (data.session) {
        // Email confirmation is off: the student is logged in immediately
        navigate('/dashboard', { replace: true });
      } else {
        // Email confirmation is on: ask the student to check their inbox
        setMessage('Account created. Check your email to confirm your address, then log in.');
        setForm({ fullName: '', email: '', password: '', confirmPassword: '' });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start building your personalized study plan"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="fullName" className="block text-sm text-slate-300 mb-2">Full name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            value={form.fullName}
            onChange={handleChange}
            className="input-field"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm text-slate-300 mb-2">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            className="input-field"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-slate-300 mb-2">Password</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              className="input-field pr-12"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm text-slate-300 mb-2">Confirm password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            className="input-field"
            placeholder="Re-enter your password"
          />
        </div>

        <FormMessage type="error">{error}</FormMessage>
        <FormMessage type="success">{message}</FormMessage>

        <button type="submit" disabled={submitting} className="btn-gradient inline-flex items-center justify-center gap-2 mt-2">
          {submitting ? 'Creating account...' : 'Create Account'} {!submitting && <ArrowRight size={18} />}
        </button>
      </form>
    </AuthLayout>
  );
}