import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Dumbbell } from 'lucide-react';
import { api } from '../api/client';

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

export default function History() {
  const [selectedExercise, setSelectedExercise] = useState('');
  const { data: exerciseNames = [] } = useQuery(
    'history-exercise-names',
    () => api.get('/sessions/history/exercise-names')
  );
  const { data: sessions = [] } = useQuery('sessions', () => api.get('/sessions'));

  const { data: historyByExercise = [], isLoading } = useQuery(
    ['history', selectedExercise],
    () => api.get(`/sessions/history/by-name?exerciseName=${encodeURIComponent(selectedExercise)}`),
    { enabled: !!selectedExercise }
  );

  const chartData = useMemo(() => {
    if (!historyByExercise.length) return [];
    const byDate = {};
    historyByExercise.forEach((log) => {
      const key = formatDate(log.started_at);
      if (!byDate[key]) byDate[key] = { date: key, maxWeight: 0, maxReps: 0, volume: 0, count: 0 };
      const w = log.weight_kg || 0;
      const r = log.reps || 0;
      byDate[key].maxWeight = Math.max(byDate[key].maxWeight, w);
      byDate[key].maxReps = Math.max(byDate[key].maxReps, r);
      byDate[key].volume += w * r;
      byDate[key].count += 1;
    });
    return Object.values(byDate).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [historyByExercise]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <TrendingUp className="w-6 h-6 text-gain-500" />
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 font-mono">Progress</h1>
          <p className="text-zinc-500 text-sm">Strength over time</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-slab-900 border border-slab-850 rounded-xl p-5 sm:p-6"
      >
        <label className="block text-sm font-medium text-zinc-400 mb-3">Select exercise</label>
        <select
          value={selectedExercise}
          onChange={(e) => setSelectedExercise(e.target.value)}
          className="w-full max-w-xs px-4 py-2.5 bg-slab-850 border border-slab-850 rounded-lg text-zinc-100 font-mono focus:border-gain-500 focus:ring-1 focus:ring-gain-500"
        >
          <option value="">— Choose exercise —</option>
          {exerciseNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {!selectedExercise && (
          <div className="mt-8 flex flex-col items-center justify-center py-12 text-zinc-500">
            <Dumbbell className="w-12 h-12 mb-4 opacity-50" />
            <p>Pick an exercise to view progress</p>
          </div>
        )}

        {selectedExercise && isLoading && (
          <div className="mt-8 py-12 text-center text-zinc-500">Loading history...</div>
        )}

        {selectedExercise && !isLoading && chartData.length === 0 && (
          <div className="mt-8 py-12 text-center text-zinc-500">
            No logged sets for <strong className="text-zinc-400">{selectedExercise}</strong> yet.
          </div>
        )}

        {selectedExercise && !isLoading && chartData.length > 0 && (
          <div className="mt-6 h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" tick={{ fill: '#71717a', fontSize: 12 }} />
                <YAxis stroke="#71717a" tick={{ fill: '#71717a', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1d24',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="maxWeight"
                  name="Max weight (kg)"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e' }}
                />
                <Line
                  type="monotone"
                  dataKey="maxReps"
                  name="Max reps"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {sessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slab-900 border border-slab-850 rounded-xl p-5"
        >
          <h2 className="font-semibold text-zinc-200 mb-4 font-mono">Recent sessions</h2>
          <ul className="space-y-2">
            {sessions.slice(0, 10).map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between py-2 border-b border-slab-850 last:border-0 text-sm"
              >
                <span className="text-zinc-300">{s.workout_name}</span>
                <span className="text-zinc-500 font-mono">{formatDate(s.started_at)}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
