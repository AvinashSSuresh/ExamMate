import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock,
  Download,
  Sparkles,
  Target,
  Timer,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Feature cards shown in the Features section
const features = [
  {
    icon: Sparkles,
    title: 'Smart Timetable',
    text: 'Generates a plan from your actual subjects, exam dates and daily study hours.',
  },
  {
    icon: Target,
    title: 'Priority Scheduling',
    text: 'Difficult and urgent subjects get more time, weighted by how prepared you already are.',
  },
  {
    icon: Zap,
    title: 'Revision Built In',
    text: 'Revision, practice and mock tests are placed before every exam automatically.',
  },
  {
    icon: BarChart3,
    title: 'Progress Tracking',
    text: 'Mark sessions as done, watch your completion grow and see what remains.',
  },
  {
    icon: Clock,
    title: 'Respects Your Routine',
    text: 'Never schedules study during college hours, sleep or any time you mark unavailable.',
  },
  {
    icon: Download,
    title: 'PDF Export',
    text: 'Download your complete study timetable as a clean, printable PDF.',
  },
];

// Steps shown in the How It Works section
const steps = [
  { number: '01', title: 'Add your subjects', text: 'Enter exam dates, times, difficulty and your current preparation level.' },
  { number: '02', title: 'Set your availability', text: 'Tell ExamMate when you wake up, sleep, attend college and can study.' },
  { number: '03', title: 'Generate your plan', text: 'Get a day-by-day timetable balanced across all of your subjects.' },
  { number: '04', title: 'Study and track', text: 'Complete sessions, reschedule missed ones and watch your progress grow.' },
];

// Animation presets
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function Home() {
  return (
    <main className="flex-1">
      {/* Hero section */}
      <section id="top" className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.15 } } }}
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm text-purple-300"
            >
              <Sparkles size={16} /> Smart exam preparation
            </motion.span>

            <motion.h1 variants={fadeUp} className="mt-6 text-5xl md:text-6xl font-extrabold leading-tight">
              Your Exams. <span className="gradient-text">Your Plan.</span> Your Success.
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 text-lg text-slate-400 max-w-xl">
              Stop worrying about what to study next. Create your personalized exam preparation timetable automatically.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
              <Link to="/register" className="btn-gradient inline-flex items-center gap-2">
                Create My Study Plan <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works" className="glass rounded-xl px-6 py-3 font-semibold hover:bg-white/10 transition-colors">
                See How It Works
              </a>
            </motion.div>
          </motion.div>

          {/* Illustrations */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="grid gap-6"
          >
            <CalendarPreview />
            <div className="grid sm:grid-cols-2 gap-6">
              <CountdownPreview />
              <SubjectPreview />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features section */}
      <section id="features" className="px-6 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-4xl font-bold">
              Everything you need to <span className="gradient-text">study smarter</span>
            </h2>
            <p className="mt-4 text-slate-400">
              ExamMate combines your subjects, deadlines and routine into one clear plan you can follow every day.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, text }, index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center mb-4">
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-slate-400">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works section */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold">
              How it <span className="gradient-text">works</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass rounded-2xl p-6"
              >
                <span className="text-3xl font-extrabold gradient-text">{step.number}</span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto glass rounded-3xl p-10 text-center">
          <BookOpen className="mx-auto text-purple-400 mb-4" size={36} />
          <h2 className="text-3xl font-bold">Ready to take control of your exams?</h2>
          <p className="mt-4 text-slate-400">Build your personalized study plan in minutes.</p>
          <Link to="/register" className="btn-gradient inline-flex items-center gap-2 mt-8">
            Create My Study Plan <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <CalendarDays size={18} className="text-purple-400" /> ExamMate
          </div>
          <p>© {new Date().getFullYear()} ExamMate. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how-it-works" className="hover:text-white">How It Works</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ---------- Illustration components (visual previews only) ---------- */

// Animated study calendar illustration
function CalendarPreview() {
  const examDays = [9, 14, 21, 27];

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <CalendarDays size={18} className="text-purple-400" /> Study Calendar
        </h3>
        <span className="text-xs text-slate-400">Preview</span>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 28 }, (_, i) => {
          const day = i + 1;
          const isExam = examDays.includes(day);
          const isStudy = !isExam && day % 3 !== 0;

          let style = 'bg-white/5 text-slate-400';
          if (isExam) style = 'bg-rose-500/80 text-white';
          else if (isStudy) style = 'bg-gradient-to-br from-purple-600/70 to-blue-500/70 text-white';

          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium ${style}`}
            >
              {day}
            </motion.div>
          );
        })}
      </div>

      <div className="flex gap-4 mt-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500" /> Study</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500" /> Exam</span>
      </div>
    </div>
  );
}

// Countdown timer illustration
function CountdownPreview() {
  return (
    <div className="glass rounded-3xl p-6 flex flex-col items-center justify-center text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        className="text-blue-400 mb-3"
      >
        <Timer size={28} />
      </motion.div>
      <p className="text-4xl font-extrabold gradient-text">12 days</p>
      <p className="text-sm text-slate-400 mt-1">until your next exam</p>
    </div>
  );
}

// Subject scheduling preview
function SubjectPreview() {
  const subjects = [
    { name: 'Mathematics', progress: 70 },
    { name: 'Physics', progress: 45 },
    { name: 'Networks', progress: 25 },
  ];

  return (
    <div className="glass rounded-3xl p-6">
      <h3 className="font-semibold mb-4">Subject Progress</h3>
      <div className="flex flex-col gap-4">
        {subjects.map((subject) => (
          <div key={subject.name}>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>{subject.name}</span>
              <span>{subject.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${subject.progress}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}