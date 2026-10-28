import { normalize } from './foods.js';

// Illustrations d'exercices : un personnage vu de face (ou de dos pour les muscles du dos) fait le mouvement
// en boucle entre une position A et une position B. Les muscles travaillés sont colorés et pulsent :
// rouge pour les principaux, orange pour les secondaires.
// Articulations du côté gauche de l'image : hd tête, s épaule, e coude, w main, h hanche, k genou, f pied.
// Le côté droit est symétrique, sauf si la position donne sR, eR, wR, hR, kR ou fR.

const BASE = { hd: [60, 15], s: [45, 33], e: [41, 55], w: [40, 76], h: [52, 74], k: [51, 104], f: [51, 132] };
const pose = (o) => ({ ...BASE, ...o });

const PATTERNS = {
  squat: {
    a: pose({ e: [31, 40], w: [33, 27] }),
    b: pose({ hd: [60, 35], s: [45, 53], e: [31, 60], w: [33, 47], h: [51, 91], k: [31, 102] }),
    load: 'bar',
  },
  legpress: {
    a: pose({ e: [41, 56], w: [42, 76] }),
    b: pose({ hd: [60, 35], s: [45, 53], e: [41, 75], w: [42, 95], h: [51, 91], k: [31, 102] }),
  },
  lunge: {
    a: pose({}),
    b: pose({ hd: [60, 33], s: [45, 51], e: [41, 73], w: [40, 94], h: [52, 92], k: [49, 110], kR: [69, 125], fR: [68, 134] }),
  },
  hinge: {
    a: pose({ hd: [60, 42], s: [45, 53], e: [44, 74], w: [44, 94], h: [52, 78], k: [49, 104] }),
    b: pose({ e: [43, 55], w: [44, 77] }),
  },
  hipthrust: {
    a: pose({ hd: [60, 31], s: [45, 49], e: [43, 70], w: [46, 86], h: [51, 90], k: [43, 105] }),
    b: pose({ e: [43, 55], w: [46, 73] }),
  },
  bench: {
    a: pose({ e: [25, 40], w: [27, 23] }),
    b: pose({ e: [35, 30], w: [50, 24] }),
    anchor: 'sides',
  },
  dip: {
    a: pose({ e: [41, 52], w: [37, 72], k: [51, 98], f: [53, 120] }),
    b: pose({ hd: [60, 31], s: [45, 49], e: [32, 57], w: [37, 72], h: [52, 90], k: [51, 114], f: [53, 136] }),
    props: '<path class="fig-prop-line" d="M37 75V138M83 75V138"/>',
    noGround: true,
  },
  ohp: {
    a: pose({ e: [29, 42], w: [31, 26] }),
    b: pose({ e: [38, 10], w: [42, -6] }),
  },
  raise: {
    a: pose({ e: [40, 55], w: [38, 74] }),
    b: pose({ e: [24, 37], w: [7, 39] }),
    anchor: 'low',
  },
  row: {
    a: pose({ e: [42, 57], w: [46, 76] }),
    b: pose({ e: [29, 50], w: [42, 61] }),
  },
  pulldown: {
    a: pose({ e: [28, 12], w: [22, -6], k: [49, 86], f: [50, 112] }),
    b: pose({ e: [27, 50], w: [30, 31], k: [49, 86], f: [50, 112] }),
    load: 'bar',
    noGround: true,
  },
  pullup: {
    a: pose({ e: [28, 14], w: [24, -6], k: [51, 100], f: [52, 124] }),
    b: pose({ hd: [60, -1], s: [45, 17], e: [29, 22], w: [24, -6], h: [52, 58], k: [51, 84], f: [52, 108] }),
    props: '<line class="fig-eq" stroke-width="3" x1="4" y1="-8" x2="116" y2="-8"/>',
    noGround: true,
    noLoad: true,
  },
  curl: {
    a: pose({ e: [41, 55], w: [42, 77] }),
    b: pose({ e: [41, 55], w: [52, 37] }),
    anchor: 'low',
  },
  triceps: {
    a: pose({ e: [42, 56], w: [50, 39] }),
    b: pose({ e: [42, 56], w: [44, 79] }),
  },
  legext: {
    a: pose({ e: [40, 57], w: [40, 76], k: [50, 90], f: [50, 116] }),
    b: pose({ e: [40, 57], w: [40, 76], k: [50, 90], f: [50, 98] }),
    props: '<rect class="fig-prop-ghost" x="30" y="40" width="60" height="58" rx="10"/>',
    noGround: true,
  },
  legcurl: {
    a: pose({}),
    b: pose({ fR: [68, 111] }),
    props: '<rect class="fig-prop-ghost" x="26" y="58" width="68" height="16" rx="6"/>',
  },
  calf: {
    a: pose({}),
    b: pose(Object.fromEntries(Object.entries(BASE).map(([k, [x, y]]) => [k, [x, y - 7]]))),
  },
  plank: {
    a: pose({ e: [43, 57], w: [51, 64] }),
    b: pose({ s: [45, 34], e: [43, 58], w: [51, 65] }),
  },
  crunch: {
    a: pose({ e: [42, 50], w: [55, 44] }),
    b: pose({ hd: [60, 33], s: [46, 46], e: [43, 62], w: [55, 56] }),
  },
  shrug: {
    a: pose({}),
    b: pose({ s: [45, 26], e: [41, 48], w: [40, 69] }),
  },
  jump: {
    a: pose({}),
    b: pose({ hd: [60, 10], s: [45, 28], e: [26, 10], w: [18, -6], h: [52, 69], k: [40, 98], f: [33, 126] }),
    noLoad: true,
  },
  stretch: {
    a: pose({}),
    b: pose({ hd: [71, 18], s: [47, 38], sR: [79, 30], e: [43, 60], w: [43, 82], eR: [89, 12], wR: [80, -4], hR: [68, 74] }),
    noLoad: true,
  },
};

PATTERNS.pushup = PATTERNS.bench;

// Type de mouvement d'après le nom de l'exercice (dans cet ordre), sinon d'après le muscle principal.
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

// ---------------------------------------------------------------------------
// Dessin
// ---------------------------------------------------------------------------

// Vue de dos quand les muscles principaux sont surtout à l'arrière du corps.
const BACK_MUSCLES = ['dorsaux', 'haut_dos', 'lombaires', 'trapezes', 'triceps', 'fessiers', 'ischios', 'mollets'];
export function viewFor(ex) {
  const back = ex.p.filter((m) => BACK_MUSCLES.includes(m)).length;
  return back > ex.p.length - back ? 'back' : 'front';
}

function tone(ex, muscles) {
  if (ex.p.some((m) => muscles.includes(m))) return 'p';
  if (ex.s.some((m) => muscles.includes(m))) return 's';
  return 'n';
}

const JOINTS = ['s', 'e', 'w', 'h', 'k', 'f'];
/** Position complète : côté gauche donné, côté droit par symétrie (sauf exception). */
function resolve(p) {
  const out = { hd: p.hd };
  for (const j of JOINTS) {
    out[`${j}L`] = p[j];
    out[`${j}R`] = p[`${j}R`] || [120 - p[j][0], p[j][1]];
  }
  return out;
}

function halfway(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const get = (p, k) => p[k] || (k.endsWith('R') ? [120 - p[k[0]][0], p[k[0]][1]] : BASE[k]);
  return Object.fromEntries([...keys].map((k) => [k, lerp(get(a, k), get(b, k), 0.5)]));
}

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const plus = (p, dx, dy) => [p[0] + dx, p[1] + dy];
const r1 = (n) => Math.round(n * 10) / 10;
const pt = (p) => `${r1(p[0])} ${r1(p[1])}`;
const poly = (pts) => `M${pts.map(pt).join('L')}Z`;

const DUR = '2.4s';
const SPLINE = 'keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"';

function animate(attr, a, b, still) {
  if (still || a === b) return '';
  return `<animate attributeName="${attr}" values="${a};${b};${a}" ${SPLINE} dur="${DUR}" repeatCount="indefinite"/>`;
}

// Les muscles principaux « respirent » au rythme du mouvement.
const pulse = (cls, still) => (cls === 'fig-p' && !still ? `<animate attributeName="opacity" values="0.72;1;0.72" ${SPLINE} dur="${DUR}" repeatCount="indefinite"/>` : '');

function line(cls, width, A, B, still, extra = '') {
  const [a1, a2] = still ? B : A;
  return `<line class="${cls}" stroke-width="${width}" x1="${r1(a1[0])}" y1="${r1(a1[1])}" x2="${r1(a2[0])}" y2="${r1(a2[1])}"${extra}>
    ${animate('x1', r1(A[0][0]), r1(B[0][0]), still)}${animate('y1', r1(A[0][1]), r1(B[0][1]), still)}${animate('x2', r1(A[1][0]), r1(B[1][0]), still)}${animate('y2', r1(A[1][1]), r1(B[1][1]), still)}${pulse(cls, still)}</line>`;
}

function dot(cls, r, A, B, still) {
  const p = still ? B : A;
  return `<circle class="${cls}" r="${r}" cx="${r1(p[0])}" cy="${r1(p[1])}">${animate('cx', r1(A[0]), r1(B[0]), still)}${animate('cy', r1(A[1]), r1(B[1]), still)}${pulse(cls, still)}</circle>`;
}

function shape(cls, fn, A, B, still) {
  const da = fn(A);
  const db = fn(B);
  return `<path class="${cls}" d="${still ? db : da}">${animate('d', da, db, still)}${pulse(cls, still)}</path>`;
}

// Points du tronc, calculés à partir des épaules et des hanches.
const mid = (P) => ({ s: lerp(P.sL, P.sR, 0.5), h: lerp(P.hL, P.hR, 0.5) });
const torsoPath = (P) => {
  const { h } = mid(P);
  return poly([
    plus(P.sL, -1, -3), plus(lerp(P.sL, P.hL, 0.35), 2, 0), plus(lerp(P.sL, P.hL, 0.72), 5, 0), plus(P.hL, -5, 3), plus(h, 0, 9),
    plus(P.hR, 5, 3), plus(lerp(P.sR, P.hR, 0.72), -5, 0), plus(lerp(P.sR, P.hR, 0.35), -2, 0), plus(P.sR, 1, -3),
  ]);
};
// Une forme du côté gauche (dx vers l'extérieur négatif) et son reflet à droite.
const sides = (fn) => (P) => {
  const c = mid(P);
  return fn(P.sL, P.hL, c, -1) + fn(P.sR, P.hR, c, 1);
};
const axis = (c, t, dx) => plus(lerp(c.s, c.h, t), dx, 0);

const FRONT_TORSO = [
  ['trapezes', sides((s, h, c, o) => poly([axis(c, -0.04, 5 * o), plus(s, -3 * o, -3), plus(s, -4 * o, 1), axis(c, 0.02, 6 * o)]))],
  ['pectoraux', sides((s, h, c, o) => poly([plus(s, -1 * o, 0), axis(c, -0.02, 1 * o), axis(c, 0.36, 1 * o), plus(lerp(s, h, 0.36), -4 * o, 0)]))],
  ['obliques', sides((s, h, c, o) => poly([plus(lerp(s, h, 0.42), -4 * o, 0), axis(c, 0.42, 8 * o), axis(c, 0.9, 8 * o), plus(lerp(s, h, 0.86), -6 * o, 0)]))],
  ['abdos', (P) => {
    const c = mid(P);
    return [0, 1, 2].map((i) => {
      const t0 = 0.38 + i * 0.18;
      const t1 = t0 + 0.15;
      return poly([axis(c, t0, -6.5), axis(c, t0, -1), axis(c, t1, -1), axis(c, t1, -6.5)]) + poly([axis(c, t0, 1), axis(c, t0, 6.5), axis(c, t1, 6.5), axis(c, t1, 1)]);
    }).join('');
  }],
];

const BACK_TORSO = [
  ['haut_dos', sides((s, h, c, o) => poly([plus(s, -3 * o, 4), plus(lerp(s, h, 0.3), -4 * o, 0), axis(c, 0.34, 4 * o), axis(c, 0.08, 5 * o)]))],
  ['dorsaux', sides((s, h, c, o) => poly([plus(lerp(s, h, 0.24), -2 * o, 0), plus(lerp(s, h, 0.7), -5 * o, 0), axis(c, 0.84, 3 * o), axis(c, 0.4, 5 * o)]))],
  ['trapezes', (P) => {
    const c = mid(P);
    return poly([axis(c, -0.14, 0), plus(P.sL, 3, -2), axis(c, 0.4, 0), plus(P.sR, -3, -2)]);
  }],
  ['lombaires', (P) => {
    const c = mid(P);
    return poly([axis(c, 0.66, -6), axis(c, 0.66, -1), axis(c, 0.98, -1), axis(c, 0.98, -6)]) + poly([axis(c, 0.66, 1), axis(c, 0.66, 6), axis(c, 0.98, 6), axis(c, 0.98, 1)]);
  }],
];

const GLUTES = sides((s, h, c, o) => poly([plus(h, 4 * o, 0), plus(c.h, 1 * o, -3), plus(c.h, 1 * o, 12), plus(h, 2 * o, 14)]));

function load(ex, pattern, A, B, still) {
  const P = PATTERNS[pattern];
  if (P.noLoad) return '';
  const eq = ex.eq;
  const hands = (X) => [X.wL, X.wR];
  if (eq === 'Barre' || eq === 'Barre EZ') {
    const bar = (X) => [plus(X.wL, -14, 0), plus(X.wR, 14, 0)];
    const plate = (X, side) => {
      const end = bar(X)[side];
      return [plus(end, 0, -11), plus(end, 0, 11)];
    };
    return line('fig-eq', 3, bar(A), bar(B), still) + line('fig-plate', 7, plate(A, 0), plate(B, 0), still) + line('fig-plate', 7, plate(A, 1), plate(B, 1), still);
  }
  if (eq === 'Haltères') {
    return [0, 1].map((i) => {
      const handle = (X) => [plus(hands(X)[i], -6, 0), plus(hands(X)[i], 6, 0)];
      const end = (X, k) => {
        const p = handle(X)[k];
        return [plus(p, 0, -5), plus(p, 0, 5)];
      };
      return line('fig-eq', 3, handle(A), handle(B), still) + line('fig-plate', 4.5, end(A, 0), end(B, 0), still) + line('fig-plate', 4.5, end(A, 1), end(B, 1), still);
    }).join('');
  }
  if (eq === 'Kettlebell') {
    const c = (X) => plus(lerp(X.wL, X.wR, 0.5), 0, 7);
    return dot('fig-plate', 7, c(A), c(B), still);
  }
  if (eq === 'Poulie') {
    if (P.load === 'bar') {
      const c = (X) => lerp(X.wL, X.wR, 0.5);
      return line('fig-eq', 3, [plus(A.wL, -6, 0), plus(A.wR, 6, 0)], [plus(B.wL, -6, 0), plus(B.wR, 6, 0)], still) +
        line('fig-cable', 1.6, [[60, -16], c(A)], [[60, -16], c(B)], still);
    }
    const anchors = P.anchor === 'sides' ? [[2, -12], [118, -12]] : P.anchor === 'low' ? [[60, 140], [60, 140]] : [[60, -16], [60, -16]];
    return [0, 1].map((i) => line('fig-cable', 1.6, [anchors[i], hands(A)[i]], [anchors[i], hands(B)[i]], still)).join('') +
      anchors.map((a) => `<circle class="fig-pulley" r="3.5" cx="${a[0]}" cy="${a[1]}"/>`).join('');
  }
  if (eq === 'Élastique') {
    return [0, 1].map((i) => line('fig-cable', 1.8, [i ? A.fR : A.fL, hands(A)[i]], [i ? B.fR : B.fL, hands(B)[i]], still, ' stroke-dasharray="3 3"')).join('');
  }
  return '';
}

// Cadre resserré autour du personnage : carré qui contient les deux positions.
const UPPER = new Set(['curl', 'triceps', 'raise', 'ohp', 'bench', 'pushup', 'row', 'shrug', 'crunch', 'plank']);
function cropBox(pattern, A, B, focusUpper) {
  const keys = focusUpper && UPPER.has(pattern) ? ['hd', 'sL', 'sR', 'eL', 'eR', 'wL', 'wR', 'hL', 'hR'] : Object.keys(A);
  const pts = [A, B].flatMap((X) => keys.map((k) => X[k]));
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  const pad = 12;
  const [x0, x1, y0, y1] = [Math.min(...xs) - pad, Math.max(...xs) + pad, Math.min(...ys) - pad, Math.max(...ys) + pad];
  const side = Math.max(x1 - x0, y1 - y0, 60);
  return `${r1((x0 + x1 - side) / 2)} ${r1((y0 + y1 - side) / 2)} ${r1(side)} ${r1(side)}`;
}

/**
 * Illustration d'un exercice.
 * @param still image fixe (vignettes de liste), sinon le personnage fait le mouvement en boucle
 * @param crop cadre resserré sur le personnage (sur le haut du corps pour les exercices du haut, en vignette)
 */
export function exerciseFigure(ex, { size = 120, still = false, crop = false } = {}) {
  const pattern = patternFor(ex);
  const P = PATTERNS[pattern];
  // En image fixe, la position à mi-mouvement montre le sens de l'exercice.
  const B = resolve(still ? halfway(P.a, P.b) : P.b);
  const A = still ? B : resolve(P.a);
  const view = viewFor(ex);
  const T = (muscles) => `fig-${tone(ex, muscles)}`;
  const seg = (cls, width, j1, j2, side, extra) => line(cls, width, [A[j1 + side], A[j2 + side]], [B[j1 + side], B[j2 + side]], still, extra);

  const legs = ['L', 'R'].map((side) => {
    const o = side === 'L' ? 1 : -1;
    const inner = (X) => [plus(X[`h${side}`], 3.5 * o, 2), plus(X[`k${side}`], 3 * o, -3)];
    return seg(T(view === 'front' ? ['quadriceps'] : ['ischios']), 13, 'h', 'k', side) +
      line(T(['adducteurs']), 3.6, inner(A), inner(B), still) +
      seg(T(['mollets']), 9, 'k', 'f', side) +
      dot('fig-n', 4.2, A[`f${side}`], B[`f${side}`], still);
  }).join('');

  const arms = ['L', 'R'].map((side) =>
    seg(T(view === 'front' ? ['biceps'] : ['triceps']), 9.5, 's', 'e', side) +
    seg(T(['avant_bras']), 7.5, 'e', 'w', side) +
    dot('fig-n', 3.8, A[`w${side}`], B[`w${side}`], still) +
    dot(T(['epaules']), 6.2, A[`s${side}`], B[`s${side}`], still)).join('');

  const neck = (X) => [plus(X.hd, 0, 6), mid(X).s];
  const torso = (view === 'front' ? FRONT_TORSO : BACK_TORSO).map(([m, fn]) => shape(T([m]), fn, A, B, still)).join('');
  const viewBox = crop ? cropBox(pattern, A, B, still) : '0 -16 120 158';

  return `<svg class="fig fig-${view}" width="${size}" height="${size}" viewBox="${viewBox}" role="img" aria-label="${view === 'front' ? 'Vue de face' : 'Vue de dos'}">
    ${P.noGround ? '' : '<line class="fig-ground" x1="4" y1="138" x2="116" y2="138"/>'}
    ${P.props || ''}
    ${ex.eq === 'Machine' && !P.props ? '<rect class="fig-prop-ghost" x="18" y="-6" width="84" height="126" rx="12"/>' : ''}
    ${legs}
    ${view === 'back' ? shape(T(['fessiers']), GLUTES, A, B, still) : ''}
    ${line('fig-n', 7, neck(A), neck(B), still)}
    ${shape('fig-n fig-torso', torsoPath, A, B, still)}
    ${torso}
    ${dot('fig-head', 9.5, A.hd, B.hd, still)}
    ${arms}
    ${load(ex, pattern, A, B, still)}
  </svg>`;
}
