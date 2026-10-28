/**
 * Helpers compartilhados para testes de integridade (Fase 4).
 * RNG determinístico sem mockar Math.random global.
 */

import { createCharacter, computeStats, allocateAttributes } from "../character.ts";
import { startFarm } from "../combat.ts";
import { ensureChapters } from "../chapters.ts";

/** LCG simples [0,1) — sequência estável entre runs. */
export function makeSeededRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return function rng() {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Sequência finita de valores; após o fim repete o último (ou 0). */
export function makeSequenceRng(values: number[]) {
  let i = 0;
  return function rng() {
    if (i < values.length) return values[i++];
    return values.length ? values[values.length - 1] : 0;
  };
}

export function freshCharacter(
  classId: "GUERREIRO" | "BARBARO" | "MAGO" | "ARQUEIRO" = "GUERREIRO",
  name = "Tester",
) {
  const c = createCharacter(name, classId);
  ensureChapters(c);
  return c;
}

/** Personagem Lv.1 pronto para farm no Bosque, com pontos aplicados para DPS estável. */
export function combatReadyCharacter(
  classId: "GUERREIRO" | "BARBARO" | "MAGO" | "ARQUEIRO" = "GUERREIRO",
) {
  const c = freshCharacter(classId, `T_${classId.slice(0, 3)}`);
  // Boost via attrs se houver unspent; caso contrário stats base bastam no tier 1.
  if ((c.unspentPoints || 0) > 0) {
    const pts = c.unspentPoints;
    if (classId === "MAGO") allocateAttributes(c, { int: pts });
    else if (classId === "ARQUEIRO") allocateAttributes(c, { dex: pts });
    else allocateAttributes(c, { str: Math.ceil(pts / 2), con: Math.floor(pts / 2) });
  }
  computeStats(c);
  return c;
}

/**
 * Tank Lv.1 no Bosque — sobrevive catch-up longo (evita faint encerrar a sessão).
 * Usar em testes de teto 2h / 5k ticks / chunks.
 */
export function tankFarmCharacter(
  classId: "GUERREIRO" | "BARBARO" | "MAGO" | "ARQUEIRO" = "GUERREIRO",
) {
  const c = freshCharacter(classId, `Tank_${classId.slice(0, 3)}`);
  c.attributes = {
    str: classId === "MAGO" ? 5 : 40,
    int: classId === "MAGO" ? 40 : 5,
    dex: classId === "ARQUEIRO" ? 80 : 20,
    con: 220,
  };
  c.autoRestartFarm = false;
  computeStats(c);
  return c;
}

export function beginFarm(
  character: any,
  zoneId = "bosque_sussurros",
  options: { rng?: () => number; preserveHuntPerf?: boolean } = {},
) {
  startFarm(character, zoneId, options);
  return character;
}
