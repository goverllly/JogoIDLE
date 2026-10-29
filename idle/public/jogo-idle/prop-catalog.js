/**
 * Catálogo de props gerado por `npm run props:index`.
 * Lista metadados. Não instancia cena Three.
 */
const MANIFEST_URL = "/jogo-idle/admin-studio/prop-manifest.json";

const PACK_RE = /^[a-z][A-Za-z0-9]{0,40}$/;
const KEY_RE = /^[A-Za-z][A-Za-z0-9_]{0,47}$/;

/** @type {Map<string, object>} */
let byId = new Map();
/** @type {object[]} */
let placeables = [];
let ready = false;
/** @type {Promise<object[]> | null} */
let pending = null;

function isSafeUrl(url) {
  return typeof url === "string" && url.startsWith("/jogo-idle/assets/") && !url.includes("..") && !url.includes("\\") && !/^[a-z]+:/i.test(url);
}

export function placeableEntry(pack, key) {
  if (!PACK_RE.test(String(pack || "")) || !KEY_RE.test(String(key || ""))) return null;
  return byId.get(`${pack}/${key}`) || null;
}

export function listPlaceables() {
  return placeables;
}

export function searchPlaceables({ query = "", pack = "", category = "" } = {}) {
  const q = String(query || "").trim().toLowerCase();
  return placeables.filter((asset) => {
    if (pack && asset.pack !== pack) return false;
    if (category && asset.category !== category) return false;
    if (!q) return true;
    return `${asset.name || ""} ${asset.key || ""} ${asset.pack || ""} ${asset.category || ""}`
      .toLowerCase()
      .includes(q);
  });
}

export function ensurePropCatalog() {
  if (ready) return Promise.resolve(placeables);
  if (!pending) {
    pending = fetch(MANIFEST_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const assets = Array.isArray(data?.assets) ? data.assets : [];
        const next = [];
        const index = new Map();
        for (const asset of assets) {
          if (!asset || asset.class !== "placeable" || asset.compat !== "ok") continue;
          if (!PACK_RE.test(asset.pack || "") || !KEY_RE.test(asset.key || "")) continue;
          if (!isSafeUrl(asset.url)) continue;
          next.push(asset);
          index.set(`${asset.pack}/${asset.key}`, asset);
        }
        placeables = next;
        byId = index;
        ready = true;
        return placeables;
      })
      .catch((error) => {
        console.warn("[jogo-idle] manifesto de props indisponível", error);
        placeables = [];
        byId = new Map();
        ready = true;
        return placeables;
      });
  }
  return pending;
}
