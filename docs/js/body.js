// Schéma du corps détaillé (face et dos) : chaque groupe musculaire est une zone coloriable.
// Tracés : react-native-body-highlighter (licence MIT), voir body-data.js.
import { BODY } from './body-data.js';

// Zones du dessin -> groupes musculaires de l'app.
const MUSCLE_OF = {
  chest: 'pectoraux', obliques: 'obliques', abs: 'abdos', biceps: 'biceps', triceps: 'triceps', deltoids: 'epaules',
  trapezius: 'trapezes', 'lower-back': 'lombaires', forearm: 'avant_bras', gluteal: 'fessiers', hamstring: 'ischios',
  quadriceps: 'quadriceps', adductors: 'adducteurs', calves: 'mollets',
};
// Le haut du dos regroupe les dorsaux (grands, sur les côtés) et le milieu du dos (rhomboïdes, grand rond).
const UPPER_BACK = ['dorsaux', 'dorsaux', 'haut_dos', 'haut_dos', 'dorsaux', 'dorsaux'];
const SKIN = new Set(['head', 'neck', 'hands', 'feet', 'ankles', 'knees', 'tibialis']);

function side(name, colors, clickable) {
  const parts = BODY[name].map(([slug, paths]) => {
    if (slug === 'hair') return paths.map((d) => `<path class="b-hair" d="${d}"/>`).join('');
    return paths.map((d, i) => {
      const muscle = slug === 'upper-back' ? UPPER_BACK[i] : MUSCLE_OF[slug];
      if (!muscle) return `<path class="${SKIN.has(slug) ? 'b-skin' : 'b-zone'}" d="${d}"/>`;
      const color = colors[muscle];
      const attrs = clickable ? ` data-wact="muscle-filter" data-muscle="${muscle}"` : '';
      return `<path class="b-zone m ${color ? 'on' : ''}" data-m="${muscle}"${color ? ` style="--mc:${color}"` : ''}${attrs} d="${d}"/>`;
    }).join('');
  }).join('');
  return `<path class="b-outline" d="${BODY.outline[name]}"/>${parts}`;
}

// Visage de face, dans le style du personnage.
const FACE = `<g class="b-face">
  <ellipse cx="342" cy="200" rx="9" ry="12"/><ellipse cx="383" cy="200" rx="9" ry="12"/>
  <path d="M347 238q15 12 31 0" fill="none"/>
</g>`;

/**
 * @param colors couleur par groupe musculaire (les autres restent neutres)
 * @param clickable chaque zone filtre la bibliothèque d'exercices quand on la touche
 */
export function bodyDiagram(colors = {}, { clickable = false } = {}) {
  return `<svg class="body" viewBox="40 80 1368 1340" role="img" aria-label="Schéma des muscles">
    <g>${side('front', colors, clickable)}${FACE}</g>
    <g>${side('back', colors, clickable)}</g>
    <text x="362" y="1408" text-anchor="middle" class="body-label">Face</text>
    <text x="1086" y="1408" text-anchor="middle" class="body-label">Dos</text>
  </svg>`;
}
