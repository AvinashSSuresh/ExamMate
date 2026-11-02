import { motion } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';

// Centered card used by Login, Register, Forgot Password and Reset Password
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="flex-1 flex items-center justify-center px-6 pt-32 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass rounded-3xl p-8"
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <span className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500">
            <CalendarDays size={20} />
          </span>
          <span className="text-xl font-extrabold gradient-text">ExamMate</span>
        </Link>

        <h1 className="text-2xl font-bold text-center">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 text-center mt-2">{subtitle}</p>}

        <div className="mt-8">{children}</div>

        {footer && <div className="mt-6 text-center text-sm text-slate-400">{footer}</div>}
      </motion.div>
    </main>
  );
}

// Error or success message box used inside forms
// Error or success message box used inside forms. Accepts an optional className for grid layouts.
export function FormMessage({ type = 'error', className = '', children }) {
  if (!children) return null;

  const styles =
    type === 'error'
      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';

  return <p className={`text-sm rounded-xl px-4 py-3 border ${styles} ${className}`}>{children}</p>;
}