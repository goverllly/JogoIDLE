// @ts-nocheck
/** Conteúdo do idle — zonas, classes e bosses. */
import { getBalance, xpToNextLevel as xpCurve } from './balance';

export { xpToNextLevel } from './balance';

export const CLASSES = {
  GUERREIRO: {
    id: 'GUERREIRO',
    name: 'Guerreiro',
    description: 'Tanque físico com alto HP e defesa.',
    base: { str: 12, int: 3, dex: 6, con: 10 },
    growth: { str: 3, int: 0, dex: 1, con: 2 },
  },
  BARBARO: {
    id: 'BARBARO',
    name: 'Bárbaro',
    description: 'Dano bruto com machados e muita vitalidade.',
    base: { str: 14, int: 2, dex: 5, con: 11 },
    growth: { str: 3, int: 0, dex: 1, con: 2 },
  },
  MAGO: {
    id: 'MAGO',
    name: 'Mago',
    description: 'Dano mágico e mana alta.',
    base: { str: 3, int: 12, dex: 5, con: 6 },
    growth: { str: 0, int: 3, dex: 1, con: 1 },
  },
  ARQUEIRO: {
    id: 'ARQUEIRO',
    name: 'Arqueiro',
    description: 'Ataque rápido e crítico.',
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
    bossHpMult: null,
    bossAtkMult: null,
    bossDropMult: null,
    refineDropChance: null,
    /** null = derivado (2 × monsters.length, mín. 2). */
    bossWaveSize: null,
    ...def,
  };
}

/** Zonas base (overrides admin em `__world.zones`). */
export const BASE_ZONES = [
  zone({
    id: 'floresta',
    name: 'Floresta Inicial',
    description: 'Ossadas errantes assombram a mata.',
    minLevel: 1,
    tier: 1,
    bossName: 'Senhor da Clareira',
    monsters: [
      { name: 'Esqueleto Errante', level: 1 },
      { name: 'Saqueador Ósseo', level: 2 },
    ],
  }),
  zone({
    id: 'cemiterio',
    name: 'Cemitério',
    description: 'Mortos-vivos vagam entre as lápides.',
    minLevel: 10,
    tier: 2,
    bossName: 'Rei das Lápides',
    monsters: [
      { name: 'Guerreiro Ósseo', level: 10 },
      { name: 'Necromante Aprendiz', level: 12 },
    ],
  }),
  zone({
    id: 'jardim',
    name: 'Jardim Sombrio',
    description: 'Flora corrompida e espíritos famintos.',
    minLevel: 25,
    tier: 3,
    bossName: 'Lorde do Espinheiro',
    monsters: [
      { name: 'Espectro Musgoso', level: 25 },
      { name: 'Guardião Espinhoso', level: 28 },
    ],
  }),
  zone({
    id: 'pantano',
    name: 'Pântano Venenoso',
    description: 'Afogados e bruxos rastejam pela névoa tóxica.',
    minLevel: 35,
    tier: 4,
    bossName: 'Primordial do Lodo',
    monsters: [
      { name: 'Afogado do Pântano', level: 35 },
      { name: 'Bruxo Lodoso', level: 38 },
    ],
  }),
  zone({
    id: 'hidra',
    name: 'Cripta Ardente',
    description: 'Campeões mortos-vivos guardam as chamas eternas.',
    minLevel: 50,
    tier: 5,
    bossName: 'Tirano da Cripta',
    monsters: [
      { name: 'Campeão Flamejante', level: 50 },
      { name: 'Arquimago Cinzento', level: 55 },
    ],
  }),
  zone({
    id: 'gelo',
    name: 'Picos Gelados',
    description: 'Sentinelas congeladas vigiam a nevasca sem fim.',
    minLevel: 70,
    tier: 6,
    bossName: 'Colosso Glacial',
    monsters: [
      { name: 'Sentinela Congelada', level: 70 },
      { name: 'Caçador da Nevasca', level: 74 },
    ],
  }),
  zone({
    id: 'abismo',
    name: 'Cidadela Abissal',
    description: 'O trono do vazio, guardado por cavaleiros e liches.',
    minLevel: 90,
    tier: 7,
    bossName: 'Soberano do Vazio',
    monsters: [
      { name: 'Cavaleiro do Abismo', level: 90 },
      { name: 'Lich Abissal', level: 95 },
    ],
  }),
  zone({
    id: 'fortaleza',
    name: 'Fortaleza Esquecida',
    description: 'Muralhas antigas e soldados espectrais.',
    minLevel: 120,
    tier: 8,
    bossName: 'Marechal Fantasma',
    monsters: [
      { name: 'Sentinela da Muralha', level: 120 },
      { name: 'Arqueiro Espectral', level: 125 },
    ],
  }),
  zone({
    id: 'vulcao',
    name: 'Vulcão Rubro',
    description: 'Magma e elementais de fogo.',
    minLevel: 180,
    tier: 9,
    bossName: 'Senhor do Magma',
    monsters: [
      { name: 'Elemental de Cinzas', level: 180 },
      { name: 'Golem Magmático', level: 188 },
    ],
  }),
  zone({
    id: 'catacumbas',
    name: 'Catacumbas Profundas',
    description: 'Ossuários sem fim sob a cidade.',
    minLevel: 250,
    tier: 10,
    bossName: 'Guardião do Ossuário',
    monsters: [
      { name: 'Devorador de Almas', level: 250 },
      { name: 'Sacerdote Cadavérico', level: 260 },
    ],
  }),
  zone({
    id: 'nevoa',
    name: 'Névoa Eterna',
    description: 'Criaturas que nascem da bruma.',
    minLevel: 320,
    tier: 11,
    bossName: 'Avatar da Névoa',
    monsters: [
      { name: 'Sombra Errante', level: 320 },
      { name: 'Caçador Nebuloso', level: 330 },
    ],
  }),
  zone({
    id: 'reliquias',
    name: 'Câmara das Relíquias',
    description: 'Artefatos proibidos e seus guardiões.',
    minLevel: 400,
    tier: 12,
    bossName: 'Curador das Relíquias',
    monsters: [
      { name: 'Golem de Runas', level: 400 },
      { name: 'Lacaio Arcano', level: 410 },
    ],
  }),
  zone({
    id: 'trono',
    name: 'Trono Mortal',
    description: 'Último desafio antes da ascensão.',
    minLevel: 450,
    tier: 13,
    bossWaveSize: 10,
    bossName: 'Regente Final',
    monsters: [
      { name: 'Cavaleiro do Trono', level: 450 },
      { name: 'Algoz Imperial', level: 465 },
    ],
  }),
  zone({
    id: 'prova_divina',
    name: 'Prova Divina',
    description:
      'MEGA BOSS mortal no limiar da ascensão. Só Mortais Lv.500+ — chance mínúscula de Suco Celestial.',
    minLevel: 500,
    tier: 13,
    /** Só Mortal (não Celestial) pode caçar aqui — gate em startFarm. */
    mortalOnly: true,
    bossWaveSize: 12,
    bossHpMult: 2.2,
    bossAtkMult: 1.35,
    bossDropMult: 1.2,
    refineDropChance: 0,
    bossName: 'Guardião da Divindade',
    monsters: [
      { name: 'Sentinela do Limiar', level: 500 },
      { name: 'Arauto do Julgamento', level: 505 },
    ],
  }),
  zone({
    id: 'eter',
    name: 'Campos do Éter',
    description: 'Além da mortalidade — só Celestiais.',
    minLevel: 500,
    tier: 14,
    requiresAscension: 'CELESTIAL',
    bossWaveSize: 10,
    bossName: 'Arauto do Éter',
    monsters: [
      { name: 'Serafim Caído', level: 500 },
      { name: 'Sentinela Astral', level: 520 },
    ],
  }),
  zone({
    id: 'firmamento',
    name: 'Firmamento',
    description: 'Constelações vivas e tempestades de luz.',
    minLevel: 560,
    tier: 15,
    requiresAscension: 'CELESTIAL',
    bossWaveSize: 11,
    bossName: 'Colosso Estelar',
    monsters: [
      { name: 'Cometa Vivo', level: 560 },
      { name: 'Guardião da Aurora', level: 580 },
    ],
  }),
  zone({
    id: 'nexus',
    name: 'Nexus Celestial',
    description: 'O coração do cosmos jogável.',
    minLevel: 620,
    tier: 16,
    requiresAscension: 'CELESTIAL',
    bossWaveSize: 12,
    bossName: 'Núcleo do Nexus',
    monsters: [
      { name: 'Fragmento do Infinito', level: 620 },
      { name: 'Eco do Criador', level: 650 },
    ],
  }),
];

/** Overrides de zona (id → partial). */
let zoneOverrides = {};

export function setZoneOverrides(map) {
  zoneOverrides = map && typeof map === 'object' ? { ...map } : {};
}

export function getZoneOverrides() {
  return { ...zoneOverrides };
}

export function listZones() {
  return BASE_ZONES.map((z) => {
    const o = zoneOverrides[z.id] || {};
    const merged = {
      ...z,
      ...o,
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

/** Compat: array mutável usado pelo combate (sempre lista resolvida). */
export let ZONES = listZones();

export function refreshZones() {
  ZONES = listZones();
  return ZONES;
}

void xpCurve;
