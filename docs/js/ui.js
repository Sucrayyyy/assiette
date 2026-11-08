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
  dumbbell: svg('<path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12"/>'),
  pencil: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
  play: svg('<path d="M7 5v14l12-7z"/>'),
  flame: `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z"/></svg>`,
  // Repas
  coffee: svg('<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 11h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3"/>'),
  utensils: svg('<path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5a2 2 0 0 0 2 2M9 3v5a2 2 0 0 1-2 2M17 3c-2 2-3 5-3 8h3v10"/>'),
  apple: svg('<path d="M12 7c-2-2-7-1-7 5 0 5 3 9 5 9 1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 5-4 5-9 0-6-5-7-7-5z"/><path d="M12 7c0-2 1-4 3-4"/>'),
  moon: svg('<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>'),
  // Divers
  target: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
  cart: svg('<path d="M3 4h2l2.4 11h10.2L20 8H6.2"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/>'),
  trophy: svg('<path d="M8 4h8v6a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8M9 18h6"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  checkCircle: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'),
  trendDown: svg('<path d="M3 7l7 7 4-4 7 7"/><path d="M21 12v5h-5"/>'),
  trendUp: svg('<path d="M3 17l7-7 4 4 7-7"/><path d="M21 12V7h-5"/>'),
  equal: svg('<path d="M5 9h14M5 15h14"/>'),
  users: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .6 3.5 2.3 3.5 5.2"/>'),
  timer: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>'),
  bolt: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  steps: svg('<path d="M8 3c-2 0-3 2-3 5s1 5 1 6h4c0-1 1-3 1-6s-1-5-3-5zM6 17h4v1.5a2 2 0 0 1-4 0zM16 7c-2 0-3 2-3 5s1 5 1 6h4c0-1 1-3 1-6s-1-5-3-5zM14 21h4v-.5"/>'),
  refresh: svg('<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>'),
  sliders: svg('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  bell: svg('<path d="M6 16V11a6 6 0 1 1 12 0v5l2 3H4zM10 21h4"/>'),
  bellOff: svg('<path d="M9 5.3A6 6 0 0 1 18 11v3M6 11v5l-2 3h13M10 21h4M3 3l18 18"/>'),
  palette: svg('<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-.5-1.5-.5-2.5S14.5 15 16 15h2a3 3 0 0 0 3-3c0-5-4-9-9-9z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="8" r="1"/>'),
  pill: svg('<rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m9 9 6 6"/>'),
  capsule: svg('<rect x="8" y="3" width="8" height="18" rx="4"/><path d="M8 12h8"/>'),
  scoop: svg('<path d="M3 12h11v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM14 13l7-5"/><path d="M6 12c0-2 1.5-3.5 3-3.5s3 1.5 3 3.5"/>'),
  drop: svg('<path d="M12 3s7 7 7 12a7 7 0 0 1-14 0c0-5 7-12 7-12z"/>'),
  medal: svg('<circle cx="12" cy="15" r="6"/><path d="M8 10 5 3h5l2 4 2-4h5l-3 7"/>'),
  calendar: svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  download: svg('<path d="M12 4v11M8 11l4 4 4-4M5 20h14"/>'),
  upload: svg('<path d="M12 16V5M8 9l4-4 4 4M5 20h14"/>'),
  scale: svg('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 10a5 5 0 0 1 8 0l-3 2h-2z"/>'),
  flag: svg('<path d="M5 21V4M5 4c5-2 8 2 14 0v10c-6 2-9-2-14 0"/>'),
  grid: svg('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'),
  play2: svg('<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  bulb: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>'),
  timer2: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>'),
  ruler: svg('<path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>'),
  book: svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>'),
  camera2: svg('<path d="M3 8a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="4"/>'),
  chevron: svg('<path d="m9 18 6-6-6-6"/>'),
  down: svg('<path d="m6 9 6 6 6-6"/>'),
  arrowUpRight: svg('<path d="M7 17 17 7M8 7h9v9"/>'),
  heart: svg('<path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"/>'),
  wave: svg('<path d="M2 12h3l3-7 4 14 3-9 2 2h5"/>'),
  star: `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/></svg>`,
  gauge: svg('<path d="M3.5 16a8.5 8.5 0 1 1 17 0"/><path d="M12 16l4-5"/><circle cx="12" cy="16" r="1.4"/><path d="M6 12.5l1 .6M12 7.5v1.2M18 12.5l-1 .6"/>'),
};

// Retour haptique : le vibreur sur Android. Sur iPhone, les apps web n'y ont pas accès, sauf à travers
// le petit « tic » natif d'un interrupteur iOS, qu'on actionne ici sans l'afficher.
let hapticLabel = null;
export function haptic(pattern = 12) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
    return;
  }
  if (!hapticLabel) {
    hapticLabel = document.createElement('label');
    hapticLabel.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden';
    hapticLabel.innerHTML = '<input type="checkbox" switch tabindex="-1" aria-hidden="true">';
    document.body.append(hapticLabel);
  }
  hapticLabel.click();
}

// Petits sons de l'app, générés à la volée (aucun fichier à charger).
let audio = null;
export function tone(freqs = [1320], gain = 0.1, length = 0.12) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume?.();
    freqs.forEach((f, i) => {
      const t = audio.currentTime + i * length * 0.9;
      const osc = audio.createOscillator();
      const g = audio.createGain();
      osc.frequency.value = f;
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + length);
      osc.connect(g).connect(audio.destination);
      osc.start(t);
      osc.stop(t + length + 0.01);
    });
  } catch { /* pas de son, tant pis */ }
}

/** Niveau d'intensité : barres remplies de 1 à `total` (pour l'activité physique). */
export function levelBars(level, total = 5) {
  const bars = Array.from({ length: total }, (_, i) => {
    const h = 6 + i * 3.5;
    return `<rect x="${3 + i * 4}" y="${21 - h}" width="2.6" height="${h}" rx="1.3" fill="currentColor" opacity="${i < level ? 1 : 0.25}"/>`;
  }).join('');
  return `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">${bars}</svg>`;
}

/** Les nombres marqués data-count défilent de 0 à leur valeur. */
export function animateCounts(root) {
  root.querySelectorAll('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 900);
      el.textContent = n0(target * (1 - (1 - t) ** 3)) + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/** Petite pluie de confettis pour les records et les rangs. */
export function confetti() {
  const colors = ['#22a06b', '#ff5e62', '#ffb347', '#4d7cfe', '#a45cff', '#f2b705'];
  const box = document.createElement('div');
  box.className = 'confetti';
  box.innerHTML = Array.from({ length: 36 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.4;
    const drift = (Math.random() - 0.5) * 140;
    return `<i style="left:${left}%;background:${colors[i % colors.length]};animation-delay:${delay}s;--drift:${drift}px;--spin:${Math.random() * 720 - 360}deg"></i>`;
  }).join('');
  document.body.append(box);
  setTimeout(() => box.remove(), 2600);
}

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
    `<div class="ring-layer ${target > 0 && value >= target * 0.95 ? 'done' : ''}" style="inset:${inset}px;--glow:${colors[1]}">${ring(value / Math.max(target, 1), colors, size - inset * 2, width, { animate })}</div>`;
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
export function toast(message, iconName = 'checkCircle') {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast glass';
    document.body.append(el);
  }
  el.innerHTML = `${icon[iconName] || ''}<span>${esc(message)}</span>`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  navigator.vibrate?.(15);
}
