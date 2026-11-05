// Personnage 3D animé : un mannequin musclé fait le mouvement de façon fluide, muscles travaillés en couleur.
// Moteur : three.js (licence MIT), chargé seulement à l'ouverture d'une fiche exercice. Personnage et
// mouvements sont dessinés ici, à partir des mêmes familles de mouvements que les illustrations 2D.
import { patternFor } from './figure.js';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';
let threePromise = null;
export const loadThree = () => (threePromise ??= import(THREE_URL));

const DEG = Math.PI / 180;
const DUR = 2.8; // secondes par répétition

// ---------------------------------------------------------------------------
// Mouvements : angles en degrés pour la position A et la position B.
// sh/el/hip/kn/an s'appliquent aux deux côtés, shL/shR… à un seul. sh et hip : { f: flexion, a: abduction }.
// ---------------------------------------------------------------------------

const ARMS_DOWN = { sh: { f: 4, a: 8 }, el: 8 };
const HOLD_FRONT = { sh: { f: 10, a: 12 }, el: 12 };

const MOVES = {
  squat: {
    a: { sh: { f: 20, a: 62 }, el: 120 },
    b: { sh: { f: 20, a: 62 }, el: 120, hip: { f: 124, a: 14 }, kn: 120, an: -24, root: { pitch: 30 }, chest: 4, neck: -18 },
    bar: 'back', anchor: 'feet',
  },
  legpress: {
    a: { ...HOLD_FRONT, hip: { f: 25, a: 10 }, kn: 30, root: { pitch: -55 }, an: 20 },
    b: { ...HOLD_FRONT, hip: { f: 115, a: 14 }, kn: 120, root: { pitch: -55 }, an: -10 },
    anchor: 'fixed', fixed: { y: 0.62, z: -0.2 }, seat: 'recline', cam: { y: 0.7 },
  },
  lunge: {
    a: { ...ARMS_DOWN, hipL: { f: 8 }, hipR: { f: -8 }, knR: 6 },
    b: { ...ARMS_DOWN, hipL: { f: 82 }, knL: 88, anL: -12, hipR: { f: -22 }, knR: 98, anR: 25, spine: 4 },
    anchor: 'feet',
  },
  hinge: {
    a: { sh: { f: 76, a: 8 }, el: 4, hip: { f: 84, a: 6 }, kn: 22, an: -8, root: { pitch: 72 }, spine: 4, neck: -30 },
    b: { sh: { f: 6, a: 8 }, el: 4, hip: { f: 2, a: 6 }, kn: 3 },
    bar: 'hands', anchor: 'feet',
  },
  hipthrust: {
    a: { sh: { f: 30, a: 40 }, el: 30, hip: { f: 78, a: 12 }, kn: 112, root: { pitch: -90 } },
    b: { sh: { f: 30, a: 40 }, el: 30, hip: { f: 6, a: 12 }, kn: 100, root: { pitch: -112 } },
    anchor: 'feet', markers: ['heel', 'toe', 'shoulders'], bar: 'hips',
  },
  bench: {
    a: { sh: { f: 18, a: 76 }, el: 96, hip: { f: 8, a: 14 }, kn: 92, root: { pitch: -90 } },
    b: { sh: { f: 88, a: 10 }, el: 4, hip: { f: 8, a: 14 }, kn: 92, root: { pitch: -90 } },
    anchor: 'fixed', fixed: { y: 0.56, z: 0.18 }, bench: 'flat', bar: 'hands', cam: { y: 0.65, dist: 3.6 },
  },
  pushup: {
    a: { sh: { f: 80, a: 14 }, el: 2, root: { pitch: 76 } },
    b: { sh: { f: 34, a: 40 }, el: 98, root: { pitch: 86 } },
    anchor: 'feet', markers: ['toe', 'hand'], cam: { y: 0.35, dist: 3.4 },
  },
  dip: {
    a: { sh: { f: 0, a: 6 }, el: 2, kn: 70, hip: { f: 20 } },
    b: { sh: { f: -42, a: 14 }, el: 92, kn: 70, hip: { f: 20 }, spine: 14 },
    anchor: 'hands', grip: { y: 1.45 }, bars: 'dip', noGround: true,
  },
  ohp: {
    a: { sh: { f: 32, a: 58 }, el: 128 },
    b: { sh: { f: 172, a: 14 }, el: 4 },
    bar: 'hands', anchor: 'feet',
  },
  raise: {
    a: { sh: { f: 6, a: 10 }, el: 12 },
    b: { sh: { f: 8, a: 86 }, el: 16 },
    anchor: 'feet',
  },
  row: {
    a: { sh: { f: 64, a: 10 }, el: 6, hip: { f: 74, a: 6 }, kn: 26, an: -8, root: { pitch: 62 }, neck: -28 },
    b: { sh: { f: 40, a: 28 }, el: 104, hip: { f: 74, a: 6 }, kn: 26, an: -8, root: { pitch: 62 }, neck: -28 },
    bar: 'hands', anchor: 'feet',
  },
  pulldown: {
    a: { sh: { f: 168, a: 26 }, el: 8, hip: { f: 88 }, kn: 92 },
    b: { sh: { f: 36, a: 66 }, el: 122, hip: { f: 88 }, kn: 92, spine: -8 },
    anchor: 'fixed', fixed: { y: 0.55, z: 0 }, seat: 'box', cable: 'top', bar: 'hands', cam: { y: 1.05, dist: 4.4 },
  },
  pullup: {
    a: { sh: { f: 170, a: 24 }, el: 6, kn: 40, hip: { f: 14 } },
    b: { sh: { f: 58, a: 58 }, el: 134, kn: 40, hip: { f: 14 } },
    anchor: 'hands', grip: { y: 2.2 }, bars: 'pullup', noGround: true, cam: { y: 1.4, dist: 4.8 },
  },
  curl: {
    a: { sh: { f: 2, a: 8 }, el: 6 },
    b: { sh: { f: 14, a: 8 }, el: 140 },
    anchor: 'feet',
  },
  triceps: {
    a: { sh: { f: 26, a: 10 }, el: 104, hip: { f: 14 }, kn: 6, root: { pitch: 14 } },
    b: { sh: { f: 18, a: 10 }, el: 4, hip: { f: 14 }, kn: 6, root: { pitch: 14 } },
    anchor: 'feet', cable: 'top',
  },
  legext: {
    a: { ...HOLD_FRONT, hip: { f: 92 }, kn: 92, an: 10 },
    b: { ...HOLD_FRONT, hip: { f: 92 }, kn: 4, an: 10 },
    anchor: 'fixed', fixed: { y: 0.55, z: 0 }, seat: 'box', cam: { y: 0.7 },
  },
  legcurl: {
    a: { sh: { f: 10, a: 30 }, el: 20, kn: 4, root: { pitch: 90 } },
    b: { sh: { f: 10, a: 30 }, el: 20, kn: 115, root: { pitch: 90 } },
    anchor: 'fixed', fixed: { y: 0.62, z: 0.1 }, bench: 'flat', cam: { y: 0.6, dist: 3.8 },
  },
  calf: {
    a: { ...ARMS_DOWN, an: 0 },
    b: { ...ARMS_DOWN, an: 34 },
    anchor: 'feet', markers: ['toe', 'heel'],
  },
  plank: {
    a: { sh: { f: 88, a: 12 }, el: 90, root: { pitch: 82 } },
    b: { sh: { f: 88, a: 12 }, el: 90, root: { pitch: 80 }, spine: -3 },
    anchor: 'feet', markers: ['toe', 'elbow'], noBar: true, cam: { y: 0.3, dist: 3.4 },
  },
  crunch: {
    a: { sh: { f: 150, a: 60 }, el: 140, hip: { f: 55, a: 10 }, kn: 95, root: { pitch: -90 } },
    b: { sh: { f: 150, a: 60 }, el: 140, hip: { f: 55, a: 10 }, kn: 95, root: { pitch: -90 }, spine: 32, chest: 14, neck: 12 },
    anchor: 'feet', markers: ['heel', 'toe', 'back'], noBar: true, cam: { y: 0.3, dist: 3.2 },
  },
  shrug: {
    a: { ...ARMS_DOWN },
    b: { ...ARMS_DOWN, shrug: 0.045 },
    anchor: 'feet',
  },
  jump: {
    a: { sh: { f: 2, a: 8 }, el: 6 },
    b: { sh: { f: 4, a: 158 }, el: 10, hip: { a: 22 }, air: 0.1 },
    anchor: 'feet',
  },
  stretch: {
    a: { ...ARMS_DOWN },
    b: { shL: { f: 6, a: 10 }, elL: 6, shR: { f: 4, a: 168 }, elR: 18, roll: 22 },
    anchor: 'feet',
  },
};

// ---------------------------------------------------------------------------
// Construction du personnage
// ---------------------------------------------------------------------------

function buildBody(THREE, worked) {
  const mats = {
    skin: new THREE.MeshStandardMaterial({ color: 0xc5cad3, roughness: 0.55, metalness: 0.04 }),
    muscle: new THREE.MeshStandardMaterial({ color: 0xb9bfc9, roughness: 0.5, metalness: 0.04 }),
    p: new THREE.MeshStandardMaterial({ color: 0xe8443a, roughness: 0.42, emissive: 0x7a0d08, emissiveIntensity: 0.2 }),
    s: new THREE.MeshStandardMaterial({ color: 0xf3994a, roughness: 0.45, emissive: 0x6a2e05, emissiveIntensity: 0.12 }),
    shorts: new THREE.MeshStandardMaterial({ color: 0x2c313a, roughness: 0.85 }),
  };
  const sphere = new THREE.SphereGeometry(1, 28, 20);
  const muscles = [];

  const blob = (parent, sx, sy, sz, x, y, z, mat = mats.skin, rot) => {
    const m = new THREE.Mesh(sphere, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    parent.add(m);
    return m;
  };
  const muscle = (key, parent, ...args) => {
    const level = worked.p.includes(key) ? 'p' : worked.s.includes(key) ? 's' : '';
    const m = blob(parent, ...args.slice(0, 6), level ? mats[level] : mats.muscle, args[6]);
    muscles.push({ key, mesh: m, level });
    return m;
  };
  // Membre arrondi : profil du haut vers le bas, extrémités en demi-sphères.
  const limb = (parent, len, r0, rm, r1, mat = mats.skin) => {
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      pts.push(new THREE.Vector2(Math.cos(a) * r1, -len - Math.sin(a) * r1 * 0.8));
    }
    pts.reverse();
    const body = [];
    for (let i = 1; i < 16; i++) {
      const t = i / 16;
      const r = (1 - t) * (1 - t) * r0 + 2 * (1 - t) * t * rm * 1.08 + t * t * r1;
      body.push(new THREE.Vector2(r, -t * len));
    }
    body.reverse();
    const top = [];
    for (let i = 6; i >= 0; i--) {
      const a = (i / 6) * (Math.PI / 2);
      top.push(new THREE.Vector2(Math.cos(a) * r0, Math.sin(a) * r0 * 0.8));
    }
    const geo = new THREE.LatheGeometry([...pts, ...body, ...top.reverse()].map((p) => new THREE.Vector2(Math.max(0.0001, p.x), p.y)), 26);
    const m = new THREE.Mesh(geo, mat);
    parent.add(m);
    return m;
  };
  const group = (parent, x, y, z) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  const marker = (parent, x, y, z) => group(parent, x, y, z);

  const J = {};
  const M = {};
  const root = new THREE.Group();
  J.root = root;

  // Bassin
  blob(root, 0.165, 0.115, 0.118, 0, 0.02, 0, mats.shorts);
  muscle('fessiers', root, 0.088, 0.095, 0.072, 0.072, -0.02, -0.07);
  muscle('fessiers', root, 0.088, 0.095, 0.072, -0.072, -0.02, -0.07);
  J.hipBar = marker(root, 0, 0.0, 0.16);

  // Abdomen
  J.spine = group(root, 0, 0.08, 0);
  blob(J.spine, 0.142, 0.15, 0.104, 0, 0.1, 0);
  [0.035, 0.1, 0.165].forEach((y) => [-0.038, 0.038].forEach((x) => muscle('abdos', J.spine, 0.034, 0.03, 0.02, x, y, 0.092)));
  muscle('obliques', J.spine, 0.042, 0.1, 0.075, 0.115, 0.08, 0.02, [0, 0, 0.12]);
  muscle('obliques', J.spine, 0.042, 0.1, 0.075, -0.115, 0.08, 0.02, [0, 0, -0.12]);
  muscle('lombaires', J.spine, 0.045, 0.1, 0.04, 0.045, 0.1, -0.082);
  muscle('lombaires', J.spine, 0.045, 0.1, 0.04, -0.045, 0.1, -0.082);
  M.back = marker(J.spine, 0, 0.12, -0.11);

  // Thorax
  J.chest = group(J.spine, 0, 0.2, 0);
  blob(J.chest, 0.198, 0.19, 0.124, 0, 0.15, 0);
  muscle('pectoraux', J.chest, 0.098, 0.078, 0.046, 0.086, 0.19, 0.088, [0, 0.25, -0.15]);
  muscle('pectoraux', J.chest, 0.098, 0.078, 0.046, -0.086, 0.19, 0.088, [0, -0.25, 0.15]);
  muscle('dorsaux', J.chest, 0.07, 0.16, 0.062, 0.138, 0.1, -0.05, [0, 0, 0.18]);
  muscle('dorsaux', J.chest, 0.07, 0.16, 0.062, -0.138, 0.1, -0.05, [0, 0, -0.18]);
  muscle('haut_dos', J.chest, 0.095, 0.085, 0.036, 0, 0.2, -0.1);
  muscle('trapezes', J.chest, 0.135, 0.065, 0.07, 0, 0.3, -0.035);
  J.backBar = marker(J.chest, 0, 0.31, -0.11);
  M.shoulders = marker(J.chest, 0, 0.26, -0.12);

  // Cou et tête
  J.neck = group(J.chest, 0, 0.33, 0);
  blob(J.neck, 0.058, 0.07, 0.058, 0, 0.04, 0);
  J.head = group(J.neck, 0, 0.1, 0);
  blob(J.head, 0.1, 0.122, 0.112, 0, 0.1, 0.005);

  // Bras
  ['L', 'R'].forEach((side) => {
    const s = side === 'L' ? 1 : -1;
    const sh = group(J.chest, 0.21 * s, 0.27, 0);
    sh.rotation.order = 'ZXY';
    J[`sh${side}`] = sh;
    muscle('epaules', sh, 0.07, 0.072, 0.074, 0.012 * s, -0.02, 0);
    limb(sh, 0.29, 0.054, 0.05, 0.04);
    muscle('biceps', sh, 0.042, 0.088, 0.046, 0, -0.165, 0.03);
    muscle('triceps', sh, 0.045, 0.1, 0.046, 0, -0.155, -0.03);
    const el = group(sh, 0, -0.29, 0);
    J[`el${side}`] = el;
    const fore = limb(el, 0.26, 0.045, 0.042, 0.029);
    const level = worked.p.includes('avant_bras') ? 'p' : worked.s.includes('avant_bras') ? 's' : '';
    if (level) fore.material = mats[level];
    muscles.push({ key: 'avant_bras', mesh: fore, level });
    const hand = group(el, 0, -0.26, 0);
    J[`hand${side}`] = hand;
    blob(hand, 0.03, 0.062, 0.045, 0, -0.05, 0.005);
    M[`hand${side}`] = marker(hand, 0, -0.06, 0);
    M[`elbow${side}`] = marker(el, 0, -0.02, 0);
  });

  // Jambes
  ['L', 'R'].forEach((side) => {
    const s = side === 'L' ? 1 : -1;
    const hip = group(root, 0.095 * s, -0.04, 0);
    hip.rotation.order = 'ZXY';
    J[`hip${side}`] = hip;
    limb(hip, 0.44, 0.088, 0.078, 0.05, mats.skin);
    blob(hip, 0.092, 0.08, 0.098, 0, -0.03, 0, mats.shorts);
    muscle('quadriceps', hip, 0.07, 0.185, 0.058, 0, -0.21, 0.035);
    muscle('ischios', hip, 0.062, 0.17, 0.052, 0, -0.21, -0.042);
    muscle('adducteurs', hip, 0.035, 0.13, 0.048, -0.042 * s, -0.15, 0);
    const kn = group(hip, 0, -0.44, 0);
    J[`kn${side}`] = kn;
    limb(kn, 0.42, 0.05, 0.048, 0.032);
    muscle('mollets', kn, 0.046, 0.115, 0.048, 0, -0.12, -0.032);
    const an = group(kn, 0, -0.42, 0);
    J[`an${side}`] = an;
    blob(an, 0.046, 0.036, 0.122, 0, -0.035, 0.06);
    M[`heel${side}`] = marker(an, 0, -0.07, -0.05);
    M[`toe${side}`] = marker(an, 0, -0.07, 0.17);
  });

  return { root, J, M, muscles, mats, sphere };
}

// ---------------------------------------------------------------------------
// Accessoires : barre, haltères, banc, barre de traction, poulie…
// ---------------------------------------------------------------------------

function buildProps(THREE, move, eq, body) {
  const metal = new THREE.MeshStandardMaterial({ color: 0x8d949e, roughness: 0.35, metalness: 0.7 });
  const plate = new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.6, metalness: 0.2 });
  const pad = new THREE.MeshStandardMaterial({ color: 0x30353d, roughness: 0.8 });
  const frame = new THREE.MeshStandardMaterial({ color: 0x5b626c, roughness: 0.5, metalness: 0.5 });
  const scene = new THREE.Group();
  const dyn = {};
  const cyl = (r, h, mat, seg = 20) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

  const isBar = eq === 'Barre' || eq === 'Barre EZ';
  if (isBar && !move.noBar) {
    move.bar ??= 'hands';
    const bar = new THREE.Group();
    const shaft = cyl(0.014, 1.72, metal);
    shaft.rotation.z = Math.PI / 2;
    bar.add(shaft);
    [-1, 1].forEach((s) => {
      [0.62, 0.67].forEach((x, i) => {
        const p = cyl(i ? 0.17 : 0.225, 0.045, plate, 32);
        p.rotation.z = Math.PI / 2;
        p.position.x = x * s;
        bar.add(p);
      });
    });
    scene.add(bar);
    dyn.bar = bar;
  }
  if (eq === 'Haltères' || (eq === 'Kettlebell' && !move.bar)) {
    ['L', 'R'].forEach((side) => {
      const d = new THREE.Group();
      if (eq === 'Kettlebell') {
        const bell = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), plate);
        bell.position.y = -0.1;
        d.add(bell);
      } else {
        const handle = cyl(0.015, 0.16, metal);
        handle.rotation.z = Math.PI / 2;
        d.add(handle);
        [-0.075, 0.075].forEach((x) => {
          const p = cyl(0.058, 0.05, plate, 6);
          p.rotation.z = Math.PI / 2;
          p.position.x = x;
          d.add(p);
        });
      }
      d.position.set(0, -0.06, 0.01);
      body.J[`hand${side}`].add(d);
    });
  }
  if (move.bench) {
    const b = new THREE.Group();
    const top = box(0.32, 0.08, 1.2, pad);
    top.position.y = 0.4;
    b.add(top);
    [-0.45, 0.45].forEach((z) => {
      const leg = box(0.06, 0.4, 0.3, frame);
      leg.position.set(0, 0.2, z);
      b.add(leg);
    });
    b.position.z = move.key === 'legcurl' ? 0.35 : -0.2;
    scene.add(b);
  }
  if (move.seat) {
    const s = new THREE.Group();
    const seat = box(0.4, 0.1, 0.4, pad);
    seat.position.set(0, 0.36, -0.05);
    s.add(seat);
    const post = box(0.08, 0.32, 0.08, frame);
    post.position.set(0, 0.16, -0.05);
    s.add(post);
    if (move.seat === 'recline') {
      const back = box(0.42, 0.08, 0.75, pad);
      back.position.set(0, 0.62, -0.42);
      back.rotation.x = -0.96;
      s.add(back);
      // Le chariot de la presse suit les pieds.
      const sled = box(0.62, 0.05, 0.5, frame);
      scene.add(sled);
      dyn.sled = sled;
    }
    scene.add(s);
  }
  if (move.bars === 'pullup') {
    const bar = cyl(0.02, 1.4, metal);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, move.grip.y, 0);
    scene.add(bar);
    [-0.7, 0.7].forEach((x) => {
      const post = cyl(0.03, move.grip.y + 0.1, frame);
      post.position.set(x, (move.grip.y + 0.1) / 2, -0.05);
      scene.add(post);
    });
  }
  if (move.bars === 'dip') {
    [-1, 1].forEach((s) => {
      const bar = cyl(0.022, 0.8, metal);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(0.27 * s, move.grip.y - 0.02, 0);
      scene.add(bar);
      [-0.35, 0.35].forEach((z) => {
        const post = cyl(0.025, move.grip.y, frame);
        post.position.set(0.27 * s, move.grip.y / 2, z);
        scene.add(post);
      });
    });
  }
  if (move.cable || eq === 'Poulie') {
    const tower = box(0.16, 2.3, 0.16, frame);
    tower.position.set(0, 1.15, -0.75);
    scene.add(tower);
    const pulleyY = move.cable === 'top' || ['pulldown', 'triceps'].includes(move.key) ? 2.25 : 0.25;
    const pulley = new THREE.Vector3(0, pulleyY, move.key === 'triceps' ? 0.32 : move.cable === 'top' ? -0.1 : 0.35);
    const geo = new THREE.BufferGeometry().setFromPoints([pulley, pulley.clone()]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x1d2128 }));
    scene.add(line);
    dyn.cable = { line, pulley };
    if (!dyn.bar && move.cable === 'top' && move.key === 'pulldown') {
      const handle = cyl(0.014, 1.0, metal);
      handle.rotation.z = Math.PI / 2;
      const g = new THREE.Group();
      g.add(handle);
      scene.add(g);
      dyn.bar = g;
    }
  }
  return { scene, dyn };
}

// ---------------------------------------------------------------------------
// Pose et animation
// ---------------------------------------------------------------------------

const lerp = (a, b, t) => a + (b - a) * t;

function poseAt(move, t) {
  const A = move.a;
  const B = move.b;
  const num = (k, side, sub) => {
    const pick = (P) => {
      const v = P[`${k}${side}`] ?? P[k];
      if (sub) return v?.[sub] ?? 0;
      return typeof v === 'number' ? v : 0;
    };
    return lerp(pick(A), pick(B), t);
  };
  const out = {};
  ['L', 'R'].forEach((s) => {
    out[`sh${s}`] = { f: num('sh', s, 'f'), a: num('sh', s, 'a') };
    out[`hip${s}`] = { f: num('hip', s, 'f'), a: num('hip', s, 'a') };
    out[`el${s}`] = num('el', s);
    out[`kn${s}`] = num('kn', s);
    out[`an${s}`] = num('an', s);
  });
  const r = (P, k) => P.root?.[k] ?? 0;
  out.pitch = lerp(r(A, 'pitch'), r(B, 'pitch'), t);
  out.spine = lerp(A.spine || 0, B.spine || 0, t);
  out.chest = lerp(A.chest || 0, B.chest || 0, t);
  out.neck = lerp(A.neck || 0, B.neck || 0, t);
  out.roll = lerp(A.roll || 0, B.roll || 0, t);
  out.shrug = lerp(A.shrug || 0, B.shrug || 0, t);
  out.air = lerp(A.air || 0, B.air || 0, t);
  return out;
}

function applyPose(THREE, body, move, pose, tmp) {
  const { J, M } = body;
  ['L', 'R'].forEach((s) => {
    const k = s === 'L' ? 1 : -1;
    J[`sh${s}`].rotation.set(-pose[`sh${s}`].f * DEG, 0, k * pose[`sh${s}`].a * DEG);
    J[`sh${s}`].position.y = 0.27 + pose.shrug;
    J[`el${s}`].rotation.x = -pose[`el${s}`] * DEG;
    J[`hip${s}`].rotation.set(-pose[`hip${s}`].f * DEG, 0, k * pose[`hip${s}`].a * DEG);
    J[`kn${s}`].rotation.x = pose[`kn${s}`] * DEG;
    J[`an${s}`].rotation.x = pose[`an${s}`] * DEG;
  });
  J.spine.rotation.set(pose.spine * DEG, 0, pose.roll * DEG);
  J.chest.rotation.x = pose.chest * DEG;
  J.neck.rotation.x = pose.neck * DEG;
  J.root.rotation.set(pose.pitch * DEG, 0, 0);
  J.root.position.set(0, 0, 0);
  J.root.updateMatrixWorld(true);

  const world = (o) => o.getWorldPosition(tmp.clone());
  if (move.anchor === 'fixed') {
    J.root.position.set(0, move.fixed.y, move.fixed.z);
  } else if (move.anchor === 'hands') {
    const mid = world(M.handL).add(world(M.handR)).multiplyScalar(0.5);
    J.root.position.set(-mid.x, move.grip.y - mid.y, -mid.z);
  } else {
    // Pieds (ou mains, coudes…) posés au sol, et pieds immobiles d'une image à l'autre.
    const names = move.markers || ['heel', 'toe'];
    const pts = names.flatMap((n) => ['L', 'R'].map((s) => world(M[n] || M[`${n}${s}`])));
    const minY = Math.min(...pts.map((p) => p.y));
    const feet = world(M.heelL).add(world(M.heelR)).multiplyScalar(0.5);
    J.root.position.set(-feet.x, -minY + pose.air, -feet.z);
  }
  J.root.updateMatrixWorld(true);
}

function updateProps(body, props, move, tmp) {
  const { M, J } = body;
  const { bar, cable, sled } = props.dyn;
  if (sled) {
    const feet = M.heelL.getWorldPosition(tmp.clone()).add(M.heelR.getWorldPosition(tmp.clone())).add(M.toeL.getWorldPosition(tmp.clone())).add(M.toeR.getWorldPosition(tmp.clone())).multiplyScalar(0.25);
    sled.position.copy(feet).add(tmp.clone().set(0, 0.02, 0.04));
    sled.rotation.set(-0.6, 0, 0);
  }
  const hL = M.handL.getWorldPosition(tmp.clone());
  const hR = M.handR.getWorldPosition(tmp.clone());
  if (bar) {
    if (move.bar === 'back' || move.bar === 'hips') {
      const at = move.bar === 'back' ? J.backBar : J.hipBar;
      at.getWorldPosition(bar.position);
      bar.quaternion.copy(at.getWorldQuaternion(bar.quaternion.clone()));
    } else {
      bar.position.copy(hL).add(hR).multiplyScalar(0.5);
      const dir = hL.clone().sub(hR).normalize();
      bar.quaternion.setFromUnitVectors(tmp.clone().set(1, 0, 0), dir);
    }
  }
  if (cable) {
    const end = bar && move.cable === 'top' ? bar.position : hL.clone().add(hR).multiplyScalar(0.5);
    const pos = cable.line.geometry.attributes.position;
    pos.setXYZ(0, cable.pulley.x, cable.pulley.y, cable.pulley.z);
    pos.setXYZ(1, end.x, end.y, end.z);
    pos.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// Montage dans la page
// ---------------------------------------------------------------------------

function shadowTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.42)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/**
 * Lance l'animation 3D d'un exercice dans `host`. Renvoie une fonction d'arrêt.
 * Glisser le doigt fait tourner le personnage.
 */
export async function mountExercise3D(host, ex, { freeze = null } = {}) {
  const THREE = await loadThree();
  if (!host.isConnected) return () => {};
  const pattern = patternFor(ex);
  const move = { key: pattern, ...(MOVES[pattern] || MOVES.stretch) };
  const worked = { p: ex.p || [], s: ex.s || [] };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    host.classList.add('no-3d');
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.className = 'ex3d-canvas';
  host.prepend(canvas);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(2.2, 3.4, 2.6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe7ff, 1.2);
  rim.position.set(-2.5, 2.2, -2.8);
  scene.add(rim);

  const stage = new THREE.Group();
  scene.add(stage);
  const body = buildBody(THREE, worked);
  stage.add(body.root);
  const props = buildProps(THREE, move, ex.eq, body);
  stage.add(props.scene);
  if (!move.noGround) {
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: shadowTexture(THREE), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    stage.add(shadow);
  }

  // Cadrage automatique : la boîte qui contient le personnage (et sa barre) sur tout le mouvement.
  const tmp = new THREE.Vector3();
  const bounds = new THREE.Box3();
  [0, 0.5, 1].forEach((t) => {
    applyPose(THREE, body, move, poseAt(move, t), tmp);
    updateProps(body, props, move, tmp);
    bounds.union(new THREE.Box3().setFromObject(body.root));
    if (props.dyn.bar) bounds.union(new THREE.Box3().setFromObject(props.dyn.bar));
  });
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = bounds.getSize(new THREE.Vector3()).length() / 2;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  let azimuth = 38 * DEG;
  let elevation = 12 * DEG;
  let dist = 4;
  const placeCamera = () => {
    camera.position.set(
      center.x + Math.sin(azimuth) * Math.cos(elevation) * dist,
      center.y + Math.sin(elevation) * dist,
      center.z + Math.cos(azimuth) * Math.cos(elevation) * dist,
    );
    camera.lookAt(center);
  };

  const resize = () => {
    const w = host.clientWidth || 300;
    const h = host.clientHeight || 220;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Assez loin pour que le personnage tienne entier, quel que soit l'angle de vue.
    const vHalf = (camera.fov * DEG) / 2;
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    dist = (radius * 0.86) / Math.sin(Math.min(vHalf, hHalf));
    placeCamera();
  };
  resize();

  // Glisser pour tourner autour du personnage.
  let drag = null;
  const down = (e) => {
    drag = { x: e.clientX, y: e.clientY, az: azimuth, el: elevation };
    host.classList.add('dragging');
  };
  const moveDrag = (e) => {
    if (!drag) return;
    azimuth = drag.az - (e.clientX - drag.x) * 0.012;
    elevation = Math.max(-0.1, Math.min(1.1, drag.el + (e.clientY - drag.y) * 0.006));
    placeCamera();
  };
  const up = () => {
    drag = null;
    host.classList.remove('dragging');
  };
  canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', up);

  const start = performance.now();
  let raf = 0;
  let stopped = false;
  const frame = (now) => {
    if (stopped) return;
    if (!host.isConnected) return stop();
    const p = ((now - start) / 1000 / DUR) % 1;
    // Aller-retour avec un temps de pause en haut et en bas, comme une vraie répétition.
    const u = p < 0.5 ? p * 2 : (1 - p) * 2;
    const v = Math.min(1, Math.max(0, (u - 0.08) / 0.84));
    const t = freeze ?? v * v * (3 - 2 * v);
    applyPose(THREE, body, move, poseAt(move, t), tmp);
    updateProps(body, props, move, tmp);
    body.mats.p.emissiveIntensity = 0.12 + 0.35 * t;
    if (!drag) {
      azimuth += 0.0009;
      placeCamera();
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  host.classList.add('ready');

  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('pointermove', moveDrag);
    window.removeEventListener('pointerup', up);
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose?.(); m.dispose?.(); });
    });
    renderer.dispose();
    renderer.forceContextLoss?.();
    canvas.remove();
  }
  return stop;
}
