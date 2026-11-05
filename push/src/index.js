// Serveur de rappels d'Assiette : envoie les notifications de compléments à 16 h, 18 h et 20 h (heure locale
// de chaque téléphone), seulement si tout n'a pas été pris. Il ne connaît ni les noms ni les doses :
// le téléphone écrit lui-même le texte à partir de ses données.
import { sendPush } from './webpush.js';

const TIERS = { 16: 1, 18: 2, 20: 3 };
const PUSH_HOSTS = [/^web\.push\.apple\.com$/, /^fcm\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/];
const ID = /^[0-9a-f-]{36}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function validTz(tz) {
  try {
    new Intl.DateTimeFormat('fr', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function validSub(sub) {
  try {
    const url = new URL(sub.endpoint);
    return url.protocol === 'https:' && PUSH_HOSTS.some((re) => re.test(url.hostname)) &&
      typeof sub.keys?.p256dh === 'string' && typeof sub.keys?.auth === 'string' && sub.endpoint.length < 1000;
  } catch {
    return false;
  }
}

/** Heure, jour et jour de la semaine sur le téléphone de l'abonné. */
export function localTime(tz, date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false, weekday: 'short',
  }).formatToParts(date).map((p) => [p.type, p.value]));
  return {
    hour: Number(parts.hour) % 24,
    day: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday),
  };
}

const pushOptions = (env, urgency) => ({
  privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK),
  publicKey: env.VAPID_PUBLIC,
  subject: env.VAPID_SUBJECT,
  urgency,
});

export async function runReminders(env, now = new Date()) {
  let cursor;
  let sent = 0;
  do {
    const page = await env.RAPPELS.list({ prefix: 'sub:', cursor });
    for (const { name } of page.keys) {
      const rec = await env.RAPPELS.get(name, 'json');
      if (!rec?.enabled) continue;
      const t = localTime(rec.tz, now);
      const tier = TIERS[t.hour];
      if (!tier || rec.doneDay === t.day || !rec.weekdays?.includes(t.weekday)) continue;
      const res = await sendPush(rec.sub, { tier, day: t.day }, pushOptions(env, tier === 3 ? 'high' : 'normal'));
      if (res.status === 404 || res.status === 410) await env.RAPPELS.delete(name);
      else if (res.ok) sent++;
      else console.warn('Envoi refusé', res.status, new URL(rec.sub.endpoint).hostname);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return sent;
}

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    const reply = (status, data) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'content-type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const { pathname } = new URL(request.url);
    if (request.method === 'GET' && pathname === '/') return reply(200, { ok: true, service: 'assiette-rappels' });
    if (request.method !== 'POST') return reply(404, { error: 'Introuvable' });
    if (!allowed.includes(origin)) return reply(403, { error: "Réservé à l'app Assiette" });

    if (env.LIMITER) {
      const { success } = await env.LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'inconnu' });
      if (!success) return reply(429, { error: 'Trop de requêtes' });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return reply(400, { error: 'Requête illisible' });
    }
    if (!ID.test(body?.id || '')) return reply(400, { error: 'Identifiant invalide' });
    const key = `sub:${body.id}`;
    const existing = await env.RAPPELS.get(key, 'json');

    if (pathname === '/sync') {
      if (body.sub && !validSub(body.sub)) return reply(400, { error: 'Abonnement invalide' });
      if (!body.sub && !existing) return reply(404, { error: 'Abonnement inconnu' });
      const rec = {
        sub: body.sub ? { endpoint: body.sub.endpoint, keys: { p256dh: body.sub.keys.p256dh, auth: body.sub.keys.auth } } : existing.sub,
        tz: validTz(body.tz) ? body.tz : existing?.tz || 'Europe/Paris',
        weekdays: Array.isArray(body.weekdays) ? body.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : existing?.weekdays || [],
        doneDay: DAY.test(body.doneDay || '') ? body.doneDay : '',
        enabled: body.enabled !== false,
      };
      await env.RAPPELS.put(key, JSON.stringify(rec));
      return reply(200, { ok: true });
    }

    if (pathname === '/test') {
      if (!existing) return reply(404, { error: 'Abonnement inconnu' });
      const res = await sendPush(existing.sub, { test: true, tier: 1 }, pushOptions(env, 'high'));
      if (res.status === 404 || res.status === 410) await env.RAPPELS.delete(key);
      return reply(res.ok ? 200 : 502, { ok: res.ok, status: res.status });
    }

    return reply(404, { error: 'Introuvable' });
  },

  scheduled(event, env, ctx) {
    ctx.waitUntil(runReminders(env, new Date(event.scheduledTime)));
  },
};
