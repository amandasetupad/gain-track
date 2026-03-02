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

function dayKeyFromTs(ts) {
  if (!ts) return null;
  const d = new Date(ts * 1000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

  const calendarInfo = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return { days: [], monthLabel: '' };
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-11
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const sessionsByDay = {};
    sessions.forEach((s) => {
      if (!s.ended_at) return;
      const key = dayKeyFromTs(s.ended_at);
      if (!key) return;
      sessionsByDay[key] = (sessionsByDay[key] || 0) + 1;
    });

    const leadingBlanks = firstOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
    const days = [];

    for (let i = 0; i < leadingBlanks; i++) {
      days.push({ key: `blank-${i}`, label: '', hasSession: false, count: 0 });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const count = sessionsByDay[key] || 0;
      days.push({
        key,
        label: String(d),
        hasSession: count > 0,
        count,
      });
    }

    const monthLabel = today.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });

    return { days, monthLabel };
  }, [sessions]);

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

      {sessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="bg-slab-900 border border-slab-850 rounded-xl p-5 sm:p-6"
        >
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="font-semibold text-zinc-200 font-mono">Workout calendar</h2>
              <p className="text-xs text-zinc-500">
                Days with completed workouts this month are highlighted.
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-500">{calendarInfo.monthLabel}</span>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-[11px] font-mono text-zinc-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
              <div key={label} className="text-center">{label}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1 text-xs font-mono">
            {calendarInfo.days.map((day) => (
              <div
                key={day.key}
                className={`relative flex h-9 items-center justify-center rounded-md border text-zinc-400 ${
                  day.label
                    ? day.hasSession
                      ? 'border-gain-500/60 bg-gain-500/10 text-zinc-50'
                      : 'border-slab-850 bg-slab-900'
                    : 'border-transparent bg-transparent'
                }`}
              >
                {day.label}
                {day.hasSession && (
                  <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-gain-500" />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

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

        {selectedExercise && !isLoading && historyByExercise.length > 0 && (
          <>
            <div className="mt-6 mb-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-1 font-mono">
                Logged sets for <span className="text-zinc-200">{selectedExercise}</span>
              </h3>
              <p className="text-xs text-zinc-500 mb-3">
                Every row is one set you logged over time, newest first.
              </p>
              <div className="overflow-x-auto rounded-lg border border-slab-850">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="bg-slab-850/80 text-zinc-500 text-left">
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Set</th>
                      <th className="px-3 py-2 font-medium">Reps</th>
                      <th className="px-3 py-2 font-medium">Weight (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...historyByExercise]
                      .sort((a, b) => (b.logged_at || 0) - (a.logged_at || 0))
                      .map((log, i) => (
                        <tr key={log.id || i} className="border-t border-slab-850 text-zinc-300">
                          <td className="px-3 py-2">{formatDate(log.started_at)}</td>
                          <td className="px-3 py-2">Set {(log.set_index ?? 0) + 1}</td>
                          <td className="px-3 py-2">{log.reps != null ? log.reps : '—'}</td>
                          <td className="px-3 py-2">{log.weight_kg != null ? log.weight_kg : '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            <h3 className="text-sm font-medium text-zinc-400 mb-3 font-mono">Progress over time</h3>
            <div className="h-72 sm:h-80">
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
          </>
        )}

        {selectedExercise && !isLoading && chartData.length === 0 && historyByExercise.length === 0 && (
          <div className="mt-8 py-12 text-center text-zinc-500">
            No logged sets for <strong className="text-zinc-400">{selectedExercise}</strong> yet. Log reps and weight during a session, then come back here.
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
                className="flex flex-wrap items-center justify-between gap-x-2 py-2 border-b border-slab-850 last:border-0 text-sm"
              >
                <span className="text-zinc-300">{s.workout_name}</span>
                <span className="text-zinc-500 font-mono">
                  {s.ended_at ? `Ended ${formatDate(s.ended_at)}` : `Started ${formatDate(s.started_at)}`}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
