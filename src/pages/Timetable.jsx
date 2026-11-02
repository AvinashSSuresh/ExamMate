import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CalendarClock, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { FormMessage } from '../components/AuthLayout.jsx';
import StudySession from '../components/StudySession.jsx';
import { listSubjects } from '../services/subjectService.js';
import { getAvailability } from '../services/availabilityService.js';
import { listAllSessions, saveTimetable } from '../services/timetableService.js';
import { generateTimetable } from '../utils/scheduler.js';
import { DEFAULT_WEIGHTS } from '../utils/priorityCalculator.js';
import { formatDisplayDate } from '../utils/dateUtils.js';

export default function Timetable() {
  const { user } = useAuth();

  const [subjects, setSubjects] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [warnings, setWarnings] = useState([]);

  // Reload every session. Used after generating and after any change in a session row.
  function reloadSessions() {
    return listAllSessions(user.id)
      .then(setSessions)
      .catch((err) => setError(err.message));
  }

  // Load subjects, availability and sessions when the page opens
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([listSubjects(user.id), getAvailability(user.id), listAllSessions(user.id)])
      .then(([subjectRows, availabilityRow, sessionRows]) => {
        setSubjects(subjectRows);
        setAvailability(availabilityRow);
        setSessions(sessionRows);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  // Sessions grouped by date
  const groupedSessions = useMemo(() => {
    return sessions.reduce((groups, session) => {
      (groups[session.session_date] ||= []).push(session);
      return groups;
    }, {});
  }, [sessions]);

  // Summary figures. Skipped sessions are left out of the totals.
  const stats = useMemo(() => {
    const active = sessions.filter((s) => s.status !== 'Skipped');
    const totalMinutes = active.reduce((sum, s) => sum + s.duration, 0);
    return {
      count: active.length,
      hours: (totalMinutes / 60).toFixed(1),
      days: new Set(active.map((s) => s.session_date)).size,
      completed: active.filter((s) => s.status === 'Completed').length,
    };
  }, [sessions]);

  const canGenerate = subjects.length > 0 && availability !== null;

  async function handleGenerate() {
    setError('');
    setMessage('');
    setWarnings([]);

    const hasPlanned = sessions.some((s) => s.status === 'Planned');
    if (
      hasPlanned &&
      !window.confirm('Generating a new timetable replaces your unfinished planned sessions from today onward. Completed sessions are kept. Continue?')
    ) {
      return;
    }

    setGenerating(true);
    try {
      const result = generateTimetable({ subjects, availability, weights: DEFAULT_WEIGHTS });
      setWarnings(result.warnings);

      if (result.sessions.length === 0) {
        setError('No sessions could be scheduled. Check the notes below.');
        return;
      }

      await saveTimetable(user.id, result.sessions);
      await reloadSessions();
      setMessage(`Timetable generated with ${result.sessions.length} sessions.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center pt-32">
        <p className="text-slate-400">Loading your timetable...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 pt-32 pb-16">
      <div className="max-w-5xl mx-auto">
        {/* Header and generate button */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Timetable</h1>
            <p className="text-slate-400 mt-1">
              Track each session, reschedule when plans change, and move missed topics forward.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="btn-gradient inline-flex items-center gap-2 self-start"
          >
            <Sparkles size={18} /> {generating ? 'Generating...' : 'Generate My Timetable'}
          </button>
        </div>

        {!canGenerate && (
          <div className="glass rounded-2xl p-5 mb-6 text-sm text-slate-300">
            {subjects.length === 0 && 'Add at least one subject first. '}
            {availability === null && 'Save your availability settings first. '}
            <span className="block mt-2">
              <Link to="/subjects" className="text-purple-400 hover:text-purple-300 mr-4">Go to subjects</Link>
              <Link to="/availability" className="text-purple-400 hover:text-purple-300">Go to availability</Link>
            </span>
          </div>
        )}

        <div className="flex flex-col gap-3 mb-6">
          <FormMessage type="error">{error}</FormMessage>
          <FormMessage type="success">{message}</FormMessage>
        </div>

        {/* Scheduling notes from the algorithm */}
        {warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5 mb-6 border-amber-500/30"
          >
            <h2 className="flex items-center gap-2 font-semibold text-amber-300 mb-3">
              <AlertTriangle size={18} /> Scheduling notes
            </h2>
            <div className="flex flex-col gap-2 text-sm text-slate-300">
              {warnings.map((warning, index) => (
                <p key={index}>{warning}</p>
              ))}
            </div>
          </motion.div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Sessions', value: stats.count },
            { label: 'Planned hours', value: stats.hours },
            { label: 'Study days', value: stats.days },
            { label: 'Completed', value: stats.completed },
          ].map((item) => (
            <div key={item.label} className="glass rounded-2xl p-5">
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className="text-2xl font-bold mt-1">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Sessions grouped by date */}
        {sessions.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <CalendarClock className="mx-auto text-purple-400 mb-4" size={40} />
            <h2 className="text-xl font-semibold">No timetable yet</h2>
            <p className="text-slate-400 mt-2">
              Click Generate My Timetable to create a study plan from your settings.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {Object.entries(groupedSessions).map(([date, daySessions]) => (
              <section key={date}>
                <h2 className="text-lg font-semibold mb-3">{formatDisplayDate(date)}</h2>
                <div className="flex flex-col gap-3">
                  {daySessions.map((session) => (
                    <StudySession key={session.id} session={session} onChanged={reloadSessions} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}