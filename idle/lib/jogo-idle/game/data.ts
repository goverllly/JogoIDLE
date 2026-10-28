// @ts-nocheck
/** Conteúdo do idle — zonas, classes e bosses. */
import { getBalance, xpToNextLevel as xpCurve } from './balance';
import { ALL_CHAPTER_ZONES, resolveZoneId, ZONE_ID_ALIASES } from './chapter-zones';
import { meetsAscensionRequirement } from './chapters';

export { xpToNextLevel } from './balance';
export { ZONE_ID_ALIASES, resolveZoneId };

export const CLASSES = {
  GUERREIRO: {
    id: 'GUERREIRO',
    name: 'Guerreiro',
    description: 'Combate físico: Força define o dano; Constituição a resistência; Destreza o ritmo e o crítico.',
    base: { str: 12, int: 3, dex: 6, con: 10 },
    growth: { str: 3, int: 0, dex: 1, con: 2 },
  },
  BARBARO: {
    id: 'BARBARO',
    name: 'Bárbaro',
    description: 'Dano bruto físico (Força), vitalidade (Constituição) e ritmo/crítico (Destreza).',
    base: { str: 14, int: 2, dex: 5, con: 11 },
    growth: { str: 3, int: 0, dex: 1, con: 2 },
  },
  MAGO: {
    id: 'MAGO',
    name: 'Mago',
    description: 'Dano mágico e mana: Intelecto é a fonte principal de ataque e MP.',
    base: { str: 3, int: 12, dex: 5, con: 6 },
    growth: { str: 0, int: 3, dex: 1, con: 1 },
  },
  ARQUEIRO: {
    id: 'ARQUEIRO',
    name: 'Arqueiro',
    description:
      'Flechas físicas: Força aumenta o dano; Destreza a velocidade e o crítico; Constituição a resistência. Destreza não aumenta o dano básico.',
    base: { str: 7, int: 4, dex: 12, con: 6 },
    growth: { str: 1, int: 0, dex: 3, con: 1 },
  },
};

/**
 * Poder esperado de um personagem on-level (attrs médios + gear leve).
 * Usado para calibrar HP/ATK dos mobs.
 */
export function expectedPlayerPower(level) {
  const b = getBalance();
  const L = Math.max(1, level);
  const attrs = 10 + L * 1.2; // ~ média após spending points
  const attack = b.baseAttack + attrs * b.kAtk + L * 1.5;
  const maxHp = b.baseHp + attrs * b.kHp + L * b.levelHp;
  const defense = b.baseDefense + attrs * b.kDefCon;
  return { attack, maxHp, defense };
}

/** Gera stats de mob calibrados para TTK alvo (hits após mitigação de DEF). */
export function scaleMonster(base, zone) {
  const b = getBalance();
  const level = base.level || zone?.minLevel || 1;
  const { attack: pAtk, maxHp: pHp, defense: pDef } = expectedPlayerPower(level);
  const hits = base.isBoss ? b.bossHitsToKill : b.mobHitsToKill;
  const atkPct = base.isBoss ? b.bossAtkHpPct : b.mobAtkHpPct;
  const hpMult = base.isBoss ? b.bossHpMult : 1;
  const atkMult = base.isBoss ? b.bossAtkMult : 1;
  // DEF alonga percepção sem zerar chip; HP usa dano efetivo para bater o TTK alvo.
  const defense = Math.max(
    1,
    Math.round(level * 0.7 + pAtk * 0.06 * (base.defMult || 1)),
  );
  const chip = Math.max(1, Math.round(pAtk - defense));
  const hp = Math.max(30, Math.round(chip * hits * hpMult * (base.hpMult || 1)));
  const attack = Math.max(
    3,
    Math.round(pHp * atkPct * atkMult * (base.atkMult || 1) + pDef * 0.35),
  );
  const xpPer = Number(b.mobXpPerLevel) > 0 ? Number(b.mobXpPerLevel) : 20;
  const goldPer = Number(b.mobGoldPerLevel) > 0 ? Number(b.mobGoldPerLevel) : 5.5;
  const xp = Math.max(8, Math.round(level * xpPer * (base.xpMult || 1) * (base.isBoss ? 2.2 : 1)));
  const gold = Math.max(3, Math.round(level * goldPer * (base.goldMult || 1) * (base.isBoss ? 2 : 1)));
  return {
    name: base.name,
    level,
    hp: base.hpOverride ?? hp,
    attack: base.attackOverride ?? attack,
    defense: base.defenseOverride ?? defense,
    xp: base.xpOverride ?? xp,
    gold: base.goldOverride ?? gold,
    isBoss: Boolean(base.isBoss),
    ...(base.visualId ? { visualId: String(base.visualId) } : {}),
  };
}

export function monsterDefense(monster) {
  if (monster?.defense != null && Number.isFinite(monster.defense)) {
    return Math.max(0, Math.floor(monster.defense));
  }
  return Math.max(0, Math.floor((monster?.level || 1) * 0.85));
}

function hasBossOverride(boss) {
  if (!boss || typeof boss !== 'object') return false;
  return (
    boss.hpOverride != null ||
    boss.attackOverride != null ||
    boss.defenseOverride != null ||
    boss.xpOverride != null ||
    boss.goldOverride != null ||
    (Number.isFinite(boss.hp) && boss.hp != null) ||
    (Number.isFinite(boss.attack) && boss.attack != null)
  );
}

/** Boss da macro: override admin explícito, senão derivado dos mobs da zona. */
export function buildZoneBoss(zone) {
  const override = zone?.boss;
  if (hasBossOverride(override)) {
    return scaleMonster(
      {
        name: override.name || zone?.bossName || `Chefe — ${zone?.name || 'Macro'}`,
        level: override.level || zone?.minLevel || 1,
        isBoss: true,
        visualId: override.visualId || undefined,
        hpOverride: override.hpOverride ?? (Number.isFinite(override.hp) ? override.hp : undefined),
        attackOverride:
          override.attackOverride ??
          (Number.isFinite(override.attack) ? override.attack : undefined),
        defenseOverride:
          override.defenseOverride ??
          (Number.isFinite(override.defense) ? override.defense : undefined),
        xpOverride: override.xpOverride ?? (Number.isFinite(override.xp) ? override.xp : undefined),
        goldOverride:
          override.goldOverride ?? (Number.isFinite(override.gold) ? override.gold : undefined),
      },
      zone,
    );
  }

  const list = (zone?.monsters || []).map((m) =>
    m.hp != null && m.attack != null ? m : scaleMonster(m, zone),
  );
  const b = getBalance();
  const bossName =
    (override && typeof override === 'object' && override.name) ||
    zone?.bossName ||
    `Chefe — ${zone?.name || 'Macro'}`;
  if (!list.length) {
    return scaleMonster(
      { name: bossName, level: zone?.minLevel || 1, isBoss: true },
      zone,
    );
  }
  const scaled = list.map((m) => scaleMonster({ ...m, isBoss: false }, zone));
  const zoneHpMult =
    zone?.bossHpMult != null && Number.isFinite(Number(zone.bossHpMult))
      ? Number(zone.bossHpMult)
      : b.bossHpMult;
  const zoneAtkMult =
    zone?.bossAtkMult != null && Number.isFinite(Number(zone.bossAtkMult))
      ? Number(zone.bossAtkMult)
      : b.bossAtkMult;
  const hp = Math.round(scaled.reduce((s, m) => s + m.hp, 0) * 1.1 * zoneHpMult);
  const xp = Math.round(scaled.reduce((s, m) => s + m.xp, 0) * 1.75);
  const gold = Math.round(scaled.reduce((s, m) => s + m.gold, 0) * 1.75);
  const maxAtk = Math.max(...scaled.map((m) => m.attack));
  const maxLevel = Math.max(...scaled.map((m) => m.level));
  const defense = Math.max(
    Math.round(maxLevel * 1.4),
    Math.round(scaled.reduce((s, m) => s + monsterDefense(m), 0) * 1.8),
  );
  return {
    name: bossName,
    level: maxLevel,
    hp,
    attack: Math.max(1, Math.round(maxAtk * 1.35 * zoneAtkMult)),
    defense,
    xp,
    gold,
    isBoss: true,
    ...(override && typeof override === 'object' && override.visualId
      ? { visualId: String(override.visualId) }
      : {}),
  };
}

/**
 * Kills de mobs comuns até o boss.
 * Override admin (`bossWaveSize`) ou mínimo de temporada (`defaultBossWaveMin`, típ. 8).
 */
export function zoneBossWaveSize(zone) {
  const override = Number(zone?.bossWaveSize);
  if (Number.isFinite(override) && override >= 1) {
    return Math.min(200, Math.floor(override));
  }
  return defaultBossWaveSize(zone);
}

export function defaultBossWaveSize(zone) {
  const b = getBalance();
  const floor = Math.max(2, Math.floor(Number(b.defaultBossWaveMin) || 8));
  const n = zone?.monsters?.length || 2;
  // 2 mobs × 3 = 6 → sobe para floor 8; late com override explícito na zona.
  return Math.min(200, Math.max(floor, n * 3));
}

function zone(def) {
  return {
    dropChance: null,
    requiresAscension: null,
    /** Se true, só Mortais (ascension null) podem farmar — ex.: Prova Divina. */
    mortalOnly: false,
    /** Bosses desta zona podem dropar Suco Divino (rituais de classificação). */
    sucoDrop: false,
    bossHpMult: null,
    bossAtkMult: null,
    bossDropMult: null,
    refineDropChance: null,
    /** null = derivado (2 × monsters.length, mín. 2). */
    bossWaveSize: null,
    ...def,
  };
}

/** Zonas base = 20 regiões de capítulo + trials (overrides admin em `__world.zones`). */
export const BASE_ZONES = ALL_CHAPTER_ZONES.map((def) =>
  zone({
    id: def.id,
    chapterId: def.chapterId,
    name: def.name,
    description: def.description,
    minLevel: def.minLevel,
    maxLevel: def.maxLevel,
    tier: def.tier,
    bossName: def.bossName,
    sceneProfileId: def.sceneProfileId,
    monsters: def.monsters,
    trial: Boolean(def.trial),
    mortalOnly: Boolean(def.mortalOnly),
    requiresAscension: def.requiresAscension ?? null,
    sucoDrop: Boolean(def.sucoDrop),
    bossWaveSize: def.bossWaveSize ?? null,
    bossHpMult: def.bossHpMult ?? null,
    bossAtkMult: def.bossAtkMult ?? null,
    bossDropMult: def.bossDropMult ?? null,
    refineDropChance: def.refineDropChance ?? null,
  }),
);

/** Overrides de zona (id → partial). Inclui aliases legados. */
let zoneOverrides = {};

export function setZoneOverrides(map) {
  zoneOverrides = map && typeof map === 'object' ? { ...map } : {};
}

export function getZoneOverrides() {
  return { ...zoneOverrides };
}

function overridesForZoneId(id) {
  const canonical = resolveZoneId(id) || id;
  const direct = zoneOverrides[canonical] || {};
  // Overrides salvos no id legado (ex. floresta) aplicam no canônico.
  let fromAlias = {};
  for (const [legacy, target] of Object.entries(ZONE_ID_ALIASES)) {
    if (target === canonical && zoneOverrides[legacy]) {
      fromAlias = { ...fromAlias, ...zoneOverrides[legacy] };
    }
  }
  return { ...fromAlias, ...direct };
}

export function listZones() {
  return BASE_ZONES.map((z) => {
    const o = overridesForZoneId(z.id);
    const merged = {
      ...z,
      ...o,
      id: z.id,
      chapterId: o.chapterId || z.chapterId,
      sceneProfileId: o.sceneProfileId || z.sceneProfileId,
      maxLevel: o.maxLevel != null ? o.maxLevel : z.maxLevel,
      trial: o.trial != null ? Boolean(o.trial) : Boolean(z.trial),
      monsters: Array.isArray(o.monsters) ? o.monsters : z.monsters,
      boss: o.boss !== undefined ? o.boss : z.boss || null,
      bossName:
        (o.boss && typeof o.boss === 'object' && o.boss.name) ||
        o.bossName ||
        z.bossName,
    };
    return {
      ...merged,
      monsters: (merged.monsters || []).map((m) => scaleMonster(m, merged)),
    };
  });
}

/** Resolve id (incl. alias) e devolve zona da lista atual. */
export function findZone(zoneId) {
  const id = resolveZoneId(zoneId);
  if (!id) return null;
  return listZones().find((z) => z.id === id) || null;
}

/**
 * Zonas visíveis para caça: campanha do capítulo ativo + trials elegíveis.
 */
export function listZonesForCharacter(character) {
  const chapterId =
    character?.chapters?.currentChapterId ||
    character?.currentChapterId ||
    'I';
  return listZones().filter((z) => {
    if (z.trial) {
      if (z.mortalOnly) return !character?.ascension;
      if (z.requiresAscension) {
        return meetsAscensionRequirement(character, z.requiresAscension);
      }
      return true;
    }
    return z.chapterId === chapterId;
  });
}

/** Compat: array mutável usado pelo combate (sempre lista resolvida). */
export let ZONES = listZones();

export function refreshZones() {
  ZONES = listZones();
  return ZONES;
}

void xpCurve;
