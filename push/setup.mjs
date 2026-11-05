// Met en ligne le serveur de rappels en une commande : « npm run setup ».
// Crée la base, les clés de signature, déploie sur Cloudflare (gratuit) et branche l'app dessus.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { b64urlEncode } from './src/webpush.js';

const say = (text) => console.log(`\n▸ ${text}`);
const wrangler = (args, options = {}) => spawnSync('npx', ['wrangler', ...args], { encoding: 'utf8', ...options });

// Affiche la sortie tout en la gardant : wrangler peut poser des questions (sous-domaine workers.dev).
function teed(args) {
  return new Promise((resolve, reject) => {
    let out = '';
    const child = spawn('npx', ['wrangler', ...args], { stdio: ['inherit', 'pipe', 'inherit'] });
    child.stdout.on('data', (d) => {
      out += d;
      process.stdout.write(d);
    });
    child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`wrangler ${args[0]} a échoué`))));
  });
}

say('Connexion à Cloudflare');
const who = wrangler(['whoami']);
if (/not authenticated/i.test(`${who.stdout}${who.stderr}`)) {
  const login = wrangler(['login'], { stdio: 'inherit' });
  if (login.status !== 0) throw new Error('Connexion à Cloudflare annulée.');
}

say('Clés de signature');
let keys;
if (existsSync('.vapid.json')) {
  keys = JSON.parse(readFileSync('.vapid.json', 'utf8'));
} else {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  keys = {
    privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey),
    publicKey: b64urlEncode(await crypto.subtle.exportKey('raw', pair.publicKey)),
  };
  writeFileSync('.vapid.json', JSON.stringify(keys), { mode: 0o600 });
}

let toml = readFileSync('wrangler.toml', 'utf8');
toml = toml.replace(/VAPID_PUBLIC = ".*"/, `VAPID_PUBLIC = "${keys.publicKey}"`);

say('Base des abonnements');
if (toml.includes('id = "a-remplir"')) {
  const created = wrangler(['kv', 'namespace', 'create', 'assiette-rappels']);
  let id = `${created.stdout}${created.stderr}`.match(/"?id"?\s*[=:]\s*"([0-9a-f]{32})"/)?.[1];
  if (!id) {
    const list = JSON.parse(wrangler(['kv', 'namespace', 'list']).stdout);
    id = list.find((n) => n.title.includes('assiette-rappels'))?.id;
  }
  if (!id) throw new Error(`Création de la base impossible :\n${created.stdout}${created.stderr}`);
  toml = toml.replace('id = "a-remplir"', `id = "${id}"`);
}
writeFileSync('wrangler.toml', toml);

say('Mise en ligne');
const deployed = await teed(['deploy']);
const url = deployed.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/)?.[0];
if (!url) throw new Error('Adresse du serveur introuvable dans la réponse de Cloudflare.');

say('Clé privée (stockée côté Cloudflare, jamais dans le code)');
const secret = wrangler(['secret', 'put', 'VAPID_PRIVATE_JWK'], { input: JSON.stringify(keys.privateJwk) });
if (secret.status !== 0) throw new Error(`Enregistrement de la clé impossible :\n${secret.stderr}`);

say("Branchement de l'app");
writeFileSync('../docs/js/config.js', `// Serveur de rappels (dossier push/ du dépôt). Rempli automatiquement par « npm run setup ».
export const PUSH_URL = '${url}';
export const VAPID_PUBLIC = '${keys.publicKey}';
`);
const git = (...args) => spawnSync('git', args, { encoding: 'utf8', stdio: 'inherit' });
git('add', '../docs/js/config.js', 'wrangler.toml');
git('commit', '-m', 'Rappels de compléments : serveur en ligne');
const pushed = git('push', 'origin', 'main');

console.log(`\n✅ Serveur de rappels en ligne : ${url}`);
console.log(pushed.status === 0
  ? "   L'app se met à jour toute seule d'ici une minute. Dans Assiette : Compléments › Rappels, puis « Tester une notification »."
  : "   ⚠️  Le git push a échoué : pousse le commit à la main pour mettre l'app à jour.");
