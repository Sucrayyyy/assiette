// Analyses : vrai métabolisme d'après le poids et les calories, date d'objectif, calendrier du mois.
import { state } from './store.js';
import { totalsOn, lastDays, dayKey, dayDate, shiftDay, defaultPace, n0 } from './nutrition.js';
import { allTakenOn, dueOn } from './supplements.js';

const DAY_MS = 864e5;

/** Pente en kg par jour (moindres carrés) : moins sensible aux variations d'un jour à l'autre. */
function weightSlope(weights) {
  const t0 = dayDate(weights[0].day).getTime();
  const pts = weights.map((w) => [(dayDate(w.day).getTime() - t0) / DAY_MS, w.kg]);
  const mx = pts.reduce((s, [x]) => s + x, 0) / pts.length;
  const my = pts.reduce((s, [, y]) => s + y, 0) / pts.length;
  const den = pts.reduce((s, [x]) => s + (x - mx) ** 2, 0);
  return den ? pts.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) / den : 0;
}

/**
 * Ton métabolisme réel : ce que tu manges, corrigé de ce que ta courbe de poids fait vraiment
 * (1 kg ≈ 7 700 kcal). Demande au moins 10 jours notés et 3 pesées sur 10 jours.
 */
export function realMaintenance() {
  const days = lastDays(28);
  const logged = days.map((d) => totalsOn(d).kcal).filter((k) => k > 500);
  const weights = state.weights.filter((w) => w.day >= days[0]);
  const span = weights.length ? (dayDate(weights.at(-1).day) - dayDate(weights[0].day)) / DAY_MS : 0;
  if (logged.length < 10 || weights.length < 3 || span < 10) {
    return { ready: false, loggedDays: logged.length, weighIns: weights.length };
  }
  const avg = logged.reduce((a, b) => a + b, 0) / logged.length;
  const slope = weightSlope(weights);
  return { ready: true, kcal: Math.round((avg - slope * 7700) / 10) * 10, avg: Math.round(avg), perWeek: slope * 7, loggedDays: logged.length, weighIns: weights.length };
}

/** Date estimée pour atteindre le poids visé : au rythme mesuré s'il va dans le bon sens, sinon au rythme choisi. */
export function goalProjection() {
  const p = state.profile;
  const target = p?.targetWeight;
  if (!target) return null;
  const current = state.weights.at(-1)?.kg ?? p.weightKg;
  const gap = target - current;
  if (Math.abs(gap) < 0.1) return { reached: true, target };
  const m = realMaintenance();
  const measured = m.ready && Math.sign(m.perWeek) === Math.sign(gap) && Math.abs(m.perWeek) > 0.05 ? Math.abs(m.perWeek) : 0;
  const planned = p.goal === 'maintien' ? 0 : p.pace || defaultPace(p.goal);
  const rate = measured || planned;
  if (!rate) return { target, gap, stalled: true };
  const date = new Date(Date.now() + (Math.abs(gap) / rate) * 7 * DAY_MS);
  return { target, gap, date, rate, measured: !!measured };
}

/** Moyenne glissante sur 7 pesées pour la courbe de tendance. */
export function weightTrend(weights) {
  return weights.map((w, i) => {
    const part = weights.slice(Math.max(0, i - 6), i + 1);
    return part.reduce((s, x) => s + x.kg, 0) / part.length;
  });
}

/** Calendrier des 5 dernières semaines, du lundi au dimanche. */
export function monthCells() {
  const today = dayKey();
  const offset = (dayDate(today).getDay() + 6) % 7;
  const start = shiftDay(today, -offset - 28);
  const workoutDays = new Set(state.workouts.map((w) => dayKey(new Date(w.end))));
  return Array.from({ length: 28 + offset + 1 }, (_, i) => {
    const day = shiftDay(start, i);
    const food = totalsOn(day).kcal > 0;
    const supps = dueOn(day).length > 0 && allTakenOn(day);
    const workout = workoutDays.has(day);
    return { day, food, supps, workout, perfect: !!state.perfectDays?.[day], today: day === today, level: Number(food) + Number(workout) + Number(supps) };
  });
}

export const kcalText = (n) => `${n0(n)} kcal`;
