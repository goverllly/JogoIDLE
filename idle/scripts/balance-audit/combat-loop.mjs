import { monsterDefense } from "../../lib/sinergia-idle/game/data.ts";
import { classSkillProfile } from "./profiles.mjs";

const MAGE_BASIC = 0.55;
const CRIT_MULT = 1.8;

/**
 * @param {object} opts
 * @param {object} opts.stats - from computeStatsMirror
 * @param {string} opts.classId
 * @param {object} opts.monster
 * @param {function} opts.rng
 * @param {object} [opts.dexAtk] - { mode, kDexAtk, wStr, wDex } proposal overlay (sim only)
 * @param {boolean} [opts.useSkills]
 */
export function simulateFight({ stats, classId, monster, rng, dexAtk = null, useSkills = true }) {
  let attack = stats.attack;
  if (dexAtk?.mode === "H1" && classId === "ARQUEIRO") {
    attack = Math.round(stats.physical + stats.dex * (dexAtk.kDexAtk || 1.4));
  } else if (dexAtk?.mode === "H2") {
    const wStr = dexAtk.weights?.[classId]?.wStr ?? (classId === "ARQUEIRO" ? 0.35 : 0.85);
    const wDex = dexAtk.weights?.[classId]?.wDex ?? (classId === "ARQUEIRO" ? 0.65 : 0.15);
    const kDex = dexAtk.kDexAtk || 1.4;
    const kAtk = dexAtk.kAtk || 2.2;
    attack = Math.round(
      6 + stats.str * kAtk * wStr + stats.dex * kDex * wDex + (stats.attackFlat || 0),
    );
    if (classId === "MAGO") {
      attack = Math.round(
        6 + stats.int * 2.4 + stats.dex * kDex * 0.1 + (stats.attackFlat || 0),
      );
    }
    // H2 Arqueiro: DES no ATK; soft-cap velocidade não corta o ATK-from-DEX (só interval/crit).
  } else if (dexAtk?.mode === "H3" && classId === "ARQUEIRO") {
    const soft = 148;
    const d = stats.dex;
    const eff = d <= soft ? d : soft + (d - soft) * 0.25;
    attack = Math.round(stats.physical * 0.4 + eff * 1.35);
  }

  const mageMult = classId === "MAGO" ? MAGE_BASIC : 1;
  const skill = classSkillProfile(classId);
  let mHp = monster.hp;
  let pHp = stats.maxHp;
  const def = monsterDefense(monster);
  let ticks = 0;
  let skillCd = 0;
  let damageDealt = 0;
  const interval = stats.attackIntervalMs;
  const maxTicks = 8000;

  while (mHp > 0 && pHp > 0 && ticks < maxTicks) {
    ticks += 1;
    if (skillCd > 0) skillCd -= interval;

    let atk;
    if (useSkills && skillCd <= 0) {
      atk = Math.max(1, Math.floor(attack * skill.avgDamageMult));
      skillCd = skill.avgCooldownMs;
    } else {
      atk = Math.max(1, Math.floor(attack * mageMult));
    }
    if (rng() < stats.critChance) atk = Math.floor(atk * CRIT_MULT);
    const dmg = Math.max(1, atk - def);
    mHp -= dmg;
    damageDealt += dmg;
    if (mHp <= 0) break;

    let incoming = Math.max(0, monster.attack - stats.defense);
    if (classId === "GUERREIRO" && rng() < 0.12) incoming = 0;
    pHp -= incoming;
  }

  return {
    ticks,
    durationMs: ticks * interval,
    fainted: pHp <= 0 && mHp > 0,
    damageDealt,
    kill: mHp <= 0,
  };
}

export function sampleTtk(player, monster, rng, n = 5, dexAtk = null) {
  let sum = 0;
  let faints = 0;
  for (let i = 0; i < n; i++) {
    const f = simulateFight({
      stats: player.stats,
      classId: player.classId,
      monster,
      rng,
      dexAtk,
      useSkills: true,
    });
    if (f.fainted) faints += 1;
    else sum += f.durationMs;
  }
  const kills = n - faints;
  return {
    avgTtkMs: kills > 0 ? sum / kills : Infinity,
    faintRate: faints / n,
    samples: n,
  };
}
