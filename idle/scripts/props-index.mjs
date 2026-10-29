/**
 * Indexa os assets 3D do Jogo IDLE e grava o manifesto de cenário.
 *
 * Uso (na pasta idle/ ou na raiz do repositório):
 *   npm run props:index
 *
 * Não altera os modelos. Para um arquivo novo aparecer no editor:
 * 1. Coloque o .gltf/.glb numa pasta já varrida (kaykit/, props/, kenney/, quaternius/).
 * 2. Rode este script de novo.
 * 3. O par pack/key antigo não muda. Arquivo novo ganha key estável a partir do nome.
 *
 * Miniaturas WebP não são geradas aqui: o Node deste projeto não tem WebGL
 * headless nem codificador de imagem (sem three no Node, sem sharp, sem canvas).
 * Se o arquivo já existir em assets/thumbs/props/{pack}/{key}.webp e o hash
 * bater com thumbs-cache.json, o manifesto aponta para ele. Caso contrário
 * thumb fica null — não registramos imagem que não foi gerada.
 */
import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, readdirSync, readSync, openSync, closeSync, writeFileSync, mkdirSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IDLE = path.resolve(HERE, "..");
const ASSETS = path.join(IDLE, "public/jogo-idle/assets");
const PUBLIC = path.join(IDLE, "public/jogo-idle");
const MANIFEST_PATH = path.join(PUBLIC, "admin-studio/prop-manifest.json");
const CATEGORIES_PATH = path.join(PUBLIC, "admin-studio/prop-categories.json");
const THUMB_CACHE_PATH = path.join(PUBLIC, "admin-studio/thumbs-cache.json");
const KAYKIT_PROPS = path.join(PUBLIC, "kaykit-props.js");

const ROOTS = ["kaykit", "kenney", "quaternius", "props", "custom", "models"];

const KEY_RE = /^[A-Za-z][A-Za-z0-9_]{0,47}$/;
const PACK_RE = /^[a-z][A-Za-z0-9]{0,40}$/;

const CONST_META = {
  DUNGEON: { pack: "dungeon", dir: "kaykit/dungeon", fallbackDir: "props/dungeon" },
  NATURE: { pack: "nature", dir: "props/nature" },
  FOREST: { pack: "forest", dir: "kaykit/forest" },
  CITY: { pack: "city", dir: "props/city" },
  SPACE: { pack: "space", dir: "props/space" },
  HALLOWEEN: { pack: "halloween", dir: "kaykit/halloween", fallbackDir: "props/halloween" },
  KENNEY_GRAVEYARD: { pack: "kenneyGraveyard", dir: "kenney/graveyard" },
  KENNEY_NATURE: { pack: "kenneyNature", dir: "kenney/nature" },
  QUATERNIUS_SPACE: { pack: "quaterniusSpace", dir: "quaternius/space" },
};

const PACK_PREFIXES = [
  ["kaykit/medieval-hexagon/buildings/", "medievalBuilding"],
  ["kaykit/medieval-hexagon/tiles/", "medievalTile"],
  ["kaykit/medieval-hexagon/decoration/", "medievalDecor"],
  ["kaykit/medieval-hexagon/", "medievalDecor"],
  ["kaykit/mixed-bag/", "mixedBag"],
  ["kaykit/dungeon/", "dungeon"],
  ["kaykit/forest/", "forest"],
  ["kaykit/halloween/", "halloween"],
  ["props/dungeon/", "dungeon"],
  ["props/halloween/", "halloween"],
  ["props/nature/", "nature"],
  ["props/city/", "city"],
  ["props/space/", "space"],
  ["kenney/graveyard/", "kenneyGraveyard"],
  ["kenney/nature/", "kenneyNature"],
  ["quaternius/space/", "quaterniusSpace"],
];

const CANONICAL_PREFIX = {
  dungeon: "kaykit/dungeon/",
  nature: "props/nature/",
  forest: "kaykit/forest/",
  city: "props/city/",
  space: "props/space/",
  halloween: "kaykit/halloween/",
  kenneyGraveyard: "kenney/graveyard/",
  kenneyNature: "kenney/nature/",
  quaterniusSpace: "quaternius/space/",
  medievalBuilding: "kaykit/medieval-hexagon/buildings/",
  medievalTile: "kaykit/medieval-hexagon/tiles/",
  medievalDecor: "kaykit/medieval-hexagon/decoration/",
  mixedBag: "kaykit/mixed-bag/",
};

const DEFAULT_SCALE = {
  kenneyNature: 0.18,
};

const CATEGORY_RULES = [
  [/torch/, "tochas"],
  [/campfire|bonfire|firebasket|fire_basket|fire-basket/, "fogueiras"],
  [/lantern|lightpost|streetlight|candle|lamp/, "iluminacao"],
  [/grave|gravestone|coffin|crypt|tomb|urn|obelisk/, "cemiterio"],
  [/chest/, "baus"],
  [/door|gate/, "portas"],
  [/bridge/, "pontes"],
  [/tree|pine|palm|oak/, "arvores"],
  [/bush|shrub/, "arbustos"],
  [/grass|flower|plant|crop|leaf|weed|fern/, "vegetacao"],
  [/rock|cliff|boulder|stone/, "rochas"],
  [/floor|tile|path|road|hex_/, "pisos"],
  [/ground|terrain|hill|coast|river/, "terrenos"],
  [/wall|fence/, "paredes"],
  [/building|house|tower|module|castle|hut|stairs|ladder/, "construcoes"],
  [/ruin|rubble|broken/, "ruinas"],
  [/table|chair|bench|shelf|bed|stool/, "moveis"],
  [/banner|flag|statue|idol|pillar|column|barrel|crate|box/, "decoracoes"],
];

function relPosix(abs) {
  return path.relative(ASSETS, abs).split(path.sep).join("/");
}

function walk(dir, out) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const abs = path.join(dir, ent.name);
    let real = abs;
    try {
      real = realpathSync(abs);
    } catch {
      out.push({ abs, escaped: true });
      continue;
    }
    const rel = path.relative(ASSETS, real);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      out.push({ abs, escaped: true });
      continue;
    }
    if (ent.isDirectory()) walk(abs, out);
    else if (ent.isFile()) out.push({ abs: real, escaped: false });
  }
  return out;
}

function hashFile(abs) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(abs);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function parseSeed(source) {
  const blocks = new Map();
  const re = /const\s+([A-Z][A-Z0-9_]*)\s*=\s*\{([^]*?)\n\};/g;
  let match;
  while ((match = re.exec(source))) {
    const entries = {};
    const line = /([A-Za-z0-9_]+)\s*:\s*'([^']+\.(?:gltf|glb))'/g;
    let item;
    let any = false;
    while ((item = line.exec(match[2]))) {
      entries[item[1]] = item[2];
      any = true;
    }
    if (any) blocks.set(match[1], entries);
  }
  return blocks;
}

function packFor(rel) {
  for (const [prefix, pack] of PACK_PREFIXES) {
    if (rel.startsWith(prefix)) return pack;
  }
  return null;
}

function pathClass(rel) {
  const ext = path.posix.extname(rel).toLowerCase();
  if (ext === ".bin") return "sidecar";
  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp") return "texture";
  if (ext !== ".gltf" && ext !== ".glb") return "other";
  if (/character-animations|\/animations\/|mannequin|\/Rig_/i.test(rel)) return "rig";
  if (rel.startsWith("models/")) return /skeleton/i.test(rel) ? "monster" : "character";
  if (rel.includes("/characters/")) return "monster";
  if (
    rel.startsWith("custom/") ||
    rel.includes("fantasy-weapons/") ||
    rel.startsWith("props/weapons/") ||
    rel.startsWith("props/tools/") ||
    rel.includes("/skeletons/props/")
  ) {
    return "equipment";
  }
  return "candidate";
}

function readGlbDocument(abs) {
  const fd = openSync(abs, "r");
  try {
    const header = Buffer.alloc(20);
    const got = readSync(fd, header, 0, 20, 0);
    if (got < 20) return { error: "GLB incompleto" };
    if (header.toString("utf8", 0, 4) !== "glTF") return { error: "GLB inválido" };
    const jsonLen = header.readUInt32LE(12);
    const jsonType = header.toString("utf8", 16, 20);
    if (jsonType !== "JSON") return { error: "GLB sem JSON" };
    if (jsonLen < 2 || jsonLen > 20_000_000) return { error: "JSON do GLB fora do limite" };
    const jsonBuf = Buffer.alloc(jsonLen);
    const n = readSync(fd, jsonBuf, 0, jsonLen, 20);
    if (n < jsonLen) return { error: "GLB truncado" };
    return { json: JSON.parse(jsonBuf.toString("utf8").replace(/\0+$/, "").trim()) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "GLB ilegível" };
  } finally {
    closeSync(fd);
  }
}

function readDocument(abs, ext) {
  if (ext === ".glb") return readGlbDocument(abs);
  try {
    const text = readFileSync(abs, "utf8");
    if (text.includes("\0")) return { error: "gltf binário inesperado" };
    return { json: JSON.parse(text) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "gltf ilegível" };
  }
}

function dependencyIssues(json, fileDir) {
  const issues = [];
  const check = (uri, label) => {
    if (!uri || typeof uri !== "string") return;
    if (uri.startsWith("data:")) return;
    if (/^[a-z][a-z0-9+.-]*:/i.test(uri) || uri.startsWith("//")) {
      issues.push(`${label} externo não autorizado`);
      return;
    }
    if (uri.includes("\\") || uri.includes("\0")) {
      issues.push(`${label} com caminho inválido`);
      return;
    }
    const resolved = path.resolve(fileDir, uri);
    const rel = path.relative(ASSETS, resolved);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      issues.push(`${label} fora dos assets`);
      return;
    }
    if (!existsSync(resolved) || !statSync(resolved).isFile()) {
      issues.push(`${label} ausente: ${path.posix.basename(uri)}`);
    }
  };
  for (const buf of json.buffers || []) check(buf?.uri, "buffer");
  for (const img of json.images || []) check(img?.uri, "textura");
  return issues;
}

function geometryCounts(json) {
  let primitives = 0;
  for (const mesh of json.meshes || []) primitives += (mesh.primitives || []).length;
  return { primitives, skins: (json.skins || []).length };
}

function modelStem(filename) {
  return filename.replace(/\.glb$/i, "").replace(/\.gltf$/i, "").toLowerCase();
}

function displayName(filename) {
  const stem = filename.replace(/\.glb$/i, "").replace(/\.gltf$/i, "");
  const name = stem.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return name || stem;
}

function slugKey(filename) {
  let key = filename
    .replace(/\.glb$/i, "")
    .replace(/\.gltf$/i, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  if (!key) key = "prop";
  if (!/^[A-Za-z]/.test(key)) key = `p_${key}`;
  if (key.length > 48) key = key.slice(0, 48).replace(/_+$/g, "");
  if (!KEY_RE.test(key)) key = "prop";
  return key;
}

function uniqueKey(used, base, rel) {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  const suffix = createHash("sha256").update(rel).digest("hex").slice(0, 6);
  let next = `${base}_${suffix}`;
  if (next.length > 48) next = `${base.slice(0, 41).replace(/_+$/g, "")}_${suffix}`;
  if (used.has(next) || !KEY_RE.test(next)) next = `p_${suffix}`;
  used.add(next);
  return next;
}

function categoryFor(pack, rel, filename) {
  const blob = `${rel} ${filename}`.toLowerCase();
  let category = null;
  for (const [rule, name] of CATEGORY_RULES) {
    if (rule.test(blob)) {
      category = name;
      break;
    }
  }
  if (!category && pack === "dungeon") category = "masmorra";
  if (!category && (pack === "kenneyGraveyard" || pack === "halloween")) category = "cemiterio";
  if (!category) category = "especiais";
  return category;
}

function applyOverride(pack, key, category, overrides) {
  const custom = overrides[`${pack}/${key}`];
  if (typeof custom === "string" && /^[a-z0-9_]{2,32}$/.test(custom)) return custom;
  return category;
}

function assetUrl(rel) {
  return encodeURI(`/jogo-idle/assets/${rel}`);
}

function loadOverrides() {
  if (!existsSync(CATEGORIES_PATH)) {
    mkdirSync(path.dirname(CATEGORIES_PATH), { recursive: true });
    writeFileSync(CATEGORIES_PATH, `${JSON.stringify({ overrides: {} }, null, 2)}\n`);
    return {};
  }
  const raw = JSON.parse(readFileSync(CATEGORIES_PATH, "utf8"));
  return raw && typeof raw.overrides === "object" && raw.overrides ? raw.overrides : {};
}

function loadThumbCache() {
  if (!existsSync(THUMB_CACHE_PATH)) {
    writeFileSync(
      THUMB_CACHE_PATH,
      `${JSON.stringify({ version: 1, entries: {} }, null, 2)}\n`,
    );
    return {};
  }
  try {
    const raw = JSON.parse(readFileSync(THUMB_CACHE_PATH, "utf8"));
    return raw && typeof raw.entries === "object" && raw.entries ? raw.entries : {};
  } catch {
    return {};
  }
}

function thumbFor(pack, key, hash, cache) {
  const id = `${pack}/${key}`;
  const rel = `assets/thumbs/props/${pack}/${key}.webp`;
  const abs = path.join(PUBLIC, rel);
  const cached = cache[id];
  if (cached && cached.hash === hash && existsSync(abs) && statSync(abs).isFile()) {
    return `/jogo-idle/${rel}`;
  }
  return null;
}

function preferCanonical(a, b) {
  const prefix = CANONICAL_PREFIX[a.pack] || "";
  const aCanon = prefix && a.rel.startsWith(prefix) ? 1 : 0;
  const bCanon = prefix && b.rel.startsWith(prefix) ? 1 : 0;
  if (aCanon !== bCanon) return bCanon - aCanon;
  const aGltf = a.rel.endsWith(".gltf") ? 1 : 0;
  const bGltf = b.rel.endsWith(".gltf") ? 1 : 0;
  if (aGltf !== bGltf) return bGltf - aGltf;
  return a.rel.length - b.rel.length;
}

async function main() {
  const overrides = loadOverrides();
  const thumbCache = loadThumbCache();
  const seedBlocks = parseSeed(readFileSync(KAYKIT_PROPS, "utf8"));
  const seedByPath = new Map();
  const fallbackByKey = new Map();

  for (const [constName, entries] of seedBlocks) {
    if (constName === "DUNGEON_LEGACY") {
      for (const [key, file] of Object.entries(entries)) {
        fallbackByKey.set(`dungeon/${key}`, `props/dungeon/${file}`);
      }
      continue;
    }
    const meta = CONST_META[constName];
    if (!meta) continue;
    for (const [key, file] of Object.entries(entries)) {
      if (!KEY_RE.test(key) || !PACK_RE.test(meta.pack)) {
        throw new Error(`Seed inválida ${meta.pack}/${key}`);
      }
      seedByPath.set(`${meta.dir}/${file}`, { pack: meta.pack, key, file, fallbackDir: meta.fallbackDir || null });
    }
  }

  const found = [];
  for (const root of ROOTS) {
    const abs = path.join(ASSETS, root);
    if (!existsSync(abs)) continue;
    walk(abs, found);
  }

  const assets = [];
  const candidates = [];
  let other = 0;
  let thumbs = 0;

  for (const file of found) {
    if (file.escaped) {
      assets.push({
        id: relPosix(file.abs),
        pack: null,
        key: null,
        name: path.basename(file.abs),
        category: null,
        class: "incompatible",
        path: relPosix(file.abs),
        url: null,
        format: null,
        hash: null,
        thumb: null,
        compat: "incompatible",
        reason: "caminho fora dos assets autorizados",
        canonical: null,
      });
      continue;
    }
    const rel = relPosix(file.abs);
    const kind = pathClass(rel);
    if (kind === "other") {
      other += 1;
      continue;
    }
    const filename = path.posix.basename(rel);
    const hash = await hashFile(file.abs);
    if (kind === "sidecar" || kind === "texture") {
      assets.push({
        id: rel,
        pack: null,
        key: null,
        name: filename,
        category: null,
        class: kind,
        path: rel,
        url: null,
        format: path.posix.extname(rel).slice(1).toLowerCase(),
        hash,
        thumb: null,
        compat: "excluded",
        reason: null,
        canonical: null,
      });
      continue;
    }

    const ext = path.posix.extname(rel).toLowerCase();
    const doc = readDocument(file.abs, ext);
    if (doc.error || !doc.json || typeof doc.json !== "object") {
      assets.push({
        id: rel,
        pack: packFor(rel),
        key: null,
        name: displayName(filename),
        category: null,
        class: "incompatible",
        path: rel,
        url: null,
        format: ext.slice(1),
        hash,
        thumb: null,
        compat: "incompatible",
        reason: doc.error || "documento ilegível",
        canonical: null,
      });
      continue;
    }

    const issues = dependencyIssues(doc.json, path.dirname(file.abs));
    const geo = geometryCounts(doc.json);
    const seed = seedByPath.get(rel) || null;
    const record = {
      rel,
      filename,
      hash,
      ext: ext.slice(1),
      pack: seed?.pack || packFor(rel),
      seed,
      issues,
      primitives: geo.primitives,
      skins: geo.skins,
      pathKind: kind,
    };

    if (kind === "rig" || kind === "equipment" || kind === "character" || kind === "monster") {
      assets.push({
        id: rel,
        pack: null,
        key: null,
        name: displayName(filename),
        category: null,
        class: kind,
        path: rel,
        url: null,
        format: record.ext,
        hash,
        thumb: null,
        compat: "excluded",
        reason: issues.length ? issues.join("; ") : null,
        canonical: null,
      });
      continue;
    }

    if (!record.pack) {
      assets.push({
        id: rel,
        pack: null,
        key: null,
        name: displayName(filename),
        category: null,
        class: "incompatible",
        path: rel,
        url: null,
        format: record.ext,
        hash,
        thumb: null,
        compat: "incompatible",
        reason: "pasta sem pack de cenário",
        canonical: null,
      });
      continue;
    }

    const seedFile = Boolean(seed);
    if (record.skins > 0 && !seedFile) {
      const base = filename.toLowerCase();
      const skinnedClass = /enemy|creature|monster/.test(base)
        ? "monster"
        : /astronaut|mech|character|hero|npc/.test(base)
          ? "character"
          : null;
      if (skinnedClass) {
        assets.push({
          id: rel,
          pack: null,
          key: null,
          name: displayName(filename),
          category: null,
          class: skinnedClass,
          path: rel,
          url: null,
          format: record.ext,
          hash,
          thumb: null,
          compat: "excluded",
          reason: "malha com esqueleto; fica fora do cenário",
          canonical: null,
        });
        continue;
      }
    }
    const blocking = issues.filter((issue) => !(seedFile && issue.startsWith("textura ausente")));
    if (blocking.length || record.primitives === 0 || (record.skins > 0 && !seedFile)) {
      const reason = blocking.length
        ? blocking.join("; ")
        : record.primitives === 0
          ? "sem geometria"
          : "possui esqueleto (skin); não é prop estático";
      assets.push({
        id: rel,
        pack: record.pack,
        key: null,
        name: displayName(filename),
        category: null,
        class: "incompatible",
        path: rel,
        url: null,
        format: record.ext,
        hash,
        thumb: null,
        compat: "incompatible",
        reason,
        canonical: null,
      });
      continue;
    }

    candidates.push({ ...record, warning: issues.find((issue) => issue.startsWith("textura ausente")) || null });
  }

  const byRel = new Map(candidates.map((row) => [row.rel, row]));
  const usedKeys = new Map();
  const claimed = new Set();
  const placeableByPackStem = new Map();
  const seedMissing = [];

  function reserve(pack, key) {
    if (!usedKeys.has(pack)) usedKeys.set(pack, new Set());
    usedKeys.get(pack).add(key);
  }

  function rememberStem(row, id) {
    const stem = `${row.pack}/${modelStem(row.filename)}`;
    if (!placeableByPackStem.has(stem)) placeableByPackStem.set(stem, id);
  }

  for (const [rel, seed] of seedByPath) {
    reserve(seed.pack, seed.key);
    let chosen = byRel.get(rel) || null;
    if (!chosen) {
      const legacy = fallbackByKey.get(`${seed.pack}/${seed.key}`);
      const sameName = seed.fallbackDir ? `${seed.fallbackDir}/${seed.file}` : null;
      chosen = (legacy && byRel.get(legacy)) || (sameName && byRel.get(sameName)) || null;
    }
    if (!chosen) {
      seedMissing.push(`${seed.pack}/${seed.key}`);
      continue;
    }
    chosen.assignedKey = seed.key;
    chosen.canonicalId = `${seed.pack}/${seed.key}`;
    claimed.add(chosen.rel);
    rememberStem(chosen, chosen.canonicalId);
  }

  const groups = new Map();
  for (const row of candidates) {
    if (claimed.has(row.rel)) continue;
    const stem = `${row.pack}/${modelStem(row.filename)}`;
    if (!groups.has(stem)) groups.set(stem, []);
    groups.get(stem).push(row);
  }

  for (const [stem, rows] of groups) {
    const known = placeableByPackStem.get(stem);
    if (known) {
      for (const row of rows) row.duplicateOf = known;
      continue;
    }
    rows.sort(preferCanonical);
    const winner = rows[0];
    const used = usedKeys.get(winner.pack) || new Set();
    usedKeys.set(winner.pack, used);
    winner.assignedKey = uniqueKey(used, slugKey(winner.filename), winner.rel);
    winner.canonicalId = `${winner.pack}/${winner.assignedKey}`;
    claimed.add(winner.rel);
    placeableByPackStem.set(stem, winner.canonicalId);
    for (const row of rows.slice(1)) row.duplicateOf = winner.canonicalId;
  }

  for (const row of candidates) {
    if (row.assignedKey && !row.duplicateOf) {
      const category = applyOverride(
        row.pack,
        row.assignedKey,
        categoryFor(row.pack, row.rel, row.filename),
        overrides,
      );
      const thumb = thumbFor(row.pack, row.assignedKey, row.hash, thumbCache);
      if (thumb) thumbs += 1;
      const url = assetUrl(row.rel);
      if (!url.startsWith("/jogo-idle/assets/") || url.includes("..")) {
        throw new Error(`URL recusada para ${row.rel}`);
      }
      assets.push({
        id: `${row.pack}/${row.assignedKey}`,
        pack: row.pack,
        key: row.assignedKey,
        name: displayName(row.filename),
        category,
        class: "placeable",
        path: row.rel,
        url,
        format: row.ext,
        hash: row.hash,
        thumb,
        defaultScale: DEFAULT_SCALE[row.pack] ?? 1,
        compat: "ok",
        reason: row.warning,
        canonical: null,
      });
      continue;
    }
    if (row.duplicateOf) {
      assets.push({
        id: row.rel,
        pack: row.pack,
        key: null,
        name: displayName(row.filename),
        category: null,
        class: "duplicate",
        path: row.rel,
        url: null,
        format: row.ext,
        hash: row.hash,
        thumb: null,
        compat: "duplicate",
        reason: `mesmo modelo que ${row.duplicateOf}`,
        canonical: row.duplicateOf,
      });
    }
  }

  const counts = {
    files: found.length,
    placeable: 0,
    duplicate: 0,
    incompatible: 0,
    equipment: 0,
    character: 0,
    monster: 0,
    rig: 0,
    sidecar: 0,
    texture: 0,
    other,
    thumbs,
    seed: seedByPath.size,
    seedMissing: seedMissing.length,
  };
  for (const asset of assets) {
    if (counts[asset.class] != null) counts[asset.class] += 1;
  }
  const packs = {};
  for (const asset of assets) {
    if (asset.class !== "placeable") continue;
    if (!packs[asset.pack]) packs[asset.pack] = { defaultScale: DEFAULT_SCALE[asset.pack] ?? 1, count: 0 };
    packs[asset.pack].count += 1;
  }

  assets.sort((a, b) => {
    const klass = a.class.localeCompare(b.class);
    if (klass) return klass;
    return `${a.pack || ""}/${a.key || ""}/${a.path}`.localeCompare(`${b.pack || ""}/${b.key || ""}/${b.path}`);
  });

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: "props:index",
    packs,
    counts,
    seedMissing,
    thumbs: {
      generated: thumbs,
      status: thumbs > 0 ? "partial" : "unavailable",
      reason:
        "Geração WebP exige WebGL headless e um codificador de imagem, que não estão nas dependências do projeto. Thumb só entra no manifesto se o arquivo .webp já existir e o hash do modelo bater com admin-studio/thumbs-cache.json.",
      directory: "/jogo-idle/assets/thumbs/props/{pack}/{key}.webp",
    },
    assets,
  };

  mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest)}\n`);

  console.log(JSON.stringify({
    manifest: path.relative(IDLE, MANIFEST_PATH),
    counts,
    packs: Object.fromEntries(Object.entries(packs).map(([id, meta]) => [id, meta.count])),
    seedMissing,
  }, null, 2));

  if (seedMissing.length) {
    console.error("Seed com arquivo ausente. Saves antigos desses keys deixariam de validar.");
    process.exitCode = 1;
  }
}

await main();
