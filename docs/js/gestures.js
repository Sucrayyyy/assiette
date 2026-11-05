// Gestes natifs : tirer une feuille vers le bas pour la fermer, glisser pour changer de jour.
import { haptic } from './ui.js';

// Fermeture : chaque feuille a un fond (.backdrop) qui sait déjà la fermer quand on le touche.
function bindSheetDrag() {
  let sheet = null;
  let startY = 0;
  let lastY = 0;
  let lastT = 0;
  let speed = 0;
  let dragging = false;

  document.addEventListener('touchstart', (e) => {
    const s = e.target.closest('.sheet');
    if (!s || e.touches.length > 1) return;
    // Depuis le contenu, seulement si la feuille est déjà tout en haut ; jamais depuis un champ.
    const onGrabber = !!e.target.closest('.grabber, .sheet-head');
    if ((!onGrabber && s.scrollTop > 0) || e.target.closest('input, textarea, select, .h-scroll')) return;
    sheet = s;
    startY = lastY = e.touches[0].clientY;
    lastT = e.timeStamp;
    speed = 0;
    dragging = false;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!sheet) return;
    const y = e.touches[0].clientY;
    const dy = y - startY;
    if (!dragging) {
      if (dy < 8) {
        if (dy < -4) sheet = null;
        return;
      }
      dragging = true;
      sheet.style.transition = 'none';
    }
    speed = (y - lastY) / Math.max(e.timeStamp - lastT, 1);
    lastY = y;
    lastT = e.timeStamp;
    if (e.cancelable) e.preventDefault();
    sheet.style.transform = `translateY(${Math.max(0, dy)}px)`;
    const back = sheet.previousElementSibling;
    if (back) back.style.opacity = String(Math.max(0.2, 1 - dy / 500));
  }, { passive: false });

  const end = () => {
    if (!sheet) return;
    const s = sheet;
    sheet = null;
    if (!dragging) return;
    const dy = lastY - startY;
    const back = s.previousElementSibling;
    s.style.transition = 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)';
    if (dy > 130 || speed > 0.7) {
      s.style.transform = 'translateY(105%)';
      haptic();
      setTimeout(() => back?.click(), 180);
    } else {
      s.style.transform = '';
      if (back) back.style.opacity = '';
    }
  };
  document.addEventListener('touchend', end, { passive: true });
  document.addEventListener('touchcancel', end, { passive: true });
}

/** Glissement horizontal sur un écran : appelle onSwipe(+1) vers la gauche, onSwipe(-1) vers la droite. */
export function bindSwipe(getRoot, onSwipe) {
  let x = 0;
  let y = 0;
  let active = false;
  document.addEventListener('touchstart', (e) => {
    const root = getRoot();
    active = !!root && root.contains(e.target) && !e.target.closest('.h-scroll, input, select, textarea, .sheet') && e.touches.length === 1;
    if (active) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    }
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!active) return;
    active = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - x;
    const dy = t.clientY - y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) onSwipe(dx < 0 ? 1 : -1);
  }, { passive: true });
}

bindSheetDrag();
