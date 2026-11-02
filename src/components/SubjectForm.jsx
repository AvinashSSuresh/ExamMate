import { useState } from 'react';
import { format, startOfToday } from 'date-fns';
import { FormMessage } from './AuthLayout.jsx';
import { isValidExamDate } from '../utils/dateUtils.js';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const PREPARATION_LEVELS = ['Not Started', 'Beginner', 'Intermediate', 'Well Prepared'];
const PRIORITIES = [1, 2, 3, 4, 5];

// Default values for a brand new subject
export const EMPTY_SUBJECT = {
  subject_name: '',
  exam_date: '',
  exam_time: '',
  difficulty: 'Medium',
  preparation_level: 'Not Started',
  chapters_count: 1,
  priority: 3,
  important_topics: '',
};

// Turn a saved subject from the database into form values
export function getInitialValues(subject) {
  if (!subject) return EMPTY_SUBJECT;
  return {
    subject_name: subject.subject_name,
    exam_date: subject.exam_date,
    exam_time: subject.exam_time ? subject.exam_time.slice(0, 5) : '',
    difficulty: subject.difficulty,
    preparation_level: subject.preparation_level,
    chapters_count: subject.chapters_count,
    priority: subject.priority,
    important_topics: subject.important_topics || '',
  };
}

// Returns an object of field errors. An empty object means the form is valid.
export function validateSubject(values) {
  const errors = {};
  const name = values.subject_name.trim();

  if (!name) {
    errors.subject_name = 'Subject name is required.';
  } else if (name.length > 100) {
    errors.subject_name = 'Keep the name under 100 characters.';
  }

  if (!values.exam_date) {
    errors.exam_date = 'Exam date is required.';
  } else if (!isValidExamDate(values.exam_date)) {
    errors.exam_date = 'Exam date cannot be in the past.';
  }

  const chapters = Number(values.chapters_count);
  if (values.chapters_count === '' || !Number.isInteger(chapters) || chapters < 0 || chapters > 200) {
    errors.chapters_count = 'Enter a whole number between 0 and 200.';
  }

  const priority = Number(values.priority);
  if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
    errors.priority = 'Priority must be between 1 and 5.';
  }

  return errors;
}

// Small wrapper that shows a label, the input and an error message
function Field({ label, error, className = '', children }) {
  return (
    <div className={className}>
      <label className="block text-sm text-slate-300 mb-2">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}

export default function SubjectForm({
  initialValues,
  submitLabel = 'Save Subject',
  submitting = false,
  onSubmit,
  onCancel,
}) {
  const [values, setValues] = useState(initialValues ?? EMPTY_SUBJECT);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  // Prevents picking yesterday's date in the date picker
  const today = format(startOfToday(), 'yyyy-MM-dd');

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    const foundErrors = validateSubject(values);
    setErrors(foundErrors);
    if (Object.keys(foundErrors).length > 0) return;

    try {
      await onSubmit(values);
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-5">
      <Field label="Subject name" error={errors.subject_name} className="md:col-span-2">
        <input
          id="subject_name"
          name="subject_name"
          type="text"
          value={values.subject_name}
          onChange={handleChange}
          className="input-field"
          placeholder="e.g. Data Structures"
        />
      </Field>

      <Field label="Exam date" error={errors.exam_date}>
        <input
          id="exam_date"
          name="exam_date"
          type="date"
          min={today}
          value={values.exam_date}
          onChange={handleChange}
          className="input-field"
        />
      </Field>

      <Field label="Exam time (optional)">
        <input
          id="exam_time"
          name="exam_time"
          type="time"
          value={values.exam_time}
          onChange={handleChange}
          className="input-field"
        />
      </Field>

      <Field label="Difficulty">
        <select id="difficulty" name="difficulty" value={values.difficulty} onChange={handleChange} className="input-field">
          {DIFFICULTIES.map((level) => (
            <option key={level} value={level} className="bg-navy-900">{level}</option>
          ))}
        </select>
      </Field>

      <Field label="Preparation level">
        <select id="preparation_level" name="preparation_level" value={values.preparation_level} onChange={handleChange} className="input-field">
          {PREPARATION_LEVELS.map((level) => (
            <option key={level} value={level} className="bg-navy-900">{level}</option>
          ))}
        </select>
      </Field>

      <Field label="Number of chapters or units" error={errors.chapters_count}>
        <input
          id="chapters_count"
          name="chapters_count"
          type="number"
          min="0"
          max="200"
          value={values.chapters_count}
          onChange={handleChange}
          className="input-field"
        />
      </Field>

      <Field label="Personal priority (1 = low, 5 = high)" error={errors.priority}>
        <select id="priority" name="priority" value={values.priority} onChange={handleChange} className="input-field">
          {PRIORITIES.map((value) => (
            <option key={value} value={value} className="bg-navy-900">{value}</option>
          ))}
        </select>
      </Field>

      <Field label="Important topics (optional)" className="md:col-span-2">
        <textarea
          id="important_topics"
          name="important_topics"
          rows={3}
          value={values.important_topics}
          onChange={handleChange}
          className="input-field resize-none"
          placeholder="e.g. Trees, graphs, dynamic programming"
        />
      </Field>

      <FormMessage type="error" className="md:col-span-2">{formError}</FormMessage>

      <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 justify-end">
        <button type="button" onClick={onCancel} className="glass rounded-xl px-6 py-3 font-semibold hover:bg-white/10 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-gradient">
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}