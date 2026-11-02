import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Dark tooltip style to match the theme
const tooltipStyle = {
  backgroundColor: '#0b1026',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 12,
  color: '#e2e8f0',
};

export default function ProgressCard({ stats, subjects, progressBySubject }) {
  // Shorten long subject names so the chart labels fit
  const chartData = subjects.map((subject) => ({
    name: subject.subject_name.length > 12 ? `${subject.subject_name.slice(0, 12)}…` : subject.subject_name,
    percent: Math.round(progressBySubject[subject.id]?.percent ?? 0),
  }));

  const tiles = [
    { label: 'Planned hours', value: stats.plannedHours.toFixed(1) },
    { label: 'Completed hours', value: stats.completedHours.toFixed(1) },
    { label: 'Remaining hours', value: stats.remainingHours.toFixed(1) },
    { label: 'Overall progress', value: `${Math.round(stats.overallPercent)}%` },
  ];

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-lg font-semibold">Preparation Statistics</h2>

      {/* Statistic tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl bg-white/5 p-4">
            <p className="text-xs text-slate-400">{tile.label}</p>
            <p className="text-2xl font-bold mt-1">{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      <div className="mt-6">
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.overallPercent}%` }}
            transition={{ duration: 1 }}
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
          />
        </div>
      </div>

      {/* Subject-wise completion chart */}
      <div className="mt-8">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Completion by subject</h3>

        {chartData.length === 0 ? (
          <p className="text-sm text-slate-400">Subject progress will appear here once you add subjects.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 12 }} unit="%" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#c4b5fd' }}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                  formatter={(value) => [`${value}%`, 'Complete']}
                />
                <Bar dataKey="percent" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}