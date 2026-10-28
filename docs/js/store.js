// État de l'app, sauvegardé dans le téléphone (localStorage).
const KEY = 'assiette.v1';

const defaults = () => ({
  profile: null, entries: [], weights: [], recents: [], apiKey: '',
  // Pas du jour (Santé via Raccourcis, ou saisis à la main)
  steps: {}, stepsToBudget: true, stepsShortcut: false,
  customFoods: [],
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

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function addEntry(entry) {
  state.entries.push({ id: uid(), createdAt: Date.now(), ...entry });
  save();
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
