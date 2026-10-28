// Schéma du corps (face et dos) : chaque groupe musculaire est une zone coloriable.
// Les tracés décrivent la moitié gauche du corps, la moitié droite est obtenue par symétrie.

const SILHOUETTE =
  'M100 62 L84 64 Q64 66 52 76 Q40 84 40 102 L36 150 Q32 168 30 196 L26 226 Q24 240 30 246 Q38 246 40 232 ' +
  'L46 200 Q52 172 56 150 L62 120 Q66 150 68 176 Q66 196 70 214 Q68 240 70 280 Q72 312 74 320 Q70 350 74 380 ' +
  'L76 398 Q70 408 78 412 L94 412 Q96 400 92 394 Q94 360 92 330 Q96 316 96 300 Q98 260 100 226 Z';

const FRONT = {
  trapezes: ['M86 64 Q72 66 62 74 Q74 78 88 70 Z'],
  epaules: ['M60 74 Q44 80 42 100 Q44 116 54 120 Q58 104 66 88 Q66 78 60 74 Z'],
  pectoraux: ['M98 80 L70 82 Q62 92 62 108 Q66 122 82 124 Q94 124 98 118 Z'],
  biceps: ['M44 122 Q40 136 42 150 Q48 158 54 150 Q58 134 56 120 Q50 116 44 122 Z'],
  avant_bras: ['M38 160 Q32 180 32 204 Q36 214 42 204 Q48 184 52 164 Q46 156 38 160 Z'],
  abdos: [
    'M98 128 L87 129 Q85 136 86 143 L98 143 Z',
    'M98 147 L86 147 L86 161 L98 161 Z',
    'M98 165 L86 165 L86 180 L98 180 Z',
    'M98 184 L87 184 Q87 200 98 210 Z',
  ],
  obliques: ['M83 128 Q72 132 70 150 Q70 176 74 196 Q80 200 84 192 Q81 160 83 128 Z'],
  quadriceps: ['M72 220 Q68 250 72 290 Q78 312 88 312 Q94 290 94 250 Q92 228 86 218 Z'],
  adducteurs: ['M97 228 Q92 240 92 262 Q95 272 99 262 L99 230 Z'],
  mollets: ['M76 330 Q72 350 76 376 Q82 384 86 376 Q90 352 88 330 Q82 324 76 330 Z'],
};

const BACK = {
  trapezes: ['M100 60 L86 64 Q70 68 62 76 Q76 82 86 98 Q94 116 100 132 Z'],
  epaules: ['M60 76 Q44 82 42 100 Q44 116 54 120 Q58 104 64 90 Q64 80 60 76 Z'],
  haut_dos: ['M84 100 Q74 96 68 104 Q68 120 76 132 Q86 134 92 124 Q90 112 84 100 Z'],
  dorsaux: ['M66 118 Q62 142 70 168 Q80 186 94 190 Q98 176 96 160 Q86 148 80 136 Q74 126 66 118 Z'],
  lombaires: ['M98 162 Q92 164 90 174 Q90 190 94 202 L98 204 Z'],
  triceps: ['M44 122 Q38 140 42 156 Q48 162 54 154 Q58 136 56 120 Q50 114 44 122 Z'],
  avant_bras: ['M38 162 Q32 182 32 204 Q36 214 42 204 Q48 184 52 166 Q46 158 38 162 Z'],
  fessiers: ['M98 208 Q84 204 74 212 Q68 228 74 242 Q86 252 98 246 Z'],
  ischios: ['M72 254 Q70 282 74 306 Q82 316 90 310 Q96 288 96 264 Q86 254 72 254 Z'],
  adducteurs: ['M97 254 Q94 264 95 282 L99 284 L99 254 Z'],
  mollets: ['M74 326 Q68 344 74 368 Q80 378 86 370 Q92 350 90 330 Q82 320 74 326 Z'],
};

const mirror = 'transform="translate(200 0) scale(-1 1)"';

function figure(shapes, colors, x, label, clickable) {
  const zones = Object.entries(shapes)
    .map(([muscle, paths]) => {
      const fill = colors[muscle] || 'var(--muscle-idle)';
      const attrs = `class="m" data-m="${muscle}" fill="${fill}"${clickable ? ` data-wact="muscle-filter" data-muscle="${muscle}"` : ''}`;
      return paths.map((d) => `<path ${attrs} d="${d}"/><path ${attrs} d="${d}" ${mirror}/>`).join('');
    })
    .join('');
  return `<g transform="translate(${x} 0)">
    <circle cx="100" cy="32" r="20" class="silhouette"/>
    <rect x="91" y="48" width="18" height="16" rx="6" class="silhouette"/>
    <path d="${SILHOUETTE}" class="silhouette"/><path d="${SILHOUETTE}" class="silhouette" ${mirror}/>
    ${zones}
    <text x="100" y="436" text-anchor="middle" class="body-label">${label}</text>
  </g>`;
}

/**
 * @param colors couleur par groupe musculaire (les autres restent neutres)
 * @param clickable chaque zone filtre la bibliothèque d'exercices quand on la touche
 */
export function bodyDiagram(colors = {}, { clickable = false } = {}) {
  return `<svg class="body" viewBox="0 0 420 444" role="img" aria-label="Schéma des muscles">
    ${figure(FRONT, colors, 0, 'Face', clickable)}${figure(BACK, colors, 220, 'Dos', clickable)}
  </svg>`;
}
