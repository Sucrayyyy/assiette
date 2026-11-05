// Modules de l'écran d'accueil et réglages : eau, score du jour, apparence, écran d'accueil, sauvegarde.
import { state, save, replaceState } from './store.js';
import { dayKey, totalsOn, targets, burnedOn, stepsOn, lastDays, n0 } from './nutrition.js';
import { esc, icon, ring, haptic, tone, toast, confetti } from './ui.js';
import { act, openPanel, refreshPanel, closePanel, panelHead } from './panel.js';
import { ACCENTS, LOCKED_ACCENTS, currentAccent, setTheme, applyTheme } from './theme.js';
import { levelInfo } from './rewards.js';
import { dueOn, allTakenOn } from './supplements.js';

export const STEPS_GOAL = 10000;
let rerender = () => {};

export function initModules({ renderApp }) {
  rerender = renderApp;
  navigator.storage?.persist?.().catch?.(() => {});
}

export const homeOn = (key) => state.home?.[key] !== false;

// ---------------------------------------------------------------------------
// Eau
// ---------------------------------------------------------------------------

export const waterGoal = () => state.waterGoal || Math.round(((state.profile?.weightKg || 70) * 35) / 50) * 50;
export const waterOn = (day) => state.water?.[day] || 0;
const liters = (ml) => `${(ml / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} L`;
const fill = (day) => Math.min(100, (waterOn(day) / waterGoal()) * 100);

const waves = `<svg class="wave w1" viewBox="0 0 240 20" preserveAspectRatio="none" aria-hidden="true"><path d="M0 10 Q30 0 60 10 T120 10 T180 10 T240 10 V20 H0Z"/></svg>
  <svg class="wave w2" viewBox="0 0 240 20" preserveAspectRatio="none" aria-hidden="true"><path d="M0 10 Q30 20 60 10 T120 10 T180 10 T240 10 V20 H0Z"/></svg>`;

export function waterTile(day) {
  return `<div class="tile water-tile glass" style="--fill:${fill(day)}%" data-water-day="${day}">
    <div class="liquid">${waves}</div>
    <button class="tile-main" data-x="water-open">
      <span class="tile-ico">${icon.drop}</span>
      <b data-water-value>${liters(waterOn(day))}</b><small>sur ${liters(waterGoal())}</small>
    </button>
    <button class="round tile-add" data-x="water-add" data-ml="250" aria-label="Ajouter un verre">${icon.plus}</button>
  </div>`;
}

function addWater(day, ml) {
  const before = waterOn(day);
  const next = Math.max(0, before + ml);
  state.water = { ...state.water, [day]: next };
  save();
  haptic();
  // Mise à jour sur place : le niveau monte en douceur au lieu de redessiner tout l'écran.
  document.querySelectorAll(`[data-water-day="${day}"]`).forEach((el) => {
    el.style.setProperty('--fill', `${fill(day)}%`);
    el.querySelector('[data-water-value]').textContent = liters(next);
    if (ml > 0) {
      el.classList.remove('splash');
      void el.offsetWidth;
      el.classList.add('splash');
    }
  });
  refreshScore();
  refreshPanel();
  if (before < waterGoal() && next >= waterGoal()) {
    tone([784, 1047], 0.07, 0.12);
    toast('Objectif eau atteint', 'drop');
  }
}

function panelWater(day) {
  return () => {
    const ml = waterOn(day);
    const week = lastDays(7).map((d) => waterOn(d));
    const max = Math.max(waterGoal(), ...week, 1);
    return `${panelHead('Hydratation', `Objectif ${liters(waterGoal())}`)}
      <div class="water-big" style="--fill:${fill(day)}%" data-water-day="${day}">
        <div class="liquid">${waves}</div>
        <div class="water-big-text"><b data-water-value>${liters(ml)}</b><small>${ml >= waterGoal() ? 'Objectif atteint' : `encore ${liters(waterGoal() - ml)}`}</small></div>
      </div>
      <div class="water-add-row">
        ${[[150, 'Petit verre'], [250, 'Verre'], [500, 'Bouteille'], [1000, '1 litre']].map(([v, l]) => `<button class="glass" data-x="water-add" data-ml="${v}"><b>${v >= 1000 ? '1 L' : `${v} ml`}</b><small>${l}</small></button>`).join('')}
      </div>
      <button class="link" data-x="water-add" data-ml="-250" style="align-self:center">${icon.minus} Enlever 250 ml</button>
      <div class="mini-bars">${week.map((v, i) => `<div><i style="height:${Math.max(4, (v / max) * 100)}%;${i === 6 ? '' : 'opacity:.5'}"></i></div>`).join('')}</div>
      <label class="field"><span>Mon objectif (ml par jour)</span><input class="input" data-water-goal inputmode="numeric" value="${waterGoal()}"></label>
      <p class="muted small" style="margin:0">Par défaut 35 ml par kilo de poids de corps, par jour.</p>`;
  };
}

act('water-add', (el) => {
  const day = el.closest('[data-water-day]')?.dataset.waterDay || document.querySelector('[data-water-day]')?.dataset.waterDay || dayKey();
  addWater(day, Number(el.dataset.ml));
});
act('water-open', (el) => openPanel(panelWater(el.closest('[data-water-day]')?.dataset.waterDay || dayKey())));

document.addEventListener('change', (e) => {
  if (!e.target.matches('[data-water-goal]')) return;
  const v = Number(e.target.value);
  state.waterGoal = v >= 500 && v <= 8000 ? Math.round(v) : null;
  save();
  rerender();
  refreshPanel();
});

// ---------------------------------------------------------------------------
// Score du jour : la journée parfaite
// ---------------------------------------------------------------------------

export function dayScore(day) {
  const g = targets();
  const t = totalsOn(day);
  const budget = g.kcal + burnedOn(day);
  const items = [
    { key: 'kcal', label: 'Calories dans la cible', detail: `${n0(t.kcal)} sur ${n0(budget)} kcal`, done: t.kcal >= budget * 0.85 && t.kcal <= budget * 1.05, ico: 'target' },
    { key: 'protein', label: 'Protéines atteintes', detail: `${n0(t.protein)} sur ${n0(g.protein)} g`, done: t.protein >= g.protein * 0.95, ico: 'bolt' },
  ];
  if (homeOn('steps')) items.push({ key: 'steps', label: `${n0(STEPS_GOAL)} pas`, detail: `${n0(stepsOn(day))} pas`, done: stepsOn(day) >= STEPS_GOAL, ico: 'steps' });
  if (homeOn('water')) items.push({ key: 'water', label: 'Assez bu', detail: `${liters(waterOn(day))} sur ${liters(waterGoal())}`, done: waterOn(day) >= waterGoal(), ico: 'drop' });
  if (homeOn('supps') && dueOn(day).length) items.push({ key: 'supps', label: 'Compléments pris', detail: `${dueOn(day).length} au programme`, done: allTakenOn(day), ico: 'pill' });
  return { items, done: items.filter((i) => i.done).length, total: items.length };
}

export function scorePill(day) {
  const s = dayScore(day);
  const perfect = s.done === s.total;
  return `<button class="score-pill glass ${perfect ? 'perfect' : ''}" data-x="score-open" data-score data-day="${day}" aria-label="Score du jour : ${s.done} sur ${s.total}">
    <span class="score-ring">${ring(s.done / s.total, perfect ? ['#ffd25e', '#ff9d3d'] : ['var(--accent)', 'var(--accent)'], 22, 3.5)}</span><b>${s.done}/${s.total}</b></button>`;
}

function refreshScore() {
  const el = document.querySelector('[data-score]');
  if (el) el.outerHTML = scorePill(el.dataset.day);
  checkPerfect();
}

/** Toutes les cases cochées aujourd'hui : petite fête, une fois par jour. */
export function checkPerfect() {
  if (!state.profile || !homeOn('score')) return;
  const day = dayKey();
  if (state.perfectDays?.[day]) return;
  const s = dayScore(day);
  if (s.total < 3 || s.done < s.total) return;
  state.perfectDays = { ...state.perfectDays, [day]: true };
  save();
  confetti();
  haptic([30, 40, 60]);
  tone([659, 784, 988, 1319], 0.07, 0.13);
  toast('Journée parfaite !', 'flag');
}

act('score-open', (el) => {
  const day = el.dataset.day;
  openPanel(() => {
    const s = dayScore(day);
    return `${panelHead('Ta journée', s.done === s.total ? 'Parfaite. Rien à redire.' : `${s.done} objectifs sur ${s.total}`)}
      <div class="list glass">${s.items.map((i) => `<div class="food score-row ${i.done ? 'ok' : ''}">
          <span class="icon-chip">${i.done ? icon.check : icon[i.ico]}</span>
          <div class="info"><div class="name">${esc(i.label)}</div><div class="meta">${esc(i.detail)}</div></div></div>`).join('')}</div>
      <p class="muted small" style="margin:0;text-align:center">${n0(Object.keys(state.perfectDays || {}).length)} journées parfaites au compteur</p>`;
  });
});

// ---------------------------------------------------------------------------
// Apparence
// ---------------------------------------------------------------------------

function panelTheme() {
  const a = currentAccent();
  const t = state.theme || {};
  const mode = t.mode || 'auto';
  return `${panelHead('Apparence')}
    <div class="theme-preview glass">
      <span class="tp-ring">${ring(0.68, ['var(--accent)', 'var(--accent-deep)'], 58, 8)}</span>
      <div class="spacer"><b>${esc(a.name)}</b><div class="tp-bar"><i></i></div></div>
      <span class="tp-btn">${icon.check}</span>
    </div>
    <div class="field"><span>Couleur d'accentuation</span>
      <div class="swatches">
        ${ACCENTS.map((c) => `<button class="swatch ${!t.custom && (t.accent || 'emeraude') === c.key ? 'on' : ''}" data-x="theme-accent" data-k="${c.key}" style="--s:${c.light};--s2:${c.dark}" aria-label="${c.name}"></button>`).join('')}
        <label class="swatch custom ${t.custom ? 'on' : ''}" aria-label="Couleur sur mesure" ${t.custom ? `style="--s:${t.custom};--s2:${t.custom}"` : ''}><input type="color" data-theme-color value="${t.custom || a.light}"></label>
      </div>
    </div>
    <div class="field"><span>Couleurs exclusives</span>
      <div class="swatches">${LOCKED_ACCENTS.map((c) => {
        const open = levelInfo().level >= c.level;
        return `<button class="swatch ${open ? '' : 'locked'} ${!t.custom && t.accent === c.key ? 'on' : ''}" data-x="${open ? 'theme-accent' : 'theme-locked'}" data-k="${c.key}" data-l="${c.level}" style="--s:${c.light};--s2:${c.dark}" aria-label="${c.name}${open ? '' : `, niveau ${c.level}`}">${open ? '' : `<span>${c.level}</span>`}</button>`;
      }).join('')}</div>
      <small class="muted">Débloquées en montant de niveau : note tes repas, fais tes séances, relève les défis.</small>
    </div>
    <div class="field"><span>Thème</span>
      <div class="pills mode-pills">${[['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => `<button class="pill glass ${mode === k ? 'active' : ''}" data-x="theme-mode" data-k="${k}">${l}</button>`).join('')}</div>
    </div>
    <p class="muted small" style="margin:0">L'onglet Muscu reste toujours sombre, avec ta couleur.</p>`;
}

const themeChanged = () => {
  rerender();
  refreshPanel();
  haptic();
};
act('theme-open', () => openPanel(panelTheme));
act('theme-locked', (el) => {
  haptic([10, 30, 10]);
  toast(`Débloquée au niveau ${el.dataset.l}`, 'info');
});
act('theme-accent', (el) => setTheme({ accent: el.dataset.k, custom: null }, themeChanged));
act('theme-mode', (el) => setTheme({ mode: el.dataset.k }, themeChanged));
// Couleur libre : l'aperçu suit le doigt, l'enregistrement se fait à la fermeture du sélecteur.
document.addEventListener('input', (e) => {
  if (!e.target.matches('[data-theme-color]')) return;
  state.theme = { ...state.theme, custom: e.target.value };
  applyTheme();
});
document.addEventListener('change', (e) => {
  if (e.target.matches('[data-theme-color]')) setTheme({ custom: e.target.value }, themeChanged);
});

// ---------------------------------------------------------------------------
// Écran d'accueil à la carte
// ---------------------------------------------------------------------------

const HOME_MODULES = [
  ['quests', 'Défis du jour', 'Trois défis et un coffre chaque jour', 'trophy'],
  ['week', 'Semaine', 'Les 7 derniers jours en haut de l\'écran', 'calendar'],
  ['score', 'Score du jour', 'Tes objectifs cochés, journée parfaite', 'flag'],
  ['steps', 'Pas', 'Compteur et calories brûlées', 'steps'],
  ['water', 'Eau', 'Un verre en un geste', 'drop'],
  ['supps', 'Compléments', 'À cocher, avec rappels', 'pill'],
];

act('home-open', () => openPanel(() => `${panelHead("Écran d'accueil", 'Garde seulement ce qui te sert')}
  <div class="list glass">${HOME_MODULES.map(([k, l, d, ic]) => `<button class="food toggle-row" data-x="home-toggle" data-k="${k}">
      <span class="icon-chip">${icon[ic]}</span>
      <div class="info"><div class="name">${l}</div><div class="meta">${d}</div></div>
      <span class="switch ${homeOn(k) ? 'on' : ''}"></span></button>`).join('')}</div>`));
act('home-toggle', (el) => {
  state.home = { ...state.home, [el.dataset.k]: !homeOn(el.dataset.k) };
  save();
  haptic();
  rerender();
  refreshPanel();
});

// ---------------------------------------------------------------------------
// Sauvegarde
// ---------------------------------------------------------------------------

function backupAge() {
  if (!state.lastBackup) return 'Aucune sauvegarde pour le moment';
  const days = Math.floor((Date.now() - state.lastBackup) / 864e5);
  return days <= 0 ? "Dernière sauvegarde : aujourd'hui" : `Dernière sauvegarde : il y a ${days} j`;
}

act('backup-open', () => openPanel(() => `${panelHead('Sauvegarde', backupAge())}
  <p class="muted" style="margin:0">Tout reste sur ton téléphone. Garde une copie dans Fichiers ou iCloud : tu pourras tout récupérer si tu changes d'iPhone.</p>
  <button class="btn btn-primary" data-x="backup-export">${icon.download} Exporter mes données</button>
  <label class="btn glass" style="text-align:center;cursor:pointer">${icon.upload} Restaurer une sauvegarde<input type="file" accept="application/json,.json" data-backup-file hidden></label>`));

act('backup-export', async () => {
  const { apiKey, pushId, pushDirty, ...data } = state;
  const name = `assiette-${dayKey()}.json`;
  const file = new File([JSON.stringify({ app: 'assiette', version: 1, data })], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Sauvegarde Assiette' });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
    return toast('Export impossible', 'info');
  }
  state.lastBackup = Date.now();
  save();
  refreshPanel();
  toast('Sauvegarde prête', 'download');
});

document.addEventListener('change', async (e) => {
  if (!e.target.matches('[data-backup-file]')) return;
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (parsed?.app !== 'assiette' || !parsed.data || !Array.isArray(parsed.data.entries)) throw new Error('format');
    if (!confirm('Remplacer toutes les données de cette app par cette sauvegarde ?')) return;
    replaceState(parsed.data);
    closePanel();
    location.reload();
  } catch {
    toast("Ce fichier n'est pas une sauvegarde Assiette", 'info');
  }
});
