import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  Clock,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { logoutUser } from '../services/authService.js';
import ThemeToggle from './ThemeToggle.jsx';

// Section links point to anchors on the home page
const sectionLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
];

const linkClass =
  'px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white flex items-center gap-2 transition-colors';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    setMenuOpen(false);
    try {
      await logoutUser();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Logout failed:', err.message);
    }
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 glass">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-extrabold">
          <span className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 text-white">
            <CalendarDays size={20} />
          </span>
          <span className="gradient-text">ExamMate</span>
        </Link>

        {/* Desktop section links */}
        <ul className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
          {sectionLinks.map((link) => (
            <li key={link.label}>
              <a href={link.href} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop auth and app actions */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link to="/subjects" className={linkClass}>
                <BookOpen size={16} /> Subjects
              </Link>
              <Link to="/availability" className={linkClass}>
                <Clock size={16} /> Availability
              </Link>
              <Link to="/timetable" className={linkClass}>
                <CalendarClock size={16} /> Timetable
              </Link>
              <Link to="/dashboard" className={linkClass}>
                <LayoutDashboard size={16} /> Dashboard
              </Link>
              <Link to="/profile" className={linkClass}>
                <UserRound size={16} /> Profile
              </Link>
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="glass rounded-xl px-4 py-2 text-sm font-medium hover:bg-white/10 flex items-center gap-2"
              >
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Link to="/login" className={linkClass}>
                Login
              </Link>
              <Link to="/register" className="btn-gradient !py-2 !px-5 text-sm">
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile controls */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            className="p-2 rounded-lg hover:bg-white/10"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-white/10 px-6 py-4 flex flex-col gap-4 text-slate-700 dark:text-slate-200">
          {sectionLinks.map((link) => (
            <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)} className="hover:text-slate-900 dark:hover:text-white">
              {link.label}
            </a>
          ))}

          {user ? (
            <>
              <Link to="/subjects" onClick={() => setMenuOpen(false)} className="hover:text-slate-900 dark:hover:text-white">Subjects</Link>
              <Link to="/availability" onClick={() => setMenuOpen(false)} className="hover:text-slate-900 dark:hover:text-white">Availability</Link>
              <Link to="/timetable" onClick={() => setMenuOpen(false)} className="hover:text-slate-900 dark:hover:text-white">Timetable</Link>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="hover:text-slate-900 dark:hover:text-white">Dashboard</Link>
              <Link to="/profile" onClick={() => setMenuOpen(false)} className="hover:text-slate-900 dark:hover:text-white">Profile</Link>
              <button onClick={handleLogout} className="text-left text-rose-500 dark:text-rose-300">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="hover:text-slate-900 dark:hover:text-white">Login</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-gradient text-center !py-2">
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}