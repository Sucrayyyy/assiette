import { normalize } from './foods.js';

// Open Food Facts : base ouverte et collaborative, très complète pour les produits vendus en France.
const FIELDS = 'code,product_name,product_name_fr,generic_name_fr,brands,nutriments,serving_quantity,serving_size,image_front_small_url';
const cache = new Map();

// Catalogues intégrés, pour une recherche instantanée et hors ligne :
// les produits les plus scannés en France (avec photos), puis ceux du reste de l'Europe.
const CATALOGS = { fr: 'data/produits-fr.json', eu: 'data/produits-eu.json' };
const catalogs = {};
const byCode = new Map();

function loadOne(name) {
  catalogs[name] ??= fetch(CATALOGS[name])
    .then((r) => r.json())
    .then((d) =>
      d.products.map(([code, name, brand, kcal, protein, carbs, fat, fiber, servingG, servingLabel, img]) => {
        const p = {
          key: normalize(`${name} ${brand}`),
          food: {
            id: `off-${code}`,
            code,
            name,
            brand: brand || undefined,
            per100: { kcal, protein, carbs, fat, fiber },
            servingG: servingG || undefined,
            servingLabel: servingLabel || undefined,
            source: 'off',
            imageUrl: img ? (img.startsWith('http') ? img : d.imgPrefix + img) : undefined,
          },
        };
        byCode.set(code, p.food);
        return p;
      }),
    )
    .catch((e) => {
      delete catalogs[name];
      throw e;
    });
  return catalogs[name];
}

export const loadCatalog = () => loadOne('fr');
export const loadAllCatalogs = () => Promise.allSettled([loadOne('fr'), loadOne('eu')]);

export async function searchCatalog(query, limit = 50) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const starts = [];
  const others = [];
  for (const name of ['fr', 'eu']) {
    let list;
    try {
      list = await loadOne(name);
    } catch {
      continue;
    }
    for (const p of list) {
      if (!words.every((w) => p.key.includes(w))) continue;
      // Ceux dont le nom commence par le premier mot passent devant.
      (p.key.startsWith(words[0]) ? starts : others).push(p.food);
      if (starts.length >= limit) break;
    }
    if (starts.length + others.length >= limit * 2) break;
  }
  return [...starts, ...others].slice(0, limit);
}

/** Code-barres valide (EAN-13, EAN-8, UPC-A) : le dernier chiffre est une clé de contrôle. */
export function validBarcode(code) {
  if (!/^(\d{8}|\d{12}|\d{13})$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
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
  // Base mondiale (toute l'Europe), avec un second essai sur le miroir français si elle est occupée.
  let json;
  for (const host of ['world.openfoodfacts.org', 'fr.openfoodfacts.org']) {
    const url = `https://${host}/cgi/search.pl?search_simple=1&action=process&json=1&page_size=24&sort_by=unique_scans_n` +
      `&fields=${FIELDS}&search_terms=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal });
    if (res.ok) {
      json = await res.json();
      break;
    }
  }
  if (!json) throw new Error('Open Food Facts est occupé, réessaie dans un instant.');
  const foods = (json.products || []).map((p) => toFood(p)).filter(Boolean);
  cache.set(key, foods);
  return foods;
}

/** Cherche d'abord dans les catalogues du téléphone, puis dans toute la base mondiale Open Food Facts. */
export async function productByBarcode(code) {
  const variants = [...new Set([code, code.length === 12 ? `0${code}` : code, code.length === 13 && code.startsWith('0') ? code.slice(1) : code])];
  await loadAllCatalogs();
  for (const c of variants) if (byCode.has(c)) return byCode.get(c);
  let reached = false;
  for (const c of variants) {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(c)}.json?fields=${FIELDS}`);
      reached = true;
      if (!res.ok) continue;
      const json = await res.json();
      const food = json.product && toFood(json.product, c);
      if (food) return food;
    } catch { /* hors ligne : on essaie la variante suivante */ }
  }
  if (!reached) throw new Error('offline');
  return null;
}
