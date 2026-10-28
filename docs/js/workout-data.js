import { normalize } from './foods.js';

// Groupes musculaires : libellé et temps de récupération moyen (en heures).
export const MUSCLES = {
  pectoraux: { label: 'Pectoraux', hours: 72 },
  epaules: { label: 'Épaules', hours: 60 },
  biceps: { label: 'Biceps', hours: 48 },
  triceps: { label: 'Triceps', hours: 48 },
  avant_bras: { label: 'Avant-bras', hours: 48 },
  abdos: { label: 'Abdos', hours: 48 },
  obliques: { label: 'Obliques', hours: 48 },
  trapezes: { label: 'Trapèzes', hours: 60 },
  dorsaux: { label: 'Dorsaux', hours: 72 },
  haut_dos: { label: 'Haut du dos', hours: 60 },
  lombaires: { label: 'Lombaires', hours: 72 },
  fessiers: { label: 'Fessiers', hours: 72 },
  quadriceps: { label: 'Quadriceps', hours: 72 },
  ischios: { label: 'Ischios', hours: 72 },
  adducteurs: { label: 'Adducteurs', hours: 60 },
  mollets: { label: 'Mollets', hours: 48 },
};

export const muscleLabel = (key) => MUSCLES[key]?.label || key;

// Séances toutes prêtes : [exercice, séries, répétitions].
export const PROGRAMS = [
  {
    id: 'full-body', emoji: '🔰', name: 'Full body débutant', detail: 'Tout le corps, 3 fois par semaine',
    exercises: [
      ['f-Barbell_Squat', 3, 8], ['f-Barbell_Bench_Press_-_Medium_Grip', 3, 8], ['f-Bent_Over_Barbell_Row', 3, 8],
      ['f-Dumbbell_Shoulder_Press', 3, 10], ['f-Romanian_Deadlift', 3, 10], ['f-Plank', 3, 45],
    ],
  },
  {
    id: 'push', emoji: '💥', name: 'Push', detail: 'Pectoraux, épaules, triceps',
    exercises: [
      ['f-Barbell_Bench_Press_-_Medium_Grip', 4, 6], ['f-Incline_Dumbbell_Press', 3, 10], ['f-Standing_Military_Press', 3, 8],
      ['f-Side_Lateral_Raise', 3, 12], ['f-Triceps_Pushdown', 3, 12], ['f-Dips_-_Triceps_Version', 3, 10],
    ],
  },
  {
    id: 'pull', emoji: '🧲', name: 'Pull', detail: 'Dos et biceps',
    exercises: [
      ['f-Pullups', 4, 6], ['f-Bent_Over_Barbell_Row', 4, 8], ['f-Wide-Grip_Lat_Pulldown', 3, 10],
      ['f-Seated_Cable_Rows', 3, 10], ['f-Face_Pull', 3, 15], ['f-Dumbbell_Bicep_Curl', 3, 12], ['f-Hammer_Curls', 3, 12],
    ],
  },
  {
    id: 'legs', emoji: '🦵', name: 'Legs', detail: 'Quadriceps, ischios, fessiers, mollets',
    exercises: [
      ['f-Barbell_Squat', 4, 6], ['f-Leg_Press', 3, 10], ['f-Romanian_Deadlift', 3, 8],
      ['f-Lying_Leg_Curls', 3, 12], ['f-Leg_Extensions', 3, 12], ['f-Standing_Calf_Raises', 4, 15],
    ],
  },
  {
    id: 'upper', emoji: '🏋️', name: 'Haut du corps', detail: 'Pecs, dos, épaules, bras',
    exercises: [
      ['f-Barbell_Bench_Press_-_Medium_Grip', 4, 8], ['f-One-Arm_Dumbbell_Row', 3, 10], ['f-Seated_Dumbbell_Press', 3, 10],
      ['f-Pullups', 3, 8], ['f-Barbell_Curl', 3, 10], ['f-Lying_Triceps_Press', 3, 10],
    ],
  },
  {
    id: 'lower', emoji: '🍑', name: 'Bas du corps', detail: 'Jambes et fessiers',
    exercises: [
      ['f-Barbell_Squat', 4, 8], ['f-Barbell_Deadlift', 3, 5], ['f-Dumbbell_Lunges', 3, 10],
      ['f-Barbell_Hip_Thrust', 3, 10], ['f-Lying_Leg_Curls', 3, 12], ['f-Seated_Calf_Raise', 3, 15],
    ],
  },
  {
    id: 'force-a', emoji: '🏆', name: 'Force 5×5 · A', detail: 'Squat, développé couché, rowing',
    exercises: [['f-Barbell_Squat', 5, 5], ['f-Barbell_Bench_Press_-_Medium_Grip', 5, 5], ['f-Bent_Over_Barbell_Row', 5, 5]],
  },
  {
    id: 'force-b', emoji: '🏆', name: 'Force 5×5 · B', detail: 'Squat, développé militaire, soulevé de terre',
    exercises: [['f-Barbell_Squat', 5, 5], ['f-Standing_Military_Press', 5, 5], ['f-Barbell_Deadlift', 1, 5]],
  },
  {
    id: 'abdos', emoji: '🔥', name: 'Abdos express', detail: '15 minutes, sans matériel',
    exercises: [
      ['f-Crunches', 3, 20], ['f-Plank', 3, 45], ['f-Hanging_Leg_Raise', 3, 12], ['f-Russian_Twist', 3, 20],
      ['f-Mountain_Climbers', 3, 30],
    ],
  },
  {
    id: 'maison', emoji: '🏠', name: 'Sans matériel', detail: 'À la maison, au poids du corps',
    exercises: [
      ['f-Pushups', 4, 12], ['f-Bodyweight_Squat', 4, 20], ['f-Bodyweight_Walking_Lunge', 3, 12],
      ['f-Bench_Dips', 3, 12], ['f-Superman', 3, 15], ['w-997', 3, 10], ['f-Plank', 3, 45],
    ],
  },
];

// Rangs selon l'expérience gagnée (XP) à chaque séance.
export const RANKS = [
  { name: 'Fer', xp: 0, emoji: '⚙️', color: '#8a8f98' },
  { name: 'Bronze', xp: 300, emoji: '🥉', color: '#cd7f32' },
  { name: 'Argent', xp: 900, emoji: '🥈', color: '#a7b1bc' },
  { name: 'Or', xp: 2000, emoji: '🥇', color: '#f2b705' },
  { name: 'Platine', xp: 4000, emoji: '💠', color: '#3fbfb0' },
  { name: 'Diamant', xp: 7000, emoji: '💎', color: '#4d8bff' },
  { name: 'Maître', xp: 11000, emoji: '👑', color: '#a45cff' },
  { name: 'Légende', xp: 16000, emoji: '🔥', color: '#ff5e62' },
];

export function rankFor(xp) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const rank = RANKS[i];
  const next = RANKS[i + 1];
  return { rank, next, progress: next ? (xp - rank.xp) / (next.xp - rank.xp) : 1 };
}

// Niveaux de force : 1RM estimé / poids de corps (repères usuels hommes ; ×0,65 pour les femmes).
export const LEVELS = ['Débutant', 'Novice', 'Intermédiaire', 'Avancé', 'Élite'];
export const LIFTS = [
  { id: 'f-Barbell_Bench_Press_-_Medium_Grip', name: 'Développé couché', ratios: [0.5, 0.75, 1.0, 1.5, 2.0] },
  { id: 'f-Barbell_Squat', name: 'Squat', ratios: [0.75, 1.25, 1.5, 2.25, 2.75] },
  { id: 'f-Barbell_Deadlift', name: 'Soulevé de terre', ratios: [1.0, 1.5, 2.0, 2.5, 3.0] },
  { id: 'f-Standing_Military_Press', name: 'Développé militaire', ratios: [0.35, 0.55, 0.75, 1.0, 1.3] },
  { id: 'f-Bent_Over_Barbell_Row', name: 'Rowing barre', ratios: [0.5, 0.75, 1.0, 1.4, 1.75] },
];

export function strengthLevel(lift, oneRm, bodyWeight, sex) {
  const ratio = oneRm / Math.max(bodyWeight, 1);
  const factor = sex === 'femme' ? 0.65 : 1;
  let level = -1;
  lift.ratios.forEach((r, i) => {
    if (ratio >= r * factor) level = i;
  });
  return { level, label: level >= 0 ? LEVELS[level] : 'À débloquer', ratio };
}

// ---------------------------------------------------------------------------
// Bibliothèque d'exercices (wger, CC-BY-SA, et free-exercise-db, domaine public)
// ---------------------------------------------------------------------------

// Mots français courants en salle -> termes anglais, pour trouver aussi les exercices sans nom français.
const GLOSSARY = {
  developpe: ['press'], couche: ['bench'], incline: ['incline'], decline: ['decline'], haltere: ['dumbbell'],
  halteres: ['dumbbell'], barre: ['barbell', 'bar'], poulie: ['cable'], tirage: ['pulldown', 'row'], rowing: ['row'],
  traction: ['pull', 'chin'], tractions: ['pull', 'chin'], pompe: ['push'], pompes: ['push'], souleve: ['deadlift'],
  terre: ['deadlift'], fente: ['lunge'], fentes: ['lunge'], mollet: ['calf'], mollets: ['calf'], ecarte: ['fly', 'flye'],
  elevation: ['raise'], elevations: ['raise'], laterales: ['lateral'], laterale: ['lateral'], gainage: ['plank'],
  planche: ['plank'], abdos: ['crunch', 'ab'], cuisses: ['leg'], presse: ['press'], epaules: ['shoulder'],
  oiseau: ['reverse'], corde: ['rope'], banc: ['bench'], debout: ['standing'], assis: ['seated'], allonge: ['lying'],
  fessiers: ['glute', 'hip'], pont: ['bridge'], biceps: ['curl', 'bicep'], marteau: ['hammer'], jambes: ['leg'],
  dos: ['back', 'row'], pecs: ['chest'], pectoraux: ['chest'], extension: ['extension'], squat: ['squat'],
};

let library = null;
let libraryPromise = null;

export function loadLibrary() {
  libraryPromise ??= fetch('data/exercices.json')
    .then((r) => r.json())
    .then((data) => {
      const list = data.exercises.map(([id, fr, en, p, s, eq, t, lv, img, how]) => ({
        id, fr, en, name: fr || en, p, s, eq, t, lv, how,
        img: img ? data.imgPrefix + img : '',
        key: normalize(`${fr} ${en}`),
      }));
      const programIds = new Set(PROGRAMS.flatMap((p) => p.exercises.map(([id]) => id)));
      // Les grands classiques d'abord, puis ceux qui ont un nom français.
      list.sort((a, b) => Number(programIds.has(b.id)) - Number(programIds.has(a.id)) || Number(!!b.fr) - Number(!!a.fr));
      library = { list, byId: new Map(list.map((e) => [e.id, e])) };
      return library;
    })
    .catch((e) => {
      libraryPromise = null;
      throw e;
    });
  return libraryPromise;
}

export const libraryReady = () => !!library;
export const exerciseById = (id) => library?.byId.get(id);

export function searchExercises({ query = '', muscle = '', equipment = '' } = {}, limit = 60) {
  if (!library) return [];
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const out = [];
  for (const ex of library.list) {
    if (muscle && !ex.p.includes(muscle) && !ex.s.includes(muscle)) continue;
    if (equipment && ex.eq !== equipment) continue;
    if (!words.every((w) => ex.key.includes(w) || (GLOSSARY[w] || []).some((t) => ex.key.includes(t)))) continue;
    out.push(ex);
    if (out.length >= limit) break;
  }
  // Muscle choisi en premier : ceux qui le travaillent en principal.
  if (muscle) out.sort((a, b) => Number(b.p.includes(muscle)) - Number(a.p.includes(muscle)));
  return out;
}

export const EQUIPMENTS = ['Poids du corps', 'Haltères', 'Barre', 'Machine', 'Poulie', 'Kettlebell', 'Élastique', 'Barre EZ'];
