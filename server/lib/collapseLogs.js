/**
 * Collapse duplicate exercise logs for the same set into one row.
 * Partial saves (reps-only, then weight-only) used to create extra rows.
 */
export function collapseLogsBySet(logs = []) {
  const map = new Map();
  for (const log of logs) {
    const key = `${log.session_id ?? ''}::${log.workout_exercise_id ?? log.exercise_name ?? ''}::${log.set_index ?? 0}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...log });
      continue;
    }
    const logIsNewer = (log.logged_at || 0) >= (existing.logged_at || 0);
    const newer = logIsNewer ? log : existing;
    const older = logIsNewer ? existing : log;
    map.set(key, {
      ...older,
      ...newer,
      reps: newer.reps != null ? newer.reps : older.reps,
      weight_kg: newer.weight_kg != null ? newer.weight_kg : older.weight_kg,
      variant: (newer.variant != null && String(newer.variant).trim() !== '')
        ? newer.variant
        : older.variant,
      logged_at: Math.max(existing.logged_at || 0, log.logged_at || 0),
    });
  }
  return Array.from(map.values()).sort((a, b) => {
    const ex = String(a.workout_exercise_id).localeCompare(String(b.workout_exercise_id));
    if (ex !== 0) return ex;
    return (a.set_index ?? 0) - (b.set_index ?? 0);
  });
}
