// Coach muscu : une conversation qui fait le bilan (objectif, niveau, séances actuelles), garde ce qui marche,
// corrige le reste et construit un programme d'hypertrophie sur mesure.
// Principes : 2 fois par semaine par muscle, 10 à 20 séries par muscle et par semaine selon le niveau,
// polyarticulaires lourds puis isolations, 1 à 2 répétitions en réserve, double progression, décharge toutes les 6 semaines.
import { state, save, uid } from './store.js';
import { targets, n0 } from './nutrition.js';
import { esc, icon, haptic, tone, toast, confetti } from './ui.js';
import { MUSCLES, muscleLabel, exerciseById, loadLibrary, libraryReady } from './workout-data.js';

const COACH_NAME = 'Max';
let rerender = () => {};
let startSessionFn = () => {};

export function initCoach({ renderApp, startSession }) {
  rerender = renderApp;
  startSessionFn = startSession;
}

const C = () => {
  state.coach ??= { step: 'intro', answers: {}, log: [], program: null };
  return state.coach;
};

// ---------------------------------------------------------------------------
// Banque d'exercices du coach : [id, matériel minimum, type, articulations sollicitées]
// matériel : body (poids du corps) < home (haltères + banc) < gym (salle complète)
// ---------------------------------------------------------------------------

const POOL = {
  pectoraux: [
    ['f-Barbell_Bench_Press_-_Medium_Grip', 'gym', 'c', ['epaules']], ['f-Incline_Dumbbell_Press', 'home', 'c', []],
    ['f-Dumbbell_Bench_Press', 'home', 'c', []], ['f-Machine_Bench_Press', 'gym', 'c', []], ['f-Cable_Crossover', 'gym', 'i', []],
    ['f-Incline_Dumbbell_Flyes', 'home', 'i', ['epaules']], ['f-Pushups', 'body', 'c', []], ['f-Decline_Push-Up', 'body', 'c', []],
    ['f-Dips_-_Chest_Version', 'body', 'c', ['epaules', 'coudes']],
  ],
  dorsaux: [
    ['f-Pullups', 'body', 'c', ['coudes']], ['f-Wide-Grip_Lat_Pulldown', 'gym', 'c', []], ['f-Seated_Cable_Rows', 'gym', 'c', []],
    ['f-One-Arm_Dumbbell_Row', 'home', 'c', []], ['f-Bent_Over_Barbell_Row', 'gym', 'c', ['dos']], ['f-Chin-Up', 'body', 'c', ['coudes']],
    ['f-Straight-Arm_Pulldown', 'gym', 'i', []], ['f-Bent_Over_Two-Dumbbell_Row', 'home', 'c', ['dos']], ['f-Inverted_Row', 'body', 'c', []],
  ],
  haut_dos: [
    ['f-Face_Pull', 'gym', 'i', []], ['f-Reverse_Flyes', 'home', 'i', []], ['f-Cable_Rope_Rear-Delt_Rows', 'gym', 'i', []],
    ['f-Seated_Bent-Over_Rear_Delt_Raise', 'home', 'i', []], ['f-Inverted_Row', 'body', 'c', []],
  ],
  epaules: [
    ['f-Seated_Dumbbell_Press', 'home', 'c', ['epaules']], ['f-Side_Lateral_Raise', 'home', 'i', []], ['f-Standing_Military_Press', 'gym', 'c', ['epaules', 'dos']],
    ['f-Cable_Seated_Lateral_Raise', 'gym', 'i', []], ['f-Arnold_Dumbbell_Press', 'home', 'c', ['epaules']], ['f-Handstand_Push-Ups', 'body', 'c', ['epaules']],
  ],
  biceps: [
    ['f-Dumbbell_Bicep_Curl', 'home', 'i', []], ['f-Barbell_Curl', 'gym', 'i', ['coudes']], ['f-Hammer_Curls', 'home', 'i', []],
    ['f-Incline_Dumbbell_Curl', 'home', 'i', []], ['f-Preacher_Curl', 'gym', 'i', ['coudes']], ['f-Chin-Up', 'body', 'c', ['coudes']],
  ],
  triceps: [
    ['f-Triceps_Pushdown_-_Rope_Attachment', 'gym', 'i', []], ['f-Cable_Rope_Overhead_Triceps_Extension', 'gym', 'i', ['coudes']],
    ['f-Standing_Dumbbell_Triceps_Extension', 'home', 'i', ['coudes', 'epaules']], ['f-Lying_Triceps_Press', 'gym', 'i', ['coudes']],
    ['f-Tricep_Dumbbell_Kickback', 'home', 'i', []], ['f-Close-Grip_Push-Up_off_of_a_Dumbbell', 'body', 'c', []], ['f-Bench_Dips', 'body', 'c', ['epaules']],
  ],
  quadriceps: [
    ['f-Barbell_Squat', 'gym', 'c', ['genoux', 'dos']], ['f-Leg_Press', 'gym', 'c', ['genoux']], ['f-Hack_Squat', 'gym', 'c', ['genoux']],
    ['f-Goblet_Squat', 'home', 'c', []], ['f-Split_Squat_with_Dumbbells', 'home', 'c', ['genoux']], ['f-Leg_Extensions', 'gym', 'i', ['genoux']],
    ['f-Bodyweight_Squat', 'body', 'c', []], ['f-Bodyweight_Walking_Lunge', 'body', 'c', ['genoux']],
  ],
  ischios: [
    ['f-Romanian_Deadlift', 'gym', 'c', ['dos']], ['f-Lying_Leg_Curls', 'gym', 'i', []], ['f-Seated_Leg_Curl', 'gym', 'i', []],
    ['f-Stiff-Legged_Dumbbell_Deadlift', 'home', 'c', ['dos']], ['f-Ball_Leg_Curl', 'body', 'i', []], ['f-Single_Leg_Glute_Bridge', 'body', 'i', []],
  ],
  fessiers: [
    ['f-Barbell_Hip_Thrust', 'gym', 'c', []], ['f-Barbell_Glute_Bridge', 'gym', 'c', []], ['f-Single_Leg_Glute_Bridge', 'body', 'i', []],
    ['f-Glute_Kickback', 'body', 'i', []], ['f-Butt_Lift_Bridge', 'body', 'i', []],
  ],
  mollets: [
    ['f-Standing_Calf_Raises', 'gym', 'i', []], ['f-Seated_Calf_Raise', 'gym', 'i', []], ['f-Standing_Dumbbell_Calf_Raise', 'home', 'i', []],
    ['f-Calf_Raise_On_A_Dumbbell', 'body', 'i', []],
  ],
  abdos: [
    ['f-Cable_Crunch', 'gym', 'i', []], ['f-Hanging_Leg_Raise', 'body', 'i', []], ['f-Ab_Roller', 'home', 'i', ['dos']],
    ['f-Reverse_Crunch', 'body', 'i', []], ['f-Plank', 'body', 'i', []], ['f-Dead_Bug', 'body', 'i', []],
  ],
  trapezes: [['f-Dumbbell_Shrug', 'home', 'i', []], ['f-Barbell_Shrug', 'gym', 'i', []]],
};
const EQUIP_RANK = { body: 0, home: 1, gym: 2 };

// Types de séance : muscles dans l'ordre où on les travaille (les gros et lourds d'abord).
const DAY_TYPES = {
  full: { name: 'Full body', muscles: ['quadriceps', 'pectoraux', 'dorsaux', 'epaules', 'ischios'] },
  upper: { name: 'Haut du corps', muscles: ['pectoraux', 'dorsaux', 'epaules', 'haut_dos', 'biceps', 'triceps'] },
  lower: { name: 'Bas du corps', muscles: ['quadriceps', 'ischios', 'fessiers', 'mollets', 'abdos'] },
  push: { name: 'Push', muscles: ['pectoraux', 'epaules', 'triceps'] },
  pull: { name: 'Pull', muscles: ['dorsaux', 'haut_dos', 'biceps', 'trapezes'] },
  legs: { name: 'Legs', muscles: ['quadriceps', 'ischios', 'fessiers', 'mollets', 'abdos'] },
};

function splitFor(days, level) {
  if (days <= 2) return { name: 'Full body', days: ['full', 'full'] };
  if (days === 3) return level === 'debutant' ? { name: 'Full body', days: ['full', 'full', 'full'] } : { name: 'Haut / Bas / Full', days: ['upper', 'lower', 'full'] };
  if (days === 4) return { name: 'Haut / Bas', days: ['upper', 'lower', 'upper', 'lower'] };
  if (days === 5) return { name: 'Haut / Bas + Push Pull Legs', days: ['upper', 'lower', 'push', 'pull', 'legs'] };
  return { name: 'Push Pull Legs', days: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] };
}

const PRIORITY_GROUPS = {
  pecs: ['pectoraux'], dos: ['dorsaux', 'haut_dos'], epaules: ['epaules'], bras: ['biceps', 'triceps'],
  jambes: ['quadriceps', 'ischios', 'mollets'], fessiers: ['fessiers'], abdos: ['abdos'],
};
const SMALL = new Set(['biceps', 'triceps', 'mollets', 'abdos', 'haut_dos', 'trapezes']);
// En full body, les petits muscles tournent d'une séance à l'autre pour garder des séances courtes.
const FULL_EXTRAS = [['biceps', 'triceps'], ['haut_dos', 'fessiers', 'abdos'], ['biceps', 'triceps', 'mollets']];
const musclesOf = (type, variant) => (type === 'full' ? [...DAY_TYPES.full.muscles, ...FULL_EXTRAS[variant % 3]] : DAY_TYPES[type].muscles);
// Ordre de ce qu'on raccourcit en premier quand le temps manque : les petits muscles avant les gros.
const CUT_ORDER = ['abdos', 'mollets', 'trapezes', 'haut_dos', 'avant_bras', 'triceps', 'biceps', 'epaules', 'fessiers', 'ischios', 'pectoraux', 'dorsaux', 'quadriceps'];

// ---------------------------------------------------------------------------
// Bilan de l'entraînement actuel
// ---------------------------------------------------------------------------

export function analyseCurrent() {
  const since = Date.now() - 14 * 864e5;
  const recent = state.workouts.filter((w) => w.end >= since);
  const source = recent.length >= 2 ? 'history' : state.routines.length ? 'routines' : 'none';
  const sets = Object.fromEntries(Object.keys(MUSCLES).map((m) => [m, 0]));
  const freq = Object.fromEntries(Object.keys(MUSCLES).map((m) => [m, 0]));
  const favs = {};
  let sessions = 0;
  if (source === 'history') {
    sessions = recent.length / 2;
    recent.forEach((w) => {
      const hit = new Set();
      w.exercises.forEach((e) => {
        e.p.forEach((m) => { if (sets[m] != null) { sets[m] += e.sets.length / 2; hit.add(m); } });
        e.s.forEach((m) => { if (sets[m] != null) sets[m] += e.sets.length / 4; });
        favs[e.exId] = (favs[e.exId] || 0) + 1;
      });
      hit.forEach((m) => (freq[m] += 0.5));
    });
  } else if (source === 'routines') {
    sessions = state.routines.length;
    state.routines.forEach((r) => {
      const hit = new Set();
      r.exercises.forEach((e) => {
        const ex = exerciseById(e.exId);
        (ex?.p || e.p || []).forEach((m) => { if (sets[m] != null) { sets[m] += Number(e.sets) || 3; hit.add(m); } });
        (ex?.s || []).forEach((m) => { if (sets[m] != null) sets[m] += (Number(e.sets) || 3) / 2; });
        favs[e.exId] = (favs[e.exId] || 0) + 2;
      });
      hit.forEach((m) => (freq[m] += 1));
    });
  }
  const keep = [];
  const fix = [];
  if (source !== 'none') {
    const major = ['pectoraux', 'dorsaux', 'epaules', 'quadriceps', 'ischios', 'fessiers'];
    const good = major.filter((m) => sets[m] >= 9 && sets[m] <= 22);
    if (good.length) keep.push(`Le volume de tes ${good.map(muscleLabel).join(', ').toLowerCase()} est dans la bonne zone.`);
    const low = major.filter((m) => sets[m] > 0 && sets[m] < 8);
    if (low.length) fix.push(`Trop peu de séries pour ${low.map((m) => `${muscleLabel(m).toLowerCase()} (${n0(sets[m])} par semaine)`).join(', ')} : on monte à 10 minimum.`);
    const none = major.filter((m) => !sets[m]);
    if (none.length) fix.push(`Tu ne travailles pas ${none.map((m) => muscleLabel(m).toLowerCase()).join(', ')} : on les ajoute, sinon pas de silhouette équilibrée.`);
    const high = Object.keys(sets).filter((m) => sets[m] > 24);
    if (high.length) fix.push(`Beaucoup trop pour ${high.map((m) => muscleLabel(m).toLowerCase()).join(', ')} : au-delà de 20 séries, tu récupères mal et tu ne gagnes plus rien.`);
    const once = major.filter((m) => sets[m] > 0 && freq[m] > 0 && freq[m] < 1.5);
    if (once.length) fix.push(`${once.map(muscleLabel).join(', ')} ne travaillent qu'une fois par semaine : deux fois, c'est nettement mieux pour grossir.`);
    else if (major.every((m) => freq[m] >= 1.5)) keep.push('Chaque muscle travaille au moins deux fois par semaine : parfait.');
    const push = sets.pectoraux + sets.epaules;
    const pull = sets.dorsaux + sets.haut_dos;
    if (push > pull * 1.5 && push > 8) fix.push('Trop de poussée par rapport au tirage : on rééquilibre avec plus de dos, tes épaules te diront merci.');
  }
  const favorites = Object.entries(favs).sort((a, b) => b[1] - a[1]).map(([id]) => id).filter((id) => exerciseById(id));
  return { source, sets, freq, sessions, keep, fix, favorites };
}

// ---------------------------------------------------------------------------
// Générateur de programme
// ---------------------------------------------------------------------------

export function buildProgram(a, current) {
  const level = a.level || 'intermediaire';
  const goal = a.goal || 'masse';
  const days = Number(a.days) || 4;
  const equip = a.equip || 'gym';
  const pains = a.pain || [];
  const priority = new Set((a.priority || []).flatMap((p) => PRIORITY_GROUPS[p] || []));
  const split = splitFor(days, level);
  const capacity = Math.round((Number(a.minutes) || 60) / 2.8);
  const base = { debutant: 10, intermediaire: 14, avance: 18 }[level];
  const goalFactor = { masse: 1, force: 0.85, seche: 0.8, forme: 0.75 }[goal];

  // Séries visées par muscle et par semaine.
  const weekly = {};
  Object.keys(POOL).forEach((m) => {
    let t = base * goalFactor * (SMALL.has(m) ? 0.7 : m === 'epaules' ? 0.8 : 1);
    if (m === 'trapezes') t = priority.has('trapezes') || level === 'avance' ? 6 : 0;
    if (priority.has(m)) t += 4;
    weekly[m] = Math.round(t);
  });

  const favorites = current?.favorites || [];
  const allowed = (row) => EQUIP_RANK[row[1]] <= EQUIP_RANK[equip];
  const avoided = new Set();
  const choose = (muscle, kind, variant, used) => {
    let list = POOL[muscle].filter(allowed).filter((r) => !used.has(r[0]) && exerciseById(r[0]))
      .filter((r) => r[0] !== 'f-Handstand_Push-Ups' || level === 'avance');
    const safe = list.filter((r) => !r[3].some((j) => pains.includes(j)));
    if (safe.length) {
      list.filter((r) => !safe.includes(r)).forEach((r) => avoided.add(r[0]));
      list = safe;
    }
    const byKind = list.filter((r) => r[2] === kind);
    const pool = byKind.length ? byKind : list;
    if (!pool.length) return null;
    // Les exercices que tu fais déjà passent devant : on garde ce qui marche.
    const fav = pool.find((r) => favorites.slice(0, 12).includes(r[0]));
    if (fav && variant === 0) return fav[0];
    return pool[variant % pool.length][0];
  };

  const reps = (kind, muscle) => {
    if (muscle === 'abdos') return '12-20';
    if (kind === 'c') return goal === 'force' ? '4-6' : goal === 'forme' ? '8-12' : '6-10';
    return '10-15';
  };
  const kindOf = (muscle, id) => POOL[muscle].find((r) => r[0] === id)?.[2] || 'i';

  const count = {};
  const seenCount = {};
  split.days.forEach((d) => {
    const v = (seenCount[d] = (seenCount[d] ?? -1) + 1);
    musclesOf(d, v).forEach((m) => (count[m] = (count[m] || 0) + 1));
  });
  const seen = {};
  const out = split.days.map((type, i) => {
    const variant = (seen[type] = (seen[type] ?? -1) + 1);
    const used = new Set();
    const items = [];
    musclesOf(type, variant).forEach((m) => {
      if (!weekly[m]) return;
      let perDay = Math.max(2, Math.round(weekly[m] / count[m]));
      if (type === 'full' && !priority.has(m)) perDay = Math.min(perDay, SMALL.has(m) ? 3 : 4);
      // Petits muscles : une isolation suffit (ils travaillent déjà sur les gros exercices).
      const first = choose(m, SMALL.has(m) ? 'i' : 'c', variant, used);
      if (!first) return;
      used.add(first);
      const two = perDay >= 6 && !SMALL.has(m);
      const second = two ? choose(m, 'i', variant, used) || choose(m, 'c', variant + 1, used) : null;
      if (second) {
        used.add(second);
        const a = Math.ceil(perDay * 0.55);
        items.push({ exId: first, muscle: m, sets: a }, { exId: second, muscle: m, sets: perDay - a, extra: true });
      } else items.push({ exId: first, muscle: m, sets: perDay });
    });
    // Séance trop longue pour le temps dispo : d'abord moins d'exercices (on garde les gros), puis moins de séries.
    const total = () => items.reduce((s, x) => s + x.sets, 0);
    for (let guard = 0; total() > capacity && guard < 80; guard++) {
      const extra = items.filter((x) => x.extra && !priority.has(x.muscle)).pop() || items.filter((x) => x.extra).pop();
      if (extra) {
        const main = items.find((x) => x.muscle === extra.muscle && !x.extra);
        main.sets = Math.min(5, main.sets + Math.ceil(extra.sets / 2));
        items.splice(items.indexOf(extra), 1);
        continue;
      }
      // Plancher par exercice : 2 séries pour les petits muscles, 4 pour les gros, 3 pour les priorités.
      const floor = (x) => (SMALL.has(x.muscle) || x.muscle === 'epaules' ? 2 : priority.has(x.muscle) ? 3 : 4);
      const rank = (x) => (priority.has(x.muscle) ? 100 : 0) + CUT_ORDER.indexOf(x.muscle);
      const cut = items.filter((x) => x.sets > floor(x)).sort((p, q) => rank(p) - rank(q))[0]
        || items.filter((x) => x.sets > 3).sort((p, q) => rank(p) - rank(q))[0];
      if (!cut) break;
      cut.sets--;
    }
    const letter = split.days.filter((d) => d === type).length > 1 ? ` ${'ABC'[variant]}` : '';
    return {
      id: `coach-${i}`,
      name: `${DAY_TYPES[type].name}${letter}`,
      type,
      exercises: items.map((x) => {
        const ex = exerciseById(x.exId);
        const kind = kindOf(x.muscle, x.exId);
        return { exId: x.exId, name: ex.name, p: ex.p, sets: Math.min(5, Math.max(2, x.sets)), reps: reps(kind, x.muscle), rest: kind === 'c' ? 150 : 75 };
      }),
    };
  });

  // Volume final par muscle (principaux pleins, secondaires à moitié).
  const volume = Object.fromEntries(Object.keys(MUSCLES).map((m) => [m, 0]));
  out.forEach((d) => d.exercises.forEach((e) => {
    const ex = exerciseById(e.exId);
    ex.p.forEach((m) => volume[m] != null && (volume[m] += e.sets));
    ex.s.forEach((m) => volume[m] != null && (volume[m] += e.sets / 2));
  }));

  const kept = favorites.filter((id) => out.some((d) => d.exercises.some((e) => e.exId === id))).slice(0, 3);
  const why = [
    `${days} séances par semaine en ${split.name} : chaque muscle travaille deux fois par semaine, la fréquence qui fait le plus grossir.`,
    `Environ ${n0(base * goalFactor)} séries par gros muscle et par semaine : la bonne dose pour ton niveau.`,
    priority.size ? `Plus de volume pour ${[...priority].map((m) => muscleLabel(m).toLowerCase()).join(', ')}, ta priorité.` : '',
    kept.length ? `Je garde ${kept.map((id) => exerciseById(id).name).join(', ')} : tu les fais déjà, ils sont efficaces.` : '',
    avoided.size ? `J'ai écarté ${[...avoided].slice(0, 3).map((id) => exerciseById(id)?.name).filter(Boolean).join(', ')} pour ménager ${pains.map((p) => ({ epaules: 'tes épaules', dos: 'ton dos', genoux: 'tes genoux', coudes: 'tes coudes' })[p]).join(', ')}.` : '',
    `Arrête chaque série à 1 ou 2 répétitions de l'échec. Quand tu fais le haut de la fourchette sur toutes les séries, ajoute 2,5 kg.`,
    'Toutes les 6 semaines, une semaine plus légère (moitié des séries) pour revenir plus fort.',
    `Côté assiette : ${n0(targets().protein)} g de protéines par jour, c'est le carburant du muscle.`,
  ].filter(Boolean);

  return { id: uid(), name: `Programme ${split.name}`, split: split.name, goal, level, daysPerWeek: days, minutes: Number(a.minutes) || 60, days: out, volume, why, created: Date.now() };
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

const QUESTIONS = {
  goal: {
    text: () => 'Ton objectif principal ?',
    options: [['masse', 'Prendre un max de muscle'], ['force', 'Force et muscle'], ['seche', 'Sécher en gardant le muscle'], ['forme', 'Être en forme']],
  },
  level: {
    text: () => 'Tu t\'entraînes depuis combien de temps ?',
    options: [['debutant', 'Moins d\'un an'], ['intermediaire', '1 à 3 ans'], ['avance', 'Plus de 3 ans']],
  },
  days: {
    text: () => 'Combien de séances par semaine, de façon réaliste ?',
    options: [['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']],
  },
  minutes: {
    text: () => 'Combien de temps par séance ?',
    options: [['45', '45 min'], ['60', '1 h'], ['75', '1 h 15'], ['90', '1 h 30']],
  },
  equip: {
    text: () => 'Tu t\'entraînes où ?',
    options: [['gym', 'En salle'], ['home', 'À la maison avec haltères'], ['body', 'Au poids du corps']],
  },
  priority: {
    text: () => 'Des muscles à faire grossir en priorité ? (plusieurs choix)',
    multi: true,
    options: [['pecs', 'Pecs'], ['dos', 'Dos'], ['epaules', 'Épaules'], ['bras', 'Bras'], ['jambes', 'Jambes'], ['fessiers', 'Fessiers'], ['abdos', 'Abdos']],
    none: 'Équilibré partout',
  },
  pain: {
    text: () => 'Une zone à ménager ?',
    multi: true,
    options: [['epaules', 'Épaules'], ['dos', 'Bas du dos'], ['genoux', 'Genoux'], ['coudes', 'Coudes']],
    none: 'Aucune',
  },
};
const ORDER = ['goal', 'level', 'days', 'minutes', 'equip', 'priority', 'pain'];

let typing = false;
let seenCount = 0;
let multiDraft = [];

function say(text, kind = 'coach', extra = {}) {
  C().log.push({ from: kind, text, t: Date.now(), ...extra });
  if (C().log.length > 80) C().log = C().log.slice(-80);
}

/** Le coach « écrit » quelques instants, puis ses messages arrivent un par un. */
function coachSays(messages, then) {
  typing = true;
  rerender();
  scrollChat();
  const queue = [...messages];
  const next = () => {
    const m = queue.shift();
    if (!m) {
      typing = false;
      save();
      then?.();
      rerender();
      scrollChat();
      return;
    }
    if (typeof m === 'string') say(m);
    else say(m.text, 'coach', m);
    tone([1046], 0.025, 0.05);
    rerender();
    scrollChat();
    setTimeout(next, Math.min(1400, 450 + (typeof m === 'string' ? m : m.text || '').length * 9));
  };
  setTimeout(next, 650);
}

function scrollChat() {
  requestAnimationFrame(() => document.querySelector('.coach-end')?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
}

function ask(step) {
  C().step = step;
  multiDraft = [];
  coachSays([QUESTIONS[step].text(C().answers)]);
}

function answer(step, value, label) {
  const c = C();
  c.answers[step] = value;
  say(label, 'me');
  haptic();
  const i = ORDER.indexOf(step);
  const reactions = {
    goal: { masse: 'Parfait, c\'est ma spécialité.', force: 'Force et volume, excellent combo.', seche: 'On garde tout le muscle pendant la sèche, promis.', forme: 'Super, on va construire du solide.' },
    days: { 2: 'Deux séances bien faites, ça suffit pour progresser.', 6: 'Six séances, tu es motivé ! On va bien doser la récup.' },
  };
  const react = reactions[step]?.[value];
  if (i < ORDER.length - 1) {
    if (react) {
      coachSays([react], () => ask(ORDER[i + 1]));
    } else ask(ORDER[i + 1]);
  } else finish();
}

async function finish() {
  const c = C();
  c.step = 'analysing';
  if (!libraryReady()) await loadLibrary().catch(() => {});
  const current = analyseCurrent();
  const program = buildProgram(c.answers, current);
  const intro = current.source === 'none'
    ? ['Pas d\'historique pour l\'instant : on part de zéro, c\'est même idéal.']
    : [`J'ai analysé ${current.source === 'history' ? 'tes deux dernières semaines' : 'tes séances perso'}.`];
  const verdict = [
    ...current.keep.map((t) => ({ text: t, tag: 'keep' })),
    ...current.fix.map((t) => ({ text: t, tag: 'fix' })),
  ];
  c.program = program;
  c.step = 'done';
  c.lastCheckin = Date.now();
  coachSays([
    ...intro,
    ...verdict,
    'Voilà ton programme, taillé pour toi :',
    { text: '', kind: 'program' },
  ], () => {
    confetti();
    tone([659, 784, 1047], 0.08, 0.13);
  });
}

// ---------------------------------------------------------------------------
// Réponses rapides après le programme
// ---------------------------------------------------------------------------

function faq(key) {
  const p = state.profile;
  const g = targets();
  const answers = {
    proteines: [`Vise ${n0(g.protein)} g de protéines par jour, soit environ ${(g.protein / (p?.weightKg || 70)).toFixed(1).replace('.', ',')} g par kilo.`, 'Répartis-les sur 3 à 5 repas : viande, poisson, œufs, skyr, whey si besoin.'],
    stagne: ['Si tu stagnes depuis 2 semaines sur un exercice :', '1. Vérifie ton sommeil (7 h minimum) et tes protéines.', '2. Baisse la charge de 10 %, remonte en 3 semaines.', '3. Si ça bloque encore, change de variante (haltères au lieu de barre, par exemple).'],
    repos: ['2 à 3 minutes sur les gros exercices (squat, développé, rowing), 1 minute à 1 min 30 sur les isolations.', 'Se reposer assez, ça te fait soulever plus, donc grossir plus.'],
    courbatures: ['Les courbatures ne sont pas un signe d\'efficacité.', 'Tu peux t\'entraîner avec de petites courbatures. Si un muscle est vraiment douloureux, passe à une séance qui ne le sollicite pas, ou marche 30 minutes.'],
    echec: ['Pas besoin d\'aller à l\'échec à chaque série : garde 1 ou 2 répétitions en réserve.', 'Tu peux aller à l\'échec sur la dernière série des isolations (curl, élévations).'],
  };
  return answers[key] || [];
}

const FAQ = [['proteines', 'Combien de protéines ?'], ['stagne', 'Je stagne'], ['repos', 'Combien de repos ?'], ['courbatures', 'Courbatures'], ['echec', 'Aller à l\'échec ?']];

/** Bilan de la semaine : le coach regarde ce que tu as fait depuis la dernière fois. */
function checkin() {
  const c = C();
  if (!c.program || typing || Date.now() - (c.lastCheckin || 0) < 6.5 * 864e5) return;
  const since = c.lastCheckin || c.program.created;
  const done = state.workouts.filter((w) => w.end >= since);
  const planned = c.program.daysPerWeek;
  const prs = done.flatMap((w) => w.prs || []);
  c.lastCheckin = Date.now();
  const ratio = done.length / planned;
  const lines = [
    `Bilan de la semaine : ${done.length} séance${done.length > 1 ? 's' : ''} sur ${planned} prévues.`,
    ratio >= 1 ? 'Semaine parfaite. C\'est exactement comme ça qu\'on construit du muscle.' : ratio >= 0.5 ? 'Pas mal ! La régularité fera la différence : on vise toutes les séances cette semaine.' : 'Semaine compliquée, ça arrive. Une seule séance aujourd\'hui et on relance la machine.',
    prs.length ? `Et ${prs.length} record${prs.length > 1 ? 's' : ''} battu${prs.length > 1 ? 's' : ''} (${[...new Set(prs)].slice(0, 2).join(', ')}) : bravo !` : 'Essaie d\'ajouter une répétition ou 2,5 kg sur ton premier exercice de chaque séance.',
  ];
  coachSays(lines);
}

/** Prochaine séance du programme, dans l'ordre. */
export function coachNext() {
  const p = C().program;
  if (!p) return null;
  const last = [...state.workouts].sort((a, b) => b.end - a.end).find((w) => w.source?.type === 'coach');
  const i = last ? (p.days.findIndex((d) => d.id === last.source.id) + 1) % p.days.length : 0;
  return { day: p.days[i], index: i, program: p };
}

export function startCoachDay(id) {
  const p = C().program;
  const day = p?.days.find((d) => d.id === id);
  if (!day) return;
  startSessionFn(day.name, { type: 'coach', id: day.id }, day.exercises.map((e) => [e.exId, e.sets, e.reps]));
}

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------

export const coachAvatar = (size = 40) => `<svg class="coach-avatar" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
  <defs><linearGradient id="cav" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--ad)"/><stop offset="1" stop-color="var(--ad-deep)"/></linearGradient></defs>
  <circle cx="24" cy="24" r="24" fill="url(#cav)"/>
  <circle cx="24" cy="26" r="13" fill="#f3d2b5"/>
  <path d="M11 22c1-8 6-12 13-12s12 4 13 12c-4-2-8-3-13-3s-9 1-13 3z" fill="#2a2f38"/>
  <rect x="10.5" y="18.5" width="27" height="4" rx="2" fill="#ff4d4f"/>
  <circle cx="19.5" cy="26.5" r="1.7" fill="#2a2f38"/><circle cx="28.5" cy="26.5" r="1.7" fill="#2a2f38"/>
  <path d="M19.5 31.5q4.5 3.5 9 0" stroke="#2a2f38" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M33 33l5 5" stroke="#cfd5dc" stroke-width="2"/><circle cx="39" cy="39" r="2.6" fill="#cfd5dc"/>
</svg>`;

function programCard(p, compact = false) {
  const top = Math.max(20, ...Object.values(p.volume));
  const shown = ['pectoraux', 'dorsaux', 'epaules', 'quadriceps', 'ischios', 'fessiers', 'biceps', 'triceps'];
  return `<div class="program-card">
    <div class="pc-head"><span class="pc-kicker">${p.daysPerWeek} séances · ${p.minutes} min</span><b>${esc(p.name)}</b></div>
    <div class="pc-days">${p.days.map((d, i) => `<details class="pc-day" ${compact ? '' : i === 0 ? 'open' : ''}>
        <summary><span class="pc-num">${i + 1}</span><span class="spacer"><b>${esc(d.name)}</b><small>${d.exercises.length} exercices · ${d.exercises.reduce((s, e) => s + e.sets, 0)} séries</small></span>
          <button class="round pc-go" data-x="coach-start" data-id="${d.id}" aria-label="Démarrer">${icon.play}</button></summary>
        ${d.exercises.map((e) => `<button class="pc-ex" data-wact="exercise-detail" data-id="${esc(e.exId)}"><span>${esc(e.name)}</span><b>${e.sets} × ${e.reps}</b></button>`).join('')}
      </details>`).join('')}</div>
    ${compact ? '' : `<div class="pc-vol"><div class="muted small">Séries par semaine</div>${shown.map((m) => `<div class="pc-vrow"><span>${muscleLabel(m)}</span>
        <div class="vol-track"><i class="vol-band" style="left:${(10 / top) * 100}%;width:${(10 / top) * 100}%"></i><div class="vol-fill" style="width:${Math.min(100, (p.volume[m] / top) * 100)}%;--c:var(--accent)"></div></div><b>${n0(p.volume[m])}</b></div>`).join('')}</div>`}
  </div>`;
}

export function coachSection() {
  const c = C();
  checkin();
  const next = coachNext();
  const log = c.log;
  const fresh = seenCount;
  seenCount = log.length;
  const bubbles = log.map((m, i) => {
    const cls = `${i >= fresh ? 'new' : ''}`;
    if (m.kind === 'program' && c.program) return `<div class="bubble-row coach ${cls}"><div class="bubble wide">${programCard(c.program)}
        <ul class="pc-why">${c.program.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
        <div class="pc-actions"><button class="btn btn-primary" data-x="coach-save">${icon.download} Enregistrer dans mes séances</button></div></div></div>`;
    if (m.from === 'me') return `<div class="bubble-row me ${cls}"><div class="bubble">${esc(m.text)}</div></div>`;
    return `<div class="bubble-row coach ${cls}">${coachAvatar(30)}<div class="bubble ${m.tag || ''}">${m.tag === 'keep' ? `<b class="tag">On garde</b>` : m.tag === 'fix' ? `<b class="tag">On corrige</b>` : ''}${esc(m.text)}</div></div>`;
  }).join('');

  let input = '';
  if (typing) {
    input = '';
  } else if (c.step === 'intro') {
    input = `<button class="btn btn-primary" data-x="coach-begin">${icon.play} C'est parti</button>`;
  } else if (QUESTIONS[c.step]) {
    const q = QUESTIONS[c.step];
    input = `<div class="coach-chips">${q.options.map(([v, l]) => `<button class="pill glass ${multiDraft.includes(v) ? 'active' : ''}" data-x="coach-answer" data-v="${v}" data-l="${esc(l)}">${esc(l)}</button>`).join('')}
      ${q.multi ? `<button class="pill glass" data-x="coach-none">${esc(q.none)}</button>` : ''}</div>
      ${q.multi && multiDraft.length ? `<button class="btn btn-primary" data-x="coach-multi">Valider (${multiDraft.length})</button>` : ''}`;
  } else if (c.step === 'done') {
    input = `<div class="coach-chips">${FAQ.map(([k, l]) => `<button class="pill glass" data-x="coach-faq" data-k="${k}" data-l="${esc(l)}">${esc(l)}</button>`).join('')}
      <button class="pill glass" data-x="coach-restart">${icon.refresh} Refaire le bilan</button></div>`;
  }

  return `${next ? `<button class="coach-next" data-x="coach-start" data-id="${next.day.id}">
      <span class="cn-kicker">Séance ${next.index + 1} sur ${next.program.days.length} · ton programme</span>
      <b>${esc(next.day.name)}</b><span>${next.day.exercises.slice(0, 3).map((e) => esc(e.name)).join(' · ')}${next.day.exercises.length > 3 ? '…' : ''}</span>
      <span class="pick-go">${icon.play} Démarrer</span></button>` : ''}
    <section class="coach-chat">
      <div class="coach-head">${coachAvatar(46)}<div><b>Coach ${COACH_NAME}</b><small><i class="online"></i>Spécialiste prise de muscle</small></div></div>
      ${log.length ? '' : `<div class="bubble-row coach new">${coachAvatar(30)}<div class="bubble">Salut ${esc(state.profile?.firstName || '')} ! Je suis ${COACH_NAME}, ton coach. En 7 questions, je regarde ce que tu fais déjà, je garde ce qui marche, je corrige le reste et je te construis un programme pour prendre un max de muscle.</div></div>`}
      ${bubbles}
      ${typing ? `<div class="bubble-row coach">${coachAvatar(30)}<div class="bubble typing"><i></i><i></i><i></i></div></div>` : ''}
      <div class="coach-input">${input}</div>
      <span class="coach-end"></span>
    </section>`;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function coachAction(name, el) {
  const c = C();
  switch (name) {
    case 'coach-begin':
      say("C'est parti !", 'me');
      haptic();
      ask(ORDER[0]);
      return true;
    case 'coach-answer': {
      const q = QUESTIONS[c.step];
      if (!q || typing) return true;
      if (q.multi) {
        const v = el.dataset.v;
        multiDraft = multiDraft.includes(v) ? multiDraft.filter((x) => x !== v) : [...multiDraft, v];
        haptic(8);
        rerender();
      } else answer(c.step, el.dataset.v, el.dataset.l);
      return true;
    }
    case 'coach-multi': {
      const q = QUESTIONS[c.step];
      const labels = q.options.filter(([v]) => multiDraft.includes(v)).map(([, l]) => l);
      answer(c.step, [...multiDraft], labels.join(', '));
      return true;
    }
    case 'coach-none':
      answer(c.step, [], QUESTIONS[c.step].none);
      return true;
    case 'coach-faq':
      say(el.dataset.l, 'me');
      coachSays(faq(el.dataset.k));
      return true;
    case 'coach-restart':
      if (!confirm('Refaire le bilan ? Ton programme actuel sera remplacé à la fin.')) return true;
      c.answers = {};
      say('On refait le bilan', 'me');
      ask(ORDER[0]);
      return true;
    case 'coach-save': {
      const p = c.program;
      if (!p) return true;
      state.routines = [
        ...p.days.map((d) => ({ id: `${p.id}-${d.id}`, name: `Coach · ${d.name}`, exercises: d.exercises.map((e) => ({ exId: e.exId, name: e.name, p: e.p, sets: e.sets, reps: e.reps })) })),
        ...state.routines.filter((r) => !r.id.startsWith(p.id)),
      ];
      save();
      haptic([20, 30, 40]);
      tone([784, 1047], 0.07, 0.12);
      toast(`${p.days.length} séances ajoutées`, 'checkCircle');
      rerender();
      return true;
    }
    case 'coach-start':
      startCoachDay(el.dataset.id);
      return true;
  }
  return false;
}
