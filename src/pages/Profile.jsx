import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import {
  fetchProfile,
  logoutUser,
  saveProfileName,
  sendPasswordResetEmail,
} from '../services/authService.js';
import { FormMessage } from '../components/AuthLayout.jsx';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchProfile(user.id)
      .then((data) => {
        setProfile(data);
        setFullName(data.full_name || '');
      })
      .catch((err) => setError(err.message));
  }, [user]);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!fullName.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const updated = await saveProfileName(user.id, fullName.trim());
      setProfile(updated);
      setMessage('Profile updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    setError('');
    setMessage('');
    try {
      await sendPasswordResetEmail(user.email);
      setMessage('A password reset link has been sent to your email.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="flex-1 px-6 pt-32 pb-16">
      <div className="max-w-2xl mx-auto glass rounded-3xl p-8">
        <h1 className="text-3xl font-bold">Your Profile</h1>
        <p className="text-slate-400 mt-2">Manage your account details</p>

        <form onSubmit={handleSave} className="mt-8 flex flex-col gap-5">
          <div>
            <label htmlFor="fullName" className="block text-sm text-slate-300 mb-2">Full name</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Email</label>
            <input type="email" value={profile?.email || user?.email || ''} disabled className="input-field opacity-60 cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Member since</label>
            <p className="text-slate-400">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
            </p>
          </div>

          <FormMessage type="error">{error}</FormMessage>
          <FormMessage type="success">{message}</FormMessage>

          <button type="submit" disabled={saving} className="btn-gradient mt-2">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row gap-4">
          <button onClick={handlePasswordReset} className="glass rounded-xl px-5 py-3 hover:bg-white/10 transition-colors">
            Change Password
          </button>
          <button onClick={handleLogout} className="glass rounded-xl px-5 py-3 flex items-center justify-center gap-2 hover:bg-white/10 transition-colors text-rose-300">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>
    </main>
  );
}