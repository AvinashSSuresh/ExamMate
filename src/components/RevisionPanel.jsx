import { useEffect, useMemo, useState } from 'react';
import { format, startOfToday } from 'date-fns';
import { BrainCircuit, CalendarX, FlaskConical } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { FormMessage } from './AuthLayout.jsx';
import { getAvailability } from '../services/availabilityService.js';
import { addMockTest, moveUnfinishedSessions, REVISION_INTERVALS } from '../utils/revisionPlanner.js';
import { daysUntil, formatDisplayDate } from '../utils/dateUtils.js';

export default function RevisionPanel({ subjects, sessions, onChanged }) {
  const { user } = useAuth();

  const [availability, setAvailability] = useState(null);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const todayKey = format(startOfToday(), 'yyyy-MM-dd');

  // Mock tests need the session length, so load the availability settings once
  useEffect(() => {
    if (!user) return;
    getAvailability(user.id)
      .then(setAvailability)
      .catch((err) => setError(err.message));
  }, [user]);

  // Planned sessions from today or earlier are missed, grouped by date
  const missedByDate = useMemo(() => {
    const groups = {};
    for (const session of sessions) {
      if (session.status === 'Planned' && session.session_date <= todayKey) {
        (groups[session.session_date] ||= []).push(session);
      }
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [sessions, todayKey]);

  // Subjects that still have at least two days before the exam
  const mockEligible = subjects
    .filter((s) => daysUntil(s.exam_date) >= 2)
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date));

  // Runs an action, shows the outcome and reloads the parent data
  async function run(key, task) {
    setBusyKey(key);
    setError('');
    setNotice('');
    try {
      await task();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  }

  function handleMoveDay(dateKey) {
    run(dateKey, async () => {
      const result = await moveUnfinishedSessions({ userId: user.id, dateKey });
      const plural = result.moved === 1 ? 'session' : 'sessions';
      const failNote = result.failed
        ? `, and ${result.failed} could not be placed before the exam`
        : '';
      setNotice(`Moved ${result.moved} ${plural} to free slots${failNote}.`);
    });
  }

  function handleAddMock(subject) {
    run(`mock-${subject.id}`, async () => {
      if (!availability) throw new Error('Save your availability before adding a mock test.');
      const duration = Math.min(180, availability.session_duration * 2);

      await addMockTest({
        userId: user.id,
        subjectId: subject.id,
        subjectName: subject.subject_name,
        examKey: subject.exam_date,
        duration,
      });
      setNotice(`Mock test added for ${subject.subject_name}.`);
    });
  }

  return (
    <section className="flex flex-col gap-6 mb-8">
      {/* How automatic revision works */}
      <div className="glass rounded-2xl p-5 flex gap-4 items-start">
        <BrainCircuit className="text-purple-400 shrink-0 mt-1" size={22} />
        <div>
          <h2 className="font-semibold">Automatic revision</h2>
          <p className="text-sm text-slate-400 mt-1">
            When you complete a study session, ExamMate plans revision for that topic
            {' '}
            {REVISION_INTERVALS.map((d, i) => (
              <span key={d}>
                {i > 0 && (i === REVISION_INTERVALS.length - 1 ? ' and ' : ', ')}
                {d} {d === 1 ? 'day' : 'days'}
              </span>
            ))}
            {' '}later, in free slots before the exam.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Missed sessions */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarX size={18} className="text-rose-300" />
            <h2 className="font-semibold">Missed sessions</h2>
          </div>

          {missedByDate.length === 0 ? (
            <p className="text-sm text-slate-400">No missed sessions. You are on track.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {missedByDate.map(([dateKey, daySessions]) => (
                <div
                  key={dateKey}
                  className="rounded-xl bg-white/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <p className="font-medium">{formatDisplayDate(dateKey)}</p>
                    <p className="text-xs text-slate-400">
                      {daySessions.length} unfinished {daySessions.length === 1 ? 'session' : 'sessions'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleMoveDay(dateKey)}
                    disabled={busyKey !== ''}
                    className="btn-gradient !py-2 !px-4 text-sm"
                  >
                    {busyKey === dateKey ? 'Moving...' : 'Move to free slots'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mock tests */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical size={18} className="text-amber-300" />
            <h2 className="font-semibold">Mock tests</h2>
          </div>

          {mockEligible.length === 0 ? (
            <p className="text-sm text-slate-400">
              Mock tests can be added for subjects with at least two days left before the exam.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {mockEligible.map((subject) => (
                <div
                  key={subject.id}
                  className="rounded-xl bg-white/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <p className="font-medium">{subject.subject_name}</p>
                    <p className="text-xs text-slate-400">Exam on {formatDisplayDate(subject.exam_date)}</p>
                  </div>
                  <button
                    onClick={() => handleAddMock(subject)}
                    disabled={busyKey !== '' || !availability}
                    className="glass rounded-xl px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
                  >
                    {busyKey === `mock-${subject.id}` ? 'Adding...' : 'Add mock test'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FormMessage type="error">{error}</FormMessage>
      <FormMessage type="success">{notice}</FormMessage>
    </section>
  );
}