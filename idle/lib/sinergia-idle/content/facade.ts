/**
 * ContentFacade adapter v1 — projeta o runtime atual (BASE_ZONES + overrides)
 * nos contratos Studio 2.0. Mutações de zona passam pelo mesmo shape de
 * adminUpdateConfig; a persistência continua em sinergia_idle_catalog_state.
 */
import { listZones, getZoneOverrides, zoneBossWaveSize } from "../game/data";
import { getDropChance, listCatalog } from "../game/items";
import type {
  CreatureTemplate,
  LootTable,
  WorldRevision,
  WorldSnapshot,
  ZoneDefinition,
  ZonePatchInput,
} from "./types";

function creatureKey(name: string, index: number, isBoss: boolean) {
  const slug = String(name || (isBoss ? "boss" : "mob"))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return isBoss ? `boss:${slug || "boss"}` : `mob:${index}:${slug || "mob"}`;
}

export function creatureIdFor(zoneId: string, key: string) {
  return `creature:${zoneId}:${key}`;
}

export function projectCreaturesFromZones(
  zones: ReturnType<typeof listZones> = listZones(),
): CreatureTemplate[] {
  const out: CreatureTemplate[] = [];
  for (const zone of zones) {
    const monsters = Array.isArray(zone.monsters) ? zone.monsters : [];
    monsters.forEach((m: Record<string, unknown>, index: number) => {
      const name = String(m.name || `Mob ${index + 1}`);
      const key = creatureKey(name, index, false);
      out.push({
        id: creatureIdFor(zone.id, key),
        zoneId: zone.id,
        key,
        name,
        level: Number(m.level) || zone.minLevel || 1,
        hp: Number(m.hp) || 1,
        attack: Number(m.attack) || 1,
        defense: Number(m.defense) || 0,
        xp: Number(m.xp) || 1,
        gold: Number(m.gold) || 0,
        isBoss: false,
        visualId: (m.visualId as string) || null,
        index,
      });
    });
    const boss = zone.boss || null;
    if (boss && typeof boss === "object") {
      const b = boss as Record<string, unknown>;
      const name = String(b.name || zone.bossName || "Boss");
      const key = creatureKey(name, -1, true);
      out.push({
        id: creatureIdFor(zone.id, key),
        zoneId: zone.id,
        key,
        name,
        level: Number(b.level) || zone.minLevel || 1,
        hp: Number(b.hp) || 1,
        attack: Number(b.attack) || 1,
        defense: Number(b.defense) || 0,
        xp: Number(b.xp) || 1,
        gold: Number(b.gold) || 0,
        isBoss: true,
        visualId: (b.visualId as string) || null,
        index: -1,
      });
    }
  }
  return out;
}

function projectZones(
  zones: ReturnType<typeof listZones>,
  creatures: CreatureTemplate[],
): ZoneDefinition[] {
  const overrides = getZoneOverrides() as Record<string, Record<string, unknown>>;
  return zones.map((z: Record<string, unknown>) => {
    const id = String(z.id);
    const o = overrides[id];
    const zoneCreatures = creatures.filter((c) => c.zoneId === id && !c.isBoss);
    const wave = zoneBossWaveSize(z);
    return {
      id,
      name: String(z.name || id),
      description: z.description != null ? String(z.description) : undefined,
      minLevel: Number(z.minLevel) || 1,
      tier: Number(z.tier) || 1,
      dropChance: z.dropChance != null ? Number(z.dropChance) : null,
      requiresAscension: (z.requiresAscension as string) || null,
      bossHpMult: z.bossHpMult != null ? Number(z.bossHpMult) : null,
      bossAtkMult: z.bossAtkMult != null ? Number(z.bossAtkMult) : null,
      bossDropMult: z.bossDropMult != null ? Number(z.bossDropMult) : null,
      refineDropChance: z.refineDropChance != null ? Number(z.refineDropChance) : null,
      bossWaveSize: wave,
      bossWaveSizeOverridden: Boolean(o && o.bossWaveSize != null),
      mortalOnly: Boolean(z.mortalOnly),
      source: o ? ("runtime_override" as const) : ("base_code" as const),
      spawnRules: zoneCreatures.map((c) => ({
        creatureId: c.id,
        weight: 1,
        maxActive: null,
      })),
      creatureIds: creatures.filter((c) => c.zoneId === id).map((c) => c.id),
    };
  });
}

function syntheticLootTables(dropChance: number): LootTable[] {
  return [
    {
      id: "loot:pool_tier",
      label: "Pool global por tier (motor atual)",
      source: "base_code",
      mode: "pool_tier",
      entries: [],
      notes: `Gear dropa do pool do tier da zona com chance base ${(dropChance * 100).toFixed(1)}% × mults de zona/boss. Loot tables por monstro chegam na Fase 2.`,
    },
  ];
}

export function getWorldRevision(catalogRevision?: number | null): WorldRevision {
  return {
    id: "runtime",
    label: "Runtime (overrides ao vivo)",
    source: "runtime_override",
    catalogRevision: catalogRevision ?? null,
    updatedAt: new Date().toISOString(),
  };
}

/** Snapshot read-only para Studio / Visão Geral. */
export function getWorldSnapshot(opts?: {
  catalogRevision?: number | null;
  itemCount?: number;
}): WorldSnapshot {
  const zonesRaw = listZones();
  const creatures = projectCreaturesFromZones(zonesRaw);
  const zones = projectZones(zonesRaw, creatures);
  const dropChance = getDropChance();
  const itemCount =
    opts?.itemCount != null ? opts.itemCount : listCatalog().length;
  return {
    revision: getWorldRevision(opts?.catalogRevision),
    zones,
    creatures,
    lootTables: syntheticLootTables(dropChance),
    counts: {
      zones: zones.length,
      creatures: creatures.length,
      items: itemCount,
      dropChance,
    },
  };
}

/** Valida e normaliza patch de zona no shape da API admin. */
export function normalizeZonePatch(input: ZonePatchInput): ZonePatchInput {
  const id = String(input.id || "").trim();
  if (!id) throw Object.assign(new Error("zone.id obrigatório"), { status: 400 });
  return {
    ...input,
    id,
    ...(input.minLevel != null ? { minLevel: Math.max(1, Math.floor(Number(input.minLevel))) } : {}),
    ...(input.tier != null ? { tier: Math.max(1, Math.floor(Number(input.tier))) } : {}),
  };
}

export const ContentFacade = {
  getWorldSnapshot,
  getWorldRevision,
  projectCreaturesFromZones,
  normalizeZonePatch,
  creatureIdFor,
};
