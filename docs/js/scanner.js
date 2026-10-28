import { state } from './store.js';

// SDK officiel Anthropic, chargé à la demande (seulement quand on scanne un plat).
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.3.0/+esm';

// Relais qui garde la clé API côté serveur (dossier relay/ du dépôt) : personne n'a de clé à saisir.
// Une clé perso saisie dans Profil passe en priorité.
export const RELAY_URL = '';

const SYSTEM = `Tu es un nutritionniste qui estime le contenu d'un repas à partir d'une photo, pour une app de suivi des calories utilisée en France.
- Décompose le plat en ingrédients distincts et visibles (ex. "Blanc de poulet grillé", "Riz basmati cuit", "Sauce crème"), y compris les matières grasses de cuisson et les sauces probables.
- Estime le poids de chaque ingrédient tel que servi (cuit), en t'aidant de la taille de l'assiette, des couverts et des portions habituelles en France.
- Donne les valeurs nutritionnelles pour 100 g de l'aliment tel que servi, cohérentes avec la table CIQUAL de l'ANSES. Pour un produit de marque reconnaissable, utilise ses valeurs.
- Si l'utilisateur donne des précisions ou des corrections, elles priment sur ce que tu vois : applique-les et réajuste le reste en conséquence.
- Noms en français, courts et précis.`;

const SCHEMA = {
  type: 'object',
  properties: {
    dish: { type: 'string', description: 'Nom court du plat, en français' },
    notes: { type: 'string', description: 'Une phrase maximum : hypothèse importante ou incertitude' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          grams: { type: 'number', description: 'Quantité estimée sur la photo, en grammes' },
          kcal_100g: { type: 'number' },
          protein_100g: { type: 'number' },
          carbs_100g: { type: 'number' },
          fat_100g: { type: 'number' },
          fiber_100g: { type: 'number' },
          confidence: { type: 'string', enum: ['haute', 'moyenne', 'faible'] },
        },
        required: ['name', 'grams', 'kcal_100g', 'protein_100g', 'carbs_100g', 'fat_100g', 'fiber_100g', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['dish', 'notes', 'items'],
  additionalProperties: false,
};

let sdk;
let client;
let clientKey = '';

async function getClient() {
  if (!state.apiKey && !RELAY_URL) throw new Error('Ajoute ta clé API Anthropic dans Profil › Scan IA pour activer le scan.');
  sdk ??= (await import(SDK_URL)).default;
  const mode = state.apiKey || 'relais';
  if (!client || clientKey !== mode) {
    client = state.apiKey
      ? // Clé perso : appel direct depuis le téléphone, la clé reste sur l'appareil.
        new sdk({ apiKey: state.apiKey, dangerouslyAllowBrowser: true })
      : // Relais : il ajoute lui-même la clé, celle envoyée ici n'est qu'un marqueur.
        new sdk({ apiKey: 'relais', baseURL: RELAY_URL, dangerouslyAllowBrowser: true, maxRetries: 1 });
    clientKey = mode;
  }
  return client;
}

/**
 * Analyse la photo d'un plat. Pour une réanalyse, `previous` est l'analyse déjà ajustée
 * et `correction` ce que la personne veut corriger ("le blanc c'est du riz complet…").
 */
export async function analyzeMeal(jpegBase64, { previous, correction } = {}) {
  const anthropic = await getClient();

  let text = 'Analyse ce repas et estime chaque ingrédient.';
  if (previous) {
    const list = previous.items.map((i) => `- ${i.name} : ${Math.round(i.grams)} g`).join('\n');
    text += `\n\nAnalyse actuelle (déjà ajustée par l'utilisateur, garde ses quantités sauf indication contraire) :\n${list}`;
  }
  if (correction?.trim()) text += `\n\nCorrections de l'utilisateur : ${correction.trim()}\nRenvoie la liste complète mise à jour.`;

  let response;
  try {
    response = await anthropic.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      // Si une requête est refusée, l'API la relance automatiquement sur un autre modèle.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpegBase64 } },
            { type: 'text', text },
          ],
        },
      ],
    });
  } catch (e) {
    if (e instanceof sdk.AuthenticationError) {
      throw new Error(state.apiKey ? 'Clé API invalide. Vérifie-la dans Profil › Scan IA.' : 'Le scan IA est momentanément indisponible.');
    }
    if (e instanceof sdk.RateLimitError) throw new Error("Trop de scans d'un coup. Réessaie dans une minute.");
    if (e instanceof sdk.APIConnectionError) throw new Error('Pas de connexion internet. Réessaie dans un instant.');
    if (e instanceof sdk.InternalServerError) throw new Error('Le service IA est surchargé. Réessaie dans un instant.');
    throw new Error(e?.message || "L'analyse a échoué.");
  }

  if (response.stop_reason === 'refusal') throw new Error("L'IA n'a pas pu analyser cette image.");
  if (response.stop_reason === 'max_tokens') throw new Error('Réponse incomplète, réessaie.');

  const block = response.content.find((b) => b.type === 'text');
  let raw;
  try {
    raw = JSON.parse(block.text);
  } catch {
    throw new Error("Réponse de l'IA illisible, réessaie.");
  }

  return {
    dish: raw.dish,
    notes: raw.notes,
    items: raw.items.map((i) => ({
      name: i.name,
      grams: Math.max(0, Math.round(i.grams)),
      per100: { kcal: i.kcal_100g, protein: i.protein_100g, carbs: i.carbs_100g, fat: i.fat_100g, fiber: i.fiber_100g },
      source: 'ai',
      confidence: i.confidence,
    })),
  };
}

/** Réduit la photo (côté max 1280 px) en JPEG base64, et une vignette pour le journal. */
export async function preparePhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Impossible de lire cette photo.'));
      i.src = url;
    });
    const draw = (maxSide, quality) => {
      const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * s);
      canvas.height = Math.round(img.naturalHeight * s);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', quality);
    };
    const full = draw(1280, 0.78);
    return { dataUrl: full, base64: full.split(',')[1], thumb: draw(240, 0.7) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
