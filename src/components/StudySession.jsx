import { useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, Pencil, Play, RotateCcw, SkipForward } from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { useAuth } from '../hooks/useAuth.js';
import { getAvailability } from '../services/availabilityService.js';
import { insertSession, listAllSessions, refreshProgress, updateSession } from '../services/timetableService.js';
import { addMinutesToTime, checkSlot, findNextFreeSlot } from '../utils/rescheduleUtils.js';
import { planSpacedRevisions } from '../utils/revisionPlanner.js';
import { formatDisplayTime, toInputTime } from '../utils/dateUtils.js';
import { FormMessage } from './AuthLayout.jsx';
import SessionTimer from './SessionTimer.jsx';

// Badge colours for each session type
export const SESSION_TYPE_STYLES = {
  Study: { badge: 'bg-purple-500/20 text-purple-300', block: 'border-purple-400 bg-purple-500/15' },
  Revision: { badge: 'bg-blue-500/20 text-blue-300', block: 'border-blue-400 bg-blue-500/15' },
  Practice: { badge: 'bg-amber-500/20 text-amber-300', block: 'border-amber-400 bg-amber-500/15' },
  'Mock Test': { badge: 'bg-rose-500/20 text-rose-300', block: 'border-rose-400 bg-rose-500/15' },
};

// Badge colours for each completion status
const STATUS_STYLES = {
  Planned: 'bg-white/10 text-slate-300',
  Completed: 'bg-emerald-500/20 text-emerald-300',
  Skipped: 'bg-slate-500/20 text-slate-400',
  Rescheduled: 'bg-amber-500/20 text-amber-300',
  Missed: 'bg-rose-500/20 text-rose-300',
};

// Small button used in the action row
function ActionButton({ icon: Icon, label, onClick, disabled = false, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
        active ? 'bg-purple-500/30 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
      }`}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

export default function StudySession({ session, compact = false, onChanged }) {
  const { user } = useAuth();

  const [panel, setPanel] = useState(null); // 'timer' | 'reschedule' | 'details' | 'redistribute' | null
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [rescheduleDate, setRescheduleDate] = useState(session.session_date);
  const [rescheduleTime, setRescheduleTime] = useState(toInputTime(session.start_time));
  const [topic, setTopic] = useState(session.topic || '');
  const [notes, setNotes] = useState(session.notes || '');

  const subjectName = session.subjects?.subject_name || 'Subject';
  const examKey = session.subjects?.exam_date || null;
  const typeStyle = SESSION_TYPE_STYLES[session.session_type] || SESSION_TYPE_STYLES.Study;
  const todayKey = format(startOfToday(), 'yyyy-MM-dd');

  // A planned session on an earlier day was missed
  const missed = session.status === 'Planned' && session.session_date < todayKey;
  const isOpen = session.status === 'Planned' || session.status === 'Rescheduled';
  const statusLabel = missed ? 'Missed' : session.status;

  // Compact block used inside the weekly calendar (no actions)
  if (compact) {
    return (
      <div className={`rounded-lg border-l-2 px-2 py-1.5 text-xs ${typeStyle.block}`}>
        <p className="font-medium truncate">{subjectName}</p>
        <p className="text-slate-400">{formatDisplayTime(session.start_time)}</p>
      </div>
    );
  }

  // Runs an action, shows any error, refreshes progress if asked, then tells the parent to reload
  async function run(task, { refreshProgressToo = false, message = '' } = {}) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
      if (refreshProgressToo) await refreshProgress(user.id);
      if (message) setNotice(message);
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function togglePanel(name) {
    if (panel !== name && name === 'reschedule') {
      setRescheduleDate(session.session_date);
      setRescheduleTime(toInputTime(session.start_time));
    }
    if (panel !== name && name === 'details') {
      setTopic(session.topic || '');
      setNotes(session.notes || '');
    }
    setPanel(panel === name ? null : name);
  }

  // Marks the session completed and plans spaced revisions for its topic
  function handleComplete() {
    run(
      async () => {
        await updateSession(session.id, {
          status: 'Completed',
          actual_minutes: session.actual_minutes || session.duration,
        });

        // Plan spaced revisions for this topic. A failure here must not undo the completion.
        try {
          await planSpacedRevisions({ userId: user.id, session });
        } catch (err) {
          console.warn('Revision planning was skipped:', err.message);
        }

        setPanel(null);
      },
      { refreshProgressToo: true, message: 'Session completed. Revision has been planned.' }
    );
  }

  function handleSkip() {
    run(
      async () => {
        await updateSession(session.id, { status: 'Skipped' });
        setPanel('redistribute');
      },
      { refreshProgressToo: true }
    );
  }

  function handleReopen() {
    run(() => updateSession(session.id, { status: 'Planned' }), {
      refreshProgressToo: true,
      message: 'Session reopened.',
    });
  }

  // Moves this topic into the next free slot before the exam, and closes the original session
  function handleMoveTopic() {
    run(
      async () => {
        const slot = await findNextFreeSlot({
          userId: user.id,
          duration: session.duration,
          examKey,
        });
        if (!slot) {
          throw new Error('No free slot is left before the exam. Add study hours or free up a day.');
        }

        await insertSession(user.id, {
          subject_id: session.subject_id,
          topic: session.topic,
          notes: null,
          session_date: slot.dateKey,
          start_time: slot.startTime,
          end_time: slot.endTime,
          duration: session.duration,
          session_type: session.session_type,
          status: 'Planned',
        });

        if (session.status !== 'Skipped') {
          await updateSession(session.id, { status: 'Skipped' });
        }
        setPanel(null);
      },
      { refreshProgressToo: true, message: 'Topic moved to your next free slot.' }
    );
  }

  function handleReschedule(e) {
    e.preventDefault();
    run(
      async () => {
        // Check the new slot against the latest availability and sessions
        const availability = await getAvailability(user.id);
        if (!availability) throw new Error('Save your availability before rescheduling.');

        const allSessions = await listAllSessions(user.id);
        const problem = checkSlot({
          availability,
          sessions: allSessions,
          dateKey: rescheduleDate,
          startTime: rescheduleTime,
          duration: session.duration,
          examKey,
          ignoreId: session.id,
        });
        if (problem) throw new Error(problem);

        await updateSession(session.id, {
          session_date: rescheduleDate,
          start_time: rescheduleTime,
          end_time: addMinutesToTime(rescheduleTime, session.duration),
          status: 'Rescheduled',
        });
        setPanel(null);
      },
      { message: 'Session rescheduled.' }
    );
  }

  function handleSaveDetails(e) {
    e.preventDefault();
    run(
      async () => {
        await updateSession(session.id, {
          topic: topic.trim() || session.topic,
          notes: notes.trim() || null,
        });
        setPanel(null);
      },
      { message: 'Details saved.' }
    );
  }

  function handleTimerStop(minutes) {
    run(
      () =>
        updateSession(session.id, {
          actual_minutes: (session.actual_minutes || 0) + minutes,
        }),
      { message: `Logged ${minutes} minutes of study.` }
    );
  }

  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-4">
      {/* Session details */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-white/5">
            <Clock size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="font-semibold">{subjectName}</p>
            <p className="text-sm text-slate-400">{session.topic}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-slate-300">
            {formatDisplayTime(session.start_time)} – {formatDisplayTime(session.end_time)}
          </span>
          <span className="text-slate-500">{session.duration} min</span>
          <span className={`px-2.5 py-1 rounded-full text-xs ${typeStyle.badge}`}>
            {session.session_type}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs ${STATUS_STYLES[statusLabel] || STATUS_STYLES.Planned}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {session.notes && (
        <p className="text-sm text-slate-300 bg-white/5 rounded-xl p-3 whitespace-pre-line">{session.notes}</p>
      )}
      {session.actual_minutes > 0 && (
        <p className="text-xs text-slate-500">Studied {session.actual_minutes} minutes so far</p>
      )}

      {/* Action row */}
      <div className="flex flex-wrap gap-2">
        {isOpen && !missed && (
          <>
            <ActionButton icon={Play} label="Timer" active={panel === 'timer'} onClick={() => togglePanel('timer')} disabled={busy} />
            <ActionButton icon={CheckCircle2} label="Complete" onClick={handleComplete} disabled={busy} />
            <ActionButton icon={SkipForward} label="Skip" onClick={handleSkip} disabled={busy} />
            <ActionButton
              icon={CalendarClock}
              label="Reschedule"
              active={panel === 'reschedule'}
              onClick={() => togglePanel('reschedule')}
              disabled={busy}
            />
          </>
        )}

        {missed && (
          <>
            <ActionButton icon={CheckCircle2} label="Mark completed" onClick={handleComplete} disabled={busy} />
            <ActionButton icon={SkipForward} label="Move topic to a free slot" onClick={handleMoveTopic} disabled={busy} />
          </>
        )}

        <ActionButton
          icon={Pencil}
          label="Topic and notes"
          active={panel === 'details'}
          onClick={() => togglePanel('details')}
          disabled={busy}
        />

        {!isOpen && (
          <ActionButton icon={RotateCcw} label="Reopen" onClick={handleReopen} disabled={busy} />
        )}
      </div>

      {/* Study timer */}
      {panel === 'timer' && (
        <div className="rounded-xl bg-white/5 p-4">
          <SessionTimer onStop={handleTimerStop} busy={busy} />
        </div>
      )}

      {/* Reschedule form */}
      {panel === 'reschedule' && (
        <form onSubmit={handleReschedule} className="rounded-xl bg-white/5 p-4 grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-400 mb-1">New date</label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">New start time</label>
            <input
              type="time"
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-gradient !py-2.5 !px-4 text-sm flex-1">
              Save
            </button>
            <button
              type="button"
              onClick={() => setPanel(null)}
              className="glass rounded-xl px-4 py-2.5 text-sm flex-1 hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Topic and notes form */}
      {panel === 'details' && (
        <form onSubmit={handleSaveDetails} className="rounded-xl bg-white/5 p-4 flex flex-col gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="input-field"
              placeholder="What will you study in this session?"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Study notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field resize-none"
              placeholder="Key points, questions, things to revise"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPanel(null)}
              className="glass rounded-xl px-4 py-2 text-sm hover:bg-white/10"
            >
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-gradient !py-2 !px-4 text-sm">
              Save details
            </button>
          </div>
        </form>
      )}

      {/* Offer to redistribute a skipped topic */}
      {panel === 'redistribute' && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-slate-200">
            Move "{session.topic || 'this topic'}" to your next free slot before the exam?
          </p>
          <div className="flex gap-2">
            <button onClick={handleMoveTopic} disabled={busy} className="btn-gradient !py-2 !px-4 text-sm">
              Move topic
            </button>
            <button onClick={() => setPanel(null)} className="glass rounded-xl px-4 py-2 text-sm hover:bg-white/10">
              Not now
            </button>
          </div>
        </div>
      )}

      <FormMessage type="error">{error}</FormMessage>
      <FormMessage type="success">{notice}</FormMessage>
    </div>
  );
}