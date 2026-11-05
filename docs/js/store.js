// État de l'app, sauvegardé dans le téléphone (localStorage).
const KEY = 'assiette.v1';

const defaults = () => ({
  profile: null, entries: [], weights: [], recents: [], apiKey: '',
  // Pas du jour (Santé via Raccourcis, ou saisis à la main)
  steps: {}, stepsToBudget: true, stepsShortcut: false,
  customFoods: [],
  // Compléments
  supps: [], suppLog: {}, suppNotif: { on: false }, suppSeen: null, pushId: '', pushDirty: false,
  // Eau, thème, écran d'accueil, trophées
  water: {}, waterGoal: null,
  theme: { mode: 'auto', accent: 'emeraude', custom: null },
  home: { week: true, steps: true, water: true, supps: true, score: true },
  trophies: {}, perfectDays: {}, lastBackup: 0, recapSeen: '',
  recipes: [], measures: [], timerCfg: null,
  // Muscu
  workouts: [], routines: [], friends: [], activeWorkout: null, userId: '',
});

function load() {
  try {
    return { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return defaults();
  }
}

export const state = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Sauvegarde impossible', e);
  }
}

export function reset() {
  Object.assign(state, defaults());
  save();
}

/** Restaure une sauvegarde : ce qui manque reprend sa valeur par défaut. */
export function replaceState(data) {
  Object.assign(state, defaults(), data);
  save();
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function addEntry(entry) {
  const id = uid();
  state.entries.push({ id, createdAt: Date.now(), ...entry });
  save();
  return id;
}

export function updateEntry(entry) {
  const i = state.entries.findIndex((e) => e.id === entry.id);
  if (i >= 0) state.entries[i] = entry;
  save();
}

export function deleteEntry(id) {
  state.entries = state.entries.filter((e) => e.id !== id);
  save();
}

export function pushRecent(food) {
  state.recents = [food, ...state.recents.filter((f) => f.id !== food.id)].slice(0, 30);
  save();
}

export function logWeight(kg, day) {
  state.weights = state.weights.filter((w) => w.day !== day);
  state.weights.push({ day, kg });
  state.weights.sort((a, b) => a.day.localeCompare(b.day));
  // Les objectifs automatiques suivent le poids.
  if (state.profile) state.profile.weightKg = kg;
  save();
}
