// Calorimètre : devine les calories d'aliments du quotidien.
// Deux modes : le défi du jour (5 aliments, les mêmes pour tout le monde ce jour-là) et le duel (lequel est le plus calorique ?).
// But : se rendre compte que certains aliments pèsent bien plus lourd qu'on ne le croit, et d'autres bien moins.
import { state, save } from './store.js';
import { dayKey, n0 } from './nutrition.js';
import { esc, icon, haptic, tone, confetti, toast } from './ui.js';
import { act } from './panel.js';
import { burst, rollNumber, pulse } from './fx.js';
import { award } from './rewards.js';

// Valeurs moyennes pour la portion indiquée (ordre de grandeur des tables françaises).
// [nom, portion, kcal, catégorie, le saviez-tu ?]
const FOODS = [
  ['Croissant', '1 croissant, 60 g', 250, 'boulangerie', 'Le beurre feuilleté représente presque la moitié de ses calories.'],
  ['Pain au chocolat', '1 pain au chocolat, 70 g', 290, 'boulangerie'],
  ['Baguette', '1 quart de baguette, 60 g', 160, 'boulangerie', 'Le pain blanc est moins calorique qu\'on ne le pense : c\'est ce qu\'on met dessus qui compte.'],
  ['Pain de mie', '2 tranches, 50 g', 135, 'boulangerie'],
  ['Éclair au chocolat', '1 éclair, 90 g', 260, 'boulangerie'],
  ['Macaron', '1 macaron, 15 g', 70, 'boulangerie', 'Petit mais concentré : presque 470 kcal pour 100 g.'],
  ['Cookie', '1 grand cookie, 60 g', 290, 'snack'],
  ['Pomme', '1 pomme moyenne, 150 g', 80, 'fruit', '85 % d\'eau et des fibres : elle rassasie pour pas cher.'],
  ['Banane', '1 banane, 120 g', 110, 'fruit'],
  ['Avocat', '1 avocat entier, 150 g', 240, 'fruit', 'Riche en bonnes graisses, donc dense : un avocat vaut presque un croissant.'],
  ['Raisin', '1 grappe, 150 g', 105, 'fruit'],
  ['Mangue', '1 mangue entière, 300 g', 180, 'fruit'],
  ['Fraises', '1 barquette, 250 g', 80, 'fruit', 'Une barquette entière pour 80 kcal : un des desserts les plus légers.'],
  ['Dattes', '5 dattes, 40 g', 110, 'fruit'],
  ['Noix de cajou', '1 poignée, 30 g', 175, 'fruit', 'Une simple poignée de fruits secs, c\'est déjà un petit repas.'],
  ['Amandes', '1 poignée, 30 g', 175, 'fruit'],
  ['Pastèque', '1 grosse tranche, 300 g', 90, 'fruit', '92 % d\'eau : tu peux en manger beaucoup.'],
  ['Jus d\'orange', '1 verre, 25 cl', 110, 'boisson', 'Autant de sucre qu\'un soda, sans les fibres du fruit entier.'],
  ['Soda classique', '1 canette, 33 cl', 140, 'boisson', 'L\'équivalent de 7 morceaux de sucre.'],
  ['Soda zéro', '1 canette, 33 cl', 1, 'boisson', 'Zéro sucre, donc quasiment zéro calorie.'],
  ['Bière blonde', '1 demi, 25 cl', 105, 'alcool'],
  ['Vin rouge', '1 verre, 12,5 cl', 85, 'alcool'],
  ['Champagne', '1 coupe, 10 cl', 80, 'alcool'],
  ['Mojito', '1 verre', 170, 'alcool', 'Le sucre et le rhum s\'additionnent vite.'],
  ['Café latte', '1 grand gobelet, 35 cl, lait entier', 210, 'boisson', 'Un grand latte, c\'est presque un repas liquide.'],
  ['Smoothie aux fruits', '1 bouteille, 25 cl', 140, 'boisson'],
  ['Expresso', '1 tasse', 2, 'boisson', 'Sans sucre, un café ne compte presque pas.'],
  ['Thé glacé', '1 canette, 33 cl', 90, 'boisson'],
  ['Pizza margherita', '1 pizza entière, 300 g', 750, 'plat'],
  ['Quiche lorraine', '1 part, 150 g', 400, 'plat'],
  ['Burger classique', '1 burger, 220 g', 550, 'plat'],
  ['Frites', '1 portion moyenne, 120 g', 380, 'plat'],
  ['Kebab complet', '1 sandwich, 400 g', 850, 'plat', 'Pain, viande, frites et sauce : une bonne partie des besoins d\'une journée.'],
  ['Salade César', '1 assiette, 350 g', 550, 'plat', 'Une salade, mais la sauce, le parmesan et les croûtons font grimper la note.'],
  ['Makis au saumon', '6 makis, 150 g', 220, 'plat'],
  ['Pâtes carbonara', '1 assiette, 350 g', 700, 'plat'],
  ['Lasagnes', '1 part, 300 g', 480, 'plat'],
  ['Croque-monsieur', '1 croque, 150 g', 400, 'plat'],
  ['Couscous royal', '1 assiette, 450 g', 750, 'plat'],
  ['Poké bowl au saumon', '1 bol, 450 g', 650, 'plat'],
  ['Riz blanc', '1 assiette cuite, 200 g', 260, 'plat'],
  ['Blanc de poulet', '1 filet cuit, 150 g', 245, 'plat', 'Beaucoup de protéines pour peu de calories : le champion de la sèche.'],
  ['Œuf', '1 œuf dur, 55 g', 80, 'plat'],
  ['Omelette', '3 œufs cuits au beurre', 300, 'plat'],
  ['Raclette', '1 assiette avec charcuterie', 1100, 'plat', 'Une assiette de raclette peut dépasser la moitié des besoins d\'une journée.'],
  ['Tartiflette', '1 part, 400 g', 840, 'plat'],
  ['Chips', '1 petit paquet, 45 g', 240, 'snack', 'Plus de 500 kcal pour 100 g : le paquet familial passe vite les 1 000.'],
  ['Barre chocolatée au caramel', '1 barre, 50 g', 240, 'snack'],
  ['Chocolat noir', '4 carrés, 20 g', 110, 'snack'],
  ['Pâte à tartiner', '1 cuillère à soupe, 20 g', 110, 'snack', 'Une cuillère bien pleine dépasse souvent les 20 g.'],
  ['Glace', '2 boules, 100 g', 210, 'dessert'],
  ['Barre de céréales', '1 barre, 25 g', 100, 'snack'],
  ['Pop-corn sucré', '1 cornet moyen, 100 g', 480, 'snack', 'Au cinéma, le cornet sucré pèse autant qu\'un vrai repas.'],
  ['Crêpe au sucre', '1 crêpe', 180, 'dessert'],
  ['Gaufre au chocolat', '1 gaufre', 350, 'dessert'],
  ['Tiramisu', '1 part, 120 g', 350, 'dessert'],
  ['Yaourt nature', '1 pot, 125 g', 65, 'laitier'],
  ['Skyr nature', '1 pot, 150 g', 95, 'laitier', 'Deux fois plus de protéines qu\'un yaourt, pour très peu de calories.'],
  ['Granola', '1 bol sans lait, 60 g', 270, 'snack', 'L\'image healthy cache souvent beaucoup de sucre et de gras.'],
  ['Camembert', '1 portion, 30 g', 85, 'laitier'],
  ['Comté', '1 portion, 30 g', 125, 'laitier'],
  ['Mozzarella', '1 boule, 125 g', 290, 'laitier'],
  ['Beurre', '1 noisette, 10 g', 75, 'sauce'],
  ['Huile d\'olive', '1 cuillère à soupe, 10 g', 90, 'sauce', 'Le gras apporte 9 kcal par gramme, plus du double du sucre.'],
  ['Mayonnaise', '1 cuillère à soupe, 15 g', 105, 'sauce'],
  ['Ketchup', '1 cuillère à soupe, 15 g', 17, 'sauce'],
  ['Vinaigrette', '2 cuillères à soupe, 30 g', 135, 'sauce', 'C\'est souvent la sauce, pas la salade, qui fait les calories.'],
  ['Pesto', '2 cuillères à soupe, 30 g', 140, 'sauce'],
  ['Concombre', '1 concombre entier, 300 g', 45, 'legume', '96 % d\'eau : un concombre entier pèse moins qu\'un carré de chocolat... ou presque.'],
  ['Brocoli', '1 assiette, 200 g', 70, 'legume'],
  ['Pomme de terre', '1 moyenne vapeur, 150 g', 120, 'legume', 'Nature, la pomme de terre est légère. Frite, elle triple.'],
  ['Carotte', '1 carotte, 100 g', 35, 'legume'],
].map(([name, portion, kcal, cat, fact], id) => ({ id, name, portion, kcal, cat, fact }));

const CATS = {
  boulangerie: { label: 'Boulangerie', colors: ['#f0a050', '#b5651d'] },
  fruit: { label: 'Fruits', colors: ['#4fcf8a', '#16865a'] },
  boisson: { label: 'Boisson', colors: ['#7fb8ff', '#3d6fe0'] },
  alcool: { label: 'Alcool', colors: ['#d58cff', '#8a3ffc'] },
  plat: { label: 'Plat', colors: ['#ff9a7a', '#e0503a'] },
  snack: { label: 'Snack', colors: ['#f5b83a', '#c77700'] },
  dessert: { label: 'Dessert', colors: ['#ff9ec0', '#d6336c'] },
  laitier: { label: 'Laitier', colors: ['#86b6ec', '#4a72b8'] },
  sauce: { label: 'Gras et sauces', colors: ['#dcb93c', '#9a7a12'] },
  legume: { label: 'Légume', colors: ['#74c957', '#2c8420'] },
};

const svg = (body) => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const CAT_ICONS = {
  boulangerie: svg('<path d="M8 30c2-10 10-16 16-16s14 6 16 16c-4 3-10 4-16 4s-12-1-16-4z"/><path d="M17 17l3 16M24 14v20M31 17l-3 16"/>'),
  fruit: svg('<path d="M24 16c-4-4-14-3-14 9 0 10 7 17 11 17 2 0 2-1 3-1s1 1 3 1c4 0 11-7 11-17 0-12-10-13-14-9z"/><path d="M24 16c0-4 2-8 6-9"/>'),
  boisson: svg('<path d="M14 12h20l-3 28H17z"/><path d="M15 20h18"/><path d="M28 12l4-6"/>'),
  alcool: svg('<path d="M15 8h18c0 10-3 16-9 16s-9-6-9-16z"/><path d="M24 24v14M17 40h14"/>'),
  plat: svg('<circle cx="24" cy="26" r="13"/><circle cx="24" cy="26" r="7"/><path d="M6 10v8a3 3 0 0 0 6 0v-8M9 18v22M42 10c-3 0-4 4-4 9h4v21"/>'),
  snack: svg('<path d="M12 8h24l-2 6 2 26H12l2-26z"/><path d="M14 14h20"/><circle cx="21" cy="25" r="2"/><circle cx="28" cy="30" r="2"/><circle cx="22" cy="33" r="1.5"/>'),
  dessert: svg('<path d="M16 22a8 8 0 1 1 16 0"/><path d="M14 22h20l-10 20z"/>'),
  laitier: svg('<path d="M8 32l26-16 6 10v10H8z"/><path d="M8 32h32"/><circle cx="20" cy="36" r="1.5"/><circle cx="31" cy="32" r="2"/>'),
  sauce: svg('<path d="M20 6h8v6l4 6v22H16V18l4-6z"/><path d="M16 26h16"/>'),
  legume: svg('<path d="M30 10c-12 2-20 12-20 26 14 0 24-8 26-20"/><path d="M10 36l16-16M30 10l6-4M36 16l6-2"/>'),
};

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function seeded(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
}

function shuffle(list, rand = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Curseur non linéaire : précis sur les petites valeurs, va jusqu'à 1 500 kcal.
const MAX = 1500;
const toKcal = (t) => Math.round((MAX * (t / 1000) ** 1.8) / 5) * 5;
const toT = (kcal) => Math.round(1000 * (kcal / MAX) ** (1 / 1.8));

/** Points d'une manche : 100 si pile, de moins en moins à mesure que l'écart grandit. */
export function points(guess, truth) {
  const err = Math.abs(guess - truth) / Math.max(truth, 20);
  return Math.round(100 * Math.max(0, 1 - err) ** 1.5);
}

const verdictOf = (pts) => (pts >= 90 ? 'Parfait !' : pts >= 70 ? 'Excellent' : pts >= 45 ? 'Pas mal' : pts >= 20 ? 'Raté de peu' : 'Raté');

function equivalent(kcal) {
  const kg = state.profile?.weightKg || 70;
  const walk = Math.round(kcal / (0.06 * kg));
  const run = Math.round(kcal / (0.15 * kg));
  if (kcal < 15) return 'Presque rien à brûler.';
  return `Pour le brûler : ${walk} min de marche ou ${run} min de course.`;
}

const G = () => (state.game ||= { daily: {}, best: { daily: 0, duel: 0 }, plays: 0, perfects: 0 });
export const dailyDone = (day = dayKey()) => !!G().daily[day]?.done;
export const gameStats = () => ({ days: Object.values(G().daily).filter((d) => d.done).length, best: G().best.daily || 0, duel: G().best.duel || 0, perfects: G().perfects || 0 });

// ---------------------------------------------------------------------------
// Partie en cours
// ---------------------------------------------------------------------------

let run = null;

function mount() {
  const el = document.createElement('div');
  el.className = 'game-layer';
  document.body.append(el);
  document.body.style.overflow = 'hidden';
  el.addEventListener('click', onClick);
  el.addEventListener('input', onInput);
  return el;
}

function close() {
  if (!run) return;
  const { el } = run;
  run = null;
  el.classList.add('out');
  document.body.style.overflow = '';
  setTimeout(() => el.remove(), 300);
  rerender();
}

let rerender = () => {};
export function initGame({ renderApp }) {
  rerender = renderApp;
}

function foodCard(f, extra = '') {
  const c = CATS[f.cat];
  return `<div class="food-card ${extra}" style="--c1:${c.colors[0]};--c2:${c.colors[1]}">
    <span class="fc-icon">${CAT_ICONS[f.cat]}</span>
    <small class="fc-cat">${c.label}</small>
    <b class="fc-name">${esc(f.name)}</b>
    <span class="fc-portion">${esc(f.portion)}</span>
  </div>`;
}

// ----- Défi du jour -----

function startDaily(free = false) {
  const day = dayKey();
  const rand = free ? Math.random : seeded(`calorimetre-${day}`);
  // Cinq familles différentes, pour mélanger pièges caloriques et aliments plus légers qu'on ne croit.
  const items = [];
  for (const f of shuffle(FOODS, rand)) {
    if (items.length < 5 && !items.some((x) => x.cat === f.cat)) items.push(f);
  }
  run?.el.remove();
  run = { mode: 'daily', free, el: mount(), items, i: 0, total: 0, answers: [], guess: null };
  renderRound(true);
}

function renderRound(enter = false) {
  const r = run;
  const f = r.items[r.i];
  const ans = r.answers[r.i];
  r.el.innerHTML = `<div class="game-top">
      <button class="round" data-g="close" aria-label="Fermer">${icon.x}</button>
      <div class="game-dots">${r.items.map((_, k) => `<i class="${k < r.i || (k === r.i && ans) ? 'done' : k === r.i ? 'now' : ''}"></i>`).join('')}</div>
      <span class="game-score"><b data-total>${r.total}</b> pts</span>
    </div>
    <div class="game-body ${enter ? 'enter' : ''}">
      <small class="game-kicker">${r.free ? 'Partie libre' : 'Défi du jour'} · ${r.i + 1}/5</small>
      ${foodCard(f, ans ? 'flipped' : '')}
      ${ans ? revealBlock(f, ans) : guessBlock()}
    </div>`;
  if (ans) animateReveal(f, ans);
}

function guessBlock() {
  return `<div class="guess">
      <p class="guess-q">Combien de calories ?</p>
      <div class="guess-value ${run.guess == null ? 'empty' : ''}"><b data-guess>${run.guess == null ? '?' : n0(run.guess)}</b><span>kcal</span></div>
      <input type="range" min="0" max="1000" step="1" value="${toT(run.guess ?? 250)}" class="guess-range" data-g-range aria-label="Ta réponse en kcal">
      <div class="guess-scale"><span>0</span><span>200</span><span>700</span><span>1 500</span></div>
      <div class="guess-nudge">
        <button class="round" data-g="nudge" data-d="-50">−50</button><button class="round" data-g="nudge" data-d="-5">−5</button>
        <button class="round" data-g="nudge" data-d="5">+5</button><button class="round" data-g="nudge" data-d="50">+50</button>
      </div>
      <button class="btn btn-primary" data-g="validate" ${run.guess == null ? 'disabled' : ''}>Valider</button>
    </div>`;
}

function revealBlock(f, ans) {
  const diff = ans.guess - f.kcal;
  const scaleMax = Math.max(f.kcal, ans.guess) * 1.25 || 100;
  const pos = (v) => Math.min(100, (v / scaleMax) * 100);
  const way = Math.abs(diff) <= Math.max(10, f.kcal * 0.05) ? 'Tu avais vu juste.'
    : diff < 0 ? `${n0(-diff)} kcal de plus que ce que tu pensais !` : `${n0(diff)} kcal de moins que ce que tu pensais.`;
  return `<div class="reveal">
      <div class="reveal-value"><b data-truth>0</b><span>kcal</span></div>
      <div class="reveal-gauge">
        <i class="rg-fill" style="--w:${pos(f.kcal)}%"></i>
        <span class="rg-mark you" style="--x:${pos(ans.guess)}%"><em>Toi</em></span>
      </div>
      <div class="reveal-verdict ${diff < 0 ? 'more' : 'less'}"><b>${verdictOf(ans.pts)}</b><span class="rv-pts">+${ans.pts}</span></div>
      <p class="reveal-way">${way}</p>
      <p class="reveal-eq">${icon.steps}<span>${equivalent(f.kcal)}</span></p>
      ${f.fact ? `<p class="reveal-fact">${icon.info}<span>${esc(f.fact)}</span></p>` : ''}
      <button class="btn btn-primary" data-g="next">${run.i < 4 ? 'Aliment suivant' : 'Voir mon score'}</button>
    </div>`;
}

function animateReveal(f, ans) {
  const el = run.el;
  if (ans.animated) {
    el.querySelector('[data-truth]').textContent = n0(f.kcal);
    return;
  }
  ans.animated = true;
  rollNumber(el.querySelector('[data-truth]'), 0, f.kcal, { duration: 900, format: (v) => n0(v) });
  setTimeout(() => {
    const v = el.querySelector('.reveal-verdict');
    pulse(v, 'fx-bump', 500);
    if (ans.pts >= 70) {
      burst(v, { colors: ['#ffd25e', 'var(--accent)', '#fff'], count: ans.pts >= 90 ? 24 : 14, spread: ans.pts >= 90 ? 90 : 60 });
      tone(ans.pts >= 90 ? [784, 1047, 1319] : [784, 1047], 0.07, 0.11);
      haptic(ans.pts >= 90 ? [30, 40, 60] : 20);
    } else {
      tone([392, 330], 0.05, 0.12);
      haptic(15);
    }
    rollNumber(el.querySelector('[data-total]'), run.total - ans.pts, run.total, { duration: 600 });
  }, 950);
}

function validate() {
  const f = run.items[run.i];
  const pts = points(run.guess, f.kcal);
  run.answers[run.i] = { guess: run.guess, pts };
  run.total += pts;
  haptic();
  renderRound();
}

function next() {
  if (run.i < 4) {
    run.i++;
    run.guess = null;
    renderRound(true);
  } else finishDaily();
}

const rankOf = (score) => (score >= 450 ? 'Œil de nutritionniste' : score >= 350 ? 'Expert des étiquettes' : score >= 250 ? 'Bon instinct' : score >= 150 ? 'Apprenti' : 'Tout reste à découvrir');

function finishDaily() {
  const r = run;
  const g = G();
  const day = dayKey();
  const first = !r.free && !g.daily[day]?.done;
  const perfects = r.answers.filter((a) => a.pts >= 90).length;
  g.plays = (g.plays || 0) + 1;
  g.perfects = (g.perfects || 0) + perfects;
  // Pas de « record » à la toute première partie : il n'y a rien à battre.
  const record = g.plays > 1 && r.total > (g.best.daily || 0);
  g.best.daily = Math.max(g.best.daily || 0, r.total);
  if (!r.free) g.daily[day] = { done: true, score: r.total };
  save();
  const stars = r.total >= 400 ? 3 : r.total >= 250 ? 2 : r.total >= 100 ? 1 : 0;
  // Les plus grosses surprises de la partie.
  const surprises = r.items.map((f, k) => ({ f, d: f.kcal - r.answers[k].guess })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 2);
  r.el.innerHTML = `<div class="game-top"><button class="round" data-g="close" aria-label="Fermer">${icon.x}</button><span></span><span></span></div>
    <div class="game-end enter">
      <small class="game-kicker">${r.free ? 'Partie libre' : 'Défi du jour terminé'}</small>
      <div class="end-stars">${[0, 1, 2].map((k) => `<i class="${k < stars ? 'on' : ''}" style="--k:${k}">${icon.star}</i>`).join('')}</div>
      <div class="end-score"><b data-end>0</b><span>/ 500</span></div>
      <h1>${esc(rankOf(r.total))}</h1>
      ${record ? '<span class="end-record">Nouveau record personnel</span>' : ''}
      <div class="end-surprises">
        <small>Tes plus grosses surprises</small>
        ${surprises.map(({ f, d }) => `<div class="es-row"><span>${esc(f.name)}<em>${n0(f.kcal)} kcal en vrai</em></span><b class="${d > 0 ? 'more' : 'less'}">${n0(Math.abs(d))} kcal de ${d > 0 ? 'plus' : 'moins'}</b></div>`).join('')}
      </div>
      <div class="end-actions">
        <button class="btn glass" data-g="share">${icon.share} Défier un ami</button>
        <button class="btn btn-primary" data-g="duel">${icon.bolt} Mode duel</button>
        <button class="link" data-g="again">Rejouer une partie libre</button>
      </div>
    </div>`;
  rollNumber(r.el.querySelector('[data-end]'), 0, r.total, { duration: 1200, delay: 300 });
  setTimeout(() => {
    if (stars >= 2 || record) confetti();
    tone([659, 784, 1047], 0.08, 0.13);
    haptic([30, 40, 60]);
  }, 600);
  if (first) setTimeout(() => award(Math.max(20, Math.round(r.total / 5)), 'Défi Calorimètre'), 1500);
  else if (r.free) {
    const today = (g.freeXp ||= {});
    if ((today[day] || 0) < 3) {
      today[day] = (today[day] || 0) + 1;
      save();
      setTimeout(() => award(10, 'Partie libre'), 1500);
    }
  }
  rerender();
}

// ----- Duel : lequel est le plus calorique ? -----

function startDuel() {
  run?.el.remove();
  run = { mode: 'duel', el: mount(), streak: 0, pair: null, picked: null };
  nextPair();
}

function nextPair() {
  // Assez d'écart pour qu'il y ait une vraie bonne réponse (12 % au moins), et de moins en moins
  // à mesure que la série grandit : facile au début, serré ensuite.
  const maxRatio = run.streak < 3 ? 3 : run.streak < 8 ? 2 : 1.5;
  const seen = (run.seen ||= new Set());
  let pair = null;
  for (let tries = 0; tries < 400 && !pair; tries++) {
    const [a, b] = shuffle(FOODS).slice(0, 2);
    const ratio = Math.max(a.kcal, b.kcal) / Math.max(1, Math.min(a.kcal, b.kcal));
    const key = [a.id, b.id].sort().join('-');
    if (ratio >= 1.12 && (ratio <= maxRatio || tries > 300) && !seen.has(key)) pair = [a, b];
  }
  seen.add([pair[0].id, pair[1].id].sort().join('-'));
  run.pair = pair;
  run.picked = null;
  renderDuel(true);
}

function renderDuel(enter = false) {
  const r = run;
  const [a, b] = r.pair;
  const best = G().best.duel || 0;
  const winner = a.kcal > b.kcal ? 0 : 1;
  const card = (f, k) => {
    const state2 = r.picked == null ? '' : k === winner ? 'win' : 'lose';
    return `<button class="duel-card ${state2} ${r.picked === k ? 'picked' : ''}" data-g="pick" data-k="${k}" ${r.picked != null ? 'disabled' : ''}>
      ${foodCard(f)}
      ${r.picked != null ? `<span class="duel-kcal"><b data-duel="${k}">0</b> kcal</span>` : ''}
    </button>`;
  };
  r.el.innerHTML = `<div class="game-top">
      <button class="round" data-g="close" aria-label="Fermer">${icon.x}</button>
      <span class="duel-streak">${icon.flame}<b data-streak>${r.streak}</b></span>
      <span class="game-score">Record ${best}</span>
    </div>
    <div class="game-body ${enter ? 'enter' : ''}">
      <small class="game-kicker">Duel</small>
      <p class="guess-q">Lequel est le plus calorique ?</p>
      <div class="duel-cards">${card(a, 0)}<span class="duel-vs">VS</span>${card(b, 1)}</div>
    </div>`;
}

function pick(k) {
  const r = run;
  if (r.picked != null) return;
  r.picked = k;
  const [a, b] = r.pair;
  const winner = a.kcal > b.kcal ? 0 : 1;
  const ok = k === winner;
  renderDuel();
  rollNumber(r.el.querySelector('[data-duel="0"]'), 0, a.kcal, { duration: 700, format: (v) => n0(v) });
  rollNumber(r.el.querySelector('[data-duel="1"]'), 0, b.kcal, { duration: 700, format: (v) => n0(v) });
  setTimeout(() => {
    const picked = r.el.querySelector(`.duel-card[data-k="${k}"]`);
    if (ok) {
      r.streak++;
      burst(picked, { colors: ['#ffd25e', 'var(--accent)', '#fff'], count: 16, spread: 70 });
      tone([784, 1047], 0.07, 0.1);
      haptic(20);
      const s = r.el.querySelector('[data-streak]');
      if (s) {
        s.textContent = r.streak;
        pulse(s.parentElement, 'fx-flame', 900);
      }
      setTimeout(() => run === r && nextPair(), 1300);
    } else {
      pulse(picked, 'fx-shake', 500);
      tone([392, 294], 0.06, 0.14);
      haptic([60, 40, 60]);
      setTimeout(() => run === r && endDuel(), 1500);
    }
  }, 750);
}

function endDuel() {
  const r = run;
  const g = G();
  const record = r.streak > (g.best.duel || 0);
  g.best.duel = Math.max(g.best.duel || 0, r.streak);
  save();
  r.el.innerHTML = `<div class="game-top"><button class="round" data-g="close" aria-label="Fermer">${icon.x}</button><span></span><span></span></div>
    <div class="game-end enter">
      <small class="game-kicker">Duel terminé</small>
      <div class="end-score"><b data-end>0</b><span>${r.streak > 1 ? 'bonnes réponses d\'affilée' : 'bonne réponse'}</span></div>
      <h1>${r.streak >= 10 ? 'Imbattable' : r.streak >= 5 ? 'Très fort' : r.streak >= 2 ? 'Bien joué' : 'La prochaine sera la bonne'}</h1>
      ${record && r.streak ? '<span class="end-record">Nouveau record</span>' : `<span class="muted">Record : ${g.best.duel}</span>`}
      <div class="end-actions">
        <button class="btn btn-primary" data-g="duel">${icon.refresh} Rejouer</button>
        <button class="link" data-g="again">Partie libre de 5 aliments</button>
      </div>
    </div>`;
  rollNumber(r.el.querySelector('[data-end]'), 0, r.streak, { duration: 700, delay: 200 });
  if (record && r.streak >= 3) setTimeout(confetti, 500);
  const day = dayKey();
  const xpDay = ((g.duelXp ||= {})[day] ||= 0);
  const xp = Math.min(r.streak * 5, 50 - xpDay);
  if (xp > 0) {
    g.duelXp[day] += xp;
    save();
    setTimeout(() => award(xp, 'Duel Calorimètre'), 900);
  }
  rerender();
}

// ----- Partage -----

async function share() {
  const score = run?.total ?? 0;
  const text = `J'ai fait ${score}/500 au Calorimètre d'Assiette. Tu crois faire mieux ?`;
  const url = `${location.origin}${location.pathname}`;
  try {
    if (navigator.share) return await navigator.share({ text, url });
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast('Message copié, envoie-le à un ami');
  } catch { /* partage annulé */ }
}

// ---------------------------------------------------------------------------
// Événements de la partie
// ---------------------------------------------------------------------------

function showGuess() {
  const v = run.el.querySelector('[data-guess]');
  v.textContent = n0(run.guess);
  v.parentElement.classList.remove('empty');
  run.el.querySelector('[data-g="validate"]').disabled = false;
}

let tickAt = 0;
function onInput(e) {
  if (!e.target.matches('[data-g-range]') || !run) return;
  run.guess = toKcal(Number(e.target.value));
  showGuess();
  // Petit tic tous les 50 kcal.
  const bucket = Math.floor(run.guess / 50);
  if (bucket !== tickAt) {
    tickAt = bucket;
    haptic(4);
  }
}

function onClick(e) {
  const b = e.target.closest('[data-g]');
  if (!b || !run) return;
  switch (b.dataset.g) {
    case 'close':
      close();
      break;
    case 'nudge': {
      run.guess = Math.max(0, Math.min(MAX, (run.guess ?? 0) + Number(b.dataset.d)));
      showGuess();
      run.el.querySelector('[data-g-range]').value = toT(run.guess);
      pulse(run.el.querySelector('[data-guess]'), 'fx-bump', 300);
      haptic(6);
      break;
    }
    case 'validate':
      validate();
      break;
    case 'next':
      next();
      break;
    case 'again':
      startDaily(true);
      break;
    case 'duel':
      startDuel();
      break;
    case 'pick':
      pick(Number(b.dataset.k));
      break;
    case 'share':
      share();
      break;
  }
}

// ---------------------------------------------------------------------------
// Carte de l'écran Aujourd'hui
// ---------------------------------------------------------------------------

export function gameCard(day) {
  if (day !== dayKey()) return '';
  const d = G().daily[day];
  return `<button class="game-card glass ${d?.done ? 'done' : ''}" data-x="game-open">
    <span class="gc-icon">${icon.gauge}</span>
    <div class="spacer"><b>Calorimètre</b><small>${d?.done ? `Défi du jour : ${d.score} / 500 · rejoue en duel` : 'Devine les calories de 5 aliments du quotidien'}</small></div>
    <span class="gc-play">${d?.done ? icon.bolt : icon.play}</span>
  </button>`;
}

// Un double appui n'ouvre qu'une partie.
act('game-open', () => !run && (dailyDone() ? startDuel() : startDaily(false)));
