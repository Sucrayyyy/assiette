import { state, save, uid } from './store.js';
import { n0, n1 } from './nutrition.js';
import { esc, icon, toast, animateCounts, confetti } from './ui.js';
import { rankBadge } from './badges.js';
import { exerciseFigure } from './figure.js';
import { bodyDiagram } from './body.js';
import {
  MUSCLES, muscleLabel, PROGRAMS, RANKS, rankFor, LIFTS, LEVELS, strengthLevel,
  loadLibrary, libraryReady, exerciseById, searchExercises, EQUIPMENTS,
} from './workout-data.js';

const $session = document.getElementById('session');
const $wsheet = document.getElementById('wsheet');
let rerenderApp = () => {};

const wui = { section: 'seances', prevSection: 'seances', query: '', muscle: '', equipment: '', sheet: null, rest: null, sessionOpen: false, justDone: '' };
let ticker = 0;
let shownSheet = null;

export function initWorkout({ renderApp }) {
  rerenderApp = renderApp;
  if (!state.userId) {
    state.userId = uid();
    save();
  }
  handleFriendLink();
  if (state.activeWorkout) startTicker();
}

// ---------------------------------------------------------------------------
// Calculs
// ---------------------------------------------------------------------------

const num = (v) => Number(String(v ?? '').replace(',', '.')) || 0;
/** 1RM estimé (formule d'Epley) ; au poids du corps, le score est le nombre de répétitions. */
const e1rm = (w, r) => (w > 0 ? (r <= 1 ? w : w * (1 + r / 30)) : r);
const bestOf = (sets) => Math.max(0, ...sets.map((s) => e1rm(num(s.w), num(s.r))));
const volumeOf = (sets) => sets.reduce((sum, s) => sum + num(s.w) * num(s.r), 0);
const totalXp = () => state.workouts.reduce((sum, w) => sum + (w.xp || 0), 0);

function history(exId) {
  return [...state.workouts]
    .sort((a, b) => b.end - a.end)
    .flatMap((w) => w.exercises.filter((e) => e.exId === exId).map((e) => ({ date: w.end, sets: e.sets, best: bestOf(e.sets) })));
}

const lastPerformance = (exId) => history(exId)[0] || null;

function bestEver(exId) {
  const h = history(exId);
  return h.length ? Math.max(...h.map((x) => x.best)) : null;
}

function setLabel(s) {
  return num(s.w) > 0 ? `${n1(num(s.w))} kg × ${num(s.r)}` : `${num(s.r)} reps`;
}

/** Surcharge progressive : ce qu'on a fait la dernière fois et la prochaine marche à viser. */
function overloadHint(exId) {
  const last = lastPerformance(exId);
  if (!last) return 'Première fois : trouve une charge où les dernières reps sont difficiles.';
  const top = last.sets.reduce((a, b) => (e1rm(num(b.w), num(b.r)) > e1rm(num(a.w), num(a.r)) ? b : a));
  const w = num(top.w);
  const r = num(top.r);
  const summary = `Dernière fois : ${last.sets.length} séries, meilleure ${setLabel(top)}`;
  if (w <= 0) return `${summary} · Vise ${r + 1} reps`;
  if (r >= 8) return `${summary} · Essaie ${n1(w + (w < 20 ? 1 : 2.5))} kg`;
  return `${summary} · Vise ${r + 1} reps à ${n1(w)} kg`;
}

function ago(ts) {
  const days = Math.floor((Date.now() - ts) / 864e5);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  return `il y a ${days} j`;
}

const pad = (n) => String(n).padStart(2, '0');
function clock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  return h ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
function duration(ms) {
  const min = Math.round(ms / 60000);
  return min >= 60 ? `${Math.floor(min / 60)} h ${pad(min % 60)}` : `${min} min`;
}

/** Récupération par muscle : chaque séance fatigue les muscles travaillés, qui récupèrent en 48 à 72 h. */
export function recovery(now = Date.now()) {
  const res = Object.fromEntries(Object.keys(MUSCLES).map((k) => [k, { residual: 0, last: null }]));
  for (const w of state.workouts) {
    const ageH = (now - w.end) / 36e5;
    if (ageH > 24 * 7) continue;
    const load = {};
    for (const e of w.exercises) {
      e.p.forEach((m) => (load[m] = (load[m] || 0) + e.sets.length));
      e.s.forEach((m) => (load[m] = (load[m] || 0) + e.sets.length * 0.5));
    }
    for (const [m, l] of Object.entries(load)) {
      if (!res[m]) continue;
      res[m].residual += Math.min(1, l / 8) * Math.max(0, 1 - ageH / MUSCLES[m].hours);
      res[m].last = Math.max(res[m].last || 0, w.end);
    }
  }
  for (const r of Object.values(res)) r.pct = Math.round((1 - Math.min(1, r.residual)) * 100);
  return res;
}

const recoveryColor = (pct) => (pct >= 90 ? '#22a06b' : pct >= 60 ? '#f2a93b' : '#ff5e62');

function weekStats() {
  const since = Date.now() - 7 * 864e5;
  const recent = state.workouts.filter((w) => w.end >= since);
  return { count: recent.length, volume: recent.reduce((s, w) => s + w.volume, 0), sets: recent.reduce((s, w) => s + w.sets, 0) };
}

// ---------------------------------------------------------------------------
// Onglet Muscu
// ---------------------------------------------------------------------------

export function workoutTabView() {
  if (!libraryReady()) loadLibrary().then(() => rerenderApp()).catch(() => {});
  const xp = totalXp();
  const { rank, index } = rankFor(xp);
  const sections = [['seances', 'Séances'], ['exercices', 'Exercices'], ['recup', 'Récup'], ['classement', 'Classement']];
  const pos = (key) => sections.findIndex(([k]) => k === key);
  const views = { seances: sessionsSection, exercices: exercisesSection, recup: recoverySection, classement: rankingSection };
  return `<main class="screen">
    <div class="header"><div><h1>Muscu</h1><div class="subtitle rank-inline">${rankBadge(index, 22, { shine: false })}${rank.name} · ${n0(xp)} XP</div></div></div>
    <div class="seg glass"><span class="seg-indicator" style="--from:${pos(wui.prevSection)};--to:${pos(wui.section)}"></span>${sections.map(([k, l]) => `<button class="${wui.section === k ? 'active' : ''}" data-wact="section" data-s="${k}">${l}</button>`).join('')}</div>
    ${views[wui.section]()}
  </main>`;
}

function rankCard() {
  const xp = totalXp();
  const { rank, index, next, progress } = rankFor(xp);
  const week = weekStats();
  return `<section class="card glass rank-card" style="--rank:${rank.color}">
    <div class="row">${rankBadge(index, 58)}
      <div class="spacer"><b class="rank-name">${rank.name}</b><div class="muted small"><span data-count="${Math.round(xp)}">${n0(xp)}</span> XP${next ? ` · encore ${n0(next.xp - xp)} XP pour ${next.name}` : ' · rang maximum'}</div></div></div>
    <div class="bar-track" style="--c:${rank.color};margin-top:12px"><div class="bar-fill" style="width:${Math.round(progress * 100)}%"></div></div>
    <div class="mini-stats">
      <div><b data-count="${week.count}">${week.count}</b><span>séances (7 j)</span></div>
      <div><b data-count="${Math.round(week.volume)}" data-suffix=" kg">${n0(week.volume)} kg</b><span>soulevés (7 j)</span></div>
      <div><b data-count="${week.sets}">${week.sets}</b><span>séries (7 j)</span></div>
    </div>
  </section>`;
}

function sessionsSection() {
  const routines = state.routines;
  const recent = [...state.workouts].sort((a, b) => b.end - a.end).slice(0, 8);
  return `${rankCard()}
    ${state.activeWorkout
      ? `<button class="cta glass tinted" data-wact="open-session">${icon.dumbbell}<div class="spacer"><b>Reprendre ma séance</b><span>${esc(state.activeWorkout.name)} · <span data-elapsed>${clock(Date.now() - state.activeWorkout.start)}</span></span></div>${icon.chevron}</button>`
      : `<button class="cta glass tinted" data-wact="start-free">${icon.plus}<div class="spacer"><b>Séance libre</b><span>Ajoute tes exercices au fur et à mesure</span></div>${icon.dumbbell}</button>`}
    <div class="row"><h2 class="spacer">Mes séances</h2><button class="pill glass" data-wact="routine-new">${icon.plus} Créer</button></div>
    ${routines.length
      ? `<div class="list glass">${routines.map((r) => `<div class="food">
          <button class="info" data-wact="start-routine" data-id="${r.id}" style="text-align:left">
            <div class="name">${esc(r.name)}</div><div class="meta">${r.exercises.length} exercices · ${esc(musclesSummary(r.exercises))}</div></button>
          <button class="round glass" data-wact="routine-edit" data-id="${r.id}" aria-label="Modifier">${icon.pencil}</button>
          <button class="round glass" data-wact="start-routine" data-id="${r.id}" aria-label="Démarrer">${icon.play}</button>
        </div>`).join('')}</div>`
      : '<p class="muted small" style="margin:0">Crée tes propres séances : choisis tes exercices, tes séries et tes répétitions.</p>'}
    <h2>Programmes</h2>
    <div class="programs">${PROGRAMS.map((p) => `<button class="program glass" data-wact="start-program" data-id="${p.id}">
        <span class="prog-art">${programFigure(p)}</span><b>${esc(p.name)}</b><small>${esc(p.detail)}</small><small class="muted">${p.exercises.length} exercices</small></button>`).join('')}</div>
    ${recent.length ? `<h2>Historique</h2><div class="list glass">${recent.map((w) => `<button class="food" data-wact="workout-detail" data-id="${w.id}">
        <span class="icon-chip">${icon.dumbbell}</span>
        <div class="info"><div class="name">${esc(w.name)}${w.prs.length ? `<span class="pr-mark">${icon.trophy}</span>` : ''}</div>
          <div class="meta">${ago(w.end)} · ${duration(w.end - w.start)} · ${n0(w.volume)} kg · ${w.sets} séries</div></div>
        <span class="num">+${w.xp} XP</span></button>`).join('')}</div>` : ''}`;
}

function figureFor(exId, size, still = false, crop = false) {
  const ex = exerciseById(exId);
  return ex ? exerciseFigure(ex, { size, still, crop }) : icon.dumbbell;
}

function programFigure(program) {
  return libraryReady() ? figureFor(program.exercises[0][0], 92) : icon.dumbbell;
}

function musclesSummary(exercises) {
  const muscles = [...new Set(exercises.flatMap((e) => e.p || exerciseById(e.exId)?.p || []))];
  return muscles.slice(0, 4).map(muscleLabel).join(', ') || 'Exercices variés';
}

function exercisesSection() {
  if (!libraryReady()) return '<div class="spinner"></div>';
  const colors = wui.muscle ? { [wui.muscle]: '#ff5e62' } : {};
  return `<div class="search-bar glass">${icon.search}
      <input type="search" data-wquery placeholder="Développé couché, squat, curl…" value="${esc(wui.query)}" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search"></div>
    <section class="card glass body-card">${bodyDiagram(colors, { clickable: true })}
      <p class="muted small" style="margin:0;text-align:center">Touche un muscle pour filtrer</p></section>
    <div class="pills">${muscleChips(wui.muscle, 'muscle-filter')}</div>
    <div class="pills">${['', ...EQUIPMENTS].map((eq) => `<button class="pill glass ${wui.equipment === eq ? 'active' : ''}" data-wact="equipment-filter" data-eq="${esc(eq)}">${eq || 'Tout le matériel'}</button>`).join('')}</div>
    <div data-wresults>${exerciseResults(wui, 'exercise-detail')}</div>`;
}

function muscleChips(current, act) {
  return [['', 'Tous'], ...Object.entries(MUSCLES).map(([k, m]) => [k, m.label])]
    .map(([k, l]) => `<button class="pill glass ${current === k ? 'active' : ''}" data-wact="${act}" data-muscle="${k}">${l}</button>`)
    .join('');
}

function exerciseResults(filters, act) {
  const results = searchExercises(filters, 60);
  if (!results.length) return '<div class="notice">Aucun exercice trouvé.</div>';
  return `<div class="list glass">${results.map((ex) => exerciseRow(ex, act)).join('')}</div>
    ${results.length >= 60 ? '<p class="muted small" style="text-align:center">Affine la recherche pour voir d\'autres exercices.</p>' : ''}`;
}

function exerciseRow(ex, act) {
  return `<button class="food" data-wact="${act}" data-id="${esc(ex.id)}">
    <span class="fig-thumb">${exerciseFigure(ex, { still: true, crop: true, size: 54 })}</span>
    <div class="info"><div class="name">${esc(ex.name)}</div><div class="meta">${esc([...ex.p.map(muscleLabel), ex.eq].join(' · '))}</div></div>
    <span class="add">${act === 'pick-ex' ? icon.plus : icon.chevron}</span>
  </button>`;
}

function recoverySection() {
  const rec = recovery();
  const trained = Object.entries(rec).filter(([, r]) => r.last);
  const colors = Object.fromEntries(trained.map(([m, r]) => [m, recoveryColor(r.pct)]));
  const ready = Object.entries(rec).filter(([, r]) => r.pct >= 90).map(([m]) => muscleLabel(m));
  const tired = trained.filter(([, r]) => r.pct < 60).map(([m]) => muscleLabel(m));
  return `<section class="card glass body-card">${bodyDiagram(colors)}
      <div class="legend-row"><span><i style="background:#22a06b"></i>Récupéré</span><span><i style="background:#f2a93b"></i>En cours</span><span><i style="background:#ff5e62"></i>Fatigué</span></div></section>
    <div class="coach glass"><span class="badge">${icon.leaf}</span><span>${tired.length
      ? `Laisse souffler : ${esc(tired.join(', '))}. Tu peux entraîner ${esc(ready.slice(0, 4).join(', ') || 'autre chose')}.`
      : trained.length ? 'Tout est récupéré ou presque, fonce.' : 'Fais ta première séance pour suivre la récupération de tes muscles.'}</span></div>
    <section class="card glass" style="display:flex;flex-direction:column;gap:12px">
      ${Object.entries(rec).sort((a, b) => a[1].pct - b[1].pct).map(([m, r]) => `<div>
        <div class="bar-top"><span>${muscleLabel(m)}</span><b>${r.last ? `${r.pct} % · ${ago(r.last)}` : 'Pas entraîné cette semaine'}</b></div>
        <div class="bar-track" style="--c:${r.last ? recoveryColor(r.pct) : '#22a06b'}"><div class="bar-fill" style="width:${r.pct}%"></div></div>
      </div>`).join('')}
    </section>`;
}

function rankingSection() {
  const xp = totalXp();
  const { rank } = rankFor(xp);
  const me = { n: state.profile?.firstName || 'Moi', xp, w: state.workouts.length, vol7: weekStats().volume, me: true };
  const board = [me, ...state.friends].sort((a, b) => b.xp - a.xp);
  const p = state.profile;
  return `${rankCard()}
    <section class="card glass" style="display:flex;flex-direction:column;gap:10px">
      <h2>Amis</h2>
      ${board.map((f, i) => {
        const { rank: r, index: ri } = rankFor(f.xp);
        return `<div class="row friend ${f.me ? 'me' : ''}"><b class="pos">${i + 1}</b>${rankBadge(ri, 36, { shine: false })}
          <div class="spacer"><b>${esc(f.n)}${f.me ? ' (toi)' : ''}</b><div class="muted small">${r.name} · ${n0(f.xp)} XP · ${f.w} séances · ${n0((f.vol7 || 0) / 1000)} t cette semaine</div></div>
          ${f.me ? '' : `<button class="round glass" data-wact="friend-remove" data-id="${esc(f.id)}" aria-label="Retirer">${icon.x}</button>`}</div>`;
      }).join('')}
      <button class="btn btn-primary" data-wact="share-profile">${icon.share} Partager mon profil</button>
      <div class="row"><input class="input" data-friend-code placeholder="Colle le lien d'un ami" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="pill glass" data-wact="friend-add">Ajouter</button></div>
      <p class="muted small" style="margin:0">Ton ami t'envoie son lien Assiette : colle-le ici. Pour mettre son score à jour, il te renvoie son lien.</p>
    </section>
    <section class="card glass" style="display:flex;flex-direction:column;gap:12px">
      <h2>Niveaux de force</h2>
      ${LIFTS.map((lift) => {
        const best = bestEver(lift.id);
        if (!best || !p) return `<div class="bar-top"><span>${lift.name}</span><b class="muted">À débloquer</b></div>`;
        const lvl = strengthLevel(lift, best, p.weightKg, p.sex);
        return `<div><div class="bar-top"><span>${lift.name} · ${n0(best)} kg (1RM estimé)</span><b>${lvl.label}</b></div>
          <div class="bar-track" style="--c:${rank.color}"><div class="bar-fill" style="width:${((lvl.level + 1) / LEVELS.length) * 100}%"></div></div></div>`;
      }).join('')}
      <p class="muted small" style="margin:0">Basés sur ton 1RM estimé rapporté à ton poids de corps.</p>
    </section>
    <section class="card glass" style="display:flex;flex-direction:column;gap:8px">
      <h2>Rangs</h2>
      ${RANKS.map((r, ri) => `<div class="row ${r.name === rank.name ? 'rank-current' : ''}">${rankBadge(ri, 34, { shine: r.name === rank.name })}<b class="spacer">${r.name}</b><span class="muted small">${n0(r.xp)} XP</span></div>`).join('')}
      <p class="muted small" style="margin:0">Gagne de l'XP à chaque séance : séries validées, volume soulevé et records battus.</p>
    </section>`;
}

// ---------------------------------------------------------------------------
// Séance en cours
// ---------------------------------------------------------------------------

export function sessionAccessory() {
  const a = state.activeWorkout;
  if (!a) return '';
  return `<button class="accessory glass" data-wact="open-session">
    <span class="acc-icon pulse-dot"></span>
    <div class="spacer"><b>${esc(a.name)}</b><small>Séance en cours · <span data-elapsed>${clock(Date.now() - a.start)}</span></small></div>
    <span class="acc-icon">${icon.dumbbell}</span>
  </button>`;
}

function sessionExercise(ex, sets = 3, reps = '') {
  const last = lastPerformance(ex.id);
  return {
    exId: ex.id, name: ex.name, p: ex.p, s: ex.s, target: reps ? String(reps) : '',
    sets: Array.from({ length: sets }, (_, i) => {
      const prev = last?.sets[i] || last?.sets.at(-1);
      return { w: prev && num(prev.w) > 0 ? String(prev.w) : '', r: '', done: false };
    }),
  };
}

async function startSession(name, source, items) {
  if (state.activeWorkout && !confirm('Une séance est déjà en cours. La remplacer ?')) return;
  try {
    await loadLibrary();
  } catch {
    toast('Connexion nécessaire pour charger les exercices');
    return;
  }
  const exercises = items.map(([id, sets, reps]) => {
    const ex = exerciseById(id);
    return ex && sessionExercise(ex, sets, reps);
  }).filter(Boolean);
  state.activeWorkout = { id: uid(), name, start: Date.now(), source, exercises };
  save();
  startTicker();
  closeWSheet();
  openSession();
  rerenderApp();
}

function openSession() {
  wui.sessionOpen = true;
  renderSession(true);
}

function closeSessionLayer() {
  wui.sessionOpen = false;
  renderSession();
}

function renderSession(enter = false) {
  const a = state.activeWorkout;
  if (!a || !wui.sessionOpen) {
    $session.innerHTML = '';
    if (!document.querySelector('#scan .layer')) document.body.style.overflow = '';
    return;
  }
  document.body.style.overflow = 'hidden';
  const scrollTop = $session.querySelector('.layer')?.scrollTop || 0;
  $session.innerHTML = `<div class="layer ${enter ? 'enter' : ''}">
    <header class="session-head glass">
      <button class="round glass" data-wact="minimize" aria-label="Réduire">${icon.down}</button>
      <div class="spacer"><input class="dish-input" data-wname value="${esc(a.name)}" style="font-size:18px"><small class="muted" data-elapsed>${clock(Date.now() - a.start)}</small></div>
      <button class="pill btn-primary" data-wact="finish">Terminer</button>
    </header>
    <div class="session-body">
      ${a.exercises.map((e, i) => exerciseCard(e, i)).join('')}
      ${a.exercises.length ? '' : '<p class="muted" style="text-align:center">Ajoute ton premier exercice pour commencer.</p>'}
      <button class="btn glass" data-wact="picker" data-target="session">${icon.plus} Ajouter un exercice</button>
      <button class="btn glass btn-danger" data-wact="discard">Abandonner la séance</button>
    </div>
    ${restPill()}
  </div>`;
  $session.querySelector('.layer').scrollTop = enter ? 0 : scrollTop;
}

function exerciseCard(e, i) {
  const last = lastPerformance(e.exId);
  return `<section class="ex-card glass">
    <div class="row"><span class="fig-mini">${figureFor(e.exId, 52, false, true)}</span><button class="spacer ex-title" data-wact="exercise-detail" data-id="${esc(e.exId)}">${esc(e.name)}</button>
      <button class="round glass" data-wact="ex-remove" data-i="${i}" aria-label="Retirer">${icon.x}</button></div>
    <div class="chips">${e.p.map((m) => `<span class="chip" style="--c:#ff5e62">${muscleLabel(m)}</span>`).join('')}${e.s.slice(0, 3).map((m) => `<span class="chip" style="--c:#f2a93b">${muscleLabel(m)}</span>`).join('')}</div>
    <div class="hint">${icon.arrowUpRight}<span>${esc(overloadHint(e.exId))}</span></div>
    <div class="set-table">
      <div class="set-row head"><span>Série</span><span>Précédent</span><span>kg</span><span>Reps</span><span></span></div>
      ${e.sets.map((s, j) => {
        const prev = last?.sets[j];
        return `<div class="set-row ${s.done ? 'done' : ''} ${wui.justDone === `${i}:${j}` ? 'pop' : ''}">
          <span class="set-n">${j + 1}</span>
          <span class="prev">${prev ? setLabel(prev) : '—'}</span>
          <input data-wset="${i}:${j}:w" inputmode="decimal" value="${esc(s.w)}" placeholder="${prev && num(prev.w) > 0 ? n1(num(prev.w)) : '0'}">
          <input data-wset="${i}:${j}:r" inputmode="numeric" value="${esc(s.r)}" placeholder="${esc(e.target || (prev ? String(num(prev.r)) : '8'))}">
          <button class="check" data-wact="set-done" data-i="${i}" data-j="${j}" aria-label="Valider la série">${icon.check}</button>
        </div>`;
      }).join('')}
    </div>
    <div class="row"><button class="link" data-wact="set-add" data-i="${i}">${icon.plus} Série</button><span class="spacer"></span>
      ${e.sets.length > 1 ? `<button class="link" style="color:var(--muted)" data-wact="set-remove" data-i="${i}">${icon.minus} Série</button>` : ''}</div>
  </section>`;
}

function restPill() {
  if (!wui.rest) return '';
  return `<div class="rest-pill glass">
    <button class="round" data-wact="rest-adjust" data-d="-15">−15</button>
    <div class="spacer" style="text-align:center"><small class="muted">Repos</small><b data-rest>${clock(wui.rest.end - Date.now())}</b></div>
    <button class="round" data-wact="rest-adjust" data-d="15">+15</button>
    <button class="pill glass" data-wact="rest-skip">Passer</button>
  </div>`;
}

function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(() => {
    const a = state.activeWorkout;
    if (!a) return stopTicker();
    const elapsed = clock(Date.now() - a.start);
    document.querySelectorAll('[data-elapsed]').forEach((el) => (el.textContent = elapsed));
    if (wui.rest) {
      const left = wui.rest.end - Date.now();
      if (left <= 0) {
        wui.rest = null;
        navigator.vibrate?.([200, 100, 200]);
        toast('Repos terminé, à toi', 'timer');
        renderSession();
      } else {
        const el = document.querySelector('[data-rest]');
        if (el) el.textContent = clock(left);
      }
    }
  }, 1000);
}

function stopTicker() {
  clearInterval(ticker);
  ticker = 0;
}

function finishSession() {
  const a = state.activeWorkout;
  const exercises = a.exercises
    .map((e) => ({
      exId: e.exId, name: e.name, p: e.p, s: e.s,
      sets: e.sets.filter((s) => s.done && num(s.r) > 0).map((s) => ({ w: num(s.w), r: num(s.r) })),
    }))
    .filter((e) => e.sets.length);
  if (!exercises.length) {
    if (confirm('Aucune série validée. Abandonner la séance ?')) discardSession();
    return;
  }
  const prs = exercises
    .filter((e) => {
      const previous = bestEver(e.exId);
      return previous !== null && bestOf(e.sets) > previous;
    })
    .map((e) => e.name);
  const volume = exercises.reduce((sum, e) => sum + volumeOf(e.sets), 0);
  const sets = exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const xpBefore = totalXp();
  const workout = {
    id: a.id, name: a.name.trim() || 'Séance', start: a.start, end: Date.now(), source: a.source,
    exercises, volume, sets, prs, xp: 20 + sets * 3 + prs.length * 30 + Math.round(volume / 500),
  };
  state.workouts.push(workout);
  state.activeWorkout = null;
  save();
  stopTicker();
  wui.rest = null;
  wui.sessionOpen = false;
  renderSession();
  const rankedUp = rankFor(xpBefore).index !== rankFor(xpBefore + workout.xp).index;
  openWSheet({ type: 'summary', id: workout.id, xpBefore, celebrate: prs.length > 0 || rankedUp });
  rerenderApp();
  navigator.vibrate?.([30, 60, 30]);
}

function discardSession() {
  state.activeWorkout = null;
  save();
  stopTicker();
  wui.rest = null;
  wui.sessionOpen = false;
  renderSession();
  rerenderApp();
}

// ---------------------------------------------------------------------------
// Feuilles (détails, choix d'exercice, séance perso, bilan)
// ---------------------------------------------------------------------------

function openWSheet(sheet) {
  wui.sheet = sheet;
  renderWSheet();
}

function closeWSheet() {
  wui.sheet = null;
  renderWSheet();
}

function renderWSheet() {
  const sh = wui.sheet;
  if (!sh) {
    $wsheet.innerHTML = '';
    shownSheet = null;
    return;
  }
  const views = { exercise: exerciseSheet, picker: pickerSheet, routine: routineSheet, summary: summarySheet, workout: workoutSheet };
  const enter = shownSheet !== sh ? 'enter' : '';
  shownSheet = sh;
  const tall = sh.type === 'picker' || sh.type === 'routine' || sh.type === 'exercise';
  $wsheet.innerHTML = `<div class="backdrop ${enter}" data-wact="close-sheet"></div>
    <div class="sheet ${tall ? 'tall' : ''} ${enter}"><div class="grabber"></div>${views[sh.type](sh)}</div>`;
  if (enter) {
    animateCounts($wsheet);
    if (sh.type === 'summary' && sh.celebrate) setTimeout(confetti, 250);
  }
}

const sheetHead = (title) => `<div class="sheet-head"><h2>${title}</h2><button class="round glass" data-wact="close-sheet" aria-label="Fermer">${icon.x}</button></div>`;

function exerciseSheet(sh) {
  const ex = exerciseById(sh.id);
  if (!ex) return sheetHead('Exercice') + '<div class="spinner"></div>';
  const colors = Object.fromEntries([...ex.s.map((m) => [m, '#f2a93b']), ...ex.p.map((m) => [m, '#ff5e62'])]);
  const h = history(ex.id);
  const best = h.length ? Math.max(...h.map((x) => x.best)) : null;
  const lift = LIFTS.find((l) => l.id === ex.id);
  const p = state.profile;
  const level = lift && best && p ? strengthLevel(lift, best, p.weightKg, p.sex) : null;
  return `${sheetHead(esc(ex.name))}
    ${ex.fr && ex.en !== ex.fr ? `<div class="muted small" style="margin-top:-10px">${esc(ex.en)}</div>` : ''}
    <div class="fig-hero">${exerciseFigure(ex, { size: 210, crop: true })}</div>
    ${ex.img ? `<details class="photo-toggle"><summary class="link">${icon.photo} Voir une photo réelle</summary>
      <img class="ex-photo" src="${esc(ex.img)}" alt="" loading="lazy" onerror="this.closest('details').remove()"></details>` : ''}
    <div class="chips"><span class="chip" style="--c:var(--accent)">${esc(ex.eq)}</span>
      <span class="chip" style="--c:#4D7CFE">${['', 'Débutant', 'Intermédiaire', 'Avancé'][ex.lv] || 'Tous niveaux'}</span></div>
    <section class="card glass body-card">${bodyDiagram(colors)}
      <div class="legend-row"><span><i style="background:#ff5e62"></i>Principal : ${esc(ex.p.map(muscleLabel).join(', '))}</span>
        ${ex.s.length ? `<span><i style="background:#f2a93b"></i>Secondaire : ${esc(ex.s.map(muscleLabel).join(', '))}</span>` : ''}</div></section>
    ${ex.how ? `<section class="card glass"><h2 style="font-size:17px">Comment faire</h2><p class="muted" style="margin:8px 0 0;line-height:1.45">${esc(ex.how)}</p></section>` : ''}
    <section class="card glass" style="display:flex;flex-direction:column;gap:10px">
      <h2 style="font-size:17px">Tes performances</h2>
      ${h.length ? `<div class="mini-stats" style="margin:0">
          <div><b>${n0(best)}${h[0].sets.some((s) => num(s.w) > 0) ? ' kg' : ''}</b><span>record (1RM estimé)</span></div>
          <div><b>${esc(setLabel(h[0].sets.reduce((a, b) => (e1rm(num(b.w), num(b.r)) > e1rm(num(a.w), num(a.r)) ? b : a))))}</b><span>meilleure série récente</span></div>
          <div><b>${h.length}</b><span>séances</span></div></div>
        ${h.length >= 2 ? `<div class="chart">${progressChart(h)}</div>` : ''}
        ${level ? `<div class="bar-top"><span>Niveau de force</span><b>${level.label}</b></div>` : ''}
        ${h.slice(0, 5).map((x) => `<div class="row small"><span class="muted" style="width:90px">${ago(x.date)}</span><span>${esc(x.sets.map(setLabel).join(' · '))}</span></div>`).join('')}`
        : '<p class="muted small" style="margin:0">Pas encore fait. Tes séries apparaîtront ici avec ta progression.</p>'}
    </section>
    ${state.activeWorkout
      ? `<button class="btn btn-primary" data-wact="add-to-session" data-id="${esc(ex.id)}">${icon.plus} Ajouter à ma séance</button>`
      : `<button class="btn btn-primary" data-wact="start-with" data-id="${esc(ex.id)}">${icon.play} Démarrer une séance avec</button>`}`;
}

function progressChart(h) {
  const points = [...h].reverse().slice(-20);
  const W = 320;
  const H = 110;
  const min = Math.min(...points.map((p) => p.best));
  const max = Math.max(...points.map((p) => p.best));
  const span = Math.max(max - min, 1);
  const xy = points.map((p, i) => [(i / Math.max(points.length - 1, 1)) * (W - 12) + 6, H - ((p.best - min) / span) * (H - 12) - 6]);
  return `<svg viewBox="0 0 ${W} ${H}">
    <polyline points="${xy.map((p) => p.join(',')).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    ${xy.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="var(--accent)"/>`).join('')}
  </svg>`;
}

function pickerSheet(sh) {
  if (!libraryReady()) {
    loadLibrary().then(renderWSheet).catch(() => {});
    return sheetHead('Ajouter un exercice') + '<div class="spinner"></div>';
  }
  return `${sheetHead('Ajouter un exercice')}
    <div class="search-bar glass">${icon.search}<input type="search" data-wpquery placeholder="Rechercher un exercice" value="${esc(sh.query)}" autocomplete="off" autocorrect="off" spellcheck="false"></div>
    <div class="pills">${muscleChips(sh.muscle, 'picker-muscle')}</div>
    <div data-wpresults>${exerciseResults({ query: sh.query, muscle: sh.muscle }, 'pick-ex')}</div>`;
}

function routineSheet(sh) {
  const r = sh.routine;
  return `${sheetHead(sh.isNew ? 'Nouvelle séance' : 'Modifier la séance')}
    <input class="input" data-rname value="${esc(r.name)}" placeholder="Nom (ex : Pecs-Triceps du lundi)">
    ${r.exercises.map((e, i) => `<div class="ingredient glass">
        <div class="row"><b class="spacer">${esc(e.name)}</b><button class="round glass" data-wact="routine-remove-ex" data-i="${i}" aria-label="Retirer" style="width:32px;height:32px">${icon.x}</button></div>
        <div class="row"><span class="muted small">Séries</span>
          <button class="round glass" data-wact="routine-sets" data-i="${i}" data-d="-1">${icon.minus}</button><b>${e.sets}</b>
          <button class="round glass" data-wact="routine-sets" data-i="${i}" data-d="1">${icon.plus}</button>
          <span class="spacer"></span><span class="muted small">Reps</span>
          <input class="input" data-rreps="${i}" inputmode="numeric" value="${esc(e.reps)}" style="width:70px;text-align:center;padding:10px"></div>
      </div>`).join('')}
    <button class="btn glass" data-wact="picker" data-target="routine">${icon.plus} Ajouter un exercice</button>
    <button class="btn btn-primary" data-wact="routine-save" ${r.exercises.length ? '' : 'disabled'}>Enregistrer</button>
    ${sh.isNew ? '' : `<button class="btn glass btn-danger" data-wact="routine-delete">${icon.trash} Supprimer</button>`}`;
}

function summarySheet(sh) {
  const w = state.workouts.find((x) => x.id === sh.id);
  if (!w) return sheetHead('Bilan');
  const before = rankFor(sh.xpBefore);
  const after = rankFor(sh.xpBefore + w.xp);
  const rankedUp = before.rank.name !== after.rank.name;
  return `<div class="ob-body center enter" style="gap:12px">
      ${rankedUp ? `<span class="badge-pop">${rankBadge(after.index, 96)}</span>` : `<span class="check-burst">${icon.check}</span>`}
      <h1 style="font-size:28px">${rankedUp ? `Nouveau rang : ${after.rank.name} !` : 'Séance terminée !'}</h1>
      <p class="muted" style="margin:0">${esc(w.name)}</p>
    </div>
    <div class="mini-stats">
      <div><b>${duration(w.end - w.start)}</b><span>durée</span></div>
      <div><b data-count="${Math.round(w.volume)}" data-suffix=" kg">${n0(w.volume)} kg</b><span>soulevés</span></div>
      <div><b data-count="${w.sets}">${w.sets}</b><span>séries</span></div>
    </div>
    ${w.prs.length ? `<section class="card glass pr-card"><b class="row"><span class="icon-chip">${icon.trophy}</span>${w.prs.length > 1 ? 'Nouveaux records' : 'Nouveau record'}</b>
      <p class="muted" style="margin:6px 0 0">${esc(w.prs.join(', '))}</p></section>` : ''}
    <section class="card glass rank-card" style="--rank:${after.rank.color}">
      <div class="row">${rankBadge(after.index, 52)}<div class="spacer"><b>+<span data-count="${w.xp}">${w.xp}</span> XP</b>
        <div class="muted small">${after.rank.name} · ${n0(sh.xpBefore + w.xp)} XP</div></div></div>
      <div class="bar-track" style="--c:${after.rank.color};margin-top:12px"><div class="bar-fill" style="width:${Math.round(after.progress * 100)}%"></div></div>
    </section>
    ${w.source?.type === 'libre' ? '<button class="btn glass" data-wact="save-as-routine">Enregistrer comme séance perso</button>' : ''}
    <button class="btn btn-primary" data-wact="close-sheet">Super</button>`;
}

function workoutSheet(sh) {
  const w = state.workouts.find((x) => x.id === sh.id);
  if (!w) return sheetHead('Séance');
  const date = new Date(w.end).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return `${sheetHead(esc(w.name))}
    <div class="muted small" style="margin-top:-10px">${date} · ${duration(w.end - w.start)}</div>
    <div class="mini-stats" style="margin:0"><div><b>${n0(w.volume)} kg</b><span>soulevés</span></div><div><b>${w.sets}</b><span>séries</span></div><div><b>+${w.xp}</b><span>XP</span></div></div>
    ${w.exercises.map((e) => `<section class="card glass" style="padding:14px">
      <button class="ex-title" data-wact="exercise-detail" data-id="${esc(e.exId)}">${esc(e.name)}${w.prs.includes(e.name) ? `<span class="pr-mark">${icon.trophy}</span>` : ''}</button>
      <p class="muted small" style="margin:6px 0 0">${esc(e.sets.map(setLabel).join(' · '))}</p></section>`).join('')}
    <button class="btn glass" data-wact="repeat-workout" data-id="${w.id}">${icon.play} Refaire cette séance</button>
    <button class="btn glass btn-danger" data-wact="workout-delete" data-id="${w.id}">${icon.trash} Supprimer</button>`;
}

// ---------------------------------------------------------------------------
// Amis (partage par lien, sans serveur)
// ---------------------------------------------------------------------------

function encodeCard(card) {
  const bytes = new TextEncoder().encode(JSON.stringify(card));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeCard(code) {
  const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

function myCard() {
  return {
    v: 1, id: state.userId, n: state.profile?.firstName || 'Moi', xp: totalXp(), w: state.workouts.length,
    vol7: Math.round(weekStats().volume), t: Date.now(),
  };
}

function addFriendFromText(text) {
  const match = String(text).match(/ami=([A-Za-z0-9_-]+)/) || String(text).trim().match(/^([A-Za-z0-9_-]{20,})$/);
  if (!match) return toast('Lien invalide');
  let card;
  try {
    card = decodeCard(match[1]);
  } catch {
    return toast('Lien invalide');
  }
  if (!card?.id || typeof card.n !== 'string' || typeof card.xp !== 'number') return toast('Lien invalide');
  if (card.id === state.userId) return toast("C'est ton propre lien", 'info');
  const friend = { id: String(card.id).slice(0, 40), n: card.n.slice(0, 30), xp: Math.max(0, card.xp), w: Number(card.w) || 0, vol7: Number(card.vol7) || 0, t: Number(card.t) || Date.now() };
  state.friends = [friend, ...state.friends.filter((f) => f.id !== friend.id)];
  save();
  toast(`${friend.n} ajouté à tes amis`, 'users');
}

function handleFriendLink() {
  if (!location.hash.startsWith('#ami=')) return;
  addFriendFromText(location.hash);
  history.replaceState(null, '', location.pathname + location.search);
  wui.section = 'classement';
}

async function shareProfile() {
  const url = `${location.origin}${location.pathname}#ami=${encodeCard(myCard())}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Assiette', text: `Ajoute-moi sur Assiette (rang ${rankFor(totalXp()).rank.name})`, url });
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Lien copié, envoie-le à tes amis');
  } catch {
    prompt('Copie ce lien et envoie-le à tes amis :', url);
  }
}

// ---------------------------------------------------------------------------
// Événements
// ---------------------------------------------------------------------------

function refreshResults(selector, filters, act) {
  const el = document.querySelector(selector);
  if (el) el.innerHTML = exerciseResults(filters, act);
}

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-wact]');
  if (!el || el.disabled) return;
  const a = state.activeWorkout;
  const sh = wui.sheet;
  const i = Number(el.dataset.i);
  const j = Number(el.dataset.j);

  switch (el.dataset.wact) {
    case 'section':
      wui.prevSection = wui.section;
      wui.section = el.dataset.s;
      rerenderApp();
      break;
    case 'muscle-filter':
      wui.muscle = wui.muscle === el.dataset.muscle ? '' : el.dataset.muscle;
      if (wui.section !== 'exercices') wui.section = 'exercices';
      rerenderApp();
      break;
    case 'equipment-filter':
      wui.equipment = el.dataset.eq;
      rerenderApp();
      break;
    case 'exercise-detail':
      if (!libraryReady()) await loadLibrary().catch(() => {});
      openWSheet({ type: 'exercise', id: el.dataset.id });
      break;
    case 'close-sheet':
      closeWSheet();
      break;

    // Démarrer
    case 'start-free':
      startSession('Séance libre', { type: 'libre' }, []);
      break;
    case 'start-program': {
      const p = PROGRAMS.find((x) => x.id === el.dataset.id);
      if (p) startSession(p.name, { type: 'programme', id: p.id }, p.exercises);
      break;
    }
    case 'start-routine': {
      const r = state.routines.find((x) => x.id === el.dataset.id);
      if (r) startSession(r.name, { type: 'perso', id: r.id }, r.exercises.map((x) => [x.exId, x.sets, x.reps]));
      break;
    }
    case 'start-with':
      startSession('Séance libre', { type: 'libre' }, [[el.dataset.id, 3, '']]);
      break;
    case 'repeat-workout': {
      const w = state.workouts.find((x) => x.id === el.dataset.id);
      if (w) startSession(w.name, w.source || { type: 'libre' }, w.exercises.map((x) => [x.exId, x.sets.length, '']));
      break;
    }
    case 'open-session':
      openSession();
      break;
    case 'minimize':
      closeSessionLayer();
      rerenderApp();
      break;

    // Séance en cours
    case 'set-done': {
      const ex = a.exercises[i];
      const s = ex.sets[j];
      s.done = !s.done;
      if (s.done) {
        const prev = lastPerformance(ex.exId)?.sets[j];
        if (!s.r) s.r = ex.target || (prev ? String(prev.r) : '8');
        if (!s.w && prev && num(prev.w) > 0) s.w = String(prev.w);
        const seconds = num(s.w) > 0 ? 90 : 60;
        wui.rest = { end: Date.now() + seconds * 1000 };
        wui.justDone = `${i}:${j}`;
        navigator.vibrate?.(15);
      }
      save();
      renderSession();
      wui.justDone = '';
      break;
    }
    case 'set-add': {
      const sets = a.exercises[i].sets;
      const prev = sets.at(-1);
      sets.push({ w: prev?.w || '', r: '', done: false });
      save();
      renderSession();
      break;
    }
    case 'set-remove':
      a.exercises[i].sets.pop();
      save();
      renderSession();
      break;
    case 'ex-remove':
      if (confirm(`Retirer « ${a.exercises[i].name} » de la séance ?`)) {
        a.exercises.splice(i, 1);
        save();
        renderSession();
      }
      break;
    case 'rest-adjust':
      wui.rest.end += Number(el.dataset.d) * 1000;
      renderSession();
      break;
    case 'rest-skip':
      wui.rest = null;
      renderSession();
      break;
    case 'finish':
      finishSession();
      break;
    case 'discard':
      if (confirm('Abandonner cette séance ? Rien ne sera enregistré.')) discardSession();
      break;

    // Choix d'exercice
    case 'picker':
      openWSheet({ type: 'picker', target: el.dataset.target, query: '', muscle: '', parent: el.dataset.target === 'routine' ? sh : null });
      break;
    case 'picker-muscle':
      sh.muscle = sh.muscle === el.dataset.muscle ? '' : el.dataset.muscle;
      renderWSheet();
      break;
    case 'pick-ex':
    case 'add-to-session': {
      const ex = exerciseById(el.dataset.id);
      if (!ex) break;
      if (sh?.type === 'picker' && sh.target === 'routine') {
        sh.parent.routine.exercises.push({ exId: ex.id, name: ex.name, p: ex.p, sets: 3, reps: '10' });
        openWSheet(sh.parent);
      } else if (state.activeWorkout) {
        state.activeWorkout.exercises.push(sessionExercise(ex));
        save();
        closeWSheet();
        openSession();
        toast(`${ex.name} ajouté`);
      }
      break;
    }

    // Séances perso
    case 'routine-new':
      openWSheet({ type: 'routine', isNew: true, routine: { id: uid(), name: '', exercises: [] } });
      break;
    case 'routine-edit': {
      const r = state.routines.find((x) => x.id === el.dataset.id);
      if (r) openWSheet({ type: 'routine', isNew: false, routine: structuredClone(r) });
      break;
    }
    case 'routine-sets': {
      const ex = sh.routine.exercises[i];
      ex.sets = Math.min(10, Math.max(1, ex.sets + Number(el.dataset.d)));
      renderWSheet();
      break;
    }
    case 'routine-remove-ex':
      sh.routine.exercises.splice(i, 1);
      renderWSheet();
      break;
    case 'routine-save': {
      const r = sh.routine;
      r.name = r.name.trim() || 'Ma séance';
      state.routines = [r, ...state.routines.filter((x) => x.id !== r.id)];
      save();
      closeWSheet();
      rerenderApp();
      toast('Séance enregistrée');
      break;
    }
    case 'routine-delete':
      if (confirm('Supprimer cette séance ?')) {
        state.routines = state.routines.filter((x) => x.id !== sh.routine.id);
        save();
        closeWSheet();
        rerenderApp();
      }
      break;
    case 'save-as-routine': {
      const w = state.workouts.find((x) => x.id === sh.id);
      state.routines.unshift({
        id: uid(), name: w.name === 'Séance libre' ? `Séance du ${new Date(w.end).toLocaleDateString('fr-FR')}` : w.name,
        exercises: w.exercises.map((e) => ({ exId: e.exId, name: e.name, p: e.p, sets: e.sets.length, reps: String(e.sets.at(-1).r) })),
      });
      save();
      closeWSheet();
      rerenderApp();
      toast('Ajoutée à tes séances');
      break;
    }

    // Historique
    case 'workout-detail':
      openWSheet({ type: 'workout', id: el.dataset.id });
      break;
    case 'workout-delete':
      if (confirm('Supprimer cette séance de ton historique ? Son XP sera retiré.')) {
        state.workouts = state.workouts.filter((x) => x.id !== el.dataset.id);
        save();
        closeWSheet();
        rerenderApp();
      }
      break;

    // Amis
    case 'share-profile':
      shareProfile();
      break;
    case 'friend-add': {
      const input = document.querySelector('[data-friend-code]');
      addFriendFromText(input.value);
      rerenderApp();
      break;
    }
    case 'friend-remove':
      state.friends = state.friends.filter((f) => f.id !== el.dataset.id);
      save();
      rerenderApp();
      break;
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.matches('[data-wquery]')) {
    wui.query = t.value;
    refreshResults('[data-wresults]', wui, 'exercise-detail');
  } else if (t.matches('[data-wpquery]')) {
    wui.sheet.query = t.value;
    refreshResults('[data-wpresults]', { query: wui.sheet.query, muscle: wui.sheet.muscle }, 'pick-ex');
  } else if (t.matches('[data-wset]')) {
    const [i, j, field] = t.dataset.wset.split(':');
    state.activeWorkout.exercises[Number(i)].sets[Number(j)][field] = t.value;
    save();
  } else if (t.matches('[data-wname]')) {
    state.activeWorkout.name = t.value;
    save();
  } else if (t.matches('[data-rname]')) {
    wui.sheet.routine.name = t.value;
  } else if (t.matches('[data-rreps]')) {
    wui.sheet.routine.exercises[Number(t.dataset.rreps)].reps = t.value;
  }
});
