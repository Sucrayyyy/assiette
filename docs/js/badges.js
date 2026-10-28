import { RANKS } from './workout-data.js';

// Badges de rang dessinés : hexagone dans la couleur du rang, emblème blanc et reflet qui passe.
const HEX = 'M32 3 L57 17.5 V46.5 L32 61 L7 46.5 V17.5 Z';
const HEX_INNER = 'M32 8.5 L52 20.5 V43.5 L32 55.5 L12 43.5 V20.5 Z';

const chevrons = (n) =>
  Array.from({ length: n }, (_, i) => {
    const y = 30 + (i - (n - 1) / 2) * 8;
    return `<path d="M21 ${y + 4} L32 ${y - 4} L43 ${y + 4} L43 ${y + 9} L32 ${y + 1} L21 ${y + 9} Z"/>`;
  }).join('');

function star(cx, cy, outer, inner) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  });
  return `<polygon points="${pts.join(' ')}"/>`;
}

const EMBLEMS = [
  chevrons(1),
  chevrons(2),
  chevrons(3),
  star(32, 33, 13, 5.5),
  `${star(32, 33, 10, 4.3)}<circle cx="32" cy="33" r="15" fill="none" stroke="#fff" stroke-width="2.4"/>`,
  '<path d="M21 27 L27 20 H37 L43 27 L32 45 Z"/><path d="M21 27 H43 M27 20 L32 27 L37 20 M32 27 V45" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1.2"/>',
  '<path d="M18 41 L20 23 L27 31 L32 19 L37 31 L44 23 L46 41 Z"/><rect x="18" y="43" width="28" height="4" rx="2"/>',
  '<path d="M32 15 C38 23 45 27 45 36 A13 13 0 0 1 19 36 C19 30 23 27 26 23 C27 28 29 30 31 30 C29.5 25 30 19 32 15 Z"/>',
];

let uid = 0;

export function rankBadge(index, size = 52, { shine = true } = {}) {
  const r = RANKS[Math.max(0, Math.min(index, RANKS.length - 1))];
  const id = `rb${++uid}`;
  return `<svg class="badge" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="Rang ${r.name}">
    <defs>
      <linearGradient id="${id}g" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="${r.light}"/><stop offset="1" stop-color="${r.color}"/></linearGradient>
      <linearGradient id="${id}s" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <clipPath id="${id}c"><path d="${HEX}"/></clipPath>
    </defs>
    <path d="${HEX}" fill="url(#${id}g)"/>
    <path d="${HEX_INNER}" fill="none" stroke="#fff" stroke-opacity="0.4" stroke-width="1.4"/>
    ${shine ? `<g clip-path="url(#${id}c)"><g transform="rotate(20 32 32)"><rect x="-40" y="-20" width="20" height="104" fill="url(#${id}s)">
      <animate attributeName="x" values="-40;-40;90" keyTimes="0;0.55;1" dur="3.6s" repeatCount="indefinite"/></rect></g></g>` : ''}
    <g fill="#fff">${EMBLEMS[RANKS.indexOf(r)]}</g>
  </svg>`;
}
