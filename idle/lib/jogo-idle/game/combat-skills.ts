// @ts-nocheck
/**
 * Skills ativas de combate (barra) — separadas da árvore de buffs de farm.
 * Guerreiro/Mago/Arqueiro gastam MP; Bárbaro gasta Fúria (Rage).
 */

import { getTemplate, RARITIES } from './items';

export const COMBAT_SKILL_UNLOCK_LEVELS = [10, 50, 120, 180, 250, 320, 400, 450, 500];
export const COMBAT_SKILL_BAR_SIZE = 9;
export const MAX_RAGE = 100;
export const RAGE_ON_HIT = 8;
export const RAGE_ON_HURT = 12;
export const MP_REGEN_PER_TICK_PCT = 0.02;

/**
 * @typedef {{
 *   id: string,
 *   classId: string,
 *   name: string,
 *   description: string,
 *   order: number,
 *   resource: 'mp' | 'rage',
 *   cost: number,
 *   cooldownMs: number,
 *   damageMult: number,
 *   mpScale?: number,
 *   element?: 'fire' | 'lightning' | 'ice',
 *   guaranteeCrit?: boolean,
 *   hits?: number,
 *   bossBonusMult?: number,
 *   mitigateNext?: number,
 *   rageGain?: number,
 *   mpRefundPct?: number,
 *   vfx: string,
 *   sfx: string,
 *   icon: string,
 * }} CombatSkillDef
 */

/** Remap de skills antigas do mago (setas/nova/dreno → elementais). */
export const MAGE_SKILL_REMAP = {
  mag_setas: 'mag_bola_fogo',
  mag_nova: 'mag_raio',
  mag_dreno: 'mag_gelo',
};

/** Mult. do ataque básico do mago (foco em skills). */
export const MAGE_BASIC_ATTACK_MULT = 0.55;

/** @type {Record<string, CombatSkillDef[]>} */
export const CLASS_COMBAT_SKILLS = {
  GUERREIRO: [
    {
      id: 'gue_escudado',
      classId: 'GUERREIRO',
      name: 'Golpe Escudado',
      description: 'Dano moderado e reduz o próximo hit do monstro.',
      order: 1,
      resource: 'mp',
      cost: 18,
      cooldownMs: 8_000,
      damageMult: 1.35,
      mitigateNext: 0.35,
      vfx: 'shield_bash',
      sfx: 'skill_shield',
      icon: '⛨',
    },
    {
      id: 'gue_investida',
      classId: 'GUERREIRO',
      name: 'Investida',
      description: 'Avanço poderoso com alto dano.',
      order: 2,
      resource: 'mp',
      cost: 28,
      cooldownMs: 14_000,
      damageMult: 2.1,
      vfx: 'dash_gold',
      sfx: 'skill_dash',
      icon: '⚔',
    },
    {
      id: 'gue_provocacao',
      classId: 'GUERREIRO',
      name: 'Provocação',
      description: 'Golpe firme; próximo hit inimigo causa bem menos dano.',
      order: 3,
      resource: 'mp',
      cost: 22,
      cooldownMs: 18_000,
      damageMult: 1.15,
      mitigateNext: 0.55,
      vfx: 'taunt_ring',
      sfx: 'skill_taunt',
      icon: '⚑',
    },
    {
      id: 'gue_martelo_ira',
      classId: 'GUERREIRO',
      name: 'Martelo da Ira',
      description: 'Martelada sagrada com alto impacto.',
      order: 4,
      resource: 'mp',
      cost: 30,
      cooldownMs: 16_000,
      damageMult: 2.25,
      vfx: 'dash_gold',
      sfx: 'skill_dash',
      icon: '🔨',
    },
    {
      id: 'gue_pilar_alvorada',
      classId: 'GUERREIRO',
      name: 'Pilar da Alvorada',
      description: 'Coluna de luz; mitiga o próximo golpe.',
      order: 5,
      resource: 'mp',
      cost: 26,
      cooldownMs: 15_000,
      damageMult: 1.55,
      mitigateNext: 0.4,
      vfx: 'shield_bash',
      sfx: 'skill_shield',
      icon: '☀',
    },
    {
      id: 'gue_nova_sagrada',
      classId: 'GUERREIRO',
      name: 'Nova Sagrada',
      description: 'Explosão radial de luz divina.',
      order: 6,
      resource: 'mp',
      cost: 34,
      cooldownMs: 20_000,
      damageMult: 2.0,
      vfx: 'taunt_ring',
      sfx: 'skill_taunt',
      icon: '✨',
    },
    {
      id: 'gue_flare_solar',
      classId: 'GUERREIRO',
      name: 'Clarão Solar',
      description: 'Rajada solar intensa.',
      order: 7,
      resource: 'mp',
      cost: 36,
      cooldownMs: 18_000,
      damageMult: 2.35,
      vfx: 'dash_gold',
      sfx: 'skill_dash',
      icon: '🌞',
    },
    {
      id: 'gue_laminas_justica',
      classId: 'GUERREIRO',
      name: 'Lâminas da Justiça',
      description: 'Dois cortes sagrados em sequência.',
      order: 8,
      resource: 'mp',
      cost: 32,
      cooldownMs: 17_000,
      damageMult: 1.15,
      hits: 2,
      vfx: 'dash_gold',
      sfx: 'skill_dash',
      icon: '⚔',
    },
    {
      id: 'gue_guilhotina',
      classId: 'GUERREIRO',
      name: 'Guilhotina Divina',
      description: 'Execução final; dano devastador (CD longo).',
      order: 9,
      resource: 'mp',
      cost: 48,
      cooldownMs: 28_000,
      damageMult: 3.2,
      guaranteeCrit: true,
      vfx: 'dash_gold',
      sfx: 'skill_dash',
      icon: '⚔',
    },
  ],
  BARBARO: [
    {
      id: 'bar_cortar',
      classId: 'BARBARO',
      name: 'Cortar',
      description: 'Corte rápido que gera Fúria (sem gastar recurso).',
      order: 1,
      resource: 'rage',
      cost: 0,
      cooldownMs: 5_000,
      damageMult: 1.2,
      rageGain: 20,
      vfx: 'cleave_red',
      sfx: 'skill_cleave',
      icon: '🪓',
    },
    {
      id: 'bar_berro',
      classId: 'BARBARO',
      name: 'Berro',
      description: 'Grito de guerra — explode Fúria em dano.',
      order: 2,
      resource: 'rage',
      cost: 40,
      cooldownMs: 12_000,
      damageMult: 2.4,
      vfx: 'rage_roar',
      sfx: 'skill_roar',
      icon: '💢',
    },
    {
      id: 'bar_massacre',
      classId: 'BARBARO',
      name: 'Massacre',
      description: 'Consome muita Fúria; crítico garantido.',
      order: 3,
      resource: 'rage',
      cost: 70,
      cooldownMs: 22_000,
      damageMult: 2.8,
      guaranteeCrit: true,
      vfx: 'massacre_arc',
      sfx: 'skill_massacre',
      icon: '☠',
    },
    {
      id: 'bar_decapitacao',
      classId: 'BARBARO',
      name: 'Decapitação',
      description: 'Golpe sangrento de alto dano.',
      order: 4,
      resource: 'rage',
      cost: 45,
      cooldownMs: 14_000,
      damageMult: 2.5,
      vfx: 'massacre_arc',
      sfx: 'skill_massacre',
      icon: '🪓',
    },
    {
      id: 'bar_sangue_fervente',
      classId: 'BARBARO',
      name: 'Sangue Fervente',
      description: 'Surto de sangue; gera Fúria extra.',
      order: 5,
      resource: 'rage',
      cost: 15,
      cooldownMs: 10_000,
      damageMult: 1.45,
      rageGain: 25,
      vfx: 'cleave_red',
      sfx: 'skill_cleave',
      icon: '🩸',
    },
    {
      id: 'bar_frenesi',
      classId: 'BARBARO',
      name: 'Frenesi',
      description: 'Rajada de golpes em fúria.',
      order: 6,
      resource: 'rage',
      cost: 35,
      cooldownMs: 12_000,
      damageMult: 0.85,
      hits: 3,
      vfx: 'cleave_red',
      sfx: 'skill_cleave',
      icon: '💢',
    },
    {
      id: 'bar_esmagador',
      classId: 'BARBARO',
      name: 'Esmaga-Crânio',
      description: 'Impacto brutal no alvo.',
      order: 7,
      resource: 'rage',
      cost: 50,
      cooldownMs: 16_000,
      damageMult: 2.7,
      vfx: 'massacre_arc',
      sfx: 'skill_massacre',
      icon: '💀',
    },
    {
      id: 'bar_salto_selvagem',
      classId: 'BARBARO',
      name: 'Salto Selvagem',
      description: 'Investida aérea com alto dano.',
      order: 8,
      resource: 'rage',
      cost: 55,
      cooldownMs: 18_000,
      damageMult: 2.9,
      vfx: 'rage_roar',
      sfx: 'skill_roar',
      icon: '🦵',
    },
    {
      id: 'bar_rasgar_armadura',
      classId: 'BARBARO',
      name: 'Rasgar Armadura',
      description: 'Rompe defesa e causa dano crítico.',
      order: 9,
      resource: 'rage',
      cost: 65,
      cooldownMs: 24_000,
      damageMult: 3.0,
      guaranteeCrit: true,
      vfx: 'massacre_arc',
      sfx: 'skill_massacre',
      icon: '🪓',
    },
  ],
  MAGO: [
    {
      id: 'mag_bola_fogo',
      classId: 'MAGO',
      name: 'Bola de Fogo',
      description: 'Projétil de fogo; escala com MP máximo.',
      order: 1,
      resource: 'mp',
      cost: 20,
      cooldownMs: 7_000,
      damageMult: 1.35,
      mpScale: 0.14,
      element: 'fire',
      vfx: 'fireball',
      sfx: 'skill_bolts',
      icon: '🔥',
    },
    {
      id: 'mag_raio',
      classId: 'MAGO',
      name: 'Raio',
      description: 'Descarga elétrica; forte contra chefes e com MP alto.',
      order: 2,
      resource: 'mp',
      cost: 32,
      cooldownMs: 15_000,
      damageMult: 1.85,
      mpScale: 0.22,
      element: 'lightning',
      bossBonusMult: 1.3,
      vfx: 'lightning',
      sfx: 'skill_nova',
      icon: '⚡',
    },
    {
      id: 'mag_gelo',
      classId: 'MAGO',
      name: 'Gelo',
      description: 'Lança de gelo; dano sólido escalado por MP.',
      order: 3,
      resource: 'mp',
      cost: 26,
      cooldownMs: 13_000,
      damageMult: 1.55,
      mpScale: 0.18,
      element: 'ice',
      vfx: 'ice',
      sfx: 'skill_drain',
      icon: '❄',
    },
    {
      id: 'mag_piscar',
      classId: 'MAGO',
      name: 'Piscar de Fase',
      description: 'Golpe temporal rápido.',
      order: 4,
      resource: 'mp',
      cost: 22,
      cooldownMs: 9_000,
      damageMult: 1.5,
      mpScale: 0.12,
      element: 'lightning',
      vfx: 'lightning',
      sfx: 'skill_bolts',
      icon: '🌀',
    },
    {
      id: 'mag_escudo_runico',
      classId: 'MAGO',
      name: 'Escudo Rúnico',
      description: 'Impacto arcano que mitiga o próximo hit.',
      order: 5,
      resource: 'mp',
      cost: 28,
      cooldownMs: 14_000,
      damageMult: 1.4,
      mpScale: 0.1,
      mitigateNext: 0.45,
      element: 'ice',
      vfx: 'ice',
      sfx: 'skill_drain',
      icon: '🛡',
    },
    {
      id: 'mag_estase',
      classId: 'MAGO',
      name: 'Estase Temporal',
      description: 'Congela o fluxo e causa dano elevado.',
      order: 6,
      resource: 'mp',
      cost: 36,
      cooldownMs: 18_000,
      damageMult: 2.1,
      mpScale: 0.2,
      element: 'ice',
      vfx: 'ice',
      sfx: 'skill_nova',
      icon: '⏱',
    },
    {
      id: 'mag_singularidade',
      classId: 'MAGO',
      name: 'Singularidade de Mana',
      description: 'Explosão de mana; escala forte com MP.',
      order: 7,
      resource: 'mp',
      cost: 40,
      cooldownMs: 20_000,
      damageMult: 2.2,
      mpScale: 0.28,
      element: 'fire',
      vfx: 'fireball',
      sfx: 'skill_bolts',
      icon: '💫',
    },
    {
      id: 'mag_poco_gravitacional',
      classId: 'MAGO',
      name: 'Poço Gravitacional',
      description: 'Colapso espacial; forte vs chefes.',
      order: 8,
      resource: 'mp',
      cost: 42,
      cooldownMs: 22_000,
      damageMult: 2.0,
      mpScale: 0.24,
      element: 'lightning',
      bossBonusMult: 1.35,
      vfx: 'lightning',
      sfx: 'skill_nova',
      icon: '🌑',
    },
    {
      id: 'mag_wormhole',
      classId: 'MAGO',
      name: 'Nexus Wormhole',
      description: 'Rajada dimensional final (CD longo).',
      order: 9,
      resource: 'mp',
      cost: 50,
      cooldownMs: 28_000,
      damageMult: 1.1,
      hits: 3,
      mpScale: 0.16,
      element: 'fire',
      vfx: 'fireball',
      sfx: 'skill_bolts',
      icon: '🌌',
    },
  ],
  ARQUEIRO: [
    {
      id: 'arq_rapido',
      classId: 'ARQUEIRO',
      name: 'Tiro Rápido',
      description: 'Dois tiros leves em rápida sucessão.',
      order: 1,
      resource: 'mp',
      cost: 16,
      cooldownMs: 6_000,
      damageMult: 0.7,
      hits: 2,
      vfx: 'rapid_shots',
      sfx: 'skill_rapid',
      icon: '➳',
    },
    {
      id: 'arq_perfurante',
      classId: 'ARQUEIRO',
      name: 'Tiro Perfurante',
      description: 'Tiro único de alta penetração.',
      order: 2,
      resource: 'mp',
      cost: 24,
      cooldownMs: 11_000,
      damageMult: 2.0,
      vfx: 'pierce_shot',
      sfx: 'skill_pierce',
      icon: '➶',
    },
    {
      id: 'arq_chuva',
      classId: 'ARQUEIRO',
      name: 'Chuva de Flechas',
      description: 'Rajada devastadora (CD longo).',
      order: 3,
      resource: 'mp',
      cost: 40,
      cooldownMs: 24_000,
      damageMult: 0.85,
      hits: 4,
      vfx: 'arrow_rain',
      sfx: 'skill_rain',
      icon: '☔',
    },
    {
      id: 'arq_presa_pantera',
      classId: 'ARQUEIRO',
      name: 'Presa da Pantera',
      description: 'Ataque feroz de curto alcance.',
      order: 4,
      resource: 'mp',
      cost: 22,
      cooldownMs: 10_000,
      damageMult: 1.9,
      vfx: 'pierce_shot',
      sfx: 'skill_pierce',
      icon: '🐆',
    },
    {
      id: 'arq_armadilha_espinho',
      classId: 'ARQUEIRO',
      name: 'Armadilha de Espinhos',
      description: 'Laço natural que causa dano contínuo.',
      order: 5,
      resource: 'mp',
      cost: 26,
      cooldownMs: 13_000,
      damageMult: 1.65,
      vfx: 'arrow_rain',
      sfx: 'skill_rain',
      icon: '🌿',
    },
    {
      id: 'arq_espirito_lobo',
      classId: 'ARQUEIRO',
      name: 'Espírito do Lobo',
      description: 'Dois ataques espirituais.',
      order: 6,
      resource: 'mp',
      cost: 28,
      cooldownMs: 14_000,
      damageMult: 1.05,
      hits: 2,
      vfx: 'rapid_shots',
      sfx: 'skill_rapid',
      icon: '🐺',
    },
    {
      id: 'arq_raio_solar',
      classId: 'ARQUEIRO',
      name: 'Raio Zenital',
      description: 'Feixe solar concentrado.',
      order: 7,
      resource: 'mp',
      cost: 34,
      cooldownMs: 16_000,
      damageMult: 2.3,
      vfx: 'pierce_shot',
      sfx: 'skill_pierce',
      icon: '☀',
    },
    {
      id: 'arq_arco_lunar',
      classId: 'ARQUEIRO',
      name: 'Arco Lunar',
      description: 'Crescentes lunares em sequência.',
      order: 8,
      resource: 'mp',
      cost: 36,
      cooldownMs: 18_000,
      damageMult: 1.0,
      hits: 3,
      vfx: 'arrow_rain',
      sfx: 'skill_rain',
      icon: '🌙',
    },
    {
      id: 'arq_pedra_desenraizada',
      classId: 'ARQUEIRO',
      name: 'Rocha Desenraizada',
      description: 'Projétil pesado de impacto final.',
      order: 9,
      resource: 'mp',
      cost: 44,
      cooldownMs: 26_000,
      damageMult: 2.85,
      guaranteeCrit: true,
      vfx: 'pierce_shot',
      sfx: 'skill_pierce',
      icon: '🪨',
    },
  ],
};

export function combatSkillsForClass(classId) {
  return CLASS_COMBAT_SKILLS[classId] || [];
}

export function findCombatSkill(skillId) {
  for (const list of Object.values(CLASS_COMBAT_SKILLS)) {
    const found = list.find((s) => s.id === skillId);
    if (found) return found;
  }
  return null;
}

function remapLegacyMageSkillIds(cs) {
  const mapId = (id) => MAGE_SKILL_REMAP[id] || id;
  cs.unlocked = [...new Set((cs.unlocked || []).map(mapId))];
  cs.bar = [...new Set((cs.bar || []).map(mapId))].slice(0, COMBAT_SKILL_BAR_SIZE);
  if (cs.pendingCastId) cs.pendingCastId = mapId(cs.pendingCastId);
  const nextCd = {};
  for (const [id, until] of Object.entries(cs.cooldowns || {})) {
    const mapped = mapId(id);
    const prev = nextCd[mapped];
    if (!prev || Date.parse(until) > Date.parse(prev)) nextCd[mapped] = until;
  }
  cs.cooldowns = nextCd;
}

/**
 * Soma bônus % de skills elementais do equipamento (armas/joias mago).
 * @param {string} element fire|lightning|ice
 * @returns {number} fração (ex.: 0.12 = +12%)
 */
export function elementSkillBonus(character, element) {
  if (!element) return 0;
  let sum = 0;
  for (const item of Object.values(character.equipment || {})) {
    if (!item) continue;
    const t = getTemplate(item.templateId);
    const base = Number(t?.skillElementBonus?.[element]) || 0;
    if (!base) continue;
    const mult = (RARITIES[item.rarity]?.mult || 1) * (item.roll || 1);
    sum += base * mult;
  }
  return Math.round(sum * 1000) / 1000;
}

export function ensureCombatSkills(character) {
  if (!character.combatSkills || typeof character.combatSkills !== 'object') {
    character.combatSkills = {
      unlocked: [],
      cooldowns: {},
      autoCast: false,
      bar: [],
      pendingCastId: null,
    };
  }
  const cs = character.combatSkills;
  if (!Array.isArray(cs.unlocked)) cs.unlocked = [];
  if (!cs.cooldowns || typeof cs.cooldowns !== 'object') cs.cooldowns = {};
  if (typeof cs.autoCast !== 'boolean') cs.autoCast = false;
  if (!Array.isArray(cs.bar)) cs.bar = [];
  if (cs.pendingCastId === undefined) cs.pendingCastId = null;

  if (character.classId === 'MAGO') {
    remapLegacyMageSkillIds(cs);
  }

  if (character.classId === 'BARBARO') {
    if (!Number.isFinite(character.currentRage)) character.currentRage = 0;
    if (!Number.isFinite(character.maxRage)) character.maxRage = MAX_RAGE;
  }

  syncCombatSkillUnlocks(character);
  return cs;
}

/** Libera skills de combate nos níveis da tabela COMBAT_SKILL_UNLOCK_LEVELS. */
export function syncCombatSkillUnlocks(character) {
  const defs = combatSkillsForClass(character.classId);
  const cs = character.combatSkills;
  const level = character.level || 1;
  defs.forEach((def, i) => {
    const need = COMBAT_SKILL_UNLOCK_LEVELS[i] ?? 999;
    if (level >= need && !cs.unlocked.includes(def.id)) {
      cs.unlocked.push(def.id);
    }
  });
  if (!cs.bar.length) {
    cs.bar = defs
      .filter((d) => cs.unlocked.includes(d.id))
      .map((d) => d.id)
      .slice(0, COMBAT_SKILL_BAR_SIZE);
  } else {
    for (const id of cs.unlocked) {
      if (!cs.bar.includes(id) && cs.bar.length < COMBAT_SKILL_BAR_SIZE) cs.bar.push(id);
    }
  }
}

export function setCombatAutoCast(character, enabled) {
  ensureCombatSkills(character);
  character.combatSkills.autoCast = Boolean(enabled);
  return character.combatSkills.autoCast;
}

export function queueCombatSkill(character, skillId) {
  ensureCombatSkills(character);
  const def = findCombatSkill(skillId);
  if (!def || def.classId !== character.classId) throw new Error('Skill inválida');
  if (!character.combatSkills.unlocked.includes(skillId)) {
    throw new Error('Skill ainda bloqueada');
  }
  character.combatSkills.pendingCastId = skillId;
  return { pendingCastId: skillId };
}

function cooldownReady(character, skillId, now = Date.now()) {
  const until = character.combatSkills?.cooldowns?.[skillId];
  if (!until) return true;
  return Date.parse(until) <= now;
}

function canAfford(character, def, stats) {
  if (def.resource === 'rage') {
    return (character.currentRage || 0) >= def.cost;
  }
  return (character.currentMp || 0) >= def.cost;
}

function spendResource(character, def, stats) {
  if (def.resource === 'rage') {
    character.currentRage = Math.max(0, (character.currentRage || 0) - def.cost);
    if (def.rageGain) {
      character.currentRage = Math.min(
        character.maxRage || MAX_RAGE,
        character.currentRage + def.rageGain,
      );
    }
    return { resource: 'rage', left: character.currentRage };
  }
  character.currentMp = Math.max(0, (character.currentMp || 0) - def.cost);
  if (def.mpRefundPct) {
    const refund = Math.floor(stats.maxMp * def.mpRefundPct);
    character.currentMp = Math.min(stats.maxMp, character.currentMp + refund);
  }
  return { resource: 'mp', left: character.currentMp };
}

/**
 * Escolhe skill para o tick: pending manual > autoCast da barra.
 * @returns {CombatSkillDef | null}
 */
export function pickCombatSkillForTick(character, now = Date.now()) {
  ensureCombatSkills(character);
  const cs = character.combatSkills;
  const stats = { maxMp: character.currentMp }; // afford only needs currentMp/rage
  const tryId = (id) => {
    if (!id || !cs.unlocked.includes(id)) return null;
    if (!cooldownReady(character, id, now)) return null;
    const def = findCombatSkill(id);
    if (!def) return null;
    if (!canAfford(character, def, stats)) return null;
    return def;
  };

  if (cs.pendingCastId) {
    const pending = cs.pendingCastId;
    cs.pendingCastId = null;
    const def = tryId(pending);
    if (def) return def;
  }

  if (!cs.autoCast) return null;
  for (const id of cs.bar) {
    const def = tryId(id);
    if (def) return def;
  }
  return null;
}

/**
 * Executa skill no alvo. Retorna hits + eventos para o combat loop.
 */
export function executeCombatSkill(character, def, target, stats, now = Date.now(), options = {}) {
  if (!canAfford(character, def, stats)) {
    return { ok: false, reason: 'resource' };
  }
  const rng = typeof options?.rng === 'function' ? options.rng : Math.random;
  const spent = spendResource(character, def, stats);
  const cdUntil = new Date(now + def.cooldownMs).toISOString();
  character.combatSkills.cooldowns[def.id] = cdUntil;

  if (def.mitigateNext != null) {
    character.combatMitigateNext = Math.max(
      Number(character.combatMitigateNext) || 0,
      def.mitigateNext,
    );
  }

  const mitigation = Math.floor(Number(target.monster.defense) || 0);
  const hits = Math.max(1, Math.floor(def.hits || 1));
  const isBoss = Boolean(target.monster.isBoss);
  let bossMult = isBoss && def.bossBonusMult ? def.bossBonusMult : 1;
  const elemMult = 1 + elementSkillBonus(character, def.element);
  const mpPart = def.mpScale ? (Number(stats.maxMp) || 0) * def.mpScale : 0;
  const hitResults = [];
  let totalDmg = 0;

  for (let i = 0; i < hits; i += 1) {
    const crit = def.guaranteeCrit || rng() < stats.critChance;
    const atk = Math.max(
      1,
      Math.floor((stats.attack * def.damageMult + mpPart) * bossMult * elemMult),
    );
    const base = Math.max(1, atk - mitigation);
    const dmg = crit ? Math.floor(base * 1.8) : base;
    const safe = Number.isFinite(dmg) ? dmg : 0;
    totalDmg += safe;
    hitResults.push({ dmg: safe, crit });
  }

  return {
    ok: true,
    def,
    spent,
    hits: hitResults,
    totalDmg,
    cooldownUntil: cdUntil,
    vfx: def.vfx,
    sfx: def.sfx,
  };
}

export function regenMpTick(character, stats) {
  if (character.classId === 'BARBARO') return;
  const max = stats.maxMp || 1;
  const gain = Math.max(1, Math.floor(max * MP_REGEN_PER_TICK_PCT));
  character.currentMp = Math.min(max, (character.currentMp || 0) + gain);
}

export function gainRage(character, amount) {
  if (character.classId !== 'BARBARO') return;
  ensureCombatSkills(character);
  character.currentRage = Math.min(
    character.maxRage || MAX_RAGE,
    (character.currentRage || 0) + Math.max(0, amount),
  );
}

export function decayRageOnStop(character) {
  if (character.classId !== 'BARBARO') return;
  character.currentRage = Math.floor((character.currentRage || 0) * 0.5);
}

export function publicCombatSkills(character) {
  ensureCombatSkills(character);
  const defs = combatSkillsForClass(character.classId);
  const cs = character.combatSkills;
  const now = Date.now();
  return {
    autoCast: Boolean(cs.autoCast),
    bar: [...cs.bar],
    pendingCastId: cs.pendingCastId || null,
    resource:
      character.classId === 'BARBARO'
        ? {
            type: 'rage',
            current: Math.floor(character.currentRage || 0),
            max: character.maxRage || MAX_RAGE,
            label: 'Fúria',
          }
        : {
            type: 'mp',
            current: Math.floor(character.currentMp || 0),
            max: null,
            label: 'MP',
          },
    catalog: defs.map((d) => {
      const unlocked = cs.unlocked.includes(d.id);
      const cdIso = cs.cooldowns[d.id];
      const cdMs = cdIso ? Math.max(0, Date.parse(cdIso) - now) : 0;
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        order: d.order,
        resource: d.resource,
        cost: d.cost,
        cooldownMs: d.cooldownMs,
        cooldownRemainingMs: cdMs,
        unlocked,
        unlockLevel: COMBAT_SKILL_UNLOCK_LEVELS[d.order - 1] || 1,
        icon: d.icon,
        vfx: d.vfx,
        sfx: d.sfx,
      };
    }),
  };
}
