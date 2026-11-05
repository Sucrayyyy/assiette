// Envoi de notifications Web Push sans dépendance : signature VAPID (RFC 8292) et chiffrement aes128gcm (RFC 8291).
const encoder = new TextEncoder();

export function b64urlEncode(bytes) {
  let bin = '';
  new Uint8Array(bytes).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(text) {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8);
  return new Uint8Array(bits);
}

/** Chiffre le message pour un abonné : seul son téléphone peut le lire. */
export async function encryptPayload(plaintext, p256dh, auth, { salt = crypto.getRandomValues(new Uint8Array(16)), serverKeys } = {}) {
  const uaPublic = b64urlDecode(p256dh);
  const pair = serverKeys || (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']));
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, pair.privateKey, 256));

  const ikm = await hkdf(b64urlDecode(auth), secret, concat(encoder.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode('Content-Encoding: nonce\0'), 12);

  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const data = concat(typeof plaintext === 'string' ? encoder.encode(plaintext) : plaintext, new Uint8Array([2]));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, data));

  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  return concat(header, asPublic, cipher);
}

/** Jeton VAPID : prouve aux services Apple, Google et Mozilla que l'envoi vient bien de notre serveur. */
export async function vapidHeader(endpoint, privateJwk, subject, publicKey) {
  const head = b64urlEncode(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  // Apple refuse les jetons valables plus d'une heure.
  const exp = Math.floor(Date.now() / 1000) + 50 * 60;
  const claims = b64urlEncode(encoder.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp, sub: subject })));
  const key = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(`${head}.${claims}`));
  return `vapid t=${head}.${claims}.${b64urlEncode(signature)}, k=${publicKey}`;
}

export async function sendPush(sub, message, { privateJwk, publicKey, subject, urgency = 'normal', ttl = 3600 }) {
  const body = await encryptPayload(JSON.stringify(message), sub.keys.p256dh, sub.keys.auth);
  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidHeader(sub.endpoint, privateJwk, subject, publicKey),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttl),
      Urgency: urgency,
      Topic: 'complements',
    },
    body,
  });
}
