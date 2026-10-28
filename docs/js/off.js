import { normalize } from './foods.js';

// Open Food Facts : base ouverte et collaborative, très complète pour les produits vendus en France.
const FIELDS = 'code,product_name,product_name_fr,generic_name_fr,brands,nutriments,serving_quantity,serving_size,image_front_small_url';
const cache = new Map();

// Catalogue intégré : les produits les plus scannés en France, pour une recherche instantanée et hors ligne.
let catalogPromise = null;

export function loadCatalog() {
  catalogPromise ??= fetch('data/produits-fr.json')
    .then((r) => r.json())
    .then((d) =>
      d.products.map(([code, name, brand, kcal, protein, carbs, fat, fiber, servingG, servingLabel, img]) => ({
        key: normalize(`${name} ${brand}`),
        food: {
          id: `off-${code}`,
          name,
          brand: brand || undefined,
          per100: { kcal, protein, carbs, fat, fiber },
          servingG: servingG || undefined,
          servingLabel: servingLabel || undefined,
          source: 'off',
          imageUrl: img ? (img.startsWith('http') ? img : d.imgPrefix + img) : undefined,
        },
      })),
    )
    .catch((e) => {
      catalogPromise = null;
      throw e;
    });
  return catalogPromise;
}

export async function searchCatalog(query, limit = 40) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const out = [];
  for (const p of await loadCatalog()) {
    if (words.every((w) => p.key.includes(w))) {
      out.push(p.food);
      if (out.length >= limit) break;
    }
  }
  return out;
}

const num = (v) => {
  const x = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  return typeof x === 'number' && Number.isFinite(x) ? x : 0;
};

function toFood(p, code) {
  const name = [p.product_name_fr, p.product_name, p.generic_name_fr].map((s) => (s || '').trim()).find(Boolean);
  const n = p.nutriments;
  if (!name || !n) return null;
  let kcal = num(n['energy-kcal_100g']);
  if (!kcal) kcal = num(n['energy_100g']) / 4.184;
  const per100 = {
    kcal,
    protein: num(n.proteins_100g),
    carbs: num(n.carbohydrates_100g),
    fat: num(n.fat_100g),
    fiber: num(n.fiber_100g),
  };
  if (!per100.kcal && !per100.protein && !per100.carbs) return null;
  const brands = Array.isArray(p.brands) ? p.brands[0] : p.brands;
  const brand = (brands || '').split(',')[0].trim() || undefined;
  const serving = num(p.serving_quantity);
  return {
    id: `off-${code || p.code || name}`,
    name,
    brand,
    per100,
    servingG: serving > 0 ? serving : undefined,
    servingLabel: serving > 0 ? p.serving_size || '1 portion' : undefined,
    source: 'off',
    imageUrl: p.image_front_small_url,
  };
}

export async function searchOff(query, signal) {
  const key = query.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const url =
    'https://fr.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=24&sort_by=unique_scans_n' +
    `&fields=${FIELDS}&search_terms=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Open Food Facts est occupé, réessaie dans un instant.');
  const json = await res.json();
  const foods = (json.products || []).map((p) => toFood(p)).filter(Boolean);
  cache.set(key, foods);
  return foods;
}

export async function productByBarcode(code) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.product ? toFood(json.product, code) : null;
}
