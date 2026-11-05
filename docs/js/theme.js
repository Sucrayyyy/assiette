import { state, save } from './store.js';

// Couleur d'accent : chaque teinte a une version pour le fond clair et une pour le fond sombre.
export const ACCENTS = [
  { key: 'emeraude', name: 'Émeraude', light: '#22a06b', dark: '#2fd37d' },
  { key: 'menthe', name: 'Menthe', light: '#0e9f8e', dark: '#2fe0c8' },
  { key: 'ocean', name: 'Océan', light: '#1f7ae0', dark: '#4da3ff' },
  { key: 'indigo', name: 'Indigo', light: '#4f5bd5', dark: '#8690ff' },
  { key: 'violet', name: 'Violet', light: '#8a3ffc', dark: '#b58cff' },
  { key: 'rose', name: 'Rose', light: '#e0307a', dark: '#ff6aa6' },
  { key: 'corail', name: 'Corail', light: '#e8503a', dark: '#ff7a63' },
  { key: 'orange', name: 'Orange', light: '#e0700a', dark: '#ff9d3d' },
  { key: 'or', name: 'Or', light: '#b98a00', dark: '#ffc93d' },
  { key: 'graphite', name: 'Graphite', light: '#23282e', dark: '#eef1f4' },
  { key: 'neon', name: 'Néon', light: '#00a389', dark: '#19f5c8' },
  { key: 'lave', name: 'Lave', light: '#d9480f', dark: '#ff6b2c' },
  { key: 'galaxie', name: 'Galaxie', light: '#6741d9', dark: '#9d7bff' },
  { key: 'or-royal', name: 'Or royal', light: '#a87a00', dark: '#f5c542' },
  { key: 'sakura', name: 'Sakura', light: '#d6336c', dark: '#ff9ec0' },
];

const toRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

// Luminance perçue (WCAG), pour choisir un texte lisible sur l'accent.
function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const mix = (hex, target, t) => {
  const a = toRgb(hex);
  const b = toRgb(target);
  return toHex(a.map((v, i) => v + (b[i] - v) * t));
};

/** Couleur libre : on l'assombrit ou on l'éclaircit juste ce qu'il faut pour rester lisible sur chaque fond. */
function variants(hex) {
  let light = hex;
  for (let i = 0; i < 12 && luminance(light) > 0.3; i++) light = mix(light, '#000000', 0.08);
  let dark = hex;
  for (let i = 0; i < 12 && luminance(dark) < 0.28; i++) dark = mix(dark, '#ffffff', 0.08);
  return { light, dark };
}

export function currentAccent() {
  const t = state.theme || {};
  if (t.custom) return { key: 'custom', name: 'Sur mesure', ...variants(t.custom) };
  return ACCENTS.find((a) => a.key === t.accent) || ACCENTS[0];
}

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
export const isDark = () => (state.theme?.mode === 'auto' || !state.theme?.mode ? systemDark.matches : state.theme.mode === 'dark');

function vars(prefix, hex) {
  const on = luminance(hex) > 0.42 ? '#07120c' : '#ffffff';
  return {
    [`--${prefix}`]: hex,
    [`--${prefix}-rgb`]: toRgb(hex).join(', '),
    [`--${prefix}-on`]: on,
    [`--${prefix}-deep`]: mix(hex, '#000000', 0.26),
  };
}

export function applyTheme() {
  const a = currentAccent();
  const root = document.documentElement;
  Object.entries({ ...vars('al', a.light), ...vars('ad', a.dark) }).forEach(([k, v]) => root.style.setProperty(k, v));
  const mode = state.theme?.mode;
  if (mode === 'light' || mode === 'dark') root.dataset.theme = mode;
  else delete root.dataset.theme;
  const color = document.body?.classList.contains('sport') || isDark() ? '#0c0e10' : '#f6f8f5';
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color));
}

/** Change le thème avec un fondu quand le navigateur sait le faire. */
export function setTheme(patch, onChange = () => {}) {
  state.theme = { ...state.theme, ...patch };
  save();
  const run = () => {
    applyTheme();
    onChange();
  };
  if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(run);
  else run();
}

systemDark.addEventListener('change', applyTheme);
