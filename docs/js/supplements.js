import { state, save, addEntry, deleteEntry, uid } from './store.js';
import { dayKey, dayDate, shiftDay, mealForNow, n0 } from './nutrition.js';
import { esc, icon, haptic, tone, toast, confetti } from './ui.js';
import { act, openPanel, refreshPanel, closePanel, panelHead } from './panel.js';
import { PUSH_URL, VAPID_PUBLIC } from './config.js';
import './reminder-copy.js';

// Compléments courants : doses indicatives, à ajuster selon ton produit.
const CATALOG = [
  { name: 'Créatine', dose: '5', unit: 'g', kind: 'scoop' },
  { name: 'Whey', dose: '30', unit: 'g', kind: 'scoop', per100: { kcal: 400, protein: 78, carbs: 8, fat: 6, fiber: 0 } },
  { name: 'Vitamine D3', dose: '1', unit: 'gélule', kind: 'capsule' },
  { name: 'Oméga-3', dose: '2', unit: 'gélules', kind: 'capsule' },
  { name: 'Magnésium', dose: '1', unit: 'comprimé', kind: 'pill' },
  { name: 'Multivitamines', dose: '1', unit: 'comprimé', kind: 'pill' },
  { name: 'Zinc', dose: '1', unit: 'comprimé', kind: 'pill' },
  { name: 'Vitamine C', dose: '1', unit: 'comprimé', kind: 'pill' },
  { name: 'Vitamine B12', dose: '1', unit: 'comprimé', kind: 'pill' },
  { name: 'Fer', dose: '1', unit: 'comprimé', kind: 'pill' },
  { name: 'Collagène', dose: '10', unit: 'g', kind: 'scoop', per100: { kcal: 360, protein: 90, carbs: 0, fat: 0, fiber: 0 } },
  { name: 'Pré-workout', dose: '1', unit: 'dose', kind: 'scoop' },
  { name: 'Caféine', dose: '1', unit: 'gélule', kind: 'capsule' },
  { name: 'BCAA', dose: '5', unit: 'g', kind: 'scoop' },
  { name: 'Électrolytes', dose: '1', unit: 'dose', kind: 'drop' },
  { name: 'Probiotiques', dose: '1', unit: 'gélule', kind: 'capsule' },
  { name: 'Ashwagandha', dose: '1', unit: 'gélule', kind: 'capsule' },
  { name: 'Mélatonine', dose: '1', unit: 'comprimé', kind: 'pill' },
];
const KINDS = [['pill', 'Comprimé'], ['capsule', 'Gélule'], ['scoop', 'Poudre'], ['drop', 'Liquide']];
const WEEK = [[1, 'L'], [2, 'M'], [3, 'M'], [4, 'J'], [5, 'V'], [6, 'S'], [0, 'D']];
const STOCK_LOW = 7;

let rerender = () => {};
let justTaken = '';

// ---------------------------------------------------------------------------
// Calculs
// ---------------------------------------------------------------------------

export const dueOn = (day) => state.supps.filter((s) => !s.days?.length || s.days.includes(dayDate(day).getDay()));
const logOf = (day) => state.suppLog[day] || {};
export const pendingOn = (day) => dueOn(day).filter((s) => !logOf(day)[s.id]);
export const allTakenOn = (day) => dueOn(day).length > 0 && pendingOn(day).length === 0;

/** Jours d'affilée avec tous les compléments pris (les jours sans prise prévue ne cassent pas la série). */
export function suppStreak() {
  let day = allTakenOn(dayKey()) ? dayKey() : shiftDay(dayKey(), -1);
  let n = 0;
  for (let i = 0; i < 400; i++) {
    if (dueOn(day).length) {
      if (!allTakenOn(day)) break;
      n++;
    }
    day = shiftDay(day, -1);
  }
  return n;
}

export const currentTier = (d = new Date()) => self.reminderTier(d.getHours());

// ---------------------------------------------------------------------------
// Carte de l'écran Aujourd'hui
// ---------------------------------------------------------------------------

const scheduleLabel = (s) => {
  if (!s.days?.length || s.days.length === 7) return 'Tous les jours';
  return WEEK.filter(([d]) => s.days.includes(d)).map(([, l]) => l).join(' ');
};

export function suppCard(day) {
  if (!state.supps.length) {
    return `<button class="supp-invite glass" data-x="supp-open"><span class="icon-chip">${icon.pill}</span>
      <div class="spacer"><b>Mes compléments</b><small>Créatine, vitamines… avec des rappels à 16 h, 18 h et 20 h</small></div>${icon.plus}</button>`;
  }
  const due = dueOn(day);
  if (!due.length) return '';
  const pending = pendingOn(day);
  const isToday = day === dayKey();
  const tier = isToday && pending.length ? currentTier() : 0;
  const streak = suppStreak();
  const message = !pending.length
    ? (streak > 1 ? `Tout est pris. ${streak} jours d'affilée !` : 'Tout est pris, bien joué.')
    : tier === 3 ? "Dernière chance aujourd'hui, prends-les maintenant"
    : tier === 2 ? `18 h passées : il en reste ${pending.length}, c'est le moment`
    : tier === 1 ? `Il est plus de 16 h, pense à en prendre ${pending.length === 1 ? 'le dernier' : `les ${pending.length}`}`
    : `${due.length - pending.length} sur ${due.length} pris aujourd'hui`;
  const low = due.filter((s) => s.stock != null && s.stock <= STOCK_LOW);
  const html = `<section class="supp-card glass tier-${tier} ${pending.length ? '' : 'done'}">
    <div class="supp-head">
      <button class="icon-chip supp-bell" data-x="supp-open" aria-label="Gérer mes compléments">${tier ? icon.bell : pending.length ? icon.pill : icon.check}</button>
      <button class="spacer supp-title" data-x="supp-open"><b>Compléments</b><small>${esc(message)}</small></button>
      <span class="supp-count"><b>${due.length - pending.length}</b>/${due.length}</span>
    </div>
    <div class="supp-chips h-scroll">${due.map((s) => {
      const taken = !!logOf(day)[s.id];
      return `<button class="supp-chip ${taken ? 'taken' : ''} ${justTaken === s.id ? 'pop' : ''}" data-x="supp-toggle" data-id="${s.id}" data-day="${day}" aria-pressed="${taken}">
        <span class="ck">${taken ? icon.check : icon[s.kind] || icon.pill}</span>
        <span class="t"><b>${esc(s.name)}</b><small>${esc(`${s.dose} ${s.unit}`.trim())}</small></span></button>`;
    }).join('')}</div>
    ${low.length ? `<div class="supp-low">${icon.info}<span>Stock bas : ${esc(low.map((s) => `${s.name} (${s.stock})`).join(', '))}</span></div>` : ''}
  </section>`;
  justTaken = '';
  return html;
}

function toggle(id, day) {
  const supp = state.supps.find((s) => s.id === id);
  if (!supp) return;
  const log = { ...logOf(day) };
  if (log[id]) {
    if (log[id].entry) deleteEntry(log[id].entry);
    if (supp.stock != null) supp.stock++;
    delete log[id];
    haptic();
  } else {
    log[id] = { t: Date.now() };
    // Whey, collagène… : leurs calories et protéines comptent dans le journal.
    if (supp.per100 && supp.logMacros !== false) {
      const grams = Number(String(supp.dose).replace(',', '.')) || 0;
      if (grams > 0) log[id].entry = addEntry({ day, meal: mealForNow(), title: supp.name, items: [{ name: supp.name, grams, per100: supp.per100, source: 'supp' }] });
    }
    if (supp.stock != null) supp.stock = Math.max(0, supp.stock - 1);
    justTaken = id;
    haptic();
    tone([880], 0.06, 0.09);
  }
  state.suppLog = { ...state.suppLog, [day]: log };
  save();
  if (allTakenOn(day) && log[id]) {
    confetti();
    tone([660, 880, 1175], 0.07, 0.11);
    toast('Tous tes compléments sont pris', 'checkCircle');
  }
  syncReminders();
  rerender();
}

// ---------------------------------------------------------------------------
// Feuilles
// ---------------------------------------------------------------------------

function panelMain() {
  const n = state.supps.length;
  const streak = suppStreak();
  return `${panelHead('Mes compléments', n ? `${n} au programme` : '')}
    ${n ? `<div class="mini-stats two" style="margin:0">
        <div><b>${streak}</b><span>${streak > 1 ? 'jours de suite' : 'jour de suite'}</span></div>
        <div><b>${regularity(30)} %</b><span>sur 30 jours</span></div>
      </div>
      ${heatStrip()}
      <div class="list glass">${state.supps.map((s) => `<button class="food" data-x="supp-edit" data-id="${s.id}">
          <span class="icon-chip">${icon[s.kind] || icon.pill}</span>
          <div class="info"><div class="name">${esc(s.name)}</div>
            <div class="meta">${esc(`${s.dose} ${s.unit}`.trim())} · ${scheduleLabel(s)}${s.stock != null ? ` · ${s.stock} en stock` : ''}</div></div>
          <span class="add">${icon.chevron}</span></button>`).join('')}</div>` : '<p class="muted" style="margin:0">Choisis ce que tu prends. On s\'occupe de te le rappeler.</p>'}
    <button class="btn ${n ? 'glass' : 'btn-primary'}" data-x="supp-catalog">${icon.plus} Ajouter un complément</button>
    ${remindersBlock()}`;
}

function regularity(days) {
  let due = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const day = shiftDay(dayKey(), -i);
    const list = dueOn(day);
    if (!list.length) continue;
    due += list.length;
    done += list.length - pendingOn(day).length;
  }
  return due ? Math.round((done / due) * 100) : 0;
}

function heatStrip() {
  const cells = Array.from({ length: 28 }, (_, i) => {
    const day = shiftDay(dayKey(), i - 27);
    const list = dueOn(day);
    const p = list.length ? (list.length - pendingOn(day).length) / list.length : 0;
    return `<i style="--p:${p}" class="${day === dayKey() ? 'now' : ''}"></i>`;
  }).join('');
  return `<div class="heat-strip">${cells}</div>`;
}

function remindersBlock() {
  const on = !!state.suppNotif?.on;
  const blocked = 'Notification' in window && Notification.permission === 'denied';
  const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const needsInstall = /iphone|ipad|ipod/i.test(navigator.userAgent) && !installed;
  const unsupported = !('Notification' in window) && !needsInstall;
  return `<section class="card glass reminders" style="display:flex;flex-direction:column;gap:10px">
    <button class="toggle-row" data-x="supp-notif"><span class="icon-chip">${on ? icon.bell : icon.bellOff}</span>
      <div class="spacer"><b>Rappels</b><small class="muted">À 16 h, 18 h et 20 h si tout n'est pas pris</small></div><span class="switch ${on ? 'on' : ''}"></span></button>
    <div class="tier-line">
      <span class="t1"><b>16 h</b>Doux</span><span class="t2"><b>18 h</b>Pressant</span><span class="t3"><b>20 h</b>Urgent</span>
    </div>
    ${needsInstall ? `<p class="notice small" style="margin:0">Sur iPhone, les notifications marchent seulement depuis l'icône sur l'écran d'accueil : Partager puis « Sur l'écran d'accueil ».</p>` : ''}
    ${blocked ? `<p class="notice small" style="margin:0">Les notifications sont bloquées. Active-les dans Réglages › Notifications › Assiette.</p>` : ''}
    ${unsupported ? `<p class="notice small" style="margin:0">Ce navigateur ne gère pas les notifications.</p>` : ''}
    ${on && !PUSH_URL ? `<p class="notice small" style="margin:0">Pour l'instant, les rappels arrivent quand l'app est ouverte. La carte du jour devient aussi de plus en plus pressante.</p>` : ''}
    ${on ? `<button class="btn glass" data-x="supp-test" style="font-size:15px;padding:12px">${icon.bell} Tester une notification</button>` : ''}
  </section>`;
}

function panelCatalog() {
  const have = new Set(state.supps.map((s) => s.name));
  return `${panelHead('Ajouter un complément')}
    <div class="catalog">${CATALOG.filter((c) => !have.has(c.name)).map((c) => `<button class="catalog-item glass" data-x="supp-pick" data-name="${esc(c.name)}">
        <span class="ico">${icon[c.kind]}</span><b>${esc(c.name)}</b></button>`).join('')}</div>
    <button class="btn glass" data-x="supp-pick" data-name="">${icon.pencil} Autre complément</button>
    <p class="muted small" style="margin:0">Les doses proposées sont indicatives : suis l'étiquette de ton produit ou l'avis de ton médecin.</p>`;
}

let draft = null;

function panelEdit() {
  const d = draft;
  const everyDay = !d.days?.length;
  return `${panelHead(d.isNew ? 'Nouveau complément' : esc(d.name))}
    <label class="field"><span>Nom</span><input class="input" data-supp="name" value="${esc(d.name)}" placeholder="Ex : Créatine" autocomplete="off"></label>
    <div class="grid2">
      <label class="field"><span>Dose</span><input class="input" data-supp="dose" inputmode="decimal" value="${esc(d.dose)}" placeholder="1"></label>
      <label class="field"><span>Unité</span><input class="input" data-supp="unit" value="${esc(d.unit)}" placeholder="g, gélule…" autocomplete="off"></label>
    </div>
    <div class="field"><span>Forme</span><div class="pills">${KINDS.map(([k, l]) => `<button class="pill glass ${d.kind === k ? 'active' : ''}" data-x="supp-kind" data-k="${k}">${l}</button>`).join('')}</div></div>
    <div class="field"><span>Quand ?</span>
      <div class="week-pick">${WEEK.map(([v, l]) => `<button class="glass ${everyDay || d.days.includes(v) ? 'active' : ''}" data-x="supp-day" data-d="${v}">${l}</button>`).join('')}</div>
    </div>
    <label class="field"><span>Doses restantes (facultatif)</span><input class="input" data-supp="stock" inputmode="numeric" value="${d.stock ?? ''}" placeholder="Pour te prévenir avant d'être à court"></label>
    ${d.per100 ? `<button class="toggle-row" data-x="supp-macros"><div class="spacer"><b>Compter dans mon journal</b><small class="muted">${n0((d.per100.kcal * (Number(d.dose) || 0)) / 100)} kcal et ${n0((d.per100.protein * (Number(d.dose) || 0)) / 100)} g de protéines à chaque prise</small></div><span class="switch ${d.logMacros !== false ? 'on' : ''}"></span></button>` : ''}
    <button class="btn btn-primary" data-x="supp-save">Enregistrer</button>
    ${d.isNew ? '' : `<button class="btn glass btn-danger" data-x="supp-delete">${icon.trash} Supprimer</button>`}`;
}

// ---------------------------------------------------------------------------
// Rappels
// ---------------------------------------------------------------------------

/** Ce que le service worker a besoin de savoir pour écrire la notification, app fermée. */
async function writeReminderState() {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open('assiette-data');
    const payload = {
      supps: state.supps.map((s) => ({ id: s.id, name: s.name, days: s.days || [] })),
      day: dayKey(),
      taken: Object.keys(logOf(dayKey())),
      streak: suppStreak(),
      pushUrl: PUSH_URL,
      pushId: state.pushId || '',
    };
    await cache.put('./__reminders', new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } }));
  } catch { /* stockage indisponible */ }
}

// Le service worker peut ne jamais être prêt (navigateur limité) : on n'attend pas indéfiniment.
const swReady = () => Promise.race([
  navigator.serviceWorker?.ready ?? Promise.resolve(null),
  new Promise((resolve) => setTimeout(() => resolve(null), 4000)),
]);

const b64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));

async function subscribePush() {
  if (!PUSH_URL || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const reg = await swReady();
  if (!reg) return false;
  let sub = await reg.pushManager.getSubscription();
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64url(VAPID_PUBLIC) });
  if (!state.pushId) {
    state.pushId = crypto.randomUUID();
    save();
  }
  await pushSync(sub);
  return true;
}

function reminderPayload(sub) {
  const weekdays = new Set();
  state.supps.forEach((s) => (s.days?.length ? s.days : [0, 1, 2, 3, 4, 5, 6]).forEach((d) => weekdays.add(d)));
  return {
    id: state.pushId,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    weekdays: [...weekdays],
    // Jour où plus rien n'est à prendre : le serveur n'envoie alors aucun rappel.
    doneDay: !dueOn(dayKey()).length || allTakenOn(dayKey()) ? dayKey() : '',
    enabled: !!state.suppNotif?.on,
    ...(sub ? { sub: sub.toJSON() } : {}),
  };
}

async function pushSync(sub) {
  if (!PUSH_URL || !state.pushId) return;
  try {
    const res = await fetch(`${PUSH_URL}/sync`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(reminderPayload(sub)) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.pushDirty = false;
  } catch {
    state.pushDirty = true; // On réessaiera à la prochaine ouverture.
  }
  save();
}

let syncTimer = 0;
export function syncReminders() {
  writeReminderState();
  updateBadge();
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => pushSync(), 800);
}

function updateBadge() {
  if (!navigator.setAppBadge || !state.suppNotif?.on) return;
  const n = currentTier() ? pendingOn(dayKey()).length : 0;
  (n ? navigator.setAppBadge(n) : navigator.clearAppBadge?.())?.catch?.(() => {});
}

async function showLocal(tier) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const pending = pendingOn(dayKey());
  const copy = self.reminderCopy(tier, pending.map((s) => s.name), suppStreak());
  try {
    const reg = await swReady();
    const options = { body: copy.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'assiette-supps', renotify: true, vibrate: copy.vibrate, requireInteraction: tier === 3, data: { url: './#complements' } };
    if (reg) await reg.showNotification(copy.title, options);
    else new Notification(copy.title, options);
  } catch { /* notification refusée par le système */ }
}

/** App ouverte : à chaque palier franchi, la carte change de ton et une notification part si besoin. */
let booted = false;
function tick() {
  const day = dayKey();
  const tier = state.supps.length && pendingOn(day).length ? currentTier() : 0;
  const seen = state.suppSeen?.day === day ? state.suppSeen.tier : 0;
  const firstTick = !booted;
  booted = true;
  updateBadge();
  if (tier <= seen) return;
  state.suppSeen = { day, tier };
  save();
  rerender();
  // À l'ouverture, la carte suffit ; la notification est pour le palier franchi pendant que l'app tourne.
  if (firstTick) return;
  haptic(tier === 3 ? [80, 40, 80] : 20);
  const copy = self.reminderCopy(tier, pendingOn(day).map((s) => s.name), suppStreak());
  toast(copy.title, 'bell');
  // Avec le serveur de rappels, la notification arrive déjà par lui.
  if (state.suppNotif?.on && !PUSH_URL) showLocal(tier);
}

/** Marque ce qui a été validé depuis la notification (bouton « Pris »). */
async function applyPendingTaken() {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open('assiette-data');
    const res = await cache.match('./__taken');
    if (!res) return;
    const { day } = await res.json();
    await cache.delete('./__taken');
    const log = { ...logOf(day) };
    dueOn(day).forEach((s) => {
      log[s.id] ??= { t: Date.now() };
    });
    state.suppLog = { ...state.suppLog, [day]: log };
    save();
    rerender();
  } catch { /* rien à appliquer */ }
}

export function initSupplements({ renderApp }) {
  rerender = renderApp;
  writeReminderState();
  applyPendingTaken();
  if (state.pushDirty) pushSync();
  tick();
  setInterval(tick, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      applyPendingTaken();
      tick();
      writeReminderState();
    }
  });
  navigator.serviceWorker?.addEventListener('message', (e) => {
    if (e.data?.type === 'supps-taken') applyPendingTaken();
    if (e.data?.type === 'open-supps') openPanel(panelMain);
  });
  if (location.hash.startsWith('#complements')) {
    history.replaceState(null, '', location.pathname + location.search);
    openPanel(panelMain);
  }
}

export const openSupplements = () => openPanel(panelMain);

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

act('supp-open', () => openPanel(panelMain));
act('supp-toggle', (el) => toggle(el.dataset.id, el.dataset.day));
act('supp-catalog', () => openPanel(panelCatalog, { tall: true }));
act('supp-pick', (el) => {
  const c = CATALOG.find((x) => x.name === el.dataset.name);
  draft = { id: uid(), name: c?.name || '', dose: c?.dose || '1', unit: c?.unit || '', kind: c?.kind || 'pill', per100: c?.per100, days: [], stock: null, isNew: true };
  openPanel(panelEdit, { tall: true });
});
act('supp-edit', (el) => {
  const s = state.supps.find((x) => x.id === el.dataset.id);
  if (!s) return;
  draft = { ...s, days: [...(s.days || [])] };
  openPanel(panelEdit, { tall: true });
});
act('supp-kind', (el) => {
  draft.kind = el.dataset.k;
  refreshPanel();
});
act('supp-day', (el) => {
  const d = Number(el.dataset.d);
  const days = draft.days?.length ? draft.days : WEEK.map(([v]) => v);
  const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
  if (!next.length) return; // Il faut au moins un jour.
  draft.days = next.length === 7 ? [] : next;
  refreshPanel();
});
act('supp-macros', () => {
  draft.logMacros = draft.logMacros === false;
  refreshPanel();
});
act('supp-save', () => {
  const name = draft.name.trim();
  if (!name) return toast('Donne-lui un nom', 'info');
  const { isNew, ...supp } = draft;
  supp.name = name;
  supp.stock = supp.stock === '' || supp.stock == null ? null : Math.max(0, Number(supp.stock) || 0);
  const i = state.supps.findIndex((s) => s.id === supp.id);
  if (i >= 0) state.supps[i] = supp;
  else state.supps.push(supp);
  save();
  syncReminders();
  rerender();
  openPanel(panelMain);
  haptic();
  // Le premier complément ajouté est le bon moment pour proposer les rappels.
  if (isNew && state.supps.length === 1 && !state.suppNotif?.on) toast('Active les rappels juste en dessous', 'bell');
});
act('supp-delete', () => {
  if (!confirm(`Retirer ${draft.name} de tes compléments ?`)) return;
  state.supps = state.supps.filter((s) => s.id !== draft.id);
  save();
  syncReminders();
  rerender();
  openPanel(panelMain);
});
act('supp-notif', async () => {
  if (state.suppNotif?.on) {
    state.suppNotif = { on: false };
    save();
    syncReminders();
    navigator.clearAppBadge?.()?.catch?.(() => {});
    refreshPanel();
    return;
  }
  if (!('Notification' in window)) {
    refreshPanel();
    return toast("Installe d'abord l'app sur ton écran d'accueil", 'info');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    refreshPanel();
    return toast('Notifications refusées', 'bellOff');
  }
  state.suppNotif = { on: true };
  save();
  try {
    await subscribePush();
  } catch {
    toast("Rappels actifs quand l'app est ouverte", 'info');
  }
  writeReminderState();
  refreshPanel();
  haptic();
  toast('Rappels activés', 'bell');
});
act('supp-test', async () => {
  haptic();
  if (PUSH_URL && state.pushId) {
    try {
      const res = await fetch(`${PUSH_URL}/test`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: state.pushId }) });
      if (res.ok) return toast('Envoyée : ferme l\'app pour la voir arriver', 'bell');
    } catch { /* on passe à la notification locale */ }
  }
  showLocal(Math.max(currentTier(), 1));
  toast('Notification envoyée', 'bell');
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.matches('[data-supp]') && draft) draft[t.dataset.supp] = t.value;
});

export { closePanel };
