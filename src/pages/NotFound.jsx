import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 pt-32 pb-16">
      <div className="glass rounded-3xl p-10 text-center max-w-md w-full">
        <CalendarDays className="mx-auto text-purple-400 mb-4" size={40} />
        <p className="text-sm text-purple-400 font-semibold">404</p>
        <h1 className="text-3xl font-bold mt-2">Page not found</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-3">
          The page you are looking for does not exist or has moved.
        </p>
        <Link to="/" className="btn-gradient inline-block mt-8">
          Back to home
        </Link>
      </div>
    </main>
  );
}