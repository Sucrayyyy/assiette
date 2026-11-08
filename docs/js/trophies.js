// Trophées : chaque défi a un compteur et un seuil. Le déblocage se fête en plein écran.
import { state, save } from './store.js';
import { itemsMacros, targets, shiftDay, n0 } from './nutrition.js';
import { esc, icon, haptic, tone, confetti } from './ui.js';
import { act, openPanel, panelHead } from './panel.js';
import { waterGoal } from './modules.js';
import { dueOn, allTakenOn } from './supplements.js';

const BENCH = 'f-Barbell_Bench_Press_-_Medium_Grip';
const SQUAT = 'f-Barbell_Squat';
const DEADLIFT = 'f-Barbell_Deadlift';

function longestRun(days) {
  const set = new Set(days);
  let best = 0;
  for (const d of set) {
    if (set.has(shiftDay(d, -1))) continue;
    let n = 1;
    let cur = d;
    while (set.has((cur = shiftDay(cur, 1)))) n++;
    best = Math.max(best, n);
  }
  return best;
}

function collect() {
  const byDay = new Map();
  for (const e of state.entries) {
    if (!byDay.has(e.day)) byDay.set(e.day, []);
    byDay.get(e.day).push(...e.items);
  }
  const g = targets();
  const proteinDays = [...byDay.values()].filter((items) => itemsMacros(items).protein >= g.protein * 0.95).length;
  const best = (id) => Math.max(0, ...state.workouts.flatMap((w) => w.exercises.filter((e) => e.exId === id).flatMap((e) => e.sets.map((s) => Number(s.w) || 0))));
  const hours = state.workouts.map((w) => new Date(w.end).getHours());
  const steps = Object.values(state.steps || {});
  const suppDays = Object.keys(state.suppLog || {}).filter((d) => dueOn(d).length && allTakenOn(d));
  return {
    entries: state.entries.length,
    foodRun: longestRun([...byDay.keys()]),
    proteinDays,
    sessions: state.workouts.length,
    prs: state.workouts.reduce((n, w) => n + (w.prs?.length || 0), 0),
    bestVolume: Math.max(0, ...state.workouts.map((w) => w.volume || 0)),
    totalVolume: state.workouts.reduce((n, w) => n + (w.volume || 0), 0),
    bench: best(BENCH),
    squat: best(SQUAT),
    deadlift: best(DEADLIFT),
    early: hours.filter((h) => h < 8).length,
    late: hours.filter((h) => h >= 22).length,
    maxSteps: Math.max(0, ...steps),
    totalSteps: steps.reduce((a, b) => a + b, 0),
    waterDays: Object.values(state.water || {}).filter((ml) => ml >= waterGoal()).length,
    suppRun: longestRun(suppDays),
    perfect: Object.keys(state.perfectDays || {}).length,
    quizDays: Object.values(state.game?.daily || {}).filter((d) => d.done).length,
    quizBest: state.game?.best?.daily || 0,
    duelBest: state.game?.best?.duel || 0,
    quizPerfects: state.game?.perfects || 0,
  };
}

// tier : bronze, argent, or ou platine.
export const TROPHIES = [
  { id: 'first-bite', cat: 'Nutrition', name: 'Première bouchée', desc: 'Note ton premier aliment', tier: 'bronze', ico: 'utensils', stat: 'entries', goal: 1 },
  { id: 'streak-7', cat: 'Nutrition', name: 'Semaine complète', desc: '7 jours notés de suite', tier: 'argent', ico: 'flame', stat: 'foodRun', goal: 7 },
  { id: 'streak-30', cat: 'Nutrition', name: 'Le mois parfait', desc: '30 jours notés de suite', tier: 'or', ico: 'flame', stat: 'foodRun', goal: 30 },
  { id: 'entries-100', cat: 'Nutrition', name: 'Cent assiettes', desc: '100 aliments notés', tier: 'argent', ico: 'target', stat: 'entries', goal: 100 },
  { id: 'entries-1000', cat: 'Nutrition', name: 'Comptable en chef', desc: '1 000 aliments notés', tier: 'platine', ico: 'target', stat: 'entries', goal: 1000 },
  { id: 'protein-7', cat: 'Nutrition', name: 'Bâtisseur', desc: 'Protéines atteintes 7 fois', tier: 'bronze', ico: 'bolt', stat: 'proteinDays', goal: 7 },
  { id: 'protein-30', cat: 'Nutrition', name: 'Machine à protéines', desc: 'Protéines atteintes 30 fois', tier: 'or', ico: 'bolt', stat: 'proteinDays', goal: 30 },

  { id: 'session-1', cat: 'Muscu', name: 'Premier pas à la salle', desc: 'Termine une séance', tier: 'bronze', ico: 'dumbbell', stat: 'sessions', goal: 1 },
  { id: 'session-10', cat: 'Muscu', name: 'Habitué', desc: '10 séances', tier: 'bronze', ico: 'dumbbell', stat: 'sessions', goal: 10 },
  { id: 'session-50', cat: 'Muscu', name: 'Pilier de la salle', desc: '50 séances', tier: 'argent', ico: 'dumbbell', stat: 'sessions', goal: 50 },
  { id: 'session-100', cat: 'Muscu', name: 'Centurion', desc: '100 séances', tier: 'or', ico: 'dumbbell', stat: 'sessions', goal: 100 },
  { id: 'session-300', cat: 'Muscu', name: 'Légende vivante', desc: '300 séances', tier: 'platine', ico: 'dumbbell', stat: 'sessions', goal: 300 },
  { id: 'pr-1', cat: 'Muscu', name: 'Nouveau toi', desc: 'Bats ton premier record', tier: 'bronze', ico: 'trophy', stat: 'prs', goal: 1 },
  { id: 'pr-25', cat: 'Muscu', name: 'Chasseur de records', desc: '25 records battus', tier: 'or', ico: 'trophy', stat: 'prs', goal: 25 },
  { id: 'ton-1', cat: 'Muscu', name: 'Une voiture', desc: '1 tonne soulevée en une séance', tier: 'bronze', ico: 'arrowUpRight', stat: 'bestVolume', goal: 1000 },
  { id: 'ton-5', cat: 'Muscu', name: "L'éléphant", desc: '5 tonnes en une séance', tier: 'argent', ico: 'arrowUpRight', stat: 'bestVolume', goal: 5000 },
  { id: 'total-100', cat: 'Muscu', name: 'Cent tonnes', desc: '100 tonnes soulevées au total', tier: 'or', ico: 'arrowUpRight', stat: 'totalVolume', goal: 100000 },
  { id: 'bench-100', cat: 'Muscu', name: 'Club des 100', desc: '100 kg au développé couché', tier: 'or', ico: 'medal', stat: 'bench', goal: 100 },
  { id: 'squat-140', cat: 'Muscu', name: 'Jambes de béton', desc: '140 kg au squat', tier: 'or', ico: 'medal', stat: 'squat', goal: 140 },
  { id: 'deadlift-180', cat: 'Muscu', name: 'Arrache-sol', desc: '180 kg au soulevé de terre', tier: 'or', ico: 'medal', stat: 'deadlift', goal: 180 },
  { id: 'early', cat: 'Muscu', name: 'Lève-tôt', desc: 'Une séance finie avant 8 h', tier: 'argent', ico: 'sun', stat: 'early', goal: 1 },
  { id: 'late', cat: 'Muscu', name: 'Oiseau de nuit', desc: 'Une séance finie après 22 h', tier: 'argent', ico: 'moon', stat: 'late', goal: 1 },

  { id: 'steps-10k', cat: 'Au quotidien', name: 'Bon marcheur', desc: '10 000 pas en un jour', tier: 'bronze', ico: 'steps', stat: 'maxSteps', goal: 10000 },
  { id: 'steps-20k', cat: 'Au quotidien', name: 'Infatigable', desc: '20 000 pas en un jour', tier: 'argent', ico: 'steps', stat: 'maxSteps', goal: 20000 },
  { id: 'marathon', cat: 'Au quotidien', name: 'Marathonien', desc: '56 000 pas au total, soit 42 km', tier: 'bronze', ico: 'flag', stat: 'totalSteps', goal: 56000 },
  { id: 'paris-marseille', cat: 'Au quotidien', name: 'Paris-Marseille', desc: "1 million de pas, l'équivalent à pied", tier: 'platine', ico: 'flag', stat: 'totalSteps', goal: 1000000 },
  { id: 'water-7', cat: 'Au quotidien', name: 'Bien hydraté', desc: 'Objectif eau atteint 7 fois', tier: 'bronze', ico: 'drop', stat: 'waterDays', goal: 7 },
  { id: 'water-30', cat: 'Au quotidien', name: 'Source vive', desc: 'Objectif eau atteint 30 fois', tier: 'or', ico: 'drop', stat: 'waterDays', goal: 30 },
  { id: 'supp-7', cat: 'Au quotidien', name: 'Sérieux', desc: 'Compléments pris 7 jours de suite', tier: 'argent', ico: 'pill', stat: 'suppRun', goal: 7 },
  { id: 'supp-30', cat: 'Au quotidien', name: 'Réglé comme une horloge', desc: 'Compléments pris 30 jours de suite', tier: 'or', ico: 'pill', stat: 'suppRun', goal: 30 },
  { id: 'perfect-1', cat: 'Au quotidien', name: 'Journée parfaite', desc: 'Tous tes objectifs en un jour', tier: 'argent', ico: 'checkCircle', stat: 'perfect', goal: 1 },
  { id: 'perfect-10', cat: 'Au quotidien', name: 'Sans faute', desc: '10 journées parfaites', tier: 'platine', ico: 'checkCircle', stat: 'perfect', goal: 10 },

  { id: 'quiz-1', cat: 'Calorimètre', name: 'Curieux', desc: 'Termine ton premier défi du jour', tier: 'bronze', ico: 'gauge', stat: 'quizDays', goal: 1 },
  { id: 'quiz-7', cat: 'Calorimètre', name: 'Fidèle au poste', desc: '7 défis du jour terminés', tier: 'argent', ico: 'gauge', stat: 'quizDays', goal: 7 },
  { id: 'quiz-30', cat: 'Calorimètre', name: 'Encyclopédie', desc: '30 défis du jour terminés', tier: 'or', ico: 'book', stat: 'quizDays', goal: 30 },
  { id: 'quiz-400', cat: 'Calorimètre', name: 'Œil affûté', desc: '400 points en un défi', tier: 'argent', ico: 'target', stat: 'quizBest', goal: 400 },
  { id: 'quiz-470', cat: 'Calorimètre', name: 'Balance humaine', desc: '470 points en un défi', tier: 'platine', ico: 'scale', stat: 'quizBest', goal: 470 },
  { id: 'quiz-perfect-10', cat: 'Calorimètre', name: 'Dans le mille', desc: '10 réponses parfaites', tier: 'or', ico: 'star', stat: 'quizPerfects', goal: 10 },
  { id: 'duel-10', cat: 'Calorimètre', name: 'Duelliste', desc: '10 bonnes réponses d\'affilée en duel', tier: 'argent', ico: 'bolt', stat: 'duelBest', goal: 10 },
  { id: 'duel-25', cat: 'Calorimètre', name: 'Imbattable', desc: '25 bonnes réponses d\'affilée en duel', tier: 'or', ico: 'bolt', stat: 'duelBest', goal: 25 },
];

export const medal = (t, locked = false, size = 64) =>
  `<span class="medal ${t.tier} ${locked ? 'locked' : ''}" style="--m:${size}px">${icon[t.ico] || icon.trophy}</span>`;

export const trophyCount = () => Object.keys(state.trophies || {}).length;

function panelTrophies() {
  const s = collect();
  const cats = [...new Set(TROPHIES.map((t) => t.cat))];
  const fmt = (t) => {
    const big = t.goal >= 10000;
    const v = (x) => (big ? `${n0(x / 1000)} k` : n0(x));
    return `${v(Math.min(s[t.stat], t.goal))} / ${v(t.goal)}`;
  };
  return `${panelHead('Trophées', `${trophyCount()} sur ${TROPHIES.length}`)}
    ${cats.map((cat) => `<div class="list-title">${cat}</div>
      <div class="trophy-grid">${TROPHIES.filter((t) => t.cat === cat).map((t) => {
        const got = state.trophies?.[t.id];
        return `<div class="trophy ${got ? '' : 'off'}">${medal(t, !got)}
          <b>${esc(t.name)}</b><small>${esc(t.desc)}</small>
          ${got ? `<small class="when">${new Date(got).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</small>`
            : `<div class="bar-track" style="--c:var(--accent)"><div class="bar-fill" style="width:${Math.min(100, (s[t.stat] / t.goal) * 100)}%"></div></div><small class="when">${fmt(t)}</small>`}
        </div>`;
      }).join('')}</div>`).join('')}`;
}

act('trophies-open', () => openPanel(panelTrophies, { tall: true }));

// ---------------------------------------------------------------------------
// Déblocage
// ---------------------------------------------------------------------------

const queue = [];
let showing = false;

function showNext() {
  const t = queue.shift();
  if (!t) {
    showing = false;
    return;
  }
  showing = true;
  const el = document.createElement('div');
  el.className = 'trophy-pop';
  el.innerHTML = `<div class="tp-rays"></div>${medal(t, false, 132)}
    <div class="tp-kicker">Trophée débloqué</div><h1>${esc(t.name)}</h1><p>${esc(t.desc)}</p>
    <small>Touche pour continuer</small>`;
  document.body.append(el);
  confetti();
  haptic([30, 40, 70]);
  tone(t.tier === 'platine' || t.tier === 'or' ? [523, 659, 784, 1047] : [659, 880], 0.08, 0.14);
  el.addEventListener('click', () => {
    el.classList.add('out');
    setTimeout(() => {
      el.remove();
      showNext();
    }, 280);
  });
}

let timer = 0;

/** À appeler après chaque changement : débloque ce qui vient d'être atteint. */
export function checkTrophies() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!state.profile || document.getElementById('splash')) return checkTrophies();
    const s = collect();
    const fresh = TROPHIES.filter((t) => !state.trophies?.[t.id] && s[t.stat] >= t.goal);
    if (!fresh.length) return;
    const now = Date.now();
    state.trophies = { ...state.trophies, ...Object.fromEntries(fresh.map((t) => [t.id, now])) };
    // À la première visite, ce qui était déjà acquis s'ajoute sans défilé de félicitations.
    const firstRun = !state.trophiesReady;
    state.trophiesReady = true;
    save();
    if (firstRun && fresh.length > 2) return;
    queue.push(...fresh.slice(0, 3));
    if (!showing) showNext();
  }, 900);
}

