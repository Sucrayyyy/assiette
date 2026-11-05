// Récompenses : de l'XP pour chaque bonne habitude, des niveaux, trois défis par jour et un coffre à ouvrir.
import { state, save } from './store.js';
import { dayKey, shiftDay, entriesOn, totalsOn, targets, stepsOn, n0 } from './nutrition.js';
import { esc, icon, haptic, tone, confetti, ring } from './ui.js';
import { act, openPanel, refreshPanel, panelHead } from './panel.js';
import { waterOn, waterGoal, homeOn } from './modules.js';
import { burst, flyTo, pulse } from './fx.js';
import { dueOn, allTakenOn } from './supplements.js';

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
  const bar = document.querySelector('[data-level-bar]');
  if (bar) setTimeout(() => flyTo(el.querySelector('b'), bar, { size: 12, onArrive: () => pulse(bar, 'fx-glow', 700) }), 450);
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
  const el = document.createElement('div');
  el.className = 'level-up';
  el.innerHTML = `<div class="lu-burst"></div>
    <div class="lu-ring">${ring(1, ['#fff', 'rgba(255,255,255,.6)'], 170, 12, { animate: true })}<b>${level}</b></div>
    <small class="lu-kicker">Niveau supérieur</small><h1>${esc(levelTitle(level))}</h1>
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
    const fresh = [];
    quests.forEach((q, i) => {
      if (q.done && !d.got[`q-${q.key}`]) {
        d.got[`q-${q.key}`] = true;
        award(q.xp, `Défi : ${q.text}`);
        fresh.push(i);
      }
    });
    if (quests.every((q) => q.done) && !d.chest) {
      d.chest = 'ready';
      haptic([30, 40, 30]);
      tone([784, 988, 1175], 0.07, 0.1);
    }
    save();
    refreshQuestCard();
    fresh.forEach((i) => setTimeout(() => burst(document.querySelectorAll('[data-quests] .qd')[i], { colors: ['#ffd25e', 'var(--accent)', '#fff'], count: 12, spread: 34, size: 5 }), 250));
    if (d.chest === 'ready' && fresh.length) setTimeout(() => burst(document.querySelector('[data-quests] .chest-mini'), { colors: ['#ffd25e', '#f2c14e', '#fff'], count: 18, spread: 50 }), 600);
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
    <div class="chest">${chestSvg(200)}</div>
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

// Coffre en verre : une lumière à la couleur de l'app brille à l'intérieur, filets dorés, couvercle qui s'ouvre.
let chestId = 0;
function chestSvg(size) {
  const id = `ch${++chestId}`;
  return `<svg class="chest-svg" viewBox="0 0 160 150" width="${size}" height="${Math.round(size * 0.94)}" aria-hidden="true">
    <defs>
      <radialGradient id="${id}c" cx="50%" cy="58%" r="55%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".25" stop-color="var(--ad)" stop-opacity=".95"/><stop offset="1" stop-color="var(--ad)" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a414d"/><stop offset="1" stop-color="#161a20"/></linearGradient>
      <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".45" stop-color="#f2c14e"/><stop offset="1" stop-color="#b9861c"/></linearGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5260"/><stop offset="1" stop-color="#262b33"/></linearGradient>
    </defs>
    <ellipse class="chest-shadow" cx="80" cy="140" rx="54" ry="7" fill="#000" opacity=".28"/>
    <circle class="chest-core" cx="80" cy="96" r="58" fill="url(#${id}c)"/>
    <g class="chest-body">
      <rect x="22" y="66" width="116" height="68" rx="16" fill="url(#${id}b)"/>
      <rect x="22" y="66" width="116" height="68" rx="16" fill="var(--ad)" opacity=".16"/>
      <rect x="30" y="74" width="100" height="52" rx="10" fill="none" stroke="var(--ad)" stroke-opacity=".55" stroke-width="1.5"/>
      <rect x="22.75" y="66.75" width="114.5" height="66.5" rx="15.5" fill="none" stroke="url(#${id}g)" stroke-width="1.5"/>
      <rect x="73" y="66" width="14" height="68" fill="url(#${id}g)"/>
      <circle cx="80" cy="96" r="12" fill="url(#${id}g)"/>
      <circle cx="80" cy="96" r="7.5" fill="#1b1f26"/>
      <path d="M80 90.5l1.7 3.5 3.8.5-2.8 2.6.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.6 3.8-.5z" fill="var(--ad)"/>
    </g>
    <g class="chest-lid">
      <path d="M18 66 Q18 34 80 34 Q142 34 142 66 Z" fill="url(#${id}l)"/>
      <path d="M18 66 Q18 34 80 34 Q142 34 142 66 Z" fill="var(--ad)" opacity=".14"/>
      <path d="M18.8 65.2 Q19 35 80 35 Q141 35 141.2 65.2" fill="none" stroke="url(#${id}g)" stroke-width="1.5"/>
      <rect x="73" y="34" width="14" height="32" fill="url(#${id}g)"/>
      <rect x="16" y="61" width="128" height="9" rx="4.5" fill="url(#${id}g)"/>
      <path d="M34 50 Q50 40 80 39" fill="none" stroke="url(#${id}s)" stroke-width="5" stroke-linecap="round"/>
    </g>
  </svg>`;
}
const chestIcon = () => chestSvg(38);

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
