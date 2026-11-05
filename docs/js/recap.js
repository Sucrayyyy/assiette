// Récap de la semaine : des slides animées plein écran, façon story, et une image à partager.
import { state, save } from './store.js';
import { lastDays, totalsOn, targets, stepsOn, dayKey, dayDate, n0, n1 } from './nutrition.js';
import { esc, icon, haptic, tone, animateCounts, ring, animateRings, toast } from './ui.js';
import { act } from './panel.js';
import { bodyDiagram } from './body.js';
import { muscleLabel } from './workout-data.js';
import { waterOn, waterGoal } from './modules.js';
import { dueOn, pendingOn } from './supplements.js';
import { currentAccent } from './theme.js';

const SLIDE_MS = 6000;

const TONNAGE = [['éléphant', 'éléphants', 5000], ['voiture', 'voitures', 1200], ['moto', 'motos', 200]];

function weekData() {
  const days = lastDays(7);
  const g = targets();
  const foods = days.map((d) => totalsOn(d));
  const logged = foods.filter((m) => m.kcal > 0);
  const avg = (k) => (logged.length ? logged.reduce((s, m) => s + m[k], 0) / logged.length : 0);
  const since = dayDate(days[0]).getTime();
  const workouts = state.workouts.filter((w) => w.end >= since);
  const muscleSets = {};
  workouts.forEach((w) => w.exercises.forEach((e) => {
    e.p.forEach((m) => (muscleSets[m] = (muscleSets[m] || 0) + e.sets.length));
    e.s.forEach((m) => (muscleSets[m] = (muscleSets[m] || 0) + e.sets.length * 0.5));
  }));
  const topMuscles = Object.entries(muscleSets).sort((a, b) => b[1] - a[1]);
  const steps = days.reduce((s, d) => s + stepsOn(d), 0);
  const water = days.reduce((s, d) => s + waterOn(d), 0);
  const due = days.reduce((s, d) => s + dueOn(d).length, 0);
  const taken = days.reduce((s, d) => s + dueOn(d).length - pendingOn(d).length, 0);
  const inTarget = foods.filter((m) => m.kcal >= g.kcal * 0.85 && m.kcal <= g.kcal * 1.1).length;
  const proteinDays = foods.filter((m) => m.protein >= g.protein * 0.95).length;

  // Note sur 100 : régularité d'abord, ce qui n'est pas suivi ne pénalise pas.
  const parts = [[logged.length / 7, 30], [inTarget / 7, 20], [proteinDays / 7, 20]];
  if (workouts.length || state.workouts.length) parts.push([Math.min(1, workouts.length / 3), 20]);
  if (steps) parts.push([Math.min(1, steps / 70000), 10]);
  if (water) parts.push([Math.min(1, water / (waterGoal() * 7)), 10]);
  if (due) parts.push([taken / due, 10]);
  const weight = parts.reduce((s, [, w]) => s + w, 0);
  const score = Math.round((parts.reduce((s, [p, w]) => s + p * w, 0) / weight) * 100);

  return {
    days, g, foods, logged: logged.length, avgKcal: avg('kcal'), avgProtein: avg('protein'), inTarget, proteinDays,
    workouts, volume: workouts.reduce((s, w) => s + w.volume, 0), sets: workouts.reduce((s, w) => s + w.sets, 0),
    minutes: workouts.reduce((s, w) => s + (w.end - w.start) / 60000, 0),
    prs: workouts.flatMap((w) => w.prs || []), muscleSets, topMuscles, steps, km: steps * 0.00075, water, due, taken, score,
    perfect: days.filter((d) => state.perfectDays?.[d]).length,
    firstName: state.profile?.firstName || '',
    range: `${dayDate(days[0]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${dayDate(days[6]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`,
  };
}

const verdict = (score) => (score >= 85 ? 'Semaine de patron.' : score >= 65 ? 'Solide. Continue comme ça.' : score >= 40 ? 'Bonne base, on monte d\'un cran.' : 'Chaque semaine est un nouveau départ.');

function tonnageText(kg) {
  const [one, many, w] = TONNAGE.find(([, , x]) => kg >= x) || TONNAGE.at(-1);
  const n = kg / w;
  if (n < 1) return 'et ça compte déjà';
  const shown = n < 10 ? n1(Math.round(n * 10) / 10) : n0(n);
  return `soit ${shown} ${n < 2 ? one : many}`;
}

function buildSlides(d) {
  const slides = [];
  const num = (v, suffix = '') => `<span data-count="${Math.round(v)}" data-suffix="${suffix}">${n0(v)}${suffix}</span>`;

  slides.push({
    tone: 'accent',
    html: `<div class="st-center"><span class="st-rings">${['#ff6a4d', '#4d7cfe', 'var(--ad)'].map((c, i) => `<i style="--c:${c};--i:${i}"></i>`).join('')}</span>
      <small class="st-kicker">Ta semaine</small><h1 class="st-title st-w">${esc(d.firstName)},<br>voici ton récap</h1><p class="st-sub st-w2">Du ${esc(d.range)}</p></div>`,
  });

  if (d.logged) {
    const max = Math.max(d.g.kcal * 1.2, ...d.foods.map((m) => m.kcal), 1);
    slides.push({
      tone: 'orange',
      html: `<small class="st-kicker">Nutrition</small>
        <div class="st-big">${num(d.avgKcal)}<small>kcal par jour</small></div>
        <p class="st-sub">Objectif ${n0(d.g.kcal)} kcal · ${d.inTarget} ${d.inTarget > 1 ? 'jours' : 'jour'} dans la cible</p>
        <div class="st-bars" style="--goal:${(d.g.kcal / max) * 100}%">${d.foods.map((m, i) => `<div><i style="--h:${(m.kcal / max) * 100}%;--i:${i}"></i><small>${dayDate(d.days[i]).toLocaleDateString('fr-FR', { weekday: 'narrow' })}</small></div>`).join('')}<span class="st-goal"></span></div>`,
    });
    slides.push({
      tone: 'blue',
      html: `<small class="st-kicker">Protéines</small>
        <div class="st-big">${num(d.avgProtein, ' g')}<small>par jour en moyenne</small></div>
        <p class="st-sub">${d.proteinDays ? `Objectif atteint ${d.proteinDays} ${d.proteinDays > 1 ? 'fois' : 'fois'} sur 7` : `Vise ${n0(d.g.protein)} g par jour : c'est ce qui construit le muscle`}</p>
        <div class="st-dots">${d.foods.map((m, i) => `<i class="${m.protein >= d.g.protein * 0.95 ? 'on' : ''}" style="--i:${i}"></i>`).join('')}</div>`,
    });
  }

  if (d.workouts.length) {
    slides.push({
      tone: 'dark',
      html: `<small class="st-kicker">À la salle</small>
        <div class="st-big">${num(d.volume, ' kg')}<small>${esc(tonnageText(d.volume))}</small></div>
        <div class="st-grid"><div><b>${d.workouts.length}</b><small>${d.workouts.length > 1 ? 'séances' : 'séance'}</small></div><div><b>${d.sets}</b><small>séries</small></div><div><b>${n0(d.minutes)}</b><small>minutes</small></div></div>
        ${d.prs.length ? `<div class="st-pr">${icon.trophy}<div><b>${d.prs.length > 1 ? `${d.prs.length} records battus` : 'Nouveau record'}</b><small>${esc([...new Set(d.prs)].slice(0, 3).join(', '))}</small></div></div>` : ''}`,
    });
    const top = d.topMuscles[0][1];
    const colors = Object.fromEntries(d.topMuscles.map(([m, v]) => [m, `rgba(255, 77, 79, ${0.3 + 0.7 * (v / top)})`]));
    slides.push({
      tone: 'dark',
      html: `<small class="st-kicker">Tes muscles</small>
        <h1 class="st-title st-w" style="font-size:30px">${esc(muscleLabel(d.topMuscles[0][0]))}, le grand gagnant</h1>
        <div class="st-body">${bodyDiagram(colors)}</div>
        <p class="st-sub">${esc(d.topMuscles.slice(0, 3).map(([m, v]) => `${muscleLabel(m)} ${n0(v)} séries`).join(' · '))}</p>`,
    });
  }

  if (d.steps || d.water || d.due) {
    const marathons = d.km / 42.2;
    slides.push({
      tone: 'teal',
      html: `<small class="st-kicker">Au quotidien</small>
        ${d.steps ? `<div class="st-big">${num(d.steps)}<small>pas, soit ${n1(Math.round(d.km * 10) / 10)} km${marathons >= 1 ? ` (${n1(Math.round(marathons * 10) / 10)} marathon${marathons >= 2 ? 's' : ''})` : ''}</small></div>` : ''}
        <div class="st-grid">
          ${d.water ? `<div><b>${n1(Math.round(d.water / 100) / 10)} L</b><small>d'eau bue</small></div>` : ''}
          ${d.due ? `<div><b>${Math.round((d.taken / d.due) * 100)} %</b><small>compléments pris</small></div>` : ''}
          <div><b>${d.perfect}</b><small>${d.perfect > 1 ? 'journées parfaites' : 'journée parfaite'}</small></div>
        </div>`,
    });
  }

  slides.push({
    tone: 'accent',
    last: true,
    html: `<div class="st-center"><small class="st-kicker">Ta note</small>
      <div class="st-score">${ring(d.score / 100, ['#ffffff', 'rgba(255,255,255,.7)'], 190, 16, { animate: true })}<b>${num(d.score)}</b></div>
      <h1 class="st-title st-w" style="font-size:28px">${esc(verdict(d.score))}</h1>
      <button class="st-share" data-x="recap-share">${icon.share} Partager</button></div>`,
  });
  return slides;
}

// ---------------------------------------------------------------------------
// Lecteur
// ---------------------------------------------------------------------------

let player = null;

function show(i) {
  const p = player;
  if (!p) return;
  if (i >= p.slides.length) return closeRecap();
  p.index = Math.max(0, i);
  const s = p.slides[p.index];
  p.el.querySelector('.st-progress').innerHTML = p.slides.map((_, n) => `<i class="${n < p.index ? 'full' : n === p.index ? 'run' : ''}"><u style="--d:${SLIDE_MS}ms"></u></i>`).join('');
  const view = p.el.querySelector('.st-view');
  view.className = `st-view tone-${s.tone}`;
  view.innerHTML = `<div class="st-slide">${s.html}</div>`;
  animateCounts(view);
  animateRings(view);
  haptic();
  p.el.querySelector('.st-progress .run u')?.addEventListener('animationend', () => {
    if (player === p && !p.slides[p.index].last) show(p.index + 1);
  });
}

function setPaused(paused) {
  if (player) player.el.classList.toggle('paused', paused);
}

export function openRecap() {
  const data = weekData();
  const el = document.createElement('div');
  el.className = 'story';
  el.innerHTML = `<div class="st-view"></div><div class="st-progress"></div>
    <button class="round st-close" data-x="recap-close" aria-label="Fermer">${icon.x}</button>`;
  document.body.append(el);
  document.body.style.overflow = 'hidden';
  player = { el, data, slides: buildSlides(data), index: 0 };
  state.recapSeen = weekKey();
  save();
  show(0);

  let downAt = 0;
  el.addEventListener('pointerdown', () => {
    downAt = Date.now();
    setPaused(true);
  });
  el.addEventListener('pointerup', (e) => {
    setPaused(false);
    if (Date.now() - downAt > 250 || e.target.closest('button')) return;
    show(player.index + (e.clientX < innerWidth * 0.3 ? -1 : 1));
  });
}

function closeRecap() {
  if (!player) return;
  const { el } = player;
  player = null;
  el.classList.add('out');
  document.body.style.overflow = '';
  setTimeout(() => el.remove(), 320);
}

// ---------------------------------------------------------------------------
// Image à partager
// ---------------------------------------------------------------------------

function drawShareImage(d) {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  const a = currentAccent();
  const bg = x.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, a.dark);
  bg.addColorStop(1, '#0a0c0e');
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);
  const font = (w, s) => `${w} ${s}px ui-rounded, -apple-system, system-ui, sans-serif`;
  x.fillStyle = '#fff';
  x.font = font(800, 44);
  x.fillText('Assiette', 80, 110);
  x.font = font(600, 36);
  x.globalAlpha = 0.75;
  x.fillText(`Du ${d.range}`, 80, 170);
  x.globalAlpha = 1;

  // Note au centre, dans son anneau
  const cx = W / 2;
  const cy = 480;
  x.lineWidth = 36;
  x.lineCap = 'round';
  x.strokeStyle = 'rgba(255,255,255,.2)';
  x.beginPath();
  x.arc(cx, cy, 190, 0, Math.PI * 2);
  x.stroke();
  x.strokeStyle = '#fff';
  x.beginPath();
  x.arc(cx, cy, 190, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * d.score) / 100);
  x.stroke();
  x.textAlign = 'center';
  x.font = font(900, 150);
  x.fillText(String(d.score), cx, cy + 52);
  x.font = font(800, 56);
  x.fillText(verdict(d.score), cx, 780);

  const stats = [
    d.logged ? [`${n0(d.avgKcal)}`, 'kcal par jour'] : null,
    d.logged ? [`${n0(d.avgProtein)} g`, 'protéines par jour'] : null,
    d.workouts.length ? [`${d.workouts.length}`, d.workouts.length > 1 ? 'séances' : 'séance'] : null,
    d.volume ? [`${n1(Math.round(d.volume / 100) / 10)} t`, 'soulevées'] : null,
    d.steps ? [`${n1(Math.round(d.km * 10) / 10)} km`, 'à pied'] : null,
    d.prs.length ? [`${d.prs.length}`, d.prs.length > 1 ? 'records' : 'record'] : null,
  ].filter(Boolean).slice(0, 4);
  stats.forEach(([v, l], i) => {
    const sx = 80 + (i % 2) * 480;
    const sy = 860 + Math.floor(i / 2) * 210;
    x.fillStyle = 'rgba(255,255,255,.12)';
    x.beginPath();
    x.roundRect(sx, sy, 440, 180, 40);
    x.fill();
    x.fillStyle = '#fff';
    x.textAlign = 'left';
    x.font = font(900, 72);
    x.fillText(v, sx + 36, sy + 92);
    x.font = font(600, 34);
    x.globalAlpha = 0.8;
    x.fillText(l, sx + 36, sy + 146);
    x.globalAlpha = 1;
  });
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}

act('recap-open', () => openRecap());
act('recap-close', closeRecap);
act('recap-share', async () => {
  if (!player) return;
  const blob = await drawShareImage(player.data);
  const file = new File([blob], `assiette-semaine-${dayKey()}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    tone([784, 1047], 0.06, 0.1);
  } catch (e) {
    if (e.name !== 'AbortError') toast('Partage impossible', 'info');
  }
});

// ---------------------------------------------------------------------------
// Bannière du dimanche soir et du lundi
// ---------------------------------------------------------------------------

function weekKey(d = new Date()) {
  // Lundi de la semaine à laquelle appartient le récap : dimanche soir et lundi parlent de la même.
  const copy = new Date(d);
  const dow = copy.getDay();
  copy.setDate(copy.getDate() + (dow === 0 ? 1 : dow === 1 ? 0 : 1 - dow));
  return dayKey(copy);
}

export function recapBanner() {
  const now = new Date();
  const dow = now.getDay();
  const open = (dow === 0 && now.getHours() >= 18) || dow === 1;
  if (!open || state.recapSeen === weekKey(now)) return '';
  const hasData = lastDays(7).some((d) => totalsOn(d).kcal > 0) || state.workouts.some((w) => w.end > Date.now() - 7 * 864e5);
  if (!hasData) return '';
  return `<button class="recap-banner glass" data-x="recap-open"><span class="rb-play">${icon.play}</span>
    <div class="spacer"><b>Ton récap de la semaine est prêt</b><small>30 secondes, ta note et tes records</small></div>${icon.chevron}</button>`;
}
