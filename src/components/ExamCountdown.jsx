import { motion } from 'framer-motion';
import { daysUntil, formatDisplayDate } from '../utils/dateUtils.js';

// Shows days left for every subject, sorted by exam date, with a completion bar
export default function ExamCountdown({ subjects, progressBySubject }) {
  const sortedSubjects = [...subjects].sort((a, b) => a.exam_date.localeCompare(b.exam_date));

  if (sortedSubjects.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-2">Exam Countdown</h2>
        <p className="text-sm text-slate-400">Add subjects to see your exam countdown.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-lg font-semibold mb-4">Exam Countdown</h2>

      <div className="flex flex-col gap-4">
        {sortedSubjects.map((subject, index) => {
          const days = daysUntil(subject.exam_date);
          const percent = progressBySubject[subject.id]?.percent ?? 0;
          const passed = days < 0;
          const urgent = days >= 0 && days <= 7;

          let unitLabel = 'days left';
          if (passed) unitLabel = 'exam passed';
          else if (days === 0) unitLabel = 'exam today';
          else if (days === 1) unitLabel = 'day left';

          return (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-xl bg-white/5 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{subject.subject_name}</p>
                  <p className="text-xs text-slate-400">{formatDisplayDate(subject.exam_date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-2xl font-extrabold ${
                      passed ? 'text-slate-500' : urgent ? 'text-rose-300' : 'gradient-text'
                    }`}
                  >
                    {passed ? '—' : days}
                  </p>
                  <p className="text-xs text-slate-400">{unitLabel}</p>
                </div>
              </div>

              <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{Math.round(percent)}% complete</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}