// Écran d'ouverture : une citation motivante différente chaque jour, en motion design, puis l'app.

const QUOTES = [
  "La discipline, c'est faire ce qu'il faut même quand l'envie n'est pas là.",
  'Chaque répétition compte. Surtout celle que tu voulais sauter.',
  "Tu n'as pas besoin d'être motivé. Tu as besoin d'être régulier.",
  "Le corps atteint ce que l'esprit accepte.",
  "Pas d'excuse aujourd'hui. Juste une séance de plus.",
  'Les résultats suivent ceux qui ne lâchent pas.',
  "Ce qui te coûte aujourd'hui te construit pour demain.",
  'Un peu chaque jour vaut mieux que beaucoup une fois.',
  "La version de toi que tu veux devenir t'attend à la salle.",
  'Tu ne regretteras jamais une séance faite.',
  'Le plus dur, c’est de commencer. Le reste, c’est de la répétition.',
  'Ta seule concurrence, c’est toi hier.',
  'La force ne vient pas de ce que tu peux faire, mais de ce que tu dépasses.',
  'Petit progrès, grande fierté.',
  'Sois plus fort que tes excuses.',
  'La douleur passe. La fierté reste.',
  'Les champions se font les jours où personne ne regarde.',
  'Une assiette à la fois, une série à la fois.',
  'La constance bat le talent quand le talent ne se montre pas.',
  "Si c'est important pour toi, tu trouveras le temps.",
  'Ton corps entend tout ce que ton esprit lui dit. Parle-lui bien.',
  'Rien ne change si rien ne change.',
  "Aujourd'hui, tu poses une brique. Demain, un mur.",
  'La motivation te lance. L’habitude te fait avancer.',
  'Tombe sept fois, relève-toi huit.',
  'Le confort ne t’a jamais fait progresser.',
  'Fais-le pour la personne que tu deviens.',
  "Chaque kilo soulevé est une promesse tenue.",
  'Les limites, c’est souvent dans la tête qu’on les range.',
  'Un jour ou jour un. C’est toi qui choisis.',
  'Respire, serre, pousse. Recommence.',
  'Le progrès, ce n’est pas la perfection. C’est la direction.',
  'Ta sueur d’aujourd’hui, c’est ta force de demain.',
  'Personne ne viendra le faire à ta place.',
  'Dur aujourd’hui, fort demain.',
  'La discipline, c’est se souvenir de ce que tu veux.',
  "Tu es plus fort que tu ne le crois. Prouve-le encore.",
  'Ne compte pas les jours. Fais que les jours comptent.',
  'Le meilleur moment pour commencer, c’était hier. Le deuxième, c’est maintenant.',
  'Chaque séance est un vote pour la personne que tu veux être.',
  'Moins de « je vais », plus de « je fais ».',
  'Le mental lâche avant le muscle. Tiens bon.',
];

const dayOfYear = (d = new Date()) => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
export const quoteOfTheDay = () => QUOTES[(dayOfYear() + new Date().getFullYear() * 7) % QUOTES.length];

export function showSplash() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const words = quoteOfTheDay().split(' ');
  const el = document.createElement('div');
  el.id = 'splash';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Citation du jour');
  el.innerHTML = `
    <div class="splash-glow"></div>
    <svg class="splash-mark" viewBox="0 0 80 80" aria-hidden="true">
      <circle class="sr sr1" cx="40" cy="40" r="34" pathLength="100"/>
      <circle class="sr sr2" cx="40" cy="40" r="25" pathLength="100"/>
      <circle class="sr sr3" cx="40" cy="40" r="16" pathLength="100"/>
    </svg>
    <div class="splash-label">Citation du jour</div>
    <p class="splash-quote">${words.map((w, i) => `<span style="--i:${i}">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join(' ')}</p>
    <div class="splash-line"></div>
    <div class="splash-skip">Touche pour continuer</div>`;
  document.body.append(el);
  document.body.classList.add('splashing');

  let done = false;
  const close = () => {
    if (done) return;
    done = true;
    el.classList.add('out');
    document.body.classList.remove('splashing');
    setTimeout(() => el.remove(), 700);
  };
  el.addEventListener('click', close);
  // On laisse le temps de lire une fois le dernier mot apparu (selon la longueur de la phrase).
  const hold = reduced ? 1800 : 900 + words.length * 160;
  el.querySelector('.splash-quote span:last-child').addEventListener('animationend', () => setTimeout(close, hold), { once: true });
  setTimeout(close, 12000);
}
