import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptPayload, vapidHeader, sendPush, b64urlDecode, b64urlEncode } from '../src/webpush.js';
import worker, { localTime, runReminders } from '../src/index.js';

const enc = new TextEncoder();

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
}

/** Déchiffre comme le ferait un téléphone (RFC 8291). */
async function decrypt(body, uaPair, authSecret) {
  const salt = body.slice(0, 16);
  const idLen = body[20];
  const asPublic = body.slice(21, 21 + idLen);
  const cipher = body.slice(21 + idLen);
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', uaPair.publicKey));
  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, uaPair.privateKey, 256));
  const info = new Uint8Array([...enc.encode('WebPush: info\0'), ...uaPublic, ...asPublic]);
  const ikm = await hkdf(authSecret, secret, info, 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, cipher));
  assert.equal(plain.at(-1), 2);
  return new TextDecoder().decode(plain.slice(0, -1));
}

async function subscriber() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return {
    pair, auth,
    sub: {
      endpoint: 'https://web.push.apple.com/abc123',
      keys: { p256dh: b64urlEncode(await crypto.subtle.exportKey('raw', pair.publicKey)), auth: b64urlEncode(auth) },
    },
  };
}

async function vapidKeys() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  return { pair, privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey), publicKey: b64urlEncode(await crypto.subtle.exportKey('raw', pair.publicKey)) };
}

function kv(initial = {}) {
  const data = new Map(Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    data,
    async get(k, type) {
      const v = data.get(k);
      return v == null ? null : type === 'json' ? JSON.parse(v) : v;
    },
    async put(k, v) { data.set(k, v); },
    async delete(k) { data.delete(k); },
    async list({ prefix }) { return { keys: [...data.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }; },
  };
}

test('RFC 8291 : le vecteur officiel donne le même message chiffré', async () => {
  // Annexe A de la RFC 8291.
  const asPublicRaw = b64urlDecode('BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8');
  const privateJwk = { kty: 'EC', crv: 'P-256', d: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw', x: b64urlEncode(asPublicRaw.slice(1, 33)), y: b64urlEncode(asPublicRaw.slice(33, 65)) };
  const serverKeys = {
    privateKey: await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']),
    publicKey: await crypto.subtle.importKey('raw', asPublicRaw, { name: 'ECDH', namedCurve: 'P-256' }, true, []),
  };
  const out = await encryptPayload(
    'When I grow up, I want to be a watermelon',
    'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
    'BTBZMqHH6r4Tts7J_aSIgg',
    { salt: b64urlDecode('DGv6ra1nlYgDCS1FRnbzlw'), serverKeys },
  );
  assert.equal(
    b64urlEncode(out),
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
  );
});

test('le téléphone déchiffre le message', async () => {
  const { pair, auth, sub } = await subscriber();
  const body = await encryptPayload('{"tier":2}', sub.keys.p256dh, sub.keys.auth);
  assert.equal(await decrypt(body, pair, auth), '{"tier":2}');
});

test('le jeton VAPID est signé et limité à moins d\'une heure', async () => {
  const { pair, privateJwk, publicKey } = await vapidKeys();
  const header = await vapidHeader('https://web.push.apple.com/abc', privateJwk, 'https://sucrayyyy.github.io/assiette/', publicKey);
  const [, jwt, k] = header.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(k, publicKey);
  const [h, c, s] = jwt.split('.');
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, b64urlDecode(s), enc.encode(`${h}.${c}`)));
  const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(c)));
  assert.equal(claims.aud, 'https://web.push.apple.com');
  assert.ok(claims.exp - Date.now() / 1000 < 3600);
});

test('heure locale selon le fuseau', () => {
  const t = localTime('Europe/Paris', new Date('2026-07-15T14:00:00Z'));
  assert.deepEqual(t, { hour: 16, day: '2026-07-15', weekday: 3 });
  assert.equal(localTime('Europe/Paris', new Date('2026-01-15T15:00:00Z')).hour, 16);
});

async function withFetch(fn) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(null, { status: url.includes('gone') ? 410 : 201 });
  };
  try {
    await fn(calls);
  } finally {
    globalThis.fetch = original;
  }
}

test('rappels : paliers, compléments déjà pris, jours sans prise, abonnements morts', async () => {
  const { sub, pair, auth } = await subscriber();
  const { privateJwk, publicKey } = await vapidKeys();
  const base = { sub, tz: 'Europe/Paris', weekdays: [0, 1, 2, 3, 4, 5, 6], doneDay: '', enabled: true };
  const RAPPELS = kv({
    'sub:a': base,
    'sub:b-pris': { ...base, doneDay: '2026-07-15' },
    'sub:c-off': { ...base, enabled: false },
    'sub:d-repos': { ...base, weekdays: [1] },
    'sub:e-mort': { ...base, sub: { ...sub, endpoint: 'https://web.push.apple.com/gone' } },
  });
  const env = { RAPPELS, VAPID_PRIVATE_JWK: JSON.stringify(privateJwk), VAPID_PUBLIC: publicKey, VAPID_SUBJECT: 'https://x.test/' };
  await withFetch(async (calls) => {
    // 16 h à Paris : un seul envoi réussi, l'abonnement mort est retiré.
    assert.equal(await runReminders(env, new Date('2026-07-15T14:00:00Z')), 1);
    assert.equal(calls.length, 2);
    assert.equal(RAPPELS.data.has('sub:e-mort'), false);
    const first = calls.find((c) => !c.url.includes('gone'));
    assert.equal(first.init.headers.Urgency, 'normal');
    assert.deepEqual(JSON.parse(await decrypt(first.init.body, pair, auth)), { tier: 1, day: '2026-07-15' });

    // 20 h : urgent.
    calls.length = 0;
    await runReminders(env, new Date('2026-07-15T18:00:00Z'));
    assert.equal(calls[0].init.headers.Urgency, 'high');
    assert.equal(JSON.parse(await decrypt(calls[0].init.body, pair, auth)).tier, 3);

    // 15 h : rien.
    calls.length = 0;
    assert.equal(await runReminders(env, new Date('2026-07-15T13:00:00Z')), 0);
    assert.equal(calls.length, 0);
  });
});

test('API : origine, abonnement, marquage et test', async () => {
  const { sub } = await subscriber();
  const { privateJwk, publicKey } = await vapidKeys();
  const RAPPELS = kv();
  const env = { RAPPELS, ALLOWED_ORIGINS: 'https://sucrayyyy.github.io', VAPID_PRIVATE_JWK: JSON.stringify(privateJwk), VAPID_PUBLIC: publicKey, VAPID_SUBJECT: 'https://x.test/' };
  const id = '123e4567-e89b-12d3-a456-426614174000';
  const post = (path, body, origin = 'https://sucrayyyy.github.io') => worker.fetch(new Request(`https://w.dev${path}`, { method: 'POST', headers: { Origin: origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }), env);

  assert.equal((await post('/sync', { id, sub }, 'https://evil.test')).status, 403);
  assert.equal((await post('/sync', { id, sub: { ...sub, endpoint: 'https://evil.test/x' } })).status, 400);
  assert.equal((await post('/sync', { id })).status, 404);
  assert.equal((await post('/sync', { id: 'pas-un-id', sub })).status, 400);
  assert.equal((await post('/sync', { id, sub, tz: 'Pas/UnFuseau', weekdays: [1, 99], doneDay: '', enabled: true })).status, 200);
  const rec = JSON.parse(RAPPELS.data.get(`sub:${id}`));
  assert.equal(rec.tz, 'Europe/Paris');
  assert.deepEqual(rec.weekdays, [1]);

  assert.equal((await post('/sync', { id, tz: 'Europe/Paris', weekdays: [1], doneDay: '2026-07-15', enabled: true })).status, 200);
  assert.equal(JSON.parse(RAPPELS.data.get(`sub:${id}`)).doneDay, '2026-07-15');
  assert.equal(JSON.parse(RAPPELS.data.get(`sub:${id}`)).sub.endpoint, sub.endpoint);

  await withFetch(async (calls) => {
    assert.equal((await post('/test', { id })).status, 200);
    assert.equal(calls.length, 1);
  });
});

test('sendPush envoie les bons en-têtes', async () => {
  const { sub } = await subscriber();
  const { privateJwk, publicKey } = await vapidKeys();
  await withFetch(async (calls) => {
    await sendPush(sub, { tier: 1 }, { privateJwk, publicKey, subject: 'https://x.test/' });
    const h = calls[0].init.headers;
    assert.equal(h['Content-Encoding'], 'aes128gcm');
    assert.equal(h.TTL, '3600');
    assert.match(h.Authorization, /^vapid t=.+, k=.+$/);
  });
});
