// Mon corps : photos de progression (gardées dans le téléphone) et mensurations.
import { state, save } from './store.js';
import { dayKey, dayDate, n1 } from './nutrition.js';
import { esc, icon, haptic, toast } from './ui.js';
import { act, openPanel, refreshPanel, panelHead } from './panel.js';

const MEASURES = [['waist', 'Tour de taille'], ['hips', 'Hanches'], ['chest', 'Poitrine'], ['arm', 'Bras'], ['thigh', 'Cuisse']];
let rerender = () => {};
let photos = [];
const urls = new Map();

// ---------------------------------------------------------------------------
// Stockage des photos (IndexedDB : trop lourdes pour le reste des données)
// ---------------------------------------------------------------------------

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('assiette-photos', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('photos', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const base = await db();
  return new Promise((resolve, reject) => {
    const t = base.transaction('photos', mode);
    const out = fn(t.objectStore('photos'));
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
  });
}

async function loadPhotos() {
  try {
    const list = await tx('readonly', (s) => s.getAll());
    photos = (list || []).sort((a, b) => a.day.localeCompare(b.day) || a.t - b.t);
  } catch {
    photos = [];
  }
  photos.forEach((p) => urls.has(p.id) || urls.set(p.id, URL.createObjectURL(p.blob)));
}

/** Photo réduite à 1 200 px de haut : nette, et légère pour le téléphone. */
async function shrink(file) {
  const img = await createImageBitmap(file).catch(() => null);
  if (!img) throw new Error('Image illisible');
  const scale = Math.min(1, 1200 / img.height);
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', 0.84));
}

export async function initBodyLog({ renderApp }) {
  rerender = renderApp;
  await loadPhotos();
  if (photos.length) rerender();
}

// ---------------------------------------------------------------------------
// Carte de l'onglet Progrès
// ---------------------------------------------------------------------------

const dateLabel = (day) => dayDate(day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const lastMeasure = () => state.measures?.at(-1);

function delta(key) {
  const list = (state.measures || []).filter((m) => m[key]);
  if (list.length < 2) return '';
  const d = list.at(-1)[key] - list[0][key];
  return Math.abs(d) < 0.05 ? '' : `<small class="${d < 0 ? 'down' : 'up'}">${d > 0 ? '+' : ''}${n1(Math.round(d * 10) / 10)}</small>`;
}

export function bodyCard() {
  const first = photos[0];
  const last = photos.at(-1);
  const m = lastMeasure();
  return `<section class="chart-card glass body-log">
    <div class="row"><div class="spacer"><h2>Mon corps</h2><div class="muted small">${photos.length ? `${photos.length} photo${photos.length > 1 ? 's' : ''} · depuis le ${dateLabel(first.day)}` : 'Photos et mensurations, rien ne quitte ton téléphone'}</div></div>
      <button class="pill glass" data-x="body-open">${photos.length || m ? 'Voir' : `${icon.plus} Commencer`}</button></div>
    ${photos.length >= 2 ? `<button class="bl-duo" data-x="body-open"><img src="${urls.get(first.id)}" alt=""><img src="${urls.get(last.id)}" alt=""><span>Avant</span><span>Maintenant</span></button>` : ''}
    ${m ? `<div class="bl-measures">${MEASURES.filter(([k]) => m[k]).slice(0, 3).map(([k, l]) => `<div><b>${n1(m[k])}${delta(k)}</b><span>${l} (cm)</span></div>`).join('')}</div>` : ''}
  </section>`;
}

// ---------------------------------------------------------------------------
// Feuille
// ---------------------------------------------------------------------------

const cmp = { a: null, b: null, x: 50 };

function panelBody() {
  const m = lastMeasure() || {};
  if (photos.length >= 2) {
    cmp.a ??= photos[0].id;
    cmp.b ??= photos.at(-1).id;
  }
  const opt = (sel) => photos.map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${dateLabel(p.day)}</option>`).join('');
  return `${panelHead('Mon corps', 'Photos et mesures restent sur ce téléphone')}
    ${photos.length >= 2 ? `<div class="compare" style="--x:${cmp.x}%">
        <img src="${urls.get(cmp.b)}" alt="Maintenant"><img class="before" src="${urls.get(cmp.a)}" alt="Avant">
        <span class="cmp-line"></span><span class="cmp-knob">${icon.chevron}</span>
        <input type="range" min="0" max="100" value="${cmp.x}" data-compare aria-label="Comparer avant et après">
      </div>
      <div class="grid2"><label class="field"><span>Avant</span><select class="input" data-cmp="a">${opt(cmp.a)}</select></label>
        <label class="field"><span>Après</span><select class="input" data-cmp="b">${opt(cmp.b)}</select></label></div>` : ''}
    <label class="btn btn-primary" style="cursor:pointer">${icon.camera2} Ajouter une photo<input type="file" accept="image/*" data-body-photo hidden></label>
    ${photos.length ? `<div class="bl-grid">${[...photos].reverse().map((p) => `<div class="bl-shot"><img src="${urls.get(p.id)}" alt="" loading="lazy"><span>${dateLabel(p.day)}</span>
        <button class="round" data-x="body-photo-del" data-id="${p.id}" aria-label="Supprimer">${icon.x}</button></div>`).join('')}</div>`
      : '<p class="muted small" style="margin:0">Astuce : même endroit, même lumière, même tenue, une fois par semaine. Le changement saute aux yeux.</p>'}
    <section class="card glass" style="display:flex;flex-direction:column;gap:10px">
      <h2 style="font-size:17px">Mensurations du jour (cm)</h2>
      <div class="grid2">${MEASURES.map(([k, l]) => `<label class="field"><span>${l}</span><input class="input" inputmode="decimal" data-measure="${k}" value="${m.day === dayKey() && m[k] ? m[k] : ''}" placeholder="${m[k] ? n1(m[k]) : '0'}"></label>`).join('')}</div>
      <button class="btn glass" data-x="measure-save" style="font-size:15px;padding:12px">Enregistrer les mesures</button>
      ${(state.measures || []).length ? `<div class="bl-history">${[...state.measures].reverse().slice(0, 6).map((x) => `<div class="row small"><span class="muted" style="width:62px">${dateLabel(x.day)}</span><span>${esc(MEASURES.filter(([k]) => x[k]).map(([k, l]) => `${l.split(' ').at(-1)} ${n1(x[k])}`).join(' · '))}</span></div>`).join('')}</div>` : ''}
    </section>`;
}

act('body-open', () => openPanel(panelBody, { tall: true }));
act('body-photo-del', async (el) => {
  if (!confirm('Supprimer cette photo ?')) return;
  await tx('readwrite', (s) => s.delete(el.dataset.id));
  URL.revokeObjectURL(urls.get(el.dataset.id));
  urls.delete(el.dataset.id);
  if (cmp.a === el.dataset.id || cmp.b === el.dataset.id) cmp.a = cmp.b = null;
  await loadPhotos();
  refreshPanel();
  rerender();
});
act('measure-save', () => {
  const values = {};
  document.querySelectorAll('[data-measure]').forEach((i) => {
    const v = Number(String(i.value).replace(',', '.'));
    if (v > 10 && v < 300) values[i.dataset.measure] = v;
  });
  if (!Object.keys(values).length) return toast('Note au moins une mesure', 'info');
  const day = dayKey();
  const prev = (state.measures || []).find((m) => m.day === day) || {};
  state.measures = [...(state.measures || []).filter((m) => m.day !== day), { ...prev, ...values, day }].sort((a, b) => a.day.localeCompare(b.day));
  save();
  haptic();
  toast('Mesures enregistrées', 'ruler');
  refreshPanel();
  rerender();
});

document.addEventListener('input', (e) => {
  if (!e.target.matches('[data-compare]')) return;
  cmp.x = Number(e.target.value);
  e.target.closest('.compare').style.setProperty('--x', `${cmp.x}%`);
});
document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.matches('[data-cmp]')) {
    cmp[t.dataset.cmp] = t.value;
    refreshPanel();
  } else if (t.matches('[data-body-photo]')) {
    const file = t.files[0];
    t.value = '';
    if (!file) return;
    try {
      const blob = await shrink(file);
      const photo = { id: `p${Date.now().toString(36)}`, day: dayKey(), t: Date.now(), blob };
      await tx('readwrite', (s) => s.put(photo));
      await loadPhotos();
      cmp.b = photo.id;
      haptic();
      toast('Photo ajoutée', 'camera2');
      refreshPanel();
      rerender();
    } catch {
      toast("Impossible d'enregistrer la photo", 'info');
    }
  }
});
