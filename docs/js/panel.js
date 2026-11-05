// Feuilles et actions des modules (compléments, eau, trophées, réglages…).
// Un module déclare ses actions avec act('nom', fn) et ouvre sa feuille avec openPanel(vue).
import { icon } from './ui.js';

const handlers = new Map();
let current = null;
let shown = null;

const host = () => document.getElementById('panel');

export const act = (name, fn) => handlers.set(name, fn);

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-x]');
  if (!el || el.disabled) return;
  handlers.get(el.dataset.x)?.(el, e);
});

function render() {
  const $p = host();
  if (!current) {
    $p.innerHTML = '';
    shown = null;
    return;
  }
  const enter = shown !== current ? 'enter' : '';
  const scroll = $p.querySelector('.sheet')?.scrollTop || 0;
  shown = current;
  $p.classList.toggle('sport', document.body.classList.contains('sport') || !!document.querySelector('#session .layer'));
  $p.innerHTML = `<div class="backdrop ${enter}" data-x="panel-close"></div>
    <div class="sheet ${current.tall ? 'tall' : ''} ${enter}"><div class="grabber"></div>${current.view()}</div>`;
  if (!enter) $p.querySelector('.sheet').scrollTop = scroll;
}

export function openPanel(view, { tall = false } = {}) {
  current = { view, tall };
  render();
}

export const refreshPanel = () => current && render();

export function closePanel() {
  current = null;
  render();
}

export const panelHead = (title, sub = '') =>
  `<div class="sheet-head"><div class="spacer"><h2>${title}</h2>${sub ? `<div class="muted small">${sub}</div>` : ''}</div>
    <button class="round glass" data-x="panel-close" aria-label="Fermer">${icon.x}</button></div>`;

act('panel-close', closePanel);
