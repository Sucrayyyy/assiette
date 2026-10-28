// Relais du scan IA d'Assiette : la clé API Anthropic reste ici (secret Cloudflare),
// l'app n'a plus besoin qu'on en saisisse une.
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-5-5';
const MAX_TOKENS = 16000;

function reply(status, message, cors, type = 'invalid_request_error') {
  return new Response(JSON.stringify({ type: 'error', error: { type, message } }), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'content-type',
      'Access-Control-Expose-Headers': 'request-id',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/v1/messages') {
      return reply(404, 'Introuvable.', cors, 'not_found_error');
    }
    if (!allowed.includes(origin)) return reply(403, "Ce relais n'accepte que l'app Assiette.", cors, 'permission_error');

    const ip = request.headers.get('CF-Connecting-IP') || 'inconnu';
    const { success } = await env.SCAN_LIMITER.limit({ key: ip });
    if (!success) return reply(429, "Trop de scans d'un coup, réessaie dans une minute.", cors, 'rate_limit_error');

    let body;
    try {
      body = await request.json();
    } catch {
      return reply(400, 'Requête illisible.', cors);
    }

    // N'accepte que des analyses de repas : un seul message avec une photo, réponse en JSON structuré.
    const content = body?.messages?.[0]?.content;
    const isMealScan =
      body?.messages?.length === 1 &&
      Array.isArray(content) &&
      content.some((block) => block?.type === 'image') &&
      body?.output_config?.format?.type === 'json_schema';
    if (!isMealScan) return reply(400, 'Ce relais ne sert qu\'à analyser des photos de repas.', cors);

    body.model = MODEL;
    body.max_tokens = Math.min(Number(body.max_tokens) || MAX_TOKENS, MAX_TOKENS);

    const headers = {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': request.headers.get('anthropic-version') || '2026-10-21',
    };
    const beta = request.headers.get('anthropic-beta');
    if (beta) headers['anthropic-beta'] = beta;

    const upstream = await fetch(ANTHROPIC_URL, { method: 'POST', headers, body: JSON.stringify(body) });
    const out = new Headers(cors);
    out.set('content-type', upstream.headers.get('content-type') || 'application/json');
    const requestId = upstream.headers.get('request-id');
    if (requestId) out.set('request-id', requestId);
    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};
