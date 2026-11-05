// Récompenses : de l'XP pour chaque bonne habitude, des niveaux, trois défis par jour et un coffre à ouvrir.
import { state, save } from './store.js';
import { dayKey, shiftDay, entriesOn, totalsOn, targets, stepsOn, n0 } from './nutrition.js';
import { esc, icon, haptic, tone, confetti, ring } from './ui.js';
import { act, openPanel, refreshPanel, panelHead } from './panel.js';
import { waterOn, waterGoal, homeOn } from './modules.js';
import { dueOn, allTakenOn } from './supplements.js';
import { LOCKED_ACCENTS } from './theme.js';

let rerender = () => {};
export function initRewards({ renderApp }) {
  rerender = renderApp;
  useFreezeIfNeeded();
}

// ---------------------------------------------------------------------------
// Niveaux
// ---------------------------------------------------------------------------

/** XP cumulée pour atteindre un niveau : 0, 120, 360, 720, 1 200… */
const threshold = (level) => 60 * (level - 1) * level;

export function totalXp() {
  return (state.xpBank || 0) + (state.xpLog || []).reduce((s, x) => s + x.a, 0) + state.workouts.reduce((s, w) => s + (w.xp || 0), 0);
}

export function levelInfo(xp = totalXp()) {
  let level = 1;
  while (xp >= threshold(level + 1)) level++;
  const from = threshold(level);
  const to = threshold(level + 1);
  return { level, xp, into: xp - from, need: to - from, progress: (xp - from) / (to - from) };
}

const TITLES = [[1, 'Recrue'], [3, 'Motivé'], [5, 'Régulier'], [8, 'Athlète'], [12, 'Machine'], [16, 'Bête de somme'], [20, 'Légende']];
export const levelTitle = (level) => [...TITLES].reverse().find(([l]) => level >= l)[1];

// ---------------------------------------------------------------------------
// Gains d'XP
// ---------------------------------------------------------------------------

const pops = [];
let popping = false;

function showPop() {
  const p = pops.shift();
  if (!p) {
    popping = false;
    return;
  }
  popping = true;
  const el = document.createElement('div');
  el.className = 'xp-pop';
  el.innerHTML = `<b>+${p.a} XP</b><span>${esc(p.r)}</span>`;
  document.body.append(el);
  tone([988, 1319], 0.05, 0.07);
  haptic(10);
  setTimeout(() => el.classList.add('out'), 1500);
  setTimeout(() => {
    el.remove();
    showPop();
  }, 1850);
}

export function award(amount, reason) {
  if (!amount) return;
  const before = levelInfo().level;
  state.xpLog = [...(state.xpLog || []), { t: Date.now(), day: dayKey(), a: amount, r: reason }];
  // On garde l'historique léger : les vieux gains passent dans la réserve.
  if (state.xpLog.length > 1500) {
    const old = state.xpLog.splice(0, 500);
    state.xpBank = (state.xpBank || 0) + old.reduce((s, x) => s + x.a, 0);
  }
  save();
  pops.push({ a: amount, r: reason });
  if (!popping) showPop();
  const after = levelInfo().level;
  if (after > before) setTimeout(() => levelUp(after), 900);
  document.querySelectorAll('[data-level-bar]').forEach((b) => b.style.setProperty('--p', `${levelInfo().progress * 100}%`));
}

function levelUp(level) {
  const unlocked = LOCKED_ACCENTS.filter((a) => a.level === level);
  const el = document.createElement('div');
  el.className = 'level-up';
  el.innerHTML = `<div class="lu-burst"></div>
    <div class="lu-ring">${ring(1, ['#fff', 'rgba(255,255,255,.6)'], 170, 12, { animate: true })}<b>${level}</b></div>
    <small class="lu-kicker">Niveau supérieur</small><h1>${esc(levelTitle(level))}</h1>
    ${unlocked.map((a) => `<div class="lu-unlock"><i style="--s:${a.light};--s2:${a.dark}"></i><span>Nouvelle couleur débloquée : <b>${esc(a.name)}</b></span></div>`).join('')}
    <small class="lu-tap">Touche pour continuer</small>`;
  document.body.append(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.querySelectorAll('.ring-fill').forEach((c) => c.setAttribute('stroke-dashoffset', c.dataset.target))));
  confetti();
  setTimeout(confetti, 500);
  haptic([40, 50, 80, 50, 120]);
  tone([523, 659, 784, 1047, 1319], 0.09, 0.15);
  el.addEventListener('click', () => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
    rerender();
  });
}

// ---------------------------------------------------------------------------
// Habitudes du jour : chaque objectif atteint rapporte une fois par jour
// ---------------------------------------------------------------------------

function flags(day) {
  const g = targets();
  const t = totalsOn(day);
  const entries = entriesOn(day).filter((e) => e.items[0]?.source !== 'supp');
  return {
    log1: entries.length >= 1,
    log3: entries.length >= 3,
    breakfast: entries.some((e) => e.meal === 'petit_dej'),
    protein: g.protein > 0 && t.protein >= g.protein * 0.95,
    fiber: g.fiber > 0 && t.fiber >= g.fiber * 0.95,
    water: waterOn(day) >= waterGoal(),
    steps: stepsOn(day) >= 8000,
    supps: dueOn(day).length > 0 && allTakenOn(day),
    workout: state.workouts.some((w) => dayKey(new Date(w.end)) === day),
    perfect: !!state.perfectDays?.[day],
  };
}

const HABITS = {
  log1: [10, 'Premier aliment noté'], log3: [20, '3 aliments notés'], protein: [30, 'Protéines atteintes'], fiber: [20, 'Fibres atteintes'],
  water: [20, 'Objectif eau'], steps: [25, '8 000 pas'], supps: [15, 'Compléments pris'], perfect: [100, 'Journée parfaite'],
};

const QUESTS = {
  log3: { text: 'Note 3 aliments', ico: 'utensils', xp: 40 },
  breakfast: { text: 'Note ton petit-déj', ico: 'coffee', xp: 30 },
  protein: { text: 'Atteins tes protéines', ico: 'bolt', xp: 50 },
  fiber: { text: 'Atteins tes fibres', ico: 'leaf', xp: 40 },
  water: { text: 'Bois ton objectif d\'eau', ico: 'drop', xp: 40, module: 'water' },
  steps: { text: 'Marche 8 000 pas', ico: 'steps', xp: 40, module: 'steps' },
  supps: { text: 'Coche tous tes compléments', ico: 'pill', xp: 30, module: 'supps', needSupps: true },
  workout: { text: 'Fais une séance de muscu', ico: 'dumbbell', xp: 60 },
};

// Tirage du jour, toujours le même pour une date donnée.
function seeded(day) {
  let h = 2166136261;
  for (const c of day) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
}

export function questsOf(day = dayKey()) {
  const d = (state.daily ||= {})[day] ||= {};
  if (!d.quests) {
    const pool = Object.keys(QUESTS).filter((k) => {
      const q = QUESTS[k];
      return (!q.module || homeOn(q.module)) && (!q.needSupps || state.supps.length);
    });
    const rand = seeded(day);
    // Un défi nutrition toujours, puis deux au hasard.
    const pick = [pool.includes('protein') && rand() < 0.5 ? 'protein' : 'log3'];
    const rest = pool.filter((k) => !pick.includes(k));
    while (pick.length < 3 && rest.length) pick.push(rest.splice(Math.floor(rand() * rest.length), 1)[0]);
    d.quests = pick;
  }
  const f = flags(day);
  return d.quests.map((k) => ({ key: k, ...QUESTS[k], done: !!f[k] }));
}

let checkTimer = 0;

/** À chaque changement : distribue l'XP gagnée, valide les défis, prépare le coffre. */
export function checkRewards() {
  clearTimeout(checkTimer);
  checkTimer = setTimeout(() => {
    if (!state.profile || document.getElementById('splash')) return checkRewards();
    const day = dayKey();
    const d = (state.daily ||= {})[day] ||= {};
    d.got ||= {};
    const f = flags(day);
    Object.entries(HABITS).forEach(([k, [xp, label]]) => {
      if (f[k] && !d.got[k]) {
        d.got[k] = true;
        award(xp, label);
      }
    });
    const quests = questsOf(day);
    quests.forEach((q) => {
      if (q.done && !d.got[`q-${q.key}`]) {
        d.got[`q-${q.key}`] = true;
        award(q.xp, `Défi : ${q.text}`);
      }
    });
    if (quests.every((q) => q.done) && !d.chest) {
      d.chest = 'ready';
      haptic([30, 40, 30]);
      tone([784, 988, 1175], 0.07, 0.1);
    }
    save();
    refreshQuestCard();
  }, 600);
}

// ---------------------------------------------------------------------------
// Coffre du jour
// ---------------------------------------------------------------------------

function openChest() {
  const d = state.daily?.[dayKey()];
  if (!d || d.chest !== 'ready') return;
  const r = Math.random();
  const reward = r < 0.12 ? { kind: 'xp', amount: 250, label: 'Jackpot !' }
    : r < 0.32 ? { kind: 'freeze', label: 'Gel de série', detail: 'Protège ta série si tu oublies un jour' }
    : { kind: 'xp', amount: 50 + Math.round(Math.random() * 7) * 10, label: 'Bonus d\'XP' };
  d.chest = 'opened';
  d.chestReward = reward;
  save();

  const el = document.createElement('div');
  el.className = 'chest-layer';
  el.innerHTML = `<div class="chest-rays"></div>
    <div class="chest"><svg viewBox="0 0 120 100" aria-hidden="true">
      <rect x="12" y="44" width="96" height="50" rx="8" fill="#9a5a24"/><rect x="12" y="44" width="96" height="50" rx="8" fill="url(#cg)"/>
      <rect x="54" y="44" width="12" height="50" fill="#f5c542"/><rect x="12" y="62" width="96" height="6" fill="#f5c542" opacity=".8"/>
      <g class="lid"><path d="M12 46 Q12 18 60 18 Q108 18 108 46 Z" fill="#b8702e"/><rect x="54" y="20" width="12" height="26" fill="#f5c542"/></g>
      <rect x="52" y="52" width="16" height="16" rx="3" fill="#ffd96b" stroke="#a87b10" stroke-width="2"/>
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,255,255,.18)"/><stop offset="1" stop-color="rgba(0,0,0,.2)"/></linearGradient></defs>
    </svg></div>
    <div class="chest-reward">${reward.kind === 'xp' ? `<b>+${reward.amount} XP</b>` : `<b>${icon.flame} Gel de série</b>`}<span>${esc(reward.label)}${reward.detail ? ` · ${esc(reward.detail)}` : ''}</span></div>
    <small class="lu-tap">Touche pour continuer</small>`;
  document.body.append(el);
  haptic([20, 60, 20, 60, 20]);
  tone([392, 440, 494], 0.05, 0.12);
  setTimeout(() => {
    el.classList.add('open');
    confetti();
    haptic([60, 40, 120]);
    tone([784, 988, 1175, 1568], 0.09, 0.14);
    if (reward.kind === 'xp') award(reward.amount, 'Coffre du jour');
    else {
      state.freezes = Math.min(3, (state.freezes || 0) + 1);
      save();
    }
  }, 1300);
  el.addEventListener('click', () => {
    if (!el.classList.contains('open')) return;
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
    rerender();
  });
}

/** Un jour oublié ? Un gel de série le protège automatiquement. */
function useFreezeIfNeeded() {
  const yesterday = shiftDay(dayKey(), -1);
  const before = shiftDay(dayKey(), -2);
  const logged = (day) => state.entries.some((e) => e.day === day) || state.frozenDays?.[day];
  if (!state.freezes || logged(yesterday) || !logged(before)) return;
  state.freezes--;
  state.frozenDays = { ...state.frozenDays, [yesterday]: true };
  save();
  setTimeout(() => {
    const el = document.createElement('div');
    el.className = 'xp-pop freeze';
    el.innerHTML = `<b>${icon.flame} Série protégée</b><span>Ton gel de série a couvert hier</span>`;
    document.body.append(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3000);
  }, 3500);
}

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------

export function questCard(day) {
  if (day !== dayKey()) return '';
  const qs = questsOf(day);
  const d = state.daily?.[day] || {};
  const doneCount = qs.filter((q) => q.done).length;
  return `<button class="quest-card glass ${d.chest === 'ready' ? 'ready' : ''}" data-x="quests-open" data-quests>
    <div class="spacer"><b>Défis du jour</b><small>${d.chest === 'opened' ? 'Coffre ouvert, à demain !' : d.chest === 'ready' ? 'Coffre prêt, ouvre-le !' : `${doneCount} sur 3 · un coffre à la clé`}</small></div>
    <div class="quest-dots">${qs.map((q) => `<span class="qd ${q.done ? 'on' : ''}">${q.done ? icon.check : icon[q.ico]}</span>`).join('')}</div>
    <span class="chest-mini ${d.chest || ''}">${chestIcon()}</span>
  </button>`;
}

const chestIcon = () => `<svg viewBox="0 0 40 34" width="34" height="30" aria-hidden="true"><rect x="3" y="14" width="34" height="18" rx="3" fill="#a5642a"/><path d="M3 15 Q3 4 20 4 Q37 4 37 15 Z" fill="#c47c36"/><rect x="18" y="4" width="4" height="28" fill="#f5c542"/><rect x="16" y="16" width="8" height="7" rx="1.5" fill="#ffd96b"/></svg>`;

function refreshQuestCard() {
  const el = document.querySelector('[data-quests]');
  if (el) el.outerHTML = questCard(dayKey());
  refreshPanel();
}

function panelQuests() {
  const day = dayKey();
  const qs = questsOf(day);
  const d = state.daily?.[day] || {};
  const info = levelInfo();
  return `${panelHead('Défis du jour', 'Nouveaux défis chaque matin')}
    <div class="level-card">
      <span class="lc-ring">${ring(info.progress, ['var(--accent)', 'var(--accent-deep)'], 64, 7)}<b>${info.level}</b></span>
      <div class="spacer"><b>Niveau ${info.level} · ${esc(levelTitle(info.level))}</b><small>${n0(info.into)} / ${n0(info.need)} XP vers le niveau ${info.level + 1}</small></div>
    </div>
    <div class="list glass">${qs.map((q) => `<div class="food quest-row ${q.done ? 'ok' : ''}"><span class="icon-chip">${q.done ? icon.check : icon[q.ico]}</span>
      <div class="info"><div class="name">${esc(q.text)}</div><div class="meta">+${q.xp} XP</div></div>${q.done ? '<span class="qr-done">Fait</span>' : ''}</div>`).join('')}</div>
    ${d.chest === 'ready' ? `<button class="btn btn-primary chest-btn" data-x="chest-open">${chestIcon()} Ouvrir le coffre</button>`
      : d.chest === 'opened' ? `<p class="muted small" style="margin:0;text-align:center">Coffre ouvert : ${d.chestReward?.kind === 'freeze' ? 'un gel de série' : `+${d.chestReward?.amount || 0} XP`}. Reviens demain !</p>`
      : `<p class="muted small" style="margin:0;text-align:center">Termine les 3 défis pour ouvrir le coffre du jour.</p>`}
    <div class="xp-guide"><div class="muted small">Ce qui rapporte de l'XP</div>
      ${Object.values(HABITS).map(([xp, label]) => `<div class="row small"><span class="spacer">${esc(label)}</span><b>+${xp}</b></div>`).join('')}
      <div class="row small"><span class="spacer">Séance de muscu</span><b>+20 à +150</b></div>
      ${state.freezes ? `<div class="row small"><span class="spacer">${icon.flame} Gels de série en réserve</span><b>${state.freezes}</b></div>` : ''}
    </div>`;
}

act('quests-open', () => openPanel(panelQuests, { tall: true }));
act('chest-open', () => {
  openChest();
  refreshPanel();
  refreshQuestCard();
});
