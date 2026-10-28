import { normalize } from './foods.js';

// Illustrations d'exercices : un personnage stylisé (vue de profil, face à droite) fait le mouvement
// entre une position A et une position B, avec les muscles travaillés colorés.
// Articulations : hd tête, s épaule, h hanche, k genou, f pied, e coude, w main (k2/f2 : jambe arrière).

const STAND = { hd: [60, 22], s: [60, 35], h: [60, 66], k: [61, 89], f: [60, 112] };
const ARMS_DOWN = { e: [61, 54], w: [62, 72] };

const PATTERNS = {
  squat: {
    a: { hd: [60, 21], s: [60, 34], h: [60, 65], k: [62, 88], f: [60, 112], e: [72, 40], w: [63, 30] },
    b: { hd: [72, 46], s: [66, 58], h: [44, 80], k: [67, 88], f: [60, 112], e: [78, 64], w: [69, 55] },
    load: 's',
  },
  lunge: {
    a: { hd: [60, 21], s: [60, 34], h: [60, 65], k: [66, 88], f: [70, 112], k2: [55, 88], f2: [50, 112], e: [62, 53], w: [63, 71] },
    b: { hd: [60, 41], s: [60, 54], h: [60, 85], k: [82, 88], f: [82, 112], k2: [56, 106], f2: [36, 110], e: [62, 73], w: [63, 91] },
  },
  hinge: {
    a: { hd: [86, 50], s: [78, 58], h: [52, 66], k: [66, 88], f: [60, 112], e: [78, 76], w: [78, 93] },
    b: { hd: [60, 21], s: [60, 34], h: [60, 65], k: [61, 88], f: [60, 112], e: [61, 53], w: [62, 71] },
    thumb: 'a',
  },
  hipthrust: {
    a: { hd: [26, 64], s: [38, 72], h: [58, 96], k: [80, 84], f: [88, 112], e: [48, 86], w: [58, 92] },
    b: { hd: [26, 64], s: [38, 72], h: [64, 74], k: [80, 86], f: [88, 112], e: [50, 74], w: [64, 70] },
    props: '<rect class="fig-prop" x="12" y="74" width="28" height="7" rx="3"/><path class="fig-prop-line" d="M16 81V112M36 81V112"/>',
  },
  bench: {
    a: { hd: [24, 70], s: [36, 73], h: [68, 75], k: [84, 92], f: [90, 112], e: [34, 88], w: [42, 70] },
    b: { hd: [24, 70], s: [36, 73], h: [68, 75], k: [84, 92], f: [90, 112], e: [38, 56], w: [40, 38] },
    props: '<rect class="fig-prop" x="18" y="79" width="60" height="7" rx="3"/><path class="fig-prop-line" d="M24 86V112M72 86V112"/>',
  },
  pushup: {
    a: { hd: [90, 64], s: [80, 72], h: [50, 82], k: [32, 92], f: [14, 104], e: [80, 91], w: [80, 110] },
    b: { hd: [90, 86], s: [80, 94], h: [50, 99], k: [32, 104], f: [14, 109], e: [66, 100], w: [80, 110] },
  },
  dip: {
    a: { hd: [60, 21], s: [60, 34], h: [60, 65], k: [54, 86], f: [64, 104], e: [61, 49], w: [63, 64] },
    b: { hd: [61, 40], s: [60, 53], h: [60, 84], k: [54, 104], f: [64, 121], e: [46, 62], w: [63, 64] },
    props: '<path class="fig-prop-line" d="M50 64H84M82 64V120"/>',
    noGround: true,
  },
  ohp: {
    a: { ...STAND, e: [72, 42], w: [66, 28] },
    b: { ...STAND, e: [63, 16], w: [64, -2] },
  },
  raise: {
    a: { ...STAND, ...ARMS_DOWN },
    b: { ...STAND, e: [78, 38], w: [96, 38] },
  },
  row: {
    a: { hd: [86, 46], s: [78, 54], h: [52, 64], k: [64, 88], f: [60, 112], e: [79, 72], w: [80, 90] },
    b: { hd: [86, 46], s: [78, 54], h: [52, 64], k: [64, 88], f: [60, 112], e: [62, 62], w: [74, 74] },
  },
  pulldown: {
    a: { hd: [56, 40], s: [56, 53], h: [56, 84], k: [78, 86], f: [80, 112], e: [62, 34], w: [67, 16] },
    b: { hd: [56, 40], s: [56, 53], h: [56, 84], k: [78, 86], f: [80, 112], e: [50, 70], w: [64, 58] },
    props: '<rect class="fig-prop" x="44" y="85" width="26" height="6" rx="3"/><path class="fig-prop-line" d="M57 91V112"/>',
    anchor: [68, -12],
  },
  pullup: {
    a: { hd: [61, 30], s: [60, 42], h: [60, 73], k: [55, 95], f: [64, 112], e: [61, 24], w: [62, 6] },
    b: { hd: [63, 15], s: [60, 28], h: [60, 59], k: [55, 81], f: [64, 98], e: [47, 15], w: [62, 6] },
    props: '<path class="fig-prop-line" d="M36 6H88"/>',
    noGround: true,
  },
  curl: {
    a: { ...STAND, e: [61, 54], w: [64, 72] },
    b: { ...STAND, e: [61, 54], w: [75, 40] },
  },
  triceps: {
    a: { ...STAND, e: [63, 54], w: [80, 46] },
    b: { ...STAND, e: [63, 54], w: [66, 72] },
    anchor: [84, -12],
  },
  legext: {
    a: { hd: [50, 40], s: [50, 53], h: [54, 84], k: [76, 86], f: [78, 110], e: [56, 70], w: [66, 82] },
    b: { hd: [50, 40], s: [50, 53], h: [54, 84], k: [76, 86], f: [100, 80], e: [56, 70], w: [66, 82] },
    props: '<rect class="fig-prop" x="40" y="86" width="40" height="7" rx="3"/><path class="fig-prop-line" d="M42 48V90M60 93V112"/>',
  },
  legcurl: {
    a: { hd: [16, 84], s: [28, 90], h: [58, 92], k: [80, 92], f: [104, 92], e: [24, 100], w: [14, 104] },
    b: { hd: [16, 84], s: [28, 90], h: [58, 92], k: [80, 92], f: [86, 68], e: [24, 100], w: [14, 104] },
    props: '<rect class="fig-prop" x="10" y="98" width="80" height="6" rx="3"/><path class="fig-prop-line" d="M18 104V112M82 104V112"/>',
    prone: true,
  },
  legpress: {
    a: { hd: [30, 52], s: [38, 62], h: [54, 86], k: [70, 64], f: [90, 66], e: [50, 72], w: [60, 82] },
    b: { hd: [30, 52], s: [38, 62], h: [54, 86], k: [78, 76], f: [102, 64], e: [50, 72], w: [60, 82] },
    props: '<path class="fig-prop-line" d="M24 50L44 92H66"/>',
    load: 'platform',
    thumb: 'a',
  },
  calf: {
    a: { hd: [60, 20], s: [60, 33], h: [60, 64], k: [61, 87], f: [60, 106], e: [61, 52], w: [62, 70] },
    b: { hd: [60, 13], s: [60, 26], h: [60, 57], k: [61, 80], f: [60, 99], e: [61, 45], w: [62, 63] },
    props: '<rect class="fig-prop" x="48" y="106" width="26" height="7" rx="2"/>',
  },
  plank: {
    a: { hd: [88, 86], s: [78, 92], h: [48, 95], k: [30, 100], f: [12, 106], e: [78, 110], w: [94, 110] },
    b: { hd: [88, 86], s: [78, 92], h: [48, 89], k: [30, 98], f: [12, 106], e: [78, 110], w: [94, 110] },
    thumb: 'a',
  },
  crunch: {
    a: { hd: [20, 98], s: [32, 102], h: [60, 106], k: [76, 86], f: [88, 110], e: [26, 90], w: [18, 92] },
    b: { hd: [34, 80], s: [42, 90], h: [60, 106], k: [76, 86], f: [88, 110], e: [38, 76], w: [30, 78] },
  },
  jump: {
    a: { hd: [62, 36], s: [60, 49], h: [56, 78], k: [70, 92], f: [60, 112], e: [70, 60], w: [80, 68] },
    b: { hd: [60, 10], s: [60, 23], h: [60, 54], k: [62, 77], f: [60, 100], e: [68, 6], w: [72, -11] },
  },
  shrug: {
    a: { ...STAND, ...ARMS_DOWN },
    b: { hd: [60, 17], s: [60, 30], h: [60, 66], k: [61, 89], f: [60, 112], e: [61, 49], w: [62, 67] },
  },
  stretch: {
    a: { ...STAND, e: [62, 16], w: [64, -2] },
    b: { hd: [80, 74], s: [72, 64], h: [56, 66], k: [60, 89], f: [60, 112], e: [70, 82], w: [66, 100] },
  },
};

// Reconnaissance du mouvement à partir du nom (français et anglais). L'ordre compte.
const RULES = [
  ['stretch', /stretch|etirement|mobilite|yoga/],
  ['legcurl', /leg curl|leg-curl|hamstring curl|flexion des jambes/],
  ['legext', /leg extension|extension des jambes|extensions de jambes/],
  ['legpress', /leg press|presse/],
  ['calf', /calf|mollet/],
  ['hipthrust', /hip thrust|bridge|pont fessier|pont/],
  ['lunge', /lunge|fente|split squat|step up|step-up|bulgarian|bulgare/],
  ['squat', /squat|thruster|wall sit|dos au mur|accroupi/],
  ['hinge', /deadlift|souleve|good morning|romanian|roumain|swing|clean|snatch|hyperextension|back extension|extension lombaire/],
  ['pullup', /pull up|pullup|pull-up|chin up|chin-up|traction|muscle up/],
  ['pulldown', /pulldown|pull down|pull-down|tirage vertical|lat pull|tirage poitrine/],
  ['crunch', /leg raise|knee raise|knee up|releve de jambes|releve de genoux|releves de jambes/],
  ['raise', /upright row|rowing menton|lateral raise|front raise|elevation|raise|reverse fly|oiseau/],
  ['row', /row|rowing|tirage|face pull|pull apart/],
  ['dip', /\bdips?\b/],
  ['pushup', /push up|pushup|push-up|pompe/],
  ['bench', /bench|couche|chest press|incline[a-z ]*press|decline[a-z ]*press|developpe (incline|decline)|floor press|fly|flye|ecarte|pec deck|butterfly|pullover/],
  ['ohp', /shoulder press|military|overhead press|militaire|arnold|developpe epaules|developpe assis|push press/],
  ['shrug', /shrug|haussement/],
  ['curl', /curl|bicep/],
  ['triceps', /tricep|pushdown|skull|kickback|barre au front|extension/],
  ['plank', /plank|planche|gainage|mountain|escaladeur|bird dog|dead bug/],
  ['crunch', /crunch|sit up|sit-up|abdominaux|leg raise|releve|russian|twist|v up|v-up|hollow|flutter|ciseaux|scissor/],
  ['jump', /jump|saut|burpee|corde|run|sprint|bike|velo|skip|jack|cardio|rameur|elliptique|course/],
];

const BY_MUSCLE = {
  pectoraux: 'bench', epaules: 'ohp', biceps: 'curl', triceps: 'triceps', avant_bras: 'curl', abdos: 'crunch',
  obliques: 'crunch', trapezes: 'shrug', dorsaux: 'pulldown', haut_dos: 'row', lombaires: 'hinge', fessiers: 'hipthrust',
  quadriceps: 'squat', ischios: 'legcurl', adducteurs: 'lunge', mollets: 'calf',
};

const cache = new Map();

export function patternFor(ex) {
  if (cache.has(ex.id)) return cache.get(ex.id);
  const name = normalize(`${ex.fr} ${ex.en}`).replace(/[-_]/g, ' ');
  let pattern = RULES.find(([, re]) => re.test(name))?.[0];
  if (!pattern && (ex.t === 'cardio' || ex.t === 'plyo')) pattern = 'jump';
  if (!pattern && ex.t === 'etirement') pattern = 'stretch';
  pattern ||= BY_MUSCLE[ex.p[0]] || 'stretch';
  cache.set(ex.id, pattern);
  return pattern;
}

// Zones du personnage et muscles qu'elles représentent.
const ZONES = {
  torsoFront: ['pectoraux', 'abdos', 'obliques'],
  torsoBack: ['dorsaux', 'haut_dos', 'lombaires', 'trapezes'],
  shoulder: ['epaules'],
  upperArm: ['biceps', 'triceps'],
  forearm: ['avant_bras'],
  thighFront: ['quadriceps', 'adducteurs'],
  thighBack: ['ischios'],
  glute: ['fessiers'],
  shin: ['mollets'],
};

function tone(ex, zone) {
  const muscles = ZONES[zone];
  if (ex.p.some((m) => muscles.includes(m))) return 'p';
  if (ex.s.some((m) => muscles.includes(m))) return 's';
  return 'n';
}

const DUR = '2.4s';
const r1 = (n) => Math.round(n * 10) / 10;

function animate(attr, a, b, still) {
  if (still || a === b) return '';
  return `<animate attributeName="${attr}" values="${a};${b};${a}" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="${DUR}" repeatCount="indefinite"/>`;
}

/** Décale un segment vers l'avant (+) ou l'arrière (-) du corps : moitié avant / arrière du tronc et des cuisses. */
function shift(p1, p2, d, prone) {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (dy / len) * d * (prone ? -1 : 1);
  const ny = (-dx / len) * d * (prone ? -1 : 1);
  return [[p1[0] + nx, p1[1] + ny], [p2[0] + nx, p2[1] + ny]];
}

function line(cls, width, A, B, still, extra = '') {
  const [[ax1, ay1], [ax2, ay2]] = A.map((p) => p.map(r1));
  const [[bx1, by1], [bx2, by2]] = B.map((p) => p.map(r1));
  const x1 = still ? bx1 : ax1;
  const y1 = still ? by1 : ay1;
  const x2 = still ? bx2 : ax2;
  const y2 = still ? by2 : ay2;
  return `<line class="${cls}" stroke-width="${width}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${extra}>
    ${animate('x1', ax1, bx1, still)}${animate('y1', ay1, by1, still)}${animate('x2', ax2, bx2, still)}${animate('y2', ay2, by2, still)}</line>`;
}

function dot(cls, r, A, B, still) {
  const [ax, ay] = A.map(r1);
  const [bx, by] = B.map(r1);
  return `<circle class="${cls}" r="${r}" cx="${still ? bx : ax}" cy="${still ? by : ay}">${animate('cx', ax, bx, still)}${animate('cy', ay, by, still)}</circle>`;
}

function load(ex, pattern, A, B, still) {
  const eq = ex.eq;
  const p = PATTERNS[pattern];
  const at = p.load === 's' && (eq === 'Barre' || eq === 'Barre EZ') ? 's' : p.load === 'platform' ? 'f' : 'w';
  const offset = at === 's' ? [-3, -6] : [0, 0];
  const pa = [A[at][0] + offset[0], A[at][1] + offset[1]];
  const pb = [B[at][0] + offset[0], B[at][1] + offset[1]];
  if (p.load === 'platform') {
    return line('fig-eq', 5, [[pa[0] + 5, pa[1] - 16], [pa[0] - 1, pa[1] + 14]], [[pb[0] + 5, pb[1] - 16], [pb[0] - 1, pb[1] + 14]], still);
  }
  if (eq === 'Barre' || eq === 'Barre EZ') {
    return dot('fig-plate', 11, pa, pb, still) + dot('fig-plate-hole', 3, pa, pb, still);
  }
  if (eq === 'Haltères') return dot('fig-plate', 6.5, pa, pb, still) + dot('fig-plate-hole', 2, pa, pb, still);
  if (eq === 'Kettlebell') return dot('fig-plate', 7, [pa[0], pa[1] + 6], [pb[0], pb[1] + 6], still);
  if (eq === 'Poulie') {
    const anchor = p.anchor || [104, -10];
    return line('fig-cable', 1.6, [anchor, pa], [anchor, pb], still) + dot('fig-pulley', 4, anchor, anchor, true);
  }
  if (eq === 'Élastique') return line('fig-cable', 1.8, [A.f, pa], [B.f, pb], still, ' stroke-dasharray="3 3"');
  return '';
}

/**
 * Illustration d'un exercice.
 * @param still image fixe (vignettes de liste), sinon le personnage fait le mouvement en boucle
 */
// Cadre resserré autour du personnage (vignettes) : carré qui contient les deux positions.
function cropBox(...poses) {
  const pts = poses.flatMap((pose) => Object.values(pose));
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  const pad = 13;
  const [x0, x1, y0, y1] = [Math.min(...xs) - pad, Math.max(...xs) + pad, Math.min(...ys) - pad, Math.max(...ys) + pad];
  const side = Math.max(x1 - x0, y1 - y0, 64);
  return `${((x0 + x1 - side) / 2).toFixed(1)} ${((y0 + y1 - side) / 2).toFixed(1)} ${side} ${side}`;
}

export function exerciseFigure(ex, { size = 120, still = false, crop = false } = {}) {
  const pattern = patternFor(ex);
  const P = PATTERNS[pattern];
  const A = still ? P[P.thumb || 'b'] : P.a;
  const B = still ? A : P.b;
  const prone = !!P.prone;

  const T = (zone) => `fig-${tone(ex, zone)}`;
  const torsoF = [shift(A.s, A.h, 3.6, prone), shift(B.s, B.h, 3.6, prone)];
  const torsoB = [shift(A.s, A.h, -3.6, prone), shift(B.s, B.h, -3.6, prone)];
  const thighF = [shift(A.h, A.k, 3.4, prone), shift(B.h, B.k, 3.4, prone)];
  const thighB = [shift(A.h, A.k, -3.4, prone), shift(B.h, B.k, -3.4, prone)];

  const far = A.k2
    ? `<g opacity="0.55">${line(T('thighFront'), 9, [A.h, A.k2], [B.h, B.k2], still)}${line(T('shin'), 8, [A.k2, A.f2], [B.k2, B.f2], still)}</g>`
    : '';

  const viewBox = crop ? cropBox(A, B) : '-6 -16 132 138';
  return `<svg class="fig" width="${size}" height="${size}" viewBox="${viewBox}" role="img" aria-label="${pattern}">
    ${P.noGround ? '' : '<line class="fig-ground" x1="-2" y1="114" x2="122" y2="114"/>'}
    ${P.props || ''}
    ${ex.eq === 'Machine' && !P.props ? '<rect class="fig-prop-ghost" x="78" y="8" width="34" height="104" rx="8"/>' : ''}
    ${far}
    ${line(T('shin'), 8.5, [A.k, A.f], [B.k, B.f], still)}
    ${line(T('thighBack'), 6.8, ...thighB, still)}
    ${line(T('thighFront'), 6.8, ...thighF, still)}
    ${dot(T('glute'), 6.5, A.h, B.h, still)}
    ${line(T('torsoBack'), 7.2, ...torsoB, still)}
    ${line(T('torsoFront'), 7.2, ...torsoF, still)}
    ${dot('fig-head', 8.5, A.hd, B.hd, still)}
    ${line(T('upperArm'), 7, [A.s, A.e], [B.s, B.e], still)}
    ${line(T('forearm'), 6, [A.e, A.w], [B.e, B.w], still)}
    ${dot(T('shoulder'), 5.2, A.s, B.s, still)}
    ${load(ex, pattern, A, B, still)}
  </svg>`;
}
