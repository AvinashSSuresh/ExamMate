import { useMemo, useState } from 'react';
import { addDays, addWeeks, format, isSameDay, startOfToday, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import StudySession from './StudySession.jsx';

export default function CalendarView({ sessions }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const today = startOfToday();
  const weekStart = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), weekOffset);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 6);

  // Group sessions by date so each day can be shown quickly
  const sessionsByDate = useMemo(() => {
    return sessions.reduce((groups, session) => {
      (groups[session.session_date] ||= []).push(session);
      return groups;
    }, {});
  }, [sessions]);

  return (
    <div className="glass rounded-2xl p-6">
      {/* Header with navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold">Weekly Timetable</h2>
          <p className="text-sm text-slate-400">
            {format(weekStart, 'dd MMM')} – {format(weekEnd, 'dd MMM yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="glass rounded-lg p-2 hover:bg-white/10"
            aria-label="Previous week"
          >
            <ChevronLeft size={18} />
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="glass rounded-lg px-3 py-2 text-sm hover:bg-white/10"
            >
              This week
            </button>
          )}
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="glass rounded-lg p-2 hover:bg-white/10"
            aria-label="Next week"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Seven day columns */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const daySessions = sessionsByDate[key] || [];
          const isToday = isSameDay(day, today);

          return (
            <div
              key={key}
              className={`rounded-xl p-3 min-h-[140px] border ${
                isToday ? 'border-purple-500/60 bg-purple-500/10' : 'border-white/10 bg-white/5'
              }`}
            >
              <p className="text-xs text-slate-400 uppercase tracking-wide">{format(day, 'EEE')}</p>
              <p className={`text-lg font-semibold ${isToday ? 'gradient-text' : ''}`}>
                {format(day, 'dd')}
              </p>

              <div className="mt-3 flex flex-col gap-2">
                {daySessions.length === 0 ? (
                  <p className="text-xs text-slate-600">Free</p>
                ) : (
                  daySessions.map((session) => (
                    <StudySession key={session.id} session={session} compact />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}