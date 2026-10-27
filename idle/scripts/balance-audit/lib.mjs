/**
 * Helpers somente-leitura para auditoria de balanceamento.
 * Não persiste estado do jogo.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
export const IDLE = join(ROOT, "idle");
export const OUT = join(ROOT, "docs/balanceamento/data");
export const DOCS = join(ROOT, "docs/balanceamento");

export function ensureOut() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(DOCS, { recursive: true });
}

export function writeJson(name, data) {
  ensureOut();
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2), "utf8");
}

export function writeCsv(name, rows, columns) {
  ensureOut();
  const cols = columns || (rows[0] ? Object.keys(rows[0]) : []);
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(",")];
  for (const row of rows) lines.push(cols.map((c) => esc(row[c])).join(","));
  writeFileSync(join(OUT, name), lines.join("\n") + "\n", "utf8");
}

export function writeMd(name, body) {
  ensureOut();
  writeFileSync(join(DOCS, name), body, "utf8");
}

/** PRNG Mulberry32 — reproduzível. */
export function makeRng(seed = 1) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function loadStandaloneCatalog() {
  const path = join(IDLE, "data/save.json");
  if (!existsSync(path)) return { exists: false, path };
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return {
    exists: true,
    path,
    dropChance: raw.catalog?.dropChance ?? null,
    balance: raw.catalog?.overrides?.__world?.balance || {},
    zones: raw.catalog?.overrides?.__world?.zones || {},
    merchant: raw.catalog?.overrides?.__merchant || {},
    characterCount: Array.isArray(raw.characters) ? raw.characters.length : 0,
    characters: (raw.characters || []).map((c) => ({
      id: c.id,
      name: c.name,
      classId: c.classId,
      level: c.level,
      gold: c.gold,
      ascension: c.state?.ascension ?? null,
      careerKills: c.state?.career?.kills ?? null,
      careerPlayMs: c.state?.career?.playMs ?? null,
      createdAt: c.createdAt,
    })),
  };
}

/** Espelho de computeStats (character.ts) — só leitura das constantes. */
export function computeStatsMirror(attrs, level, balance, { classId = "GUERREIRO", equipmentBonus = {} } = {}) {
  const b = balance;
  const str = (attrs.str || 0) + (equipmentBonus.str || 0);
  const intel = (attrs.int || 0) + (equipmentBonus.int || 0);
  const dex = (attrs.dex || 0) + (equipmentBonus.dex || 0);
  const con = (attrs.con || 0) + (equipmentBonus.con || 0);
  const hpFlat = equipmentBonus.hp || 0;
  const mpFlat = equipmentBonus.mp || 0;
  const attackFlat = equipmentBonus.attack || 0;
  const defenseFlat = equipmentBonus.defense || 0;
  const critFlat = equipmentBonus.critFlat || 0;

  const maxHp = Math.round(b.baseHp + con * b.kHp + level * b.levelHp + hpFlat);
  const maxMp = Math.round(b.baseMp + intel * b.kMp + level * b.levelMp + mpFlat);
  const physical = Math.round(b.baseAttack + str * b.kAtk + attackFlat);
  const magical = Math.round(b.baseAttack + intel * b.kMagicAtk + attackFlat);
  const attack = classId === "MAGO" ? magical : physical;
  const defense = Math.round(b.baseDefense + con * b.kDefCon + str * b.kDefStr + defenseFlat);
  const attackIntervalMs = Math.max(b.minIntervalMs, Math.round(b.baseIntervalMs - dex * b.kSpeed));
  const critChance = Math.min(b.maxCrit, dex * b.critPerDex + critFlat / 100);
  return {
    maxHp,
    maxMp,
    attack,
    physical,
    magical,
    defense,
    attackIntervalMs,
    critChance,
    str,
    int: intel,
    dex,
    con,
  };
}

export function hours(ms) {
  return Math.round((ms / 3_600_000) * 1000) / 1000;
}

export function fmtNum(n) {
  return Math.round(Number(n) || 0);
}
