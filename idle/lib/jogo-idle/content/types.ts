/**
 * Contratos de conteúdo do Jogo IDLE Studio 2.0.
 * Fase 1: tipos + adapter sobre BASE_ZONES/overrides.
 * Fases 2–4: catálogo global, loot tables, zonas dinâmicas, draft/publish.
 */

export type ContentSource = "runtime_override" | "draft" | "published" | "base_code";

export type WorldRevision = {
  id: string;
  label: string;
  source: ContentSource;
  /** Revision do catálogo em runtime (TTL sync). */
  catalogRevision?: number | null;
  updatedAt?: string | null;
};

export type CreatureTemplate = {
  /** Id estável projetado: `creature:{zoneId}:{key}` */
  id: string;
  zoneId: string;
  key: string;
  name: string;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  xp: number;
  gold: number;
  isBoss: boolean;
  visualId?: string | null;
  /** Índice na lista de mobs da zona; -1 para boss. */
  index: number;
};

export type LootEntry = {
  itemId: string;
  weight: number;
  minQty?: number;
  maxQty?: number;
  rarityBias?: string | null;
};

export type LootTable = {
  id: string;
  label: string;
  source: ContentSource;
  /** Fase 1: sempre pool_tier — motor real ainda não consome tabelas por criatura. */
  mode: "pool_tier" | "creature" | "zone" | "boss";
  entries: LootEntry[];
  notes?: string;
};

export type SpawnRule = {
  creatureId: string;
  weight: number;
  maxActive?: number | null;
};

export type ZoneDefinition = {
  id: string;
  name: string;
  description?: string;
  minLevel: number;
  maxLevel?: number | null;
  chapterId?: string | null;
  sceneProfileId?: string | null;
  trial?: boolean;
  tier: number;
  dropChance?: number | null;
  requiresAscension?: string | null;
  bossHpMult?: number | null;
  bossAtkMult?: number | null;
  bossDropMult?: number | null;
  refineDropChance?: number | null;
  bossWaveSize?: number | null;
  bossWaveSizeOverridden?: boolean;
  mortalOnly?: boolean;
  source: ContentSource;
  spawnRules: SpawnRule[];
  creatureIds: string[];
};

export type WorldSnapshot = {
  revision: WorldRevision;
  zones: ZoneDefinition[];
  creatures: CreatureTemplate[];
  /** Fase 1: tabela sintética descrevendo o pool por tier. */
  lootTables: LootTable[];
  counts: {
    zones: number;
    creatures: number;
    items: number;
    dropChance: number;
  };
};

export type ZonePatchInput = {
  id: string;
  minLevel?: number;
  tier?: number;
  dropChance?: number | null;
  requiresAscension?: string | null;
  bossHpMult?: number | null;
  bossAtkMult?: number | null;
  bossDropMult?: number | null;
  refineDropChance?: number | null;
  monsters?: Array<Record<string, unknown>>;
  boss?: Record<string, unknown> | null;
  bossWaveSize?: number | null;
  scene?: unknown;
  clear?: boolean;
};
