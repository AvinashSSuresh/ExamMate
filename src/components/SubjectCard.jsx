import { motion } from 'framer-motion';
import { CalendarClock, Clock, Pencil, Trash2 } from 'lucide-react';
import { daysUntil, formatDisplayDate, formatDisplayTime } from '../utils/dateUtils.js';

const difficultyStyles = {
  Easy: 'bg-emerald-500/15 text-emerald-300',
  Medium: 'bg-amber-500/15 text-amber-300',
  Hard: 'bg-rose-500/15 text-rose-300',
};

// Human-readable countdown text
function countdownLabel(days) {
  if (days < 0) return 'Passed';
  if (days === 0) return 'Exam today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export default function SubjectCard({ subject, onEdit, onDelete, busy = false }) {
  const days = daysUntil(subject.exam_date);
  const urgent = days >= 0 && days <= 7;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass rounded-2xl p-6 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{subject.subject_name}</h3>
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            <span className={`px-2.5 py-1 rounded-full ${difficultyStyles[subject.difficulty]}`}>
              {subject.difficulty}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-300">
              {subject.preparation_level}
            </span>
          </div>
        </div>

        <span
          className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${
            urgent ? 'bg-rose-500/20 text-rose-300' : 'bg-purple-500/20 text-purple-300'
          }`}
        >
          {countdownLabel(days)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm text-slate-400">
        <p className="flex items-center gap-2">
          <CalendarClock size={16} className="text-purple-400" /> {formatDisplayDate(subject.exam_date)}
        </p>
        <p className="flex items-center gap-2">
          <Clock size={16} className="text-blue-400" /> {formatDisplayTime(subject.exam_time)}
        </p>
        <p>{subject.chapters_count} {subject.chapters_count === 1 ? 'chapter' : 'chapters'}</p>
        <p>Priority {subject.priority}/5</p>
      </div>

      {subject.important_topics && (
        <p className="text-sm text-slate-300 line-clamp-2">{subject.important_topics}</p>
      )}

      <div className="flex gap-2 mt-auto pt-4 border-t border-white/10">
        <button
          onClick={() => onEdit(subject)}
          disabled={busy}
          className="flex-1 glass rounded-xl px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Pencil size={15} /> Edit
        </button>
        <button
          onClick={() => onDelete(subject)}
          disabled={busy}
          className="flex-1 glass rounded-xl px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Trash2 size={15} /> Delete
        </button>
      </div>
    </motion.div>
  );
}