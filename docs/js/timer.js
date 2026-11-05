// Chrono d'entraînement : Tabata, HIIT, EMOM ou intervalles sur mesure, en plein écran.
import { esc, icon, haptic, tone, confetti, ring } from './ui.js';
import { act, openPanel, closePanel, refreshPanel, panelHead } from './panel.js';
import { state, save } from './store.js';

const PRESETS = [
  { key: 'tabata', name: 'Tabata', work: 20, rest: 10, rounds: 8, detail: '20 s à fond, 10 s de repos, 8 fois' },
  { key: 'hiit', name: 'HIIT', work: 40, rest: 20, rounds: 10, detail: '40 s d\'effort, 20 s de repos' },
  { key: 'emom', name: 'EMOM', work: 60, rest: 0, rounds: 10, detail: 'Une série au début de chaque minute' },
  { key: 'gainage', name: 'Gainage', work: 45, rest: 15, rounds: 6, detail: 'Planche, pont, superman…' },
];

const cfg = { work: 20, rest: 10, rounds: 8, preset: 'tabata', ...(state.timerCfg || {}) };
let run = null;

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.ceil(s % 60)) % 60).padStart(2, '0')}`;
const total = () => cfg.rounds * (cfg.work + cfg.rest) - cfg.rest;

function panelTimer() {
  const stepper = (key, label, step, min, max) => `<div class="tm-step"><span>${label}</span>
    <div class="row"><button class="round glass" data-x="timer-step" data-k="${key}" data-d="${-step}" ${cfg[key] <= min ? 'disabled' : ''}>${icon.minus}</button>
      <b>${key === 'rounds' ? cfg[key] : `${cfg[key]} s`}</b>
      <button class="round glass" data-x="timer-step" data-k="${key}" data-d="${step}" ${cfg[key] >= max ? 'disabled' : ''}>${icon.plus}</button></div></div>`;
  return `${panelHead('Chrono', `${mmss(total())} au total`)}
    <div class="tm-presets">${PRESETS.map((p) => `<button class="glass ${cfg.preset === p.key ? 'active' : ''}" data-x="timer-preset" data-k="${p.key}"><b>${p.name}</b><small>${esc(p.detail)}</small></button>`).join('')}</div>
    <div class="tm-steps">${stepper('work', 'Effort', 5, 5, 600)}${stepper('rest', 'Repos', 5, 0, 300)}${stepper('rounds', 'Tours', 1, 1, 50)}</div>
    <button class="btn btn-primary" data-x="timer-start">${icon.play} Lancer</button>`;
}

act('timer-open', () => openPanel(panelTimer));
act('timer-preset', (el) => {
  const p = PRESETS.find((x) => x.key === el.dataset.k);
  Object.assign(cfg, { work: p.work, rest: p.rest, rounds: p.rounds, preset: p.key });
  haptic();
  refreshPanel();
});
act('timer-step', (el) => {
  const k = el.dataset.k;
  cfg[k] = Math.max(k === 'rest' ? 0 : 1, cfg[k] + Number(el.dataset.d));
  cfg.preset = '';
  haptic();
  refreshPanel();
});
act('timer-start', () => {
  state.timerCfg = { work: cfg.work, rest: cfg.rest, rounds: cfg.rounds, preset: cfg.preset };
  save();
  closePanel();
  start();
});

// ---------------------------------------------------------------------------
// Plein écran
// ---------------------------------------------------------------------------

let wake = null;

function phases() {
  const list = [{ kind: 'prep', len: 5, round: 1 }];
  for (let r = 1; r <= cfg.rounds; r++) {
    list.push({ kind: 'work', len: cfg.work, round: r });
    if (cfg.rest && r < cfg.rounds) list.push({ kind: 'rest', len: cfg.rest, round: r });
  }
  return list;
}

function start() {
  const el = document.createElement('div');
  el.className = 'timer-layer';
  document.body.append(el);
  document.body.style.overflow = 'hidden';
  run = { el, list: phases(), i: 0, phaseEnd: 0, paused: 0, lastBeep: -1 };
  navigator.wakeLock?.request('screen').then((w) => (wake = w)).catch(() => {});
  enter(0);
  run.tick = setInterval(tick, 100);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tm]');
    if (!b) return;
    if (b.dataset.tm === 'stop') stop();
    if (b.dataset.tm === 'pause') togglePause();
    if (b.dataset.tm === 'skip') enter(run.i + 1);
  });
}

function enter(i) {
  if (!run) return;
  if (i >= run.list.length) return finish();
  run.i = i;
  run.phaseEnd = Date.now() + run.list[i].len * 1000;
  run.lastBeep = -1;
  const p = run.list[i];
  if (p.kind === 'work') tone([988], 0.14, 0.25);
  else if (p.kind === 'rest') tone([523], 0.12, 0.25);
  haptic(p.kind === 'work' ? [60, 40, 60] : 30);
  render(true);
}

function render(full) {
  const p = run.list[run.i];
  const left = run.paused ? (run.phaseEnd - run.paused) / 1000 : (run.phaseEnd - Date.now()) / 1000;
  const label = { prep: 'Prépare-toi', work: 'Effort', rest: 'Repos' }[p.kind];
  if (full) {
    run.el.className = `timer-layer ${p.kind}`;
    run.el.innerHTML = `<div class="tm-top"><span>${p.kind === 'prep' ? "C'est parti dans" : `Tour ${p.round} / ${cfg.rounds}`}</span>
        <button class="round" data-tm="stop" aria-label="Arrêter">${icon.x}</button></div>
      <div class="tm-ring"><div data-tm-ring>${ring(1, ['#fff', 'rgba(255,255,255,.75)'], 280, 18)}</div>
        <div class="tm-center"><small>${label}</small><b data-tm-left>${Math.ceil(left)}</b></div></div>
      <div class="tm-dots">${Array.from({ length: cfg.rounds }, (_, r) => `<i class="${r + 1 < p.round || (r + 1 === p.round && p.kind === 'rest') ? 'done' : r + 1 === p.round && p.kind === 'work' ? 'now' : ''}"></i>`).join('')}</div>
      <div class="tm-actions"><button class="pill" data-tm="pause">${run.paused ? `${icon.play} Reprendre` : 'Pause'}</button><button class="pill" data-tm="skip">Passer</button></div>`;
  }
  const fill = run.el.querySelector('.ring-fill');
  if (fill) {
    const c = Number(fill.getAttribute('stroke-dasharray'));
    fill.style.transition = 'none';
    fill.setAttribute('stroke-dashoffset', String(c * (1 - Math.max(0, left) / p.len)));
  }
  const n = run.el.querySelector('[data-tm-left]');
  if (n) n.textContent = left >= 60 ? mmss(left) : String(Math.max(0, Math.ceil(left)));
}

function tick() {
  if (!run || run.paused) return;
  const left = (run.phaseEnd - Date.now()) / 1000;
  const whole = Math.ceil(left);
  // Bips des 3 dernières secondes.
  if (whole <= 3 && whole >= 1 && whole !== run.lastBeep) {
    run.lastBeep = whole;
    tone([740], 0.09, 0.09);
    haptic(10);
  }
  if (left <= 0) enter(run.i + 1);
  else render(false);
}

function togglePause() {
  if (!run) return;
  if (run.paused) {
    run.phaseEnd += Date.now() - run.paused;
    run.paused = 0;
  } else run.paused = Date.now();
  haptic();
  render(true);
}

function finish() {
  const el = run.el;
  clearInterval(run.tick);
  run = null;
  el.className = 'timer-layer done';
  el.innerHTML = `<div class="tm-done"><span class="check-burst">${icon.check}</span><h1>Terminé !</h1>
    <p>${cfg.rounds} tours · ${mmss(total())}</p><button class="pill" data-tm-close>Fermer</button></div>`;
  confetti();
  tone([659, 784, 1047, 1319], 0.08, 0.14);
  haptic([60, 40, 100]);
  el.querySelector('[data-tm-close]').addEventListener('click', () => stopLayer(el));
}

function stop() {
  if (!run) return;
  clearInterval(run.tick);
  const { el } = run;
  run = null;
  stopLayer(el);
}

function stopLayer(el) {
  wake?.release?.().catch?.(() => {});
  wake = null;
  document.body.style.overflow = '';
  el.classList.add('out');
  setTimeout(() => el.remove(), 300);
}
