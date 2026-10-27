import { CLASSES } from "../../lib/sinergia-idle/game/data.ts";

/** Builds comparáveis: ~55% primary, 25% CON, 15% DEX, resto secondary. */
export const CLASS_PRIMARY = {
  GUERREIRO: "str",
  BARBARO: "str",
  MAGO: "int",
  ARQUEIRO: "dex",
};

export function spendPoints(classId, level, pointsPerLevel, plan = "balanced_primary") {
  const base = { ...CLASSES[classId].base };
  const pts = Math.max(0, (level - 1) * pointsPerLevel);
  const primary = CLASS_PRIMARY[classId];
  const dist = { str: 0, int: 0, dex: 0, con: 0 };

  if (plan === "glass") {
    dist[primary] = Math.floor(pts * 0.75);
    const rem = pts - dist[primary];
    if (primary === "dex") dist.str = rem;
    else dist.dex = rem;
  } else if (plan === "tank") {
    dist.con = Math.floor(pts * 0.7);
    dist[primary] = Math.floor(pts * 0.2);
    dist.dex = pts - dist.con - dist[primary];
  } else {
    // balanced_primary: 55% primary, 25% CON, 15% secondary (DEX ou STR), resto primary
    dist[primary] = Math.floor(pts * 0.55);
    dist.con = Math.floor(pts * 0.25);
    if (primary === "dex") {
      dist.str = Math.floor(pts * 0.15);
    } else if (primary === "int") {
      dist.dex = Math.floor(pts * 0.15);
    } else {
      dist.dex = Math.floor(pts * 0.15);
    }
    const used = dist.str + dist.int + dist.dex + dist.con;
    dist[primary] += pts - used;
  }

  return {
    str: base.str + dist.str,
    int: base.int + dist.int,
    dex: base.dex + dist.dex,
    con: base.con + dist.con,
    spent: dist,
  };
}

export function classSkillProfile(classId) {
  // Médias aproximadas das skills de barra (damageMult / cooldown) — ver combat-skills.ts
  const table = {
    GUERREIRO: { avgDamageMult: 1.9, avgCooldownMs: 16_000, resource: "mp" },
    BARBARO: { avgDamageMult: 2.1, avgCooldownMs: 14_000, resource: "rage" },
    MAGO: { avgDamageMult: 2.4, avgCooldownMs: 15_000, resource: "mp" },
    ARQUEIRO: { avgDamageMult: 1.85, avgCooldownMs: 12_000, resource: "mp" },
  };
  return table[classId] || table.GUERREIRO;
}
