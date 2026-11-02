import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Save, Sun, Sunrise, Sunset } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { FormMessage } from '../components/AuthLayout.jsx';
import { getAvailability, saveAvailability } from '../services/availabilityService.js';
import { calculateFreeStudyMinutes, validateAvailability } from '../utils/availabilityUtils.js';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Preferred study times shown as selectable cards
const TIME_SLOTS = [
  { value: 'Morning', range: '5 AM – 12 PM', icon: Sunrise },
  { value: 'Afternoon', range: '12 PM – 5 PM', icon: Sun },
  { value: 'Evening', range: '5 PM – 9 PM', icon: Sunset },
  { value: 'Night', range: '9 PM – 12 AM', icon: Moon },
];

// Starting values for a student who has not saved availability yet
const DEFAULT_AVAILABILITY = {
  wake_up_time: '07:00',
  sleep_time: '23:00',
  study_start_time: '09:00',
  study_end_time: '21:00',
  college_start_time: '',
  college_end_time: '',
  daily_study_hours: 4,
  break_duration: 10,
  session_duration: 60,
  available_days: [...WEEK_DAYS],
  preferred_slots: TIME_SLOTS.map((slot) => slot.value),
};

// Convert a saved database row into form values (trims seconds from times)
function toFormValues(row) {
  if (!row) return DEFAULT_AVAILABILITY;
  return {
    wake_up_time: row.wake_up_time.slice(0, 5),
    sleep_time: row.sleep_time.slice(0, 5),
    study_start_time: row.study_start_time.slice(0, 5),
    study_end_time: row.study_end_time.slice(0, 5),
    college_start_time: row.college_start_time ? row.college_start_time.slice(0, 5) : '',
    college_end_time: row.college_end_time ? row.college_end_time.slice(0, 5) : '',
    daily_study_hours: Number(row.daily_study_hours),
    break_duration: row.break_duration,
    session_duration: row.session_duration,
    available_days: row.available_days || [],
    preferred_slots: row.preferred_slots || [],
  };
}

// Small wrapper for a labelled input
function Field({ label, error, hint, className = '', children }) {
  return (
    <div className={className}>
      <label className="block text-sm text-slate-300 mb-2">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}

// Glass card that groups related settings
function Section({ title, description, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-3xl p-6 md:p-8"
    >
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
      <div className="mt-6">{children}</div>
    </motion.section>
  );
}

export default function Availability() {
  const { user } = useAuth();

  const [values, setValues] = useState(DEFAULT_AVAILABILITY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Load saved settings when the page opens
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getAvailability(user.id)
      .then((row) => setValues(toFormValues(row)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  // Recalculated every time a time or hour field changes
  const freeHours = useMemo(
    () => (calculateFreeStudyMinutes(values) / 60).toFixed(1),
    [values]
  );

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setMessage('');
  }

  // Add or remove a day or time-slot from an array field
  function toggleItem(field, item) {
    setValues((prev) => {
      const current = prev[field];
      const next = current.includes(item)
        ? current.filter((entry) => entry !== item)
        : [...current, item];
      return { ...prev, [field]: next };
    });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setMessage('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    const foundErrors = validateAvailability(values);
    setErrors(foundErrors);

    if (Object.keys(foundErrors).length > 0) {
      setError('Please fix the highlighted fields before saving.');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveAvailability(user.id, values);
      setValues(toFormValues(saved));
      setMessage('Your availability has been saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'input-field';

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center pt-32">
        <p className="text-slate-400">Loading your availability...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 pt-32 pb-16">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Your Availability</h1>
          <p className="text-slate-400 mt-1">
            Tell ExamMate when you can study. Your timetable will never use time outside these settings.
          </p>
        </div>

        {/* Live summary */}
        <div className="glass rounded-2xl p-5 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Free study time each day</p>
            <p className="text-2xl font-bold gradient-text">{freeHours} hours</p>
          </div>
          <p className="text-sm text-slate-400 text-right max-w-xs">
            Based on your study window, with college or work hours removed.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Daily routine */}
          <Section title="Daily routine" description="When your day starts and ends.">
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Wake-up time" error={errors.wake_up_time}>
                <input type="time" name="wake_up_time" value={values.wake_up_time} onChange={handleChange} className={inputClass} />
              </Field>
              <Field label="Sleep time" error={errors.sleep_time}>
                <input type="time" name="sleep_time" value={values.sleep_time} onChange={handleChange} className={inputClass} />
              </Field>
            </div>
          </Section>

          {/* College or work */}
          <Section
            title="College or work hours"
            description="Optional. Leave both empty if you have no fixed hours on study days."
          >
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Starts at" error={errors.college_start_time}>
                <input type="time" name="college_start_time" value={values.college_start_time} onChange={handleChange} className={inputClass} />
              </Field>
              <Field label="Ends at" error={errors.college_end_time}>
                <input type="time" name="college_end_time" value={values.college_end_time} onChange={handleChange} className={inputClass} />
              </Field>
            </div>
          </Section>

          {/* Study window and hours */}
          <Section title="Study window" description="The part of the day you are willing to study.">
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Preferred study start" error={errors.study_start_time}>
                <input type="time" name="study_start_time" value={values.study_start_time} onChange={handleChange} className={inputClass} />
              </Field>
              <Field label="Preferred study end" error={errors.study_end_time}>
                <input type="time" name="study_end_time" value={values.study_end_time} onChange={handleChange} className={inputClass} />
              </Field>
              <Field label="Daily study hours" error={errors.daily_study_hours} hint="How many hours you want to study on each study day.">
                <input type="number" name="daily_study_hours" min="0.5" max="16" step="0.5" value={values.daily_study_hours} onChange={handleChange} className={inputClass} />
              </Field>
              <Field label="Break between sessions (minutes)" error={errors.break_duration}>
                <input type="number" name="break_duration" min="0" max="60" step="5" value={values.break_duration} onChange={handleChange} className={inputClass} />
              </Field>
              <Field label="Session length (minutes)" error={errors.session_duration} hint="Between 30 and 180 minutes." className="md:col-span-2">
                <input type="number" name="session_duration" min="30" max="180" step="5" value={values.session_duration} onChange={handleChange} className={inputClass} />
              </Field>
            </div>
          </Section>

          {/* Study days */}
          <Section title="Study days" description="Tap the days you can study.">
            <div className="flex flex-wrap gap-3">
              {WEEK_DAYS.map((day) => {
                const active = values.available_days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleItem('available_days', day)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      active
                        ? 'bg-gradient-to-r from-purple-600 to-blue-500 border-transparent text-white shadow-lg shadow-purple-600/30'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            {errors.available_days && <p className="text-xs text-rose-400 mt-3">{errors.available_days}</p>}
          </Section>

          {/* Time of day preferences */}
          <Section title="Preferred study times" description="Choose the parts of the day you prefer to study.">
            <div className="grid sm:grid-cols-2 gap-4">
              {TIME_SLOTS.map(({ value, range, icon: Icon }) => {
                const active = values.preferred_slots.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleItem('preferred_slots', value)}
                    className={`rounded-2xl p-5 text-left border transition-all flex items-center gap-4 ${
                      active
                        ? 'border-purple-500/60 bg-purple-500/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className={`p-2.5 rounded-xl ${active ? 'bg-gradient-to-br from-purple-600 to-blue-500' : 'bg-white/10'}`}>
                      <Icon size={20} />
                    </span>
                    <span>
                      <span className="block font-semibold">{value}</span>
                      <span className="block text-xs text-slate-400">{range}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.preferred_slots && <p className="text-xs text-rose-400 mt-3">{errors.preferred_slots}</p>}
          </Section>

          <FormMessage type="error">{error}</FormMessage>
          <FormMessage type="success">{message}</FormMessage>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-gradient inline-flex items-center gap-2">
              <Save size={18} /> {saving ? 'Saving...' : 'Save Availability'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}