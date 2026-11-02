import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookPlus, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import SubjectCard from '../components/SubjectCard.jsx';
import SubjectForm, { getInitialValues } from '../components/SubjectForm.jsx';
import { FormMessage } from '../components/AuthLayout.jsx';
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
} from '../services/subjectService.js';

export default function AddSubjects() {
  const { user } = useAuth();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Load the student's subjects when the page opens
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    listSubjects(user.id)
      .then(setSubjects)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  function openNewForm() {
    setEditingSubject(null);
    setShowForm(true);
    setError('');
    setMessage('');
  }

  function openEditForm(subject) {
    setEditingSubject(subject);
    setShowForm(true);
    setError('');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeForm() {
    setShowForm(false);
    setEditingSubject(null);
  }

  // Called by the form. Errors are thrown so the form can display them.
  async function handleSave(values) {
    setSaving(true);
    try {
      if (editingSubject) {
        const updated = await updateSubject(editingSubject.id, values);
        setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setMessage(`"${updated.subject_name}" updated.`);
      } else {
        const created = await createSubject(user.id, values);
        setSubjects((prev) => [...prev, created]);
        setMessage(`"${created.subject_name}" added.`);
      }
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(subject) {
    const confirmed = window.confirm(
      `Delete "${subject.subject_name}"? Its study sessions and progress will also be removed.`
    );
    if (!confirmed) return;

    setError('');
    setMessage('');
    setSaving(true);
    try {
      await deleteSubject(subject.id);
      setSubjects((prev) => prev.filter((s) => s.id !== subject.id));
      if (editingSubject?.id === subject.id) closeForm();
      setMessage(`"${subject.subject_name}" deleted.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Soonest exam first. ISO date strings sort correctly as text.
  const sortedSubjects = [...subjects].sort((a, b) => a.exam_date.localeCompare(b.exam_date));

  return (
    <main className="flex-1 px-6 pt-32 pb-16">
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Subjects</h1>
            <p className="text-slate-400 mt-1">
              {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'} added
            </p>
          </div>
          {!showForm && (
            <button onClick={openNewForm} className="btn-gradient inline-flex items-center gap-2 self-start">
              <BookPlus size={18} /> Add Subject
            </button>
          )}
        </div>

        {/* Page-level feedback */}
        <div className="flex flex-col gap-3 mb-6">
          <FormMessage type="error">{error}</FormMessage>
          <FormMessage type="success">{message}</FormMessage>
        </div>

        {/* Add / edit form */}
        <AnimatePresence>
          {showForm && (
            <motion.section
              key="subject-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass rounded-3xl p-8 mb-10 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {editingSubject ? `Edit "${editingSubject.subject_name}"` : 'Add a new subject'}
                </h2>
                <button onClick={closeForm} className="p-2 rounded-lg hover:bg-white/10" aria-label="Close form">
                  <X size={20} />
                </button>
              </div>

              {/* key forces a fresh form when switching between subjects */}
              <SubjectForm
                key={editingSubject?.id ?? 'new-subject'}
                initialValues={getInitialValues(editingSubject)}
                submitLabel={editingSubject ? 'Update Subject' : 'Add Subject'}
                submitting={saving}
                onSubmit={handleSave}
                onCancel={closeForm}
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Subject list */}
        {loading ? (
          <p className="text-slate-400 text-center py-16">Loading your subjects...</p>
        ) : sortedSubjects.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <BookPlus className="mx-auto text-purple-400 mb-4" size={40} />
            <h2 className="text-xl font-semibold">No subjects yet</h2>
            <p className="text-slate-400 mt-2 mb-6">
              Add your first exam subject to start building your timetable.
            </p>
            {!showForm && (
              <button onClick={openNewForm} className="btn-gradient">Add Your First Subject</button>
            )}
          </div>
        ) : (
          <motion.div layout className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {sortedSubjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  onEdit={openEditForm}
                  onDelete={handleDelete}
                  busy={saving}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </main>
  );
}