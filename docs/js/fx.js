// Petits effets de récompense : éclats de particules, lumière qui vole vers sa cible, nombres qui défilent,
// ondulation au toucher. Rien n'ajoute d'élément durable à l'écran : tout naît et disparaît en moins d'une seconde.
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const accent = () => getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#22a06b';

function layer() {
  let el = document.getElementById('fx-layer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fx-layer';
    document.body.append(el);
  }
  return el;
}

const centerOf = (target) => {
  if (!target) return null;
  if ('x' in target && 'y' in target && !(target instanceof Element)) return target;
  const r = target.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** Éclat de particules autour d'un point ou d'un élément. */
export function burst(target, { colors, count = 14, spread = 46, size = 6 } = {}) {
  if (reduced()) return;
  const c = centerOf(target);
  if (!c) return;
  const palette = colors || [accent(), accent(), '#ffd25e', '#ffffff'];
  const box = layer();
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = spread * (0.55 + Math.random() * 0.6);
    const s = size * (0.6 + Math.random() * 0.8);
    const star = i % 4 === 0;
    p.className = star ? 'fx-spark star' : 'fx-spark';
    p.style.cssText = `left:${c.x}px;top:${c.y}px;width:${s}px;height:${s}px;margin:${-s / 2}px;background:${palette[i % palette.length]}`;
    box.append(p);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    p.animate([
      { transform: 'translate(0,0) scale(0.4) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * 0.8}px,${dy * 0.8}px) scale(1.15) rotate(${star ? 90 : 0}deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px,${dy + 14}px) scale(0) rotate(${star ? 180 : 0}deg)`, opacity: 0 },
    ], { duration: 620 + Math.random() * 260, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' }).onfinish = () => p.remove();
  }
  // Onde qui s'élargit sous l'éclat.
  const ring = document.createElement('i');
  ring.className = 'fx-ring';
  ring.style.cssText = `left:${c.x}px;top:${c.y}px;border-color:${palette[0]}`;
  box.append(ring);
  ring.animate([{ transform: 'scale(0.2)', opacity: 0.9 }, { transform: `scale(${spread / 14})`, opacity: 0 }], { duration: 520, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' }).onfinish = () => ring.remove();
}

/** Une petite lumière part d'un point et file en arc jusqu'à une cible. */
export function flyTo(from, to, { color, size = 16, delay = 0, onArrive } = {}) {
  const a = centerOf(from);
  const b = centerOf(to);
  if (reduced() || !a || !b) {
    onArrive?.();
    return;
  }
  const orb = document.createElement('i');
  orb.className = 'fx-orb';
  const c = color || accent();
  orb.style.cssText = `left:${a.x}px;top:${a.y}px;width:${size}px;height:${size}px;margin:${-size / 2}px;background:radial-gradient(circle at 35% 35%, #fff, ${c} 55%);box-shadow:0 0 18px 6px ${c}`;
  layer().append(orb);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lift = Math.min(160, Math.abs(dx) * 0.4 + 60);
  orb.animate([
    { transform: 'translate(0,0) scale(0.4)', opacity: 0 },
    { transform: `translate(${dx * 0.15}px,${dy * 0.15 - lift * 0.6}px) scale(1.15)`, opacity: 1, offset: 0.2 },
    { transform: `translate(${dx * 0.55}px,${dy * 0.55 - lift}px) scale(1)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px,${dy}px) scale(0.5)`, opacity: 0.9 },
  ], { duration: 720, delay, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'both' }).onfinish = () => {
    orb.remove();
    onArrive?.();
  };
}

/** Relance une animation CSS sur un élément (classe ajoutée puis retirée). */
export function pulse(el, cls = 'fx-pulse', ms = 700) {
  if (!el || reduced()) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

/** Le nombre défile de l'ancienne à la nouvelle valeur, avec un petit rebond à l'arrivée. */
export function rollNumber(el, from, to, { format = (n) => Math.round(n).toLocaleString('fr-FR'), duration = 700, delay = 0 } = {}) {
  if (!el) return;
  if (reduced() || from === to) {
    el.textContent = format(to);
    return;
  }
  el.textContent = format(from);
  setTimeout(() => {
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - (1 - t) ** 3;
      el.textContent = format(from + (to - from) * e);
      if (t < 1) requestAnimationFrame(step);
      else pulse(el, 'fx-bump', 450);
    };
    requestAnimationFrame(step);
  }, delay);
}

// Ondulation au toucher sur les boutons : le doigt laisse une vague de lumière.
const RIPPLE = '.btn, .pill, .cta, .coach-opt, .food, .option, .tile-main, .supp-chip, .quest-card, .tab, .catalog-item, .water-add-row button, .tm-presets button';
document.addEventListener('pointerdown', (e) => {
  if (reduced()) return;
  const el = e.target.closest(RIPPLE);
  if (!el || el.disabled) return;
  const r = el.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 1.6;
  const w = document.createElement('i');
  w.className = 'fx-wave';
  w.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  el.append(w);
  w.animate([{ transform: 'scale(0)', opacity: 0.32 }, { transform: 'scale(1)', opacity: 0 }], { duration: 560, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' }).onfinish = () => w.remove();
}, { passive: true });
