import { n0, n1 } from './nutrition.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const COLORS = {
  kcal: ['#FFB347', '#FF5E62'],
  protein: ['#7FA6FF', '#3D5AFE'],
  fiber: ['#7EE0A8', '#12A06B'],
  carbs: '#F2A93B',
  fat: '#E5679A',
};

const svg = (body, size = 22) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icon = {
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  person: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'),
  camera: svg('<path d="M3 8a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="4"/>'),
  photo: svg('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  back: svg('<path d="m15 18-6-6 6-6"/>'),
  check: svg('<path d="m5 12 5 5 9-10"/>'),
  sparkles: svg('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  barcode: svg('<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8"/>'),
  swap: svg('<path d="M7 7h11l-3-3M17 17H6l3 3"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  share: svg('<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'),
  leaf: svg('<path d="M5 19c0-9 5-14 15-15-1 10-6 15-15 15z"/><path d="M5 19 13 11"/>'),
  box: svg('<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>'),
  flame: `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z"/></svg>`,
};

let gradientId = 0;

/** Anneau de progression en SVG. `animate` : part de 0 (l'animation est lancée par animateRings). */
export function ring(progress, colors, size, width, { showEmpty = true, animate = false } = {}) {
  const r = (size - width) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(progress || 0, 0), 1);
  const id = `rg${++gradientId}`;
  const target = c * (1 - p);
  const hidden = p === 0 && !showEmpty ? ' opacity="0"' : '';
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/>
    </linearGradient></defs>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${colors[1]}" stroke-opacity="0.16" stroke-width="${width}"/>
    <circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#${id})"
      stroke-width="${width}" stroke-linecap="round" stroke-dasharray="${c}"
      stroke-dashoffset="${animate ? c : target}" data-target="${target}"
      transform="rotate(-90 ${size / 2} ${size / 2})"${hidden}/>
  </svg>`;
}

/** Les trois anneaux principaux : calories, protéines, fibres. */
export function macroRings(t, g, size, width, animate) {
  const gap = width + 5;
  const one = (value, target, colors, inset) =>
    `<div class="ring-layer" style="inset:${inset}px">${ring(value / Math.max(target, 1), colors, size - inset * 2, width, { animate })}</div>`;
  return `<div class="rings" style="width:${size}px;height:${size}px">
    ${one(t.kcal, g.kcal, COLORS.kcal, 0)}
    ${one(t.protein, g.protein, COLORS.protein, gap)}
    ${one(t.fiber, g.fiber, COLORS.fiber, gap * 2)}
  </div>`;
}

export function animateRings(root) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      root.querySelectorAll('.ring-fill').forEach((el) => el.setAttribute('stroke-dashoffset', el.dataset.target));
    }),
  );
}

export function chips(m, all = true) {
  const chip = (text, color) => `<span class="chip" style="--c:${color}">${text}</span>`;
  return `<div class="chips">
    ${chip(`${n0(m.kcal)} kcal`, '#FF6A4D')}
    ${chip(`P ${n1(m.protein)} g`, '#4D7CFE')}
    ${chip(`Fib ${n1(m.fiber)} g`, '#1FB57A')}
    ${all ? chip(`G ${n1(m.carbs)} g`, COLORS.carbs) + chip(`L ${n1(m.fat)} g`, COLORS.fat) : ''}
  </div>`;
}

export function bar(label, value, target, color) {
  const p = Math.min(value / Math.max(target, 1), 1) * 100;
  return `<div class="bar">
    <div class="bar-top"><span>${label}</span><b>${n0(value)} / ${n0(target)} g</b></div>
    <div class="bar-track" style="--c:${color}"><div class="bar-fill" style="width:${p}%"></div></div>
  </div>`;
}

export function stepper(value, act, attrs = '') {
  return `<div class="stepper">
    <button class="round glass" data-act="${act}" data-delta="-10" ${attrs} aria-label="Moins 10 grammes">${icon.minus}</button>
    <label class="stepper-value"><input type="number" inputmode="numeric" min="0" value="${Math.round(value)}" data-grams ${attrs}><span>g</span></label>
    <button class="round glass" data-act="${act}" data-delta="10" ${attrs} aria-label="Plus 10 grammes">${icon.plus}</button>
  </div>`;
}

let toastTimer;
export function toast(message) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast glass';
    document.body.append(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  navigator.vibrate?.(15);
}
