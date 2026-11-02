import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, startOfToday } from 'date-fns';
import { BookOpen, CalendarClock, Clock, Download, Target } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { fetchProfile } from '../services/authService.js';
import { listSubjects } from '../services/subjectService.js';
import { listAllSessions } from '../services/timetableService.js';
import { daysUntil } from '../utils/dateUtils.js';
import { downloadTimetablePdf } from '../utils/pdfExport.js';
import { FormMessage } from '../components/AuthLayout.jsx';
import StudySession from '../components/StudySession.jsx';
import ExamCountdown from '../components/ExamCountdown.jsx';
import CalendarView from '../components/CalendarView.jsx';
import ProgressCard from '../components/ProgressCard.jsx';

// Small card for the top row of statistics
function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <Icon size={18} className="text-purple-400" />
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Load everything the dashboard needs
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchProfile(user.id), listSubjects(user.id), listAllSessions(user.id)])
      .then(([profileRow, subjectRows, sessionRows]) => {
        setProfile(profileRow);
        setSubjects(subjectRows);
        setSessions(sessionRows);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  // Reload all sessions after a change made in a session row
  function reloadSessions() {
    return listAllSessions(user.id)
      .then(setSessions)
      .catch((err) => setError(err.message));
  }

  const todayKey = format(startOfToday(), 'yyyy-MM-dd');
  const firstName = profile?.full_name?.split(' ')[0] || 'Student';

  // Today's sessions in time order
  const todaySessions = useMemo(
    () =>
      sessions
        .filter((s) => s.session_date === todayKey)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [sessions, todayKey]
  );

  // Progress for each subject. Skipped sessions are not counted.
  const progressBySubject = useMemo(() => {
    const map = {};
    for (const session of sessions) {
      if (session.status === 'Skipped') continue;
      const entry = (map[session.subject_id] ||= { total: 0, completed: 0, percent: 0 });
      entry.total += 1;
      if (session.status === 'Completed') entry.completed += 1;
    }
    for (const id of Object.keys(map)) {
      const entry = map[id];
      entry.percent = entry.total > 0 ? (entry.completed / entry.total) * 100 : 0;
    }
    return map;
  }, [sessions]);

  // Overall preparation statistics, in minutes converted to hours
  const stats = useMemo(() => {
    const active = sessions.filter((s) => s.status !== 'Skipped');
    const plannedMinutes = active.reduce((sum, s) => sum + s.duration, 0);
    const completedMinutes = active
      .filter((s) => s.status === 'Completed')
      .reduce((sum, s) => sum + s.duration, 0);

    return {
      plannedHours: plannedMinutes / 60,
      completedHours: completedMinutes / 60,
      remainingHours: (plannedMinutes - completedMinutes) / 60,
      overallPercent: plannedMinutes > 0 ? (completedMinutes / plannedMinutes) * 100 : 0,
    };
  }, [sessions]);

  // Nearest exam that has not passed yet
  const nextExam = useMemo(() => {
    return [...subjects]
      .filter((s) => daysUntil(s.exam_date) >= 0)
      .sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0];
  }, [subjects]);

  const todayPlannedHours = (todaySessions.reduce((sum, s) => sum + s.duration, 0) / 60).toFixed(1);

  // Builds the PDF from the same data shown on the dashboard
  function handleDownloadPdf() {
    setDownloading(true);
    setError('');
    try {
      const progress = subjects.map((subject) => ({
        subjectId: subject.id,
        name: subject.subject_name,
        percent: progressBySubject[subject.id]?.percent ?? 0,
        total: progressBySubject[subject.id]?.total ?? 0,
        completed: progressBySubject[subject.id]?.completed ?? 0,
      }));

      downloadTimetablePdf({
        studentName: profile?.full_name || user?.email || 'Student',
        subjects,
        sessions,
        stats,
        progress,
      });
    } catch (err) {
      setError(`Could not create the PDF: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center pt-32">
        <p className="text-slate-400">Loading your dashboard...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 pt-32 pb-16">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* Greeting and PDF download */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
        >
          <div>
            <p className="text-sm text-purple-300">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
            <h1 className="text-3xl font-bold mt-1">Hi, {firstName}</h1>
            <p className="text-slate-400 text-sm mt-1">Here is your plan for today and the week ahead.</p>
          </div>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading || subjects.length === 0}
            className="glass rounded-xl px-5 py-3 flex items-center gap-2 font-semibold hover:bg-white/10 transition-colors disabled:opacity-50 self-start md:self-auto"
          >
            <Download size={18} /> {downloading ? 'Preparing PDF...' : 'Download PDF'}
          </button>
        </motion.div>

        <FormMessage type="error">{error}</FormMessage>

        {/* Top statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Clock}
            label="Sessions today"
            value={todaySessions.length}
            hint={`${todayPlannedHours} hours planned`}
          />
          <StatCard
            icon={Target}
            label="Overall progress"
            value={`${Math.round(stats.overallPercent)}%`}
            hint={`${stats.completedHours.toFixed(1)} of ${stats.plannedHours.toFixed(1)} hours done`}
          />
          <StatCard icon={BookOpen} label="Subjects" value={subjects.length} hint="Added to your plan" />
          <StatCard
            icon={CalendarClock}
            label="Next exam"
            value={nextExam ? `${daysUntil(nextExam.exam_date)} days` : '—'}
            hint={nextExam ? nextExam.subject_name : 'No upcoming exams'}
          />
        </div>

        {/* Empty-state prompts */}
        {subjects.length === 0 && (
          <div className="glass rounded-2xl p-5 text-sm text-slate-300">
            You have no subjects yet.{' '}
            <Link to="/subjects" className="text-purple-400 hover:text-purple-300">Add your subjects</Link>{' '}
            to start planning.
          </div>
        )}
        {subjects.length > 0 && sessions.length === 0 && (
          <div className="glass rounded-2xl p-5 text-sm text-slate-300">
            No timetable yet.{' '}
            <Link to="/timetable" className="text-purple-400 hover:text-purple-300">Generate your timetable</Link>{' '}
            to see your sessions here.
          </div>
        )}

        {/* Today's schedule and countdown */}
        <div className="grid lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Today's Schedule</h2>
              <Link to="/timetable" className="text-sm text-purple-400 hover:text-purple-300">
                Full timetable
              </Link>
            </div>

            {todaySessions.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center text-slate-400 text-sm">
                Nothing scheduled for today. Enjoy your break.
              </div>
            ) : (
              todaySessions.map((session) => (
                <StudySession key={session.id} session={session} onChanged={reloadSessions} />
              ))
            )}
          </section>

          <ExamCountdown subjects={subjects} progressBySubject={progressBySubject} />
        </div>

        {/* Weekly calendar */}
        <CalendarView sessions={sessions} />

        {/* Preparation statistics */}
        <ProgressCard stats={stats} subjects={subjects} progressBySubject={progressBySubject} />
      </div>
    </main>
  );
}