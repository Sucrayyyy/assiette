import { state, save, reset, addEntry, updateEntry, deleteEntry, pushRecent, logWeight } from './store.js';
import {
  ACTIVITIES, GOALS, MEALS, autoTargets, targets, itemMacros, itemsMacros, entriesOn, totalsOn,
  mealForNow, dayKey, dayDate, lastDays, dayLabel, streak, coachMessage, scale, n0, n1,
} from './nutrition.js';
import { SUGGESTIONS, searchGeneric } from './foods.js';
import { searchOff, searchCatalog, loadCatalog, productByBarcode } from './off.js';
import { analyzeMeal, preparePhoto } from './scanner.js';
import { esc, icon, COLORS, ring, macroRings, animateRings, chips, bar, stepper, toast } from './ui.js';

const $app = document.getElementById('app');
const $sheet = document.getElementById('sheet');
const $scan = document.getElementById('scan');
const $barcode = document.getElementById('barcode');

const ZXING_URL = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
let installPrompt = null;

const newSearch = () => ({ query: '', results: [], loading: false, error: '', timer: 0, controller: null });

const ui = {
  tab: 'today',
  day: dayKey(),
  animate: true,
  hintDismissed: localStorage.getItem('assiette.hint') === '1',
  tabSearch: newSearch(),
  sheet: null,
  scan: null,
  barcode: null,
  ob: { step: 0, firstName: '', sex: 'homme', age: 25, heightCm: 175, weightKg: 70, activity: 'modere', goal: 'maintien' },
};

const foodIndex = new Map();
const mealOf = (key) => MEALS.find((m) => m.key === key) || MEALS[0];
const foodTitle = (f) => (f.brand ? `${f.name} · ${f.brand}` : f.name);

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------

// L'animation d'entrée ne joue que quand l'écran change, pas à chaque mise à jour.
let shownView = '';
let shownSheet = null;
let shownScan = '';

function renderApp() {
  const view = state.profile ? `tab:${ui.tab}` : `ob:${ui.ob.step}`;
  if (!state.profile) {
    $app.innerHTML = onboardingView();
    animateRings($app);
  } else {
    $app.innerHTML = mainView();
    if (ui.animate) {
      animateRings($app);
      ui.animate = false;
    }
  }
  if (view !== shownView) $app.querySelector('.screen, .ob-body')?.classList.add('enter');
  shownView = view;
}

function mainView() {
  const views = { today: todayView, progress: progressView, add: addView, profile: profileView };
  return views[ui.tab]() + dockView();
}

function dockView() {
  const tab = (key, ico, label) =>
    `<button class="tab ${ui.tab === key ? 'active' : ''}" data-act="tab" data-tab="${key}">${ico}<span>${label}</span></button>`;
  return `<nav class="dock">
    <button class="accessory glass" data-act="open-scan">
      <span class="acc-icon">${icon.camera}</span>
      <div class="spacer"><b>Scanner mon assiette</b><small>L'IA remplit les macros pour toi</small></div>
      <span class="acc-icon">${icon.sparkles}</span>
    </button>
    <div class="tabs glass">
      ${tab('today', icon.sun, "Aujourd'hui")}${tab('progress', icon.chart, 'Progrès')}${tab('add', icon.search, 'Ajouter')}${tab('profile', icon.person, 'Profil')}
    </div>
  </nav>`;
}

// ---------- Aujourd'hui ----------

function todayView() {
  const p = state.profile;
  const g = targets();
  const t = totalsOn(ui.day);
  const entries = entriesOn(ui.day);
  const remaining = g.kcal - t.kcal;
  const s = streak();
  const hour = new Date().getHours();
  const greeting = hour >= 18 || hour < 5 ? 'Bonsoir' : 'Bonjour';
  const legend = (color, label, value, target, unit) => `<div class="legend-item">
      <div class="label"><span class="dot" style="--c:${color}"></span>${label}</div>
      <div class="value">${n0(value)} <span>/ ${n0(target)} ${unit}</span></div>
    </div>`;

  return `<main class="screen">
    <div class="header">
      <div><h1>${greeting} ${esc(p.firstName)}</h1><div class="subtitle">${esc(dayLabel(ui.day))}</div></div>
      <div class="streak glass ${s ? 'on' : ''}" aria-label="Série de ${s} jours">${icon.flame}<b>${s}</b></div>
    </div>
    ${installHintView()}
    ${weekView()}
    <section class="hero glass">
      <div class="hero-top">
        <div style="position:relative">
          ${macroRings(t, g, 150, 14, ui.animate)}
          <div class="rings-center"><b>${n0(Math.abs(remaining))}</b><small>${remaining >= 0 ? 'restantes' : 'en trop'}</small></div>
        </div>
        <div class="legend">
          ${legend('#FF6A4D', 'Calories', t.kcal, g.kcal, 'kcal')}
          ${legend('#4D7CFE', 'Protéines', t.protein, g.protein, 'g')}
          ${legend('#1FB57A', 'Fibres', t.fiber, g.fiber, 'g')}
        </div>
      </div>
      <div class="bars">${bar('Glucides', t.carbs, g.carbs, COLORS.carbs)}${bar('Lipides', t.fat, g.fat, COLORS.fat)}</div>
    </section>
    <div class="coach glass"><span class="badge">${icon.leaf}</span><span>${esc(coachMessage(t, g, entries.length > 0, ui.day === dayKey()))}</span></div>
    ${entries.length === 0 && ui.day === dayKey() ? `<button class="cta glass tinted" data-act="open-scan">
        ${icon.camera}<div class="spacer"><b>Scanner mon assiette</b><span>Une photo, et l'IA remplit tout</span></div>${icon.sparkles}
      </button>` : ''}
    ${MEALS.map((m) => mealCard(m, entries.filter((e) => e.meal === m.key))).join('')}
  </main>`;
}

function installHintView() {
  if (isStandalone || ui.hintDismissed) return '';
  if (installPrompt) {
    return `<div class="install-hint glass"><span class="icon-box">${icon.plus}</span>
      <div class="spacer"><b>Installe Assiette</b><br><span class="muted">Une icône sur ton écran d'accueil, comme une app.</span></div>
      <button class="pill glass" data-act="install">Installer</button></div>`;
  }
  if (isIOS) {
    return `<div class="install-hint glass"><span class="icon-box">${icon.share}</span>
      <div class="spacer"><b>Installe Assiette sur ton iPhone</b><br><span class="muted">Touche Partager ${icon.share.replace('width="22" height="22"', 'width="15" height="15"')} puis « Sur l'écran d'accueil ».</span></div>
      <button class="round" data-act="dismiss-hint" aria-label="Masquer">${icon.x}</button></div>`;
  }
  return '';
}

function weekView() {
  const goal = targets().kcal || 1;
  return `<div class="week">${lastDays(7)
    .map((day) => {
      const selected = day === ui.day;
      const d = dayDate(day);
      const letter = d.toLocaleDateString('fr-FR', { weekday: 'narrow' });
      const p = totalsOn(day).kcal / goal;
      return `<button class="day glass ${selected ? 'selected' : ''}" data-act="day" data-day="${day}">
        <small>${letter}</small>
        <div class="mini">${ring(p, selected ? ['#fff', '#fff'] : COLORS.kcal, 32, 4, { showEmpty: false })}<span>${d.getDate()}</span></div>
      </button>`;
    })
    .join('')}</div>`;
}

function mealCard(meal, entries) {
  const kcal = itemsMacros(entries.flatMap((e) => e.items)).kcal;
  return `<section class="meal glass">
    <div class="meal-head">
      <span class="emoji">${meal.icon}</span><h3>${meal.label}</h3>
      ${entries.length ? `<span class="kcal">${n0(kcal)} kcal</span>` : ''}
      <button class="round glass" data-act="add-meal" data-meal="${meal.key}" aria-label="Ajouter au ${meal.label}">${icon.plus}</button>
    </div>
    ${entries.map(entryRow).join('')}
  </section>`;
}

function entryRow(e) {
  const m = itemsMacros(e.items);
  const grams = e.items.reduce((s, i) => s + i.grams, 0);
  const ai = e.items.some((i) => i.source === 'ai');
  return `<button class="entry" data-act="open-entry" data-id="${e.id}">
    ${e.photo ? `<img class="thumb" src="${e.photo}" alt="">` : `<span class="thumb">${e.items[0]?.source === 'off' ? icon.box : icon.leaf}</span>`}
    <div class="info">
      <div class="name">${ai ? '✨ ' : ''}${esc(e.title)}</div>
      <div class="meta">${n0(grams)} g · P ${n0(m.protein)} g · Fib ${n1(m.fiber)} g</div>
    </div>
    <span class="num">${n0(m.kcal)}</span>
  </button>`;
}

// ---------- Progrès ----------

function progressView() {
  const g = targets();
  const days = lastDays(7);
  const stats = days.map((day) => ({ day, m: totalsOn(day) }));
  const logged = stats.filter((s) => s.m.kcal > 0);
  const avg = (key) => (logged.length ? logged.reduce((sum, s) => sum + s.m[key], 0) / logged.length : 0);
  const s = streak();
  const weight = state.weights.at(-1)?.kg ?? state.profile.weightKg;

  return `<main class="screen">
    <h1>Progrès</h1>
    <div class="stats">
      <div class="stat glass"><span style="color:#ff6a4d">${icon.flame}</span><b>${s}</b><span class="muted small">${s > 1 ? "jours d'affilée" : "jour d'affilée"}</span></div>
      <div class="stat glass"><span style="color:var(--accent)">${icon.check}</span><b>${logged.length}/7</b><span class="muted small">jours notés</span></div>
    </div>
    ${chartCard('Calories', `Moyenne ${n0(avg('kcal'))} kcal · objectif ${n0(g.kcal)}`, stats, 'kcal', g.kcal, COLORS.kcal)}
    ${chartCard('Protéines', `Moyenne ${n0(avg('protein'))} g · objectif ${n0(g.protein)} g`, stats, 'protein', g.protein, COLORS.protein)}
    ${chartCard('Fibres', `Moyenne ${n0(avg('fiber'))} g · objectif ${n0(g.fiber)} g`, stats, 'fiber', g.fiber, COLORS.fiber)}
    <section class="chart-card glass">
      <div class="row"><div class="spacer"><h2>Poids</h2><div class="big-kcal" style="font-size:28px;margin-top:4px">${n1(weight)} <span>kg</span></div></div>
        <button class="pill glass" data-act="open-weight">${icon.plus} Noter</button></div>
      ${state.weights.length >= 2 ? `<div class="chart">${weightChart(state.weights.slice(-30))}</div>`
        : `<p class="muted small" style="margin:0">Note ton poids régulièrement pour voir ta courbe. Tes objectifs s'ajustent tout seuls.</p>`}
    </section>
  </main>`;
}

function chartCard(title, subtitle, stats, key, goal, colors) {
  const W = 320;
  const H = 130;
  const left = 4;
  const max = Math.max(goal * 1.2, ...stats.map((s) => s.m[key]), 1);
  const bw = (W - left) / stats.length;
  const id = `bc-${key}`;
  const bars = stats
    .map((s, i) => {
      const h = (s.m[key] / max) * H;
      const x = left + i * bw + bw * 0.22;
      const label = dayDate(s.day).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
      return `<rect x="${x}" y="${H - h}" width="${bw * 0.56}" height="${h}" rx="6" fill="url(#${id})"/>
        <text x="${x + bw * 0.28}" y="${H + 18}" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.55">${label}</text>`;
    })
    .join('');
  const gy = H - (goal / max) * H;
  return `<section class="chart-card glass">
    <div><h2>${title}</h2><div class="muted small">${subtitle}</div></div>
    <div class="chart"><svg viewBox="0 0 ${W} ${H + 24}">
      <defs><linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[0]}"/></linearGradient></defs>
      <line x1="0" x2="${W}" y1="${H}" y2="${H}" stroke="currentColor" opacity="0.12"/>
      ${bars}
      <line x1="0" x2="${W}" y1="${gy}" y2="${gy}" stroke="currentColor" stroke-dasharray="5 4" opacity="0.45"/>
    </svg></div>
  </section>`;
}

function weightChart(weights) {
  const W = 320;
  const H = 120;
  const kgs = weights.map((w) => w.kg);
  const min = Math.min(...kgs) - 1;
  const max = Math.max(...kgs) + 1;
  const pts = weights.map((w, i) => [(i / Math.max(weights.length - 1, 1)) * (W - 12) + 6, H - ((w.kg - min) / (max - min)) * H]);
  return `<svg viewBox="0 0 ${W} ${H + 8}">
    <polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="var(--accent)"/>`).join('')}
  </svg>`;
}

// ---------- Ajouter (recherche) ----------

function addView() {
  loadCatalog().catch(() => {});
  return `<main class="screen"><h1>Ajouter</h1>${searchBlock(ui.tabSearch)}</main>`;
}

function searchBlock(s) {
  return `<div class="search-bar glass">${icon.search}
      <input type="search" data-search-input placeholder="Aliment, marque, plat…" value="${esc(s.query)}" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search">
      <button class="round glass" data-act="barcode" aria-label="Scanner un code-barres">${icon.barcode}</button>
    </div>
    <div data-search-results>${resultsMarkup(s)}</div>`;
}

function resultsMarkup(s) {
  const q = s.query.trim();
  const list = (title, foods) => (foods.length ? `${title ? `<div class="list-title">${title}</div>` : ''}<div class="list glass">${foods.map(foodRow).join('')}</div>` : '');
  if (q.length < 2) {
    return list('Récents', state.recents.slice(0, 12)) + list('Idées', SUGGESTIONS) +
      `<p class="muted small" style="text-align:center">Tape un aliment ou une marque, ou scanne un code-barres.</p>`;
  }
  return `${s.error ? `<div class="notice">${esc(s.error)}</div>` : ''}
    ${list('', s.results)}
    ${s.loading ? '<div class="spinner"></div>' : ''}
    ${!s.loading && !s.results.length ? `<div class="notice">Aucun résultat pour « ${esc(q)} »</div>` : ''}`;
}

function foodRow(f) {
  foodIndex.set(f.id, f);
  const origin = f.brand || (f.source === 'generic' ? 'Aliment de base' : '');
  const macros = `${n0(f.per100.kcal)} kcal · P ${n1(f.per100.protein)} g · Fib ${n1(f.per100.fiber)} g`;
  return `<button class="food" data-act="pick-food" data-id="${esc(f.id)}">
    ${f.imageUrl ? `<img src="${esc(f.imageUrl)}" alt="" loading="lazy">` : `<span class="ph">${f.source === 'off' ? icon.box : icon.leaf}</span>`}
    <div class="info"><div class="name">${esc(f.name)}</div><div class="meta">${esc(origin ? `${origin} · ${macros}` : `${macros} /100 g`)}</div></div>
    <span class="add">${icon.plus}</span>
  </button>`;
}

function runSearch(s, root) {
  clearTimeout(s.timer);
  s.controller?.abort();
  const q = s.query.trim();
  const refresh = () => {
    const el = root.querySelector('[data-search-results]');
    if (el) el.innerHTML = resultsMarkup(s);
  };
  const unique = (foods) => [...new Map(foods.map((f) => [f.id, f])).values()];
  s.error = '';
  if (q.length < 2) {
    s.results = [];
    s.loading = false;
    return refresh();
  }
  s.results = searchGeneric(q);
  s.loading = true;
  refresh();
  s.timer = setTimeout(async () => {
    const controller = new AbortController();
    s.controller = controller;
    // 1. Catalogue intégré (instantané), 2. recherche en ligne en complément.
    let fromCatalog = [];
    try {
      fromCatalog = await searchCatalog(q);
    } catch { /* catalogue pas encore chargé hors ligne */ }
    if (s.query.trim() !== q) return;
    s.results = unique([...searchGeneric(q), ...fromCatalog]);
    refresh();
    if (q.length >= 3) {
      try {
        const live = await searchOff(q, controller.signal);
        if (s.query.trim() !== q) return;
        s.results = unique([...s.results, ...live]);
      } catch (e) {
        if (e.name === 'AbortError') return;
        if (!s.results.length) s.error = 'Recherche en ligne indisponible pour le moment.';
      }
    }
    s.loading = false;
    refresh();
  }, 250);
}

// ---------- Profil ----------

function profileView() {
  const p = state.profile;
  const t = targets();
  const custom = !!p.customTargets;
  const select = (key, options) =>
    `<select class="input" data-pf="${key}">${options.map(([v, l]) => `<option value="${v}" ${String(p[key]) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const targetRow = (key, label, unit) =>
    custom
      ? `<label class="field"><span>${label} (${unit})</span><input class="input" type="number" inputmode="numeric" data-target="${key}" value="${Math.round(t[key])}"></label>`
      : `<div class="row" style="justify-content:space-between"><span>${label}</span><b>${n0(t[key])} ${unit}</b></div>`;

  return `<main class="screen">
    <h1>Profil</h1>
    <section class="card glass" style="display:flex;flex-direction:column;gap:12px">
      <label class="field"><span>Prénom</span><input class="input" data-pf="firstName" value="${esc(p.firstName)}" autocomplete="given-name"></label>
      <div class="grid2">
        <label class="field"><span>Sexe</span>${select('sex', [['homme', 'Homme'], ['femme', 'Femme']])}</label>
        <label class="field"><span>Âge</span><input class="input" type="number" inputmode="numeric" data-pf="age" value="${p.age}"></label>
        <label class="field"><span>Taille (cm)</span><input class="input" type="number" inputmode="numeric" data-pf="heightCm" value="${p.heightCm}"></label>
        <label class="field"><span>Poids (kg)</span><input class="input" type="number" inputmode="decimal" step="0.1" data-pf="weightKg" value="${p.weightKg}"></label>
      </div>
      <label class="field"><span>Activité</span>${select('activity', ACTIVITIES.map((a) => [a.key, a.label]))}</label>
      <label class="field"><span>Objectif</span>${select('goal', GOALS.map((g) => [g.key, g.label]))}</label>
    </section>
    <section class="card glass" style="display:flex;flex-direction:column;gap:12px">
      <h2>Mes objectifs par jour</h2>
      <div class="pills">
        <button class="pill glass ${custom ? '' : 'active'}" data-act="targets-mode" data-mode="auto">Calculés</button>
        <button class="pill glass ${custom ? 'active' : ''}" data-act="targets-mode" data-mode="custom">Personnalisés</button>
      </div>
      ${targetRow('kcal', 'Calories', 'kcal')}${targetRow('protein', 'Protéines', 'g')}${targetRow('fiber', 'Fibres', 'g')}
      ${targetRow('carbs', 'Glucides', 'g')}${targetRow('fat', 'Lipides', 'g')}
      <p class="muted small" style="margin:0">Calculés avec la formule de Mifflin-St Jeor selon ton profil et ton activité.</p>
    </section>
    <section class="card glass" style="display:flex;flex-direction:column;gap:12px">
      <h2>Scan IA</h2>
      <p class="muted small" style="margin:0">${state.apiKey ? '✅ Clé API enregistrée sur ce téléphone.' : "Le scan photo utilise Claude, l'IA d'Anthropic. Crée une clé sur console.anthropic.com et colle-la ici."}</p>
      <input class="input" type="password" data-apikey placeholder="${state.apiKey ? 'Remplacer la clé (sk-ant-…)' : 'Colle ta clé (sk-ant-…)'}" autocomplete="off" autocapitalize="off" spellcheck="false">
      <div class="grid2">
        <button class="btn btn-primary" data-act="save-key" style="font-size:15px;padding:12px">Enregistrer</button>
        ${state.apiKey ? '<button class="btn glass btn-danger" data-act="delete-key" style="font-size:15px;padding:12px">Supprimer</button>' : ''}
      </div>
    </section>
    <button class="btn glass btn-danger" data-act="reset">Réinitialiser l'app</button>
    <p class="muted small" style="text-align:center;margin:0">Aliments : Open Food Facts (licence ODbL) et valeurs moyennes de type CIQUAL.</p>
  </main>`;
}

// ---------- Bienvenue ----------

const OB_STEPS = 7;

function onboardingView() {
  const o = ui.ob;
  const options = (list, key) => `<div style="display:flex;flex-direction:column;gap:10px">${list
    .map((x) => `<button class="option glass ${o[key] === x.key ? 'active' : ''}" data-act="ob-pick" data-key="${key}" data-v="${x.key}">
        <span class="ico">${x.icon}</span><div class="spacer"><b>${x.label}</b><small>${x.detail}</small></div>${o[key] === x.key ? icon.check : ''}</button>`)
    .join('')}</div>`;
  const numSelect = (key, from, to, stepVal, unit) => {
    const opts = [];
    for (let v = from; v <= to + 1e-9; v += stepVal) {
      const val = Math.round(v * 10) / 10;
      opts.push(`<option value="${val}" ${Number(o[key]) === val ? 'selected' : ''}>${n1(val)} ${unit}</option>`);
    }
    return `<select class="input" data-ob="${key}">${opts.join('')}</select>`;
  };
  const question = (title, sub, body) => `<div class="ob-body"><h1>${title}</h1><p class="muted" style="margin:0">${sub}</p>${body}</div>`;

  let body;
  switch (o.step) {
    case 0:
      body = `<div class="ob-body center">
        <div style="position:relative">${macroRings({ kcal: 1700, protein: 90, fiber: 22 }, { kcal: 2200, protein: 110, fiber: 30 }, 170, 16, false)}
          <div class="rings-center" style="font-size:34px">🍽️</div></div>
        <h1 style="font-size:44px">Assiette</h1>
        <p class="muted" style="font-size:19px;margin:0;line-height:1.4">Prends ton plat en photo,<br>l'IA s'occupe des calories.</p>
        <div class="features glass">
          <div><span>📸</span>Scan IA de tes plats, ajustable en un geste</div>
          <div><span>🛒</span>Les produits vendus en France et le code-barres</div>
          <div><span>🎯</span>Calories, protéines et fibres sur mesure</div>
        </div>
      </div>`;
      break;
    case 1:
      body = question('Comment tu t\'appelles ?', 'Pour te dire bonjour comme il faut.',
        `<input class="input glass name-input" data-ob="firstName" value="${esc(o.firstName)}" placeholder="Ton prénom" autocomplete="given-name" enterkeyhint="next">`);
      break;
    case 2:
      body = question(`Enchanté ${esc(o.firstName)} !`, 'Ton sexe et ton âge servent à calculer ton métabolisme.',
        `<div class="pills">${[['homme', 'Homme'], ['femme', 'Femme']].map(([v, l]) => `<button class="pill glass ${o.sex === v ? 'active' : ''}" data-act="ob-pick" data-key="sex" data-v="${v}" style="flex:1">${l}</button>`).join('')}</div>
         <label class="field"><span>Âge</span>${numSelect('age', 14, 100, 1, 'ans')}</label>`);
      break;
    case 3:
      body = question('Ta taille et ton poids', 'Tu pourras les mettre à jour quand tu veux.',
        `<div class="grid2"><label class="field"><span>Taille</span>${numSelect('heightCm', 130, 220, 1, 'cm')}</label>
         <label class="field"><span>Poids</span>${numSelect('weightKg', 35, 200, 0.5, 'kg')}</label></div>`);
      break;
    case 4:
      body = question("Ton niveau d'activité", "Sois honnête, c'est entre nous.", options(ACTIVITIES, 'activity'));
      break;
    case 5:
      body = question('Ton objectif', 'On adapte tes calories et tes protéines.', options(GOALS, 'goal'));
      break;
    default: {
      const t = autoTargets(o);
      const row = (c, l, v) => `<div class="row" style="justify-content:space-between"><span class="row"><span class="dot" style="--c:${c}"></span>${l}</span><b>${v}</b></div>`;
      body = `<div class="ob-body center">
        <h1>Tes objectifs, ${esc(o.firstName)}</h1>
        ${macroRings(t, t, 180, 17, true)}
        <div class="features glass">
          ${row('#FF6A4D', 'Calories', `${n0(t.kcal)} kcal`)}${row('#4D7CFE', 'Protéines', `${n0(t.protein)} g`)}${row('#1FB57A', 'Fibres', `${n0(t.fiber)} g`)}
          ${row(COLORS.carbs, 'Glucides', `${n0(t.carbs)} g`)}${row(COLORS.fat, 'Lipides', `${n0(t.fat)} g`)}
        </div>
        <p class="muted small" style="margin:0">Calculés avec la formule de Mifflin-St Jeor. Modifiables dans ton profil.</p>
      </div>`;
    }
  }
  const label = o.step === 0 ? 'Commencer' : o.step === OB_STEPS - 1 ? "C'est parti" : 'Continuer';
  const disabled = o.step === 1 && !o.firstName.trim();
  return `<div class="onboarding">
    ${o.step > 0 ? `<div class="ob-top"><button class="round glass" data-act="ob-back" aria-label="Retour">${icon.back}</button>
      <div class="progress"><div style="width:${(o.step / (OB_STEPS - 1)) * 100}%"></div></div></div>` : ''}
    ${body}
    <button class="btn btn-primary" data-act="ob-next" ${disabled ? 'disabled' : ''}>${label}</button>
  </div>`;
}

// ---------------------------------------------------------------------------
// Feuilles
// ---------------------------------------------------------------------------

function renderSheet() {
  const sh = ui.sheet;
  if (!sh) {
    $sheet.innerHTML = '';
    shownSheet = null;
    return;
  }
  let content;
  let tall = false;
  if ((sh.type === 'search' && sh.food) || sh.type === 'portion') content = portionView(sh);
  else if (sh.type === 'search') {
    tall = true;
    const title = sh.mode === 'pick' ? (sh.index >= 0 ? "C'est plutôt…" : 'Ajouter un ingrédient') : mealOf(sh.meal).label;
    content = `<div class="sheet-head"><h2>${esc(title)}</h2><button class="round glass" data-act="close-sheet" aria-label="Fermer">${icon.x}</button></div>${searchBlock(sh.search)}`;
  } else if (sh.type === 'entry') content = entryView(sh);
  else if (sh.type === 'weight') content = weightView(sh);
  const enter = shownSheet !== sh ? 'enter' : '';
  shownSheet = sh;
  $sheet.innerHTML = `<div class="backdrop ${enter}" data-act="close-sheet"></div><div class="sheet ${tall ? 'tall' : ''} ${enter}"><div class="grabber"></div>${content}</div>`;
  if (sh.type === 'search' && !sh.food && !sh.focused) {
    sh.focused = true;
    $sheet.querySelector('[data-search-input]')?.focus();
  }
}

function portionView(sh) {
  const f = sh.food;
  const m = scale(f.per100, sh.grams);
  const presets = [...(f.servingG ? [[`${f.servingLabel || '1 portion'} · ${n0(f.servingG)} g`, f.servingG]] : []), ['50 g', 50], ['100 g', 100], ['150 g', 150], ['200 g', 200], ['250 g', 250]];
  const back = sh.type === 'search' ? `<button class="round glass" data-act="portion-back" aria-label="Retour">${icon.back}</button>` : '';
  return `<div class="sheet-head">${back}<div class="spacer"><h2>${esc(f.name)}</h2>${f.brand ? `<div class="muted small">${esc(f.brand)}</div>` : ''}</div>
      <button class="round glass" data-act="close-sheet" aria-label="Fermer">${icon.x}</button></div>
    <div class="big-kcal" data-live-kcal>${n0(m.kcal)} <span>kcal</span></div>
    <div data-live-chips>${chips(m)}</div>
    ${stepper(sh.grams, 'portion-step', 'data-portion')}
    <div class="pills">${presets.map(([l, g]) => `<button class="pill glass ${Math.round(sh.grams) === Math.round(g) ? 'active' : ''}" data-act="portion-preset" data-g="${g}">${esc(l)}</button>`).join('')}</div>
    ${sh.mode === 'log' ? `<div class="field"><span>Repas</span>${mealPicker(sh.meal, 'portion-meal')}</div>` : ''}
    <button class="btn btn-primary" data-act="portion-confirm">${sh.mode === 'pick' ? 'Utiliser cet aliment' : 'Ajouter au journal'}</button>`;
}

function mealPicker(current, act) {
  return `<div class="meals">${MEALS.map((m) => `<button class="glass ${current === m.key ? 'active' : ''}" data-act="${act}" data-meal="${m.key}"><span>${m.icon}</span>${m.short}</button>`).join('')}</div>`;
}

function entryView(sh) {
  const e = sh.entry;
  return `<div class="sheet-head"><h2 class="spacer">Modifier</h2><button class="round glass" data-act="close-sheet" aria-label="Fermer">${icon.x}</button></div>
    ${e.photo ? `<img src="${e.photo}" alt="" style="width:100%;height:170px;object-fit:cover;border-radius:24px">` : ''}
    <input class="input" data-entry-title value="${esc(e.title)}">
    <div data-live-chips>${chips(itemsMacros(e.items))}</div>
    ${e.items.map((it, i) => `<div class="ingredient glass">
        <div class="row"><b class="spacer">${esc(it.name)}</b><span class="num" data-item-kcal="${i}">${n0(itemMacros(it).kcal)} kcal</span></div>
        ${stepper(it.grams, 'entry-step', `data-i="${i}"`)}
      </div>`).join('')}
    <div class="field"><span>Repas</span>${mealPicker(e.meal, 'entry-meal')}</div>
    <button class="btn btn-primary" data-act="entry-save">Enregistrer</button>
    <button class="btn glass btn-danger" data-act="entry-delete">${icon.trash} Supprimer du journal</button>`;
}

function weightView(sh) {
  return `<div class="sheet-head"><h2 class="spacer">Mon poids aujourd'hui</h2><button class="round glass" data-act="close-sheet" aria-label="Fermer">${icon.x}</button></div>
    <label class="field"><span>Poids (kg)</span><input class="input" type="number" inputmode="decimal" step="0.1" data-weight value="${sh.kg}" style="font-size:28px;font-weight:800;text-align:center"></label>
    <button class="btn btn-primary" data-act="weight-save">Enregistrer</button>`;
}

function openSheet(sheet) {
  ui.sheet = sheet;
  renderSheet();
}

function closeSheet() {
  if (ui.sheet?.search) {
    clearTimeout(ui.sheet.search.timer);
    ui.sheet.search.controller?.abort();
  }
  ui.sheet = null;
  renderSheet();
}

function openSearchSheet(opts) {
  loadCatalog().catch(() => {});
  const search = newSearch();
  search.query = opts.query || '';
  openSheet({ type: 'search', search, food: null, ...opts });
  if (search.query) runSearch(search, $sheet);
}

function openPortion(food, fromSheet) {
  const initial = ui.sheet?.mode === 'pick' && ui.sheet.grams ? ui.sheet.grams : food.servingG || 100;
  if (fromSheet && ui.sheet) {
    ui.sheet.food = food;
    ui.sheet.grams = Math.round(initial);
    if (ui.sheet.mode === 'log' && !ui.sheet.meal) ui.sheet.meal = mealForNow();
    renderSheet();
  } else {
    openSheet({ type: 'portion', mode: 'log', food, grams: Math.round(food.servingG || 100), meal: mealForNow() });
  }
}

function updatePortionLive() {
  const sh = ui.sheet;
  const m = scale(sh.food.per100, sh.grams);
  $sheet.querySelector('[data-live-kcal]').innerHTML = `${n0(m.kcal)} <span>kcal</span>`;
  $sheet.querySelector('[data-live-chips]').innerHTML = chips(m);
}

function updateEntryLive() {
  const e = ui.sheet.entry;
  $sheet.querySelector('[data-live-chips]').innerHTML = chips(itemsMacros(e.items));
  e.items.forEach((it, i) => {
    const el = $sheet.querySelector(`[data-item-kcal="${i}"]`);
    if (el) el.textContent = `${n0(itemMacros(it).kcal)} kcal`;
  });
}

// ---------------------------------------------------------------------------
// Scan IA
// ---------------------------------------------------------------------------

const ANALYZING_STEPS = ['Je repère les aliments…', "J'estime les portions…", 'Je calcule les macros…', 'Presque fini…'];
let analyzingTimer;

function renderScan() {
  clearInterval(analyzingTimer);
  const sc = ui.scan;
  if (!sc) {
    $scan.innerHTML = '';
    document.body.style.overflow = '';
    shownScan = '';
    return;
  }
  document.body.style.overflow = 'hidden';
  const scrollTop = $scan.querySelector('.layer')?.scrollTop || 0;
  const enter = shownScan !== sc.stage;
  shownScan = sc.stage;

  if (sc.stage === 'pick') {
    $scan.innerHTML = `<div class="layer scan-pick">
      <div class="scan-top"><span class="pill dark-glass">Cadre ton assiette</span>
        <button class="round dark-glass" data-act="close-scan" aria-label="Fermer">${icon.x}</button></div>
      <div class="frame"><div class="emoji">📸</div><h2>Prends ton plat en photo</h2>
        <p>L'IA reconnaît chaque aliment, estime les quantités et remplit les macros. Tu pourras ajuster ensuite.</p></div>
      <div class="shutter-row">
        <button class="side-btn dark-glass" data-act="scan-library" aria-label="Choisir une photo">${icon.photo}</button>
        <button class="shutter" data-act="scan-camera" aria-label="Prendre la photo"></button>
        <span style="width:56px"></span>
      </div>
    </div>`;
  } else if (sc.stage === 'analyzing') {
    let i = 0;
    $scan.innerHTML = `<div class="layer analyzing" style="background-image:url('${sc.photo.dataUrl}')">
      <div class="sweep"></div>
      <div class="status-pill dark-glass"><span class="pulse">${icon.sparkles}</span><span data-step>${ANALYZING_STEPS[0]}</span></div>
    </div>`;
    analyzingTimer = setInterval(() => {
      i = Math.min(i + 1, ANALYZING_STEPS.length - 1);
      const el = $scan.querySelector('[data-step]');
      if (el) el.textContent = ANALYZING_STEPS[i];
    }, 2200);
  } else {
    $scan.innerHTML = reviewView(sc);
    $scan.querySelector('.layer').scrollTop = enter ? 0 : scrollTop;
  }
  if (enter) $scan.querySelector('.layer')?.classList.add('enter');
}

function reviewView(sc) {
  const r = sc.result;
  const total = itemsMacros(r.items);
  const confColor = { haute: '#1FB57A', moyenne: '#F2A93B', faible: '#FF6A4D' };
  return `<div class="layer"><div class="review ${sc.busy ? 'busy' : ''}">
    <div class="row"><button class="round glass" data-act="close-scan" aria-label="Fermer">${icon.x}</button>
      <h2 class="spacer" style="text-align:center">${sc.busy ? "L'IA réajuste…" : 'Ton assiette'}</h2><span style="width:36px"></span></div>
    <div class="review-photo"><img src="${sc.photo.dataUrl}" alt="">
      <button class="retake dark-glass" data-act="scan-retake">${icon.camera} Reprendre</button></div>
    <section class="card glass" style="display:flex;flex-direction:column;gap:10px">
      <input class="dish-input" data-dish value="${esc(r.dish)}">
      <div class="big-kcal"><span class="kcal-grad" style="font-size:46px;color:transparent">${n0(total.kcal)}</span> <span>kcal</span></div>
      ${chips(total)}
      ${r.notes ? `<p class="muted small" style="margin:0">ℹ️ ${esc(r.notes)}</p>` : ''}
    </section>
    <div class="row"><h2 class="spacer" style="font-size:17px">Ingrédients détectés</h2><span class="muted small">Ajuste si besoin</span></div>
    ${r.items.map((it, i) => `<div class="ingredient glass">
        <div class="top"><span class="conf" style="background:${confColor[it.confidence] || '#999'}" title="Confiance ${esc(it.confidence || '')}"></span>
          <input data-ing-name="${i}" value="${esc(it.name)}">
          <button class="round glass" data-act="ing-remove" data-i="${i}" aria-label="Supprimer" style="width:32px;height:32px">${icon.x}</button></div>
        <div class="row">${stepper(it.grams, 'ing-step', `data-i="${i}"`)}<span class="spacer"></span><b>${n0(itemMacros(it).kcal)} kcal</b></div>
        ${chips(itemMacros(it), false)}
        <button class="link" data-act="ing-swap" data-i="${i}">${icon.swap} C'est autre chose</button>
      </div>`).join('')}
    <button class="btn glass" data-act="ing-add">${icon.plus} Ajouter un ingrédient</button>
    <section class="card glass" style="display:flex;flex-direction:column;gap:10px">
      <div class="link" style="font-size:17px">${icon.sparkles} Corriger avec l'IA</div>
      <p class="muted small" style="margin:0">Dis-lui ce qui ne va pas, elle réajuste tout le plat.</p>
      <textarea class="input" data-correction placeholder="Ex : le blanc c'est du riz complet, la sauce c'est de la crème légère, il y avait 2 œufs">${esc(sc.correction)}</textarea>
      <button class="btn glass" data-act="scan-reanalyze">↻ Réanalyser</button>
    </section>
    <div class="field"><span>Repas</span>${mealPicker(sc.meal, 'scan-meal')}</div>
  </div>
  <div class="fixed-bottom"><button class="btn btn-primary" data-act="scan-save" ${r.items.length && !sc.busy ? '' : 'disabled'}>${icon.check} Ajouter au journal</button></div>
  </div>`;
}

async function handlePhoto(file) {
  if (!file || !ui.scan) return;
  try {
    ui.scan.photo = await preparePhoto(file);
  } catch (e) {
    alert(e.message);
    return;
  }
  ui.scan.stage = 'analyzing';
  ui.scan.result = null;
  renderScan();
  await runAnalysis();
}

async function runAnalysis(correction) {
  const sc = ui.scan;
  try {
    const result = await analyzeMeal(sc.photo.base64, correction ? { previous: sc.result, correction } : {});
    if (ui.scan !== sc) return;
    sc.result = result;
    sc.stage = 'review';
    sc.correction = '';
    navigator.vibrate?.(20);
  } catch (e) {
    if (ui.scan !== sc) return;
    alert(e.message);
    if (!sc.result) sc.stage = 'pick';
  }
  sc.busy = false;
  renderScan();
}

// ---------------------------------------------------------------------------
// Code-barres
// ---------------------------------------------------------------------------

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Chargement impossible'));
    document.head.append(s);
  });
}

async function openBarcode(fromSheet) {
  ui.barcode = { fromSheet };
  $barcode.innerHTML = `<div class="layer">
    <video playsinline muted autoplay></video><div class="aim"></div>
    <div class="barcode-ui">
      <div class="row"><span class="pill dark-glass spacer" data-cam-msg>Vise le code-barres du produit</span>
        <button class="round dark-glass" data-act="close-barcode" aria-label="Fermer">${icon.x}</button></div>
      <form data-form="barcode"><input class="input dark-glass" name="code" inputmode="numeric" placeholder="Ou tape le code" style="flex:1">
        <button class="pill dark-glass" type="submit">OK</button></form>
    </div></div>`;
  const video = $barcode.querySelector('video');
  const b = ui.barcode;
  try {
    if ('BarcodeDetector' in window) {
      const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      b.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = b.stream;
      await video.play();
      const loop = async () => {
        if (ui.barcode !== b) return;
        try {
          const codes = await detector.detect(video);
          if (codes[0]) return onBarcode(codes[0].rawValue);
        } catch { /* image pas prête */ }
        requestAnimationFrame(loop);
      };
      loop();
    } else {
      if (!window.ZXing) await loadScript(ZXING_URL);
      if (ui.barcode !== b) return;
      b.reader = new window.ZXing.BrowserMultiFormatReader();
      await b.reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, video, (result) => {
        if (result && ui.barcode === b) onBarcode(result.getText());
      });
    }
  } catch {
    const msg = $barcode.querySelector('[data-cam-msg]');
    if (msg) msg.textContent = 'Caméra indisponible : tape le code ci-dessous.';
  }
}

function closeBarcode() {
  const b = ui.barcode;
  if (!b) return;
  try { b.reader?.reset(); } catch { /* déjà arrêté */ }
  b.stream?.getTracks().forEach((t) => t.stop());
  ui.barcode = null;
  $barcode.innerHTML = '';
}

async function onBarcode(code) {
  const fromSheet = ui.barcode?.fromSheet;
  closeBarcode();
  navigator.vibrate?.(30);
  toast('Recherche du produit…');
  try {
    const food = await productByBarcode(code.trim());
    if (food) openPortion(food, fromSheet);
    else alert(`Le code ${code} n'est pas dans Open Food Facts. Cherche le produit par son nom.`);
  } catch {
    alert('Impossible de contacter Open Food Facts.');
  }
}

// ---------------------------------------------------------------------------
// Événements
// ---------------------------------------------------------------------------

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  const inSheet = !!el.closest('#sheet');
  const sh = ui.sheet;
  const sc = ui.scan;
  const i = Number(el.dataset.i);

  switch (act) {
    // Navigation
    case 'tab':
      ui.tab = el.dataset.tab;
      ui.animate = ui.tab === 'today';
      renderApp();
      window.scrollTo(0, 0);
      break;
    case 'day':
      ui.day = el.dataset.day;
      ui.animate = true;
      renderApp();
      break;
    case 'dismiss-hint':
      ui.hintDismissed = true;
      localStorage.setItem('assiette.hint', '1');
      renderApp();
      break;
    case 'install':
      installPrompt?.prompt();
      installPrompt = null;
      renderApp();
      break;

    // Bienvenue
    case 'ob-pick':
      ui.ob[el.dataset.key] = el.dataset.v;
      renderApp();
      break;
    case 'ob-back':
      ui.ob.step = Math.max(0, ui.ob.step - 1);
      renderApp();
      break;
    case 'ob-next': {
      const o = ui.ob;
      if (o.step < OB_STEPS - 1) {
        o.step++;
        renderApp();
        if (o.step === 1) $app.querySelector('[data-ob="firstName"]')?.focus();
        break;
      }
      state.profile = {
        firstName: o.firstName.trim(), sex: o.sex, age: Number(o.age), heightCm: Number(o.heightCm),
        weightKg: Number(o.weightKg), activity: o.activity, goal: o.goal, customTargets: null,
      };
      logWeight(Number(o.weightKg), dayKey());
      ui.animate = true;
      renderApp();
      break;
    }

    // Journal
    case 'add-meal':
      openSearchSheet({ mode: 'log', meal: el.dataset.meal });
      break;
    case 'open-entry': {
      const entry = state.entries.find((x) => x.id === el.dataset.id);
      if (entry) openSheet({ type: 'entry', entry: structuredClone(entry) });
      break;
    }
    case 'entry-step': {
      const it = sh.entry.items[i];
      it.grams = Math.max(0, it.grams + Number(el.dataset.delta));
      el.parentElement.querySelector('[data-grams]').value = Math.round(it.grams);
      updateEntryLive();
      break;
    }
    case 'entry-meal':
      sh.entry.meal = el.dataset.meal;
      renderSheet();
      break;
    case 'entry-save':
      updateEntry(sh.entry);
      closeSheet();
      renderApp();
      toast('Modifié ✓');
      break;
    case 'entry-delete':
      if (confirm(`Supprimer « ${sh.entry.title} » du journal ?`)) {
        deleteEntry(sh.entry.id);
        closeSheet();
        renderApp();
      }
      break;
    case 'open-weight':
      openSheet({ type: 'weight', kg: state.weights.at(-1)?.kg ?? state.profile.weightKg });
      break;
    case 'weight-save': {
      const kg = Number(String($sheet.querySelector('[data-weight]').value).replace(',', '.'));
      if (kg > 20 && kg < 400) {
        logWeight(kg, dayKey());
        closeSheet();
        renderApp();
        toast('Poids noté ✓');
      }
      break;
    }

    // Recherche et portions
    case 'pick-food': {
      const food = foodIndex.get(el.dataset.id);
      if (food) openPortion(food, inSheet);
      break;
    }
    case 'barcode':
      openBarcode(inSheet);
      break;
    case 'close-barcode':
      closeBarcode();
      break;
    case 'portion-back':
      sh.food = null;
      sh.focused = true;
      renderSheet();
      break;
    case 'portion-step':
      sh.grams = Math.max(0, sh.grams + Number(el.dataset.delta));
      $sheet.querySelector('[data-grams]').value = Math.round(sh.grams);
      updatePortionLive();
      break;
    case 'portion-preset':
      sh.grams = Number(el.dataset.g);
      renderSheet();
      break;
    case 'portion-meal':
      sh.meal = el.dataset.meal;
      renderSheet();
      break;
    case 'portion-confirm': {
      const f = sh.food;
      if (sh.grams <= 0) break;
      pushRecent(f);
      if (sh.mode === 'pick') {
        const item = { name: f.name, brand: f.brand, grams: sh.grams, per100: f.per100, source: f.source, confidence: 'haute' };
        if (sh.index >= 0) ui.scan.result.items[sh.index] = item;
        else ui.scan.result.items.push(item);
        closeSheet();
        renderScan();
      } else {
        addEntry({ day: ui.day, meal: sh.meal, title: foodTitle(f), items: [{ name: f.name, brand: f.brand, grams: sh.grams, per100: f.per100, source: f.source }] });
        closeSheet();
        renderApp();
        toast('Ajouté au journal ✓');
      }
      break;
    }
    case 'close-sheet':
      closeSheet();
      break;

    // Scan IA
    case 'open-scan':
      ui.scan = { stage: 'pick', meal: mealForNow(), correction: '', busy: false };
      renderScan();
      break;
    case 'close-scan':
      ui.scan = null;
      renderScan();
      break;
    case 'scan-camera':
      document.getElementById('photo-camera').click();
      break;
    case 'scan-library':
      document.getElementById('photo-library').click();
      break;
    case 'scan-retake':
      sc.stage = 'pick';
      sc.result = null;
      renderScan();
      break;
    case 'ing-step':
      sc.result.items[i].grams = Math.max(0, sc.result.items[i].grams + Number(el.dataset.delta));
      renderScan();
      break;
    case 'ing-remove':
      sc.result.items.splice(i, 1);
      renderScan();
      break;
    case 'ing-swap': {
      const it = sc.result.items[i];
      openSearchSheet({ mode: 'pick', index: i, grams: it.grams, query: it.name });
      break;
    }
    case 'ing-add':
      openSearchSheet({ mode: 'pick', index: -1 });
      break;
    case 'scan-meal':
      sc.meal = el.dataset.meal;
      renderScan();
      break;
    case 'scan-reanalyze':
      if (!sc.correction.trim()) {
        $scan.querySelector('[data-correction]')?.focus();
        break;
      }
      sc.busy = true;
      renderScan();
      runAnalysis(sc.correction);
      break;
    case 'scan-save': {
      const r = sc.result;
      addEntry({
        day: ui.day,
        meal: sc.meal,
        title: r.dish || 'Mon assiette',
        items: r.items.map(({ confidence, ...item }) => item),
        photo: sc.photo.thumb,
      });
      ui.scan = null;
      renderScan();
      ui.tab = 'today';
      ui.animate = true;
      renderApp();
      toast('Ajouté au journal ✓');
      break;
    }

    // Profil
    case 'targets-mode':
      state.profile.customTargets = el.dataset.mode === 'custom' ? autoTargets(state.profile) : null;
      save();
      renderApp();
      break;
    case 'save-key': {
      const key = $app.querySelector('[data-apikey]').value.trim();
      if (!key) break;
      state.apiKey = key;
      save();
      renderApp();
      toast('Clé enregistrée ✓');
      break;
    }
    case 'delete-key':
      state.apiKey = '';
      save();
      renderApp();
      break;
    case 'reset':
      if (confirm('Tout effacer ? Ton profil et ton journal seront supprimés.')) {
        reset();
        ui.ob.step = 0;
        ui.tab = 'today';
        renderApp();
      }
      break;
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.matches('[data-search-input]')) {
    const inSheet = !!t.closest('#sheet');
    const s = inSheet ? ui.sheet.search : ui.tabSearch;
    s.query = t.value;
    runSearch(s, inSheet ? $sheet : $app);
  } else if (t.matches('[data-ob="firstName"]')) {
    ui.ob.firstName = t.value;
    const btn = $app.querySelector('[data-act="ob-next"]');
    if (btn) btn.disabled = !t.value.trim();
  } else if (t.matches('[data-grams]')) {
    const g = Math.max(0, Number(t.value) || 0);
    if (t.hasAttribute('data-portion')) {
      ui.sheet.grams = g;
      updatePortionLive();
    } else if (t.closest('#sheet') && ui.sheet?.type === 'entry') {
      ui.sheet.entry.items[Number(t.dataset.i)].grams = g;
      updateEntryLive();
    } else if (ui.scan?.result) {
      ui.scan.result.items[Number(t.dataset.i)].grams = g;
    }
  } else if (t.matches('[data-entry-title]')) {
    ui.sheet.entry.title = t.value;
  } else if (t.matches('[data-dish]')) {
    ui.scan.result.dish = t.value;
  } else if (t.matches('[data-ing-name]')) {
    ui.scan.result.items[Number(t.dataset.ingName)].name = t.value;
  } else if (t.matches('[data-correction]')) {
    ui.scan.correction = t.value;
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'photo-camera' || t.id === 'photo-library') {
    handlePhoto(t.files[0]);
    t.value = '';
  } else if (t.matches('[data-ob]') && t.dataset.ob !== 'firstName') {
    ui.ob[t.dataset.ob] = Number(t.value);
  } else if (t.matches('[data-pf]')) {
    const key = t.dataset.pf;
    const numeric = ['age', 'heightCm', 'weightKg'].includes(key);
    const value = numeric ? Number(String(t.value).replace(',', '.')) : t.value.trim();
    if ((numeric && value > 0) || (!numeric && value)) {
      state.profile[key] = value;
      save();
      renderApp();
    }
  } else if (t.matches('[data-target]')) {
    state.profile.customTargets[t.dataset.target] = Math.max(0, Number(t.value) || 0);
    save();
  } else if (t.matches('[data-grams]') && ui.scan?.result && !t.closest('#sheet')) {
    renderScan();
  }
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-form="barcode"]');
  if (!form) return;
  e.preventDefault();
  const code = form.elements.code.value.replace(/\D/g, '');
  if (code.length >= 8) onBarcode(code);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('[data-ob="firstName"]') && e.target.value.trim()) {
    $app.querySelector('[data-act="ob-next"]')?.click();
  }
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  if (state.profile && ui.tab === 'today') renderApp();
});

// Nouveau jour pendant que l'app est ouverte.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.profile && !ui.sheet && !ui.scan) renderApp();
});

renderApp();
