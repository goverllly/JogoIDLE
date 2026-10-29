export type PropLibraryAsset = {
  id: string;
  pack: string;
  key: string;
  name: string;
  category: string;
  url: string;
  thumb: string | null;
  defaultScale: number;
};

export const PROP_CATEGORY_LABELS: Record<string, string> = {
  arvores: "Árvores",
  arbustos: "Arbustos",
  vegetacao: "Vegetação",
  rochas: "Rochas",
  terrenos: "Terrenos",
  pisos: "Pisos",
  paredes: "Paredes",
  portas: "Portas",
  pontes: "Pontes",
  construcoes: "Construções",
  ruinas: "Ruínas",
  cemiterio: "Cemitério",
  masmorra: "Masmorra",
  tochas: "Tochas",
  fogueiras: "Fogueiras",
  iluminacao: "Iluminação",
  baus: "Baús",
  moveis: "Móveis",
  decoracoes: "Decorações",
  especiais: "Especiais",
};

const PACK_ORDER = [
  "dungeon",
  "nature",
  "forest",
  "city",
  "space",
  "halloween",
  "kenneyGraveyard",
  "kenneyNature",
  "quaterniusSpace",
  "medievalDecor",
  "medievalBuilding",
  "medievalTile",
  "mixedBag",
];

export function placeablesFromManifest(data: unknown): PropLibraryAsset[] {
  const assets = (data as { assets?: unknown[] } | null)?.assets;
  if (!Array.isArray(assets)) return [];
  const out: PropLibraryAsset[] = [];
  for (const row of assets) {
    if (!row || typeof row !== "object") continue;
    const asset = row as Record<string, unknown>;
    if (asset.class !== "placeable" || asset.compat !== "ok") continue;
    if (typeof asset.pack !== "string" || typeof asset.key !== "string") continue;
    if (typeof asset.url !== "string" || !asset.url.startsWith("/jogo-idle/assets/") || asset.url.includes("..")) {
      continue;
    }
    out.push({
      id: typeof asset.id === "string" ? asset.id : `${asset.pack}/${asset.key}`,
      pack: asset.pack,
      key: asset.key,
      name: typeof asset.name === "string" ? asset.name : asset.key,
      category: typeof asset.category === "string" ? asset.category : "especiais",
      url: asset.url,
      thumb: typeof asset.thumb === "string" ? asset.thumb : null,
      defaultScale: typeof asset.defaultScale === "number" ? asset.defaultScale : 1,
    });
  }
  return out;
}

export function searchPlaceables(
  assets: PropLibraryAsset[],
  filter: { query?: string; pack?: string; category?: string },
) {
  const query = (filter.query || "").trim().toLowerCase();
  return assets.filter((asset) => {
    if (filter.pack && asset.pack !== filter.pack) return false;
    if (filter.category && asset.category !== filter.category) return false;
    if (!query) return true;
    return `${asset.name} ${asset.key} ${asset.pack} ${asset.category}`.toLowerCase().includes(query);
  });
}

export function packsIn(assets: PropLibraryAsset[]) {
  const present = new Set(assets.map((asset) => asset.pack));
  const ordered = PACK_ORDER.filter((id) => present.has(id));
  for (const id of present) if (!ordered.includes(id)) ordered.push(id);
  return ordered;
}

export function categoriesIn(assets: PropLibraryAsset[], pack?: string) {
  const names = new Set<string>();
  for (const asset of assets) {
    if (pack && asset.pack !== pack) continue;
    if (asset.category) names.add(asset.category);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function categoryLabel(id: string) {
  return PROP_CATEGORY_LABELS[id] || id;
}
