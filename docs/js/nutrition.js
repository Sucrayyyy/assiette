import { state } from './store.js';

export const ZERO = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

export const ACTIVITIES = [
  { key: 'sedentaire', label: 'Sédentaire', detail: 'Bureau, peu ou pas de sport', icon: '🛋️', factor: 1.2 },
  { key: 'leger', label: 'Légèrement actif', detail: 'Sport 1 à 3 fois par semaine', icon: '🚶', factor: 1.375 },
  { key: 'modere', label: 'Modérément actif', detail: 'Sport 3 à 5 fois par semaine', icon: '🏃', factor: 1.55 },
  { key: 'actif', label: 'Très actif', detail: 'Sport 6 à 7 fois par semaine', icon: '🏋️', factor: 1.725 },
  { key: 'tres_actif', label: 'Extrêmement actif', detail: 'Métier physique et sport intense', icon: '🔥', factor: 1.9 },
];

export const GOALS = [
  { key: 'perte', label: 'Perdre du poids', detail: 'Environ -0,5 kg par semaine', icon: '↘︎' },
  { key: 'maintien', label: 'Garder mon poids', detail: "Manger à l'équilibre", icon: '＝' },
  { key: 'prise', label: 'Prendre du muscle', detail: 'Environ +0,25 kg par semaine', icon: '↗︎' },
];

export const MEALS = [
  { key: 'petit_dej', label: 'Petit-déjeuner', short: 'Petit-déj', icon: '☕️' },
  { key: 'dejeuner', label: 'Déjeuner', short: 'Déjeuner', icon: '🍽️' },
  { key: 'collation', label: 'Collation', short: 'Collation', icon: '🥕' },
  { key: 'diner', label: 'Dîner', short: 'Dîner', icon: '🌙' },
];

/** Métabolisme de base, formule de Mifflin-St Jeor. */
export function bmr({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'homme' ? base + 5 : base - 161;
}

export function autoTargets(p) {
  const factor = ACTIVITIES.find((a) => a.key === p.activity)?.factor ?? 1.2;
  const tdee = bmr(p) * factor;
  let kcal = tdee;
  if (p.goal === 'perte') kcal = Math.max(tdee - 500, p.sex === 'homme' ? 1500 : 1200);
  if (p.goal === 'prise') kcal = tdee + 300;
  // Protéines en g/kg, plus hautes en sèche et en prise de muscle.
  const protein = p.weightKg * (p.goal === 'maintien' ? 1.6 : p.goal === 'perte' ? 1.8 : 2.0);
  // Lipides : 30 % des calories. Glucides : le reste. Fibres : 14 g / 1000 kcal, au moins 30 g (ANSES).
  const fat = (kcal * 0.3) / 9;
  const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
  const fiber = Math.max(30, (kcal / 1000) * 14);
  return {
    kcal: Math.round(kcal / 10) * 10,
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    fiber: Math.round(fiber),
  };
}

export function targets() {
  const p = state.profile;
  if (!p) return { ...ZERO };
  return p.customTargets || autoTargets(p);
}

export function scale(per100, grams) {
  const f = grams / 100;
  return {
    kcal: per100.kcal * f,
    protein: per100.protein * f,
    carbs: per100.carbs * f,
    fat: per100.fat * f,
    fiber: per100.fiber * f,
  };
}

export function add(a, b) {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
  };
}

export const itemMacros = (item) => scale(item.per100, item.grams);
export const itemsMacros = (items) => items.reduce((acc, it) => add(acc, itemMacros(it)), { ...ZERO });
export const entriesOn = (day) => state.entries.filter((e) => e.day === day).sort((a, b) => a.createdAt - b.createdAt);
export const totalsOn = (day) => itemsMacros(entriesOn(day).flatMap((e) => e.items));

export function mealForNow(d = new Date()) {
  const h = d.getHours();
  if (h < 11) return 'petit_dej';
  if (h < 15) return 'dejeuner';
  if (h < 18) return 'collation';
  return 'diner';
}

// Jours au format AAAA-MM-JJ, en heure locale.
export function dayKey(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function dayDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shiftDay(key, n) {
  const d = dayDate(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export const lastDays = (n) => Array.from({ length: n }, (_, i) => shiftDay(dayKey(), i - n + 1));

export function dayLabel(key) {
  const today = dayKey();
  if (key === today) return "Aujourd'hui";
  if (key === shiftDay(today, -1)) return 'Hier';
  const s = dayDate(key).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Jours consécutifs avec au moins une entrée (aujourd'hui compte s'il est déjà rempli). */
export function streak() {
  const days = new Set(state.entries.map((e) => e.day));
  let day = days.has(dayKey()) ? dayKey() : shiftDay(dayKey(), -1);
  let n = 0;
  while (days.has(day)) {
    n++;
    day = shiftDay(day, -1);
  }
  return n;
}

export function coachMessage(t, g, hasEntries, isToday) {
  if (!hasEntries) {
    if (!isToday) return 'Rien de noté ce jour-là.';
    return new Date().getHours() < 11
      ? 'Nouvelle journée. Commence par scanner ton petit-déj 📸'
      : "Rien de noté pour l'instant. Un scan et c'est parti ✨";
  }
  const proteinLeft = g.protein - t.protein;
  const fiberLeft = g.fiber - t.fiber;
  if (t.kcal > g.kcal * 1.05) return `Objectif dépassé de ${Math.round(t.kcal - g.kcal)} kcal. Pas grave, demain est un autre jour 🌱`;
  if (proteinLeft <= 0 && fiberLeft <= 0) return "Protéines et fibres au top aujourd'hui 🎉";
  if (proteinLeft > 20) return `Encore ${Math.round(proteinLeft)} g de protéines : un skyr ou un blanc de poulet et c'est plié 💪`;
  if (fiberLeft > 8) return `Il te manque ${Math.round(fiberLeft)} g de fibres : légumes, lentilles ou une pomme 🍎`;
  return 'Tu es pile dans le rythme, continue comme ça ✨';
}

const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
export const n0 = (x) => nf0.format(Math.round(x || 0));
export const n1 = (x) => nf1.format(x || 0);
