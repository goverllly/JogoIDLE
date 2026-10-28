// @ts-nocheck
/**
 * Árvore linear de skills por classe (3 nós).
 * Compra com pontos de skill; ativação aplica buff temporário (XP/ouro/dano).
 */

const MIN_MS = 60_000;

/** @typedef {'xp' | 'gold' | 'damage'} SkillEffect */

/**
 * @typedef {{
 *   id: string;
 *   name: string;
 *   description: string;
 *   cost: number;
 *   order: number;
 *   effect: SkillEffect;
 *   mult: number;
 *   durationMs: number;
 *   cooldownMs: number;
 * }} SkillDef
 */

/** @type {Record<string, SkillDef[]>} */
export const CLASS_SKILLS = {
  GUERREIRO: [
    {
      id: 'gue_doutrina',
      name: 'Doutrina',
      description: '+15% XP de farm por 10 min',
      cost: 1,
      order: 1,
      effect: 'xp',
      mult: 1.15,
      durationMs: 10 * MIN_MS,
      cooldownMs: 30 * MIN_MS,
    },
    {
      id: 'gue_saque',
      name: 'Saque de Guerra',
      description: '+20% ouro de farm por 12 min',
      cost: 2,
      order: 2,
      effect: 'gold',
      mult: 1.2,
      durationMs: 12 * MIN_MS,
      cooldownMs: 35 * MIN_MS,
    },
    {
      id: 'gue_golpe',
      name: 'Golpe Disciplinado',
      description: '+25% dano de farm por 8 min',
      cost: 3,
      order: 3,
      effect: 'damage',
      mult: 1.25,
      durationMs: 8 * MIN_MS,
      cooldownMs: 40 * MIN_MS,
    },
  ],
  BARBARO: [
    {
      id: 'bar_furia',
      name: 'Fúria da Caça',
      description: '+15% XP de farm por 10 min',
      cost: 1,
      order: 1,
      effect: 'xp',
      mult: 1.15,
      durationMs: 10 * MIN_MS,
      cooldownMs: 30 * MIN_MS,
    },
    {
      id: 'bar_pilhagem',
      name: 'Pilhagem',
      description: '+20% ouro de farm por 12 min',
      cost: 2,
      order: 2,
      effect: 'gold',
      mult: 1.2,
      durationMs: 12 * MIN_MS,
      cooldownMs: 35 * MIN_MS,
    },
    {
      id: 'bar_massacre',
      name: 'Massacre',
      description: '+25% dano de farm por 8 min',
      cost: 3,
      order: 3,
      effect: 'damage',
      mult: 1.25,
      durationMs: 8 * MIN_MS,
      cooldownMs: 40 * MIN_MS,
    },
  ],
  MAGO: [
    {
      id: 'mag_estudo',
      name: 'Estudo Arcano',
      description: '+15% XP de farm por 10 min',
      cost: 1,
      order: 1,
      effect: 'xp',
      mult: 1.15,
      durationMs: 10 * MIN_MS,
      cooldownMs: 30 * MIN_MS,
    },
    {
      id: 'mag_transmutacao',
      name: 'Transmutação',
      description: '+20% ouro de farm por 12 min',
      cost: 2,
      order: 2,
      effect: 'gold',
      mult: 1.2,
      durationMs: 12 * MIN_MS,
      cooldownMs: 35 * MIN_MS,
    },
    {
      id: 'mag_descarga',
      name: 'Descarga',
      description: '+25% dano de farm por 8 min',
      cost: 3,
      order: 3,
      effect: 'damage',
      mult: 1.25,
      durationMs: 8 * MIN_MS,
      cooldownMs: 40 * MIN_MS,
    },
  ],
  ARQUEIRO: [
    {
      id: 'arq_rastro',
      name: 'Rastro',
      description: '+15% XP de farm por 10 min',
      cost: 1,
      order: 1,
      effect: 'xp',
      mult: 1.15,
      durationMs: 10 * MIN_MS,
      cooldownMs: 30 * MIN_MS,
    },
    {
      id: 'arq_presa',
      name: 'Presa Valiosa',
      description: '+20% ouro de farm por 12 min',
      cost: 2,
      order: 2,
      effect: 'gold',
      mult: 1.2,
      durationMs: 12 * MIN_MS,
      cooldownMs: 35 * MIN_MS,
    },
    {
      id: 'arq_tiro',
      name: 'Tiro Certeiro',
      description: '+25% dano de farm por 8 min',
      cost: 3,
      order: 3,
      effect: 'damage',
      mult: 1.25,
      durationMs: 8 * MIN_MS,
      cooldownMs: 40 * MIN_MS,
    },
  ],
};

export function skillsForClass(classId) {
  return CLASS_SKILLS[classId] || [];
}

export function findSkillDef(classId, skillId) {
  return skillsForClass(classId).find((s) => s.id === skillId) || null;
}

function emptySkillsState() {
  return {
    unspent: 0,
    unlocked: [],
    active: null,
    cooldownUntil: {},
  };
}

/** Garante estado + migração única de backlog (level − 1) pontos. */
export function ensureSkills(character) {
  if (!character.skills || typeof character.skills !== 'object') {
    character.skills = emptySkillsState();
  }
  const s = character.skills;
  if (!Array.isArray(s.unlocked)) s.unlocked = [];
  if (!s.cooldownUntil || typeof s.cooldownUntil !== 'object') s.cooldownUntil = {};
  if (s.unspent == null || !Number.isFinite(s.unspent)) s.unspent = 0;
  s.unspent = Math.max(0, Math.floor(s.unspent));

  if (!character.skillsMigrationV1) {
    const levelsGained = Math.max(0, (character.level || 1) - 1);
    s.unspent += levelsGained;
    character.skillsMigrationV1 = true;
  }
  return s;
}

export function grantSkillPointOnLevelUp(character, levels = 1) {
  ensureSkills(character);
  const n = Math.max(0, Math.floor(Number(levels) || 0));
  if (n > 0) character.skills.unspent += n;
  return character.skills.unspent;
}

export function resetSkillsForSeason(character) {
  character.skills = emptySkillsState();
  character.skillsMigrationV1 = true;
  return character.skills;
}

function previousSkillId(classId, order) {
  if (order <= 1) return null;
  const prev = skillsForClass(classId).find((s) => s.order === order - 1);
  return prev?.id || null;
}

export function unlockSkill(character, skillId) {
  ensureSkills(character);
  const def = findSkillDef(character.classId, skillId);
  if (!def) throw new Error('Skill inválida para esta classe');
  if (character.skills.unlocked.includes(def.id)) {
    throw new Error('Skill já desbloqueada');
  }
  const prevId = previousSkillId(character.classId, def.order);
  if (prevId && !character.skills.unlocked.includes(prevId)) {
    throw new Error('Desbloqueie a skill anterior primeiro');
  }
  if (character.skills.unspent < def.cost) {
    throw new Error(`Precisa de ${def.cost} ponto(s) de skill`);
  }
  character.skills.unspent -= def.cost;
  character.skills.unlocked.push(def.id);
  return {
    skills: publicSkills(character),
  };
}

export function activateSkill(character, skillId, now = Date.now()) {
  ensureSkills(character);
  expireActiveSkill(character, now);
  const def = findSkillDef(character.classId, skillId);
  if (!def) throw new Error('Skill inválida para esta classe');
  if (!character.skills.unlocked.includes(def.id)) {
    throw new Error('Skill não desbloqueada');
  }
  if (character.skills.active?.skillId) {
    throw new Error('Já há um buff de skill ativo');
  }
  const cdIso = character.skills.cooldownUntil?.[def.id];
  if (cdIso) {
    const cd = Date.parse(cdIso);
    if (Number.isFinite(cd) && cd > now) {
      throw new Error('Skill em cooldown');
    }
  }
  const endsAt = new Date(now + def.durationMs).toISOString();
  const cooldownUntil = new Date(now + def.cooldownMs).toISOString();
  character.skills.active = { skillId: def.id, endsAt, effect: def.effect, mult: def.mult };
  character.skills.cooldownUntil[def.id] = cooldownUntil;
  return { skills: publicSkills(character, now) };
}

export function expireActiveSkill(character, now = Date.now()) {
  ensureSkills(character);
  const active = character.skills.active;
  if (!active?.endsAt) {
    character.skills.active = null;
    return false;
  }
  const ends = Date.parse(active.endsAt);
  if (!Number.isFinite(ends) || ends <= now) {
    character.skills.active = null;
    return true;
  }
  return false;
}

/** Mults ativos para farm (1 = neutro). */
export function getSkillFarmMults(character, now = Date.now()) {
  ensureSkills(character);
  expireActiveSkill(character, now);
  const active = character.skills.active;
  const out = { xpMult: 1, goldMult: 1, damageMult: 1 };
  if (!active?.skillId) return out;
  const def = findSkillDef(character.classId, active.skillId);
  const effect = active.effect || def?.effect;
  const mult = Number(active.mult || def?.mult) || 1;
  if (effect === 'xp') out.xpMult = mult;
  if (effect === 'gold') out.goldMult = mult;
  if (effect === 'damage') out.damageMult = mult;
  return out;
}

export function publicSkills(character, now = Date.now()) {
  ensureSkills(character);
  expireActiveSkill(character, now);
  const catalog = skillsForClass(character.classId).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    cost: s.cost,
    order: s.order,
    effect: s.effect,
    mult: s.mult,
    durationMs: s.durationMs,
    cooldownMs: s.cooldownMs,
    unlocked: character.skills.unlocked.includes(s.id),
    lockedByOrder:
      s.order > 1 &&
      !character.skills.unlocked.includes(previousSkillId(character.classId, s.order) || ''),
    cooldownUntil: character.skills.cooldownUntil[s.id] || null,
  }));
  return {
    unspent: character.skills.unspent,
    unlocked: [...character.skills.unlocked],
    active: character.skills.active
      ? {
          skillId: character.skills.active.skillId,
          endsAt: character.skills.active.endsAt,
          effect: character.skills.active.effect,
          mult: character.skills.active.mult,
        }
      : null,
    catalog,
  };
}
