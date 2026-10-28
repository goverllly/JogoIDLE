/** Motor de duelo PvP — simulação server-side; eventos só para replay no cliente. */

import { computeStats } from "./character";

export const DUEL_MIN_STAKE = 100;
export const DUEL_CHALLENGE_TTL_MS = 60_000;
export const DUEL_MAX_DURATION_MS = 90_000;
export const DUEL_MAX_TICKS = 4000;
/** Hits gravados (cada hit = 1 evento); kill/faint reservados no fim. */
export const DUEL_MAX_HIT_EVENTS = 280;

export const DUEL_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  FINISHED: "FINISHED",
  DECLINED: "DECLINED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;

export type DuelStatus = (typeof DUEL_STATUS)[keyof typeof DUEL_STATUS];

export type DuelFighter = {
  characterId: string;
  name: string;
  classId: string;
  level: number;
  attack: number;
  defense: number;
  maxHp: number;
  critChance: number;
  attackIntervalMs: number;
};

export type DuelSide = "challenger" | "opponent";

export type DuelEvent = {
  type: "spawn" | "attack" | "hurt" | "kill" | "faint" | "hit";
  t: number;
  side?: DuelSide;
  dmg?: number;
  crit?: boolean;
  hp?: number;
  maxHp?: number;
  monsterHp?: number;
  monsterMaxHp?: number;
  /** HP do desafiante após o hit (eventos absolutos). */
  hpA?: number;
  /** HP do oponente após o hit. */
  hpB?: number;
  monster?: string;
  level?: number;
  attack?: number;
  defense?: number;
  isBoss?: boolean;
};

export type DuelResult = {
  winnerCharacterId: string | null;
  draw: boolean;
  ticks: number;
  durationMs: number;
  challengerHp: number;
  opponentHp: number;
  reason: "ko" | "timeout" | "forfeit";
};

export function snapshotFighter(character: {
  id: string;
  name: string;
  classId: string;
  level: number;
  attributes?: unknown;
  equipment?: unknown;
}): DuelFighter {
  const stats = computeStats(character as never) as {
    attack: number;
    defense: number;
    maxHp: number;
    critChance: number;
    attackIntervalMs: number;
  };
  return {
    characterId: String(character.id),
    name: String(character.name),
    classId: String(character.classId),
    level: Math.max(1, Math.floor(Number(character.level) || 1)),
    attack: Math.max(1, Math.floor(stats.attack)),
    defense: Math.max(0, Math.floor(stats.defense)),
    maxHp: Math.max(1, Math.floor(stats.maxHp)),
    critChance: Math.max(0, Math.min(1, Number(stats.critChance) || 0)),
    attackIntervalMs: Math.max(200, Math.floor(stats.attackIntervalMs || 1000)),
  };
}

export function validateStake(stake: unknown, goldA: number, goldB: number): number {
  const n = Math.floor(Number(stake));
  if (!Number.isFinite(n) || n < DUEL_MIN_STAKE) {
    const err = new Error(`Aposta mínima: ${DUEL_MIN_STAKE.toLocaleString("pt-BR")} gold`);
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  const max = Math.min(Math.max(0, Math.floor(goldA)), Math.max(0, Math.floor(goldB)));
  if (max < DUEL_MIN_STAKE) {
    const err = new Error("Saldo insuficiente para duelo (mínimo nos dois lados)");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  if (n > max) {
    const err = new Error(`Aposta máxima entre vocês: ${max.toLocaleString("pt-BR")} gold`);
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  return n;
}

/**
 * Dano PvP: armadura percentual (não zera com tanks) + ~1% do HP do alvo.
 * Evita duelos travados em 1 de dano quando DEF >> ATK.
 */
export function hitDamage(
  attacker: DuelFighter,
  defender: DuelFighter,
  rng: () => number,
): { dmg: number; crit: boolean } {
  const atk = Math.max(1, attacker.attack);
  const def = Math.max(0, defender.defense);
  const armor = def / (def + atk * 2);
  const raw = Math.floor(atk * (1 - armor * 0.82));
  const chip = Math.max(1, Math.floor(defender.maxHp * 0.01));
  let dmg = Math.max(1, raw + chip);
  const crit = rng() < attacker.critChance;
  if (crit) dmg = Math.floor(dmg * 1.8);
  return { dmg: Math.max(1, dmg), crit };
}

/**
 * Simula o duelo até KO ou timeout.
 * Eventos absolutos usam `hit` (1 por golpe) + spawn/kill/faint.
 */
export function processDuel(
  challenger: DuelFighter,
  opponent: DuelFighter,
  options?: { rng?: () => number; maxDurationMs?: number },
): { events: DuelEvent[]; result: DuelResult } {
  const rng = options?.rng || Math.random;
  const maxDuration = Math.max(5_000, options?.maxDurationMs ?? DUEL_MAX_DURATION_MS);

  let hpA = challenger.maxHp;
  let hpB = opponent.maxHp;
  let nextA = challenger.attackIntervalMs;
  let nextB = opponent.attackIntervalMs;
  let t = 0;
  let ticks = 0;
  let hitEvents = 0;
  const events: DuelEvent[] = [];

  const pushHit = (side: DuelSide, dmg: number, crit: boolean) => {
    if (hitEvents >= DUEL_MAX_HIT_EVENTS) return;
    hitEvents += 1;
    events.push({
      type: "hit",
      t,
      side,
      dmg,
      crit,
      hpA,
      hpB,
    });
  };

  events.push({
    type: "spawn",
    side: "opponent",
    monster: opponent.name,
    level: opponent.level,
    monsterHp: hpB,
    monsterMaxHp: opponent.maxHp,
    attack: opponent.attack,
    defense: opponent.defense,
    isBoss: false,
    t: 0,
  });

  while (ticks < DUEL_MAX_TICKS && hpA > 0 && hpB > 0) {
    const remaining = maxDuration - t;
    if (remaining <= 0) break;
    const step = Math.min(nextA, nextB, remaining);
    if (step <= 0) break;
    t += step;
    nextA -= step;
    nextB -= step;
    ticks += 1;

    const aReady = nextA <= 0;
    const bReady = nextB <= 0;

    if (aReady) {
      const { dmg, crit } = hitDamage(challenger, opponent, rng);
      hpB = Math.max(0, hpB - dmg);
      pushHit("challenger", dmg, crit);
      nextA = challenger.attackIntervalMs;
      if (hpB <= 0) break;
    }

    if (bReady && hpB > 0) {
      const { dmg, crit } = hitDamage(opponent, challenger, rng);
      hpA = Math.max(0, hpA - dmg);
      pushHit("opponent", dmg, crit);
      nextB = opponent.attackIntervalMs;
    }
  }

  let winnerCharacterId: string | null = null;
  let draw = false;
  let reason: DuelResult["reason"] = "timeout";

  if (hpB <= 0 && hpA > 0) {
    winnerCharacterId = challenger.characterId;
    reason = "ko";
    events.push({ type: "kill", t, side: "challenger", monster: opponent.name });
    events.push({ type: "faint", t, side: "opponent", monster: opponent.name });
  } else if (hpA <= 0 && hpB > 0) {
    winnerCharacterId = opponent.characterId;
    reason = "ko";
    events.push({ type: "kill", t, side: "opponent", monster: challenger.name });
    events.push({ type: "faint", t, side: "challenger", monster: challenger.name });
  } else {
    draw = true;
    reason = "timeout";
  }

  return {
    events,
    result: {
      winnerCharacterId,
      draw,
      ticks,
      durationMs: t,
      challengerHp: hpA,
      opponentHp: hpB,
      reason,
    },
  };
}

/**
 * Converte eventos absolutos no contrato farm (attack/hurt/spawn) para um viewer.
 */
export function farmEventsForViewer(
  events: DuelEvent[],
  result: DuelResult,
  viewerCharacterId: string,
  challenger: DuelFighter,
  opponent: DuelFighter,
): DuelEvent[] {
  const isChallenger = viewerCharacterId === challenger.characterId;
  if (!isChallenger && viewerCharacterId !== opponent.characterId) return [];

  const foe = isChallenger ? opponent : challenger;
  const self = isChallenger ? challenger : opponent;
  const selfSide: DuelSide = isChallenger ? "challenger" : "opponent";

  const out: DuelEvent[] = [
    {
      type: "spawn",
      t: 0,
      monster: foe.name,
      level: foe.level,
      monsterHp: foe.maxHp,
      monsterMaxHp: foe.maxHp,
      attack: foe.attack,
      defense: foe.defense,
      isBoss: false,
    },
  ];

  for (const ev of events) {
    if (ev.type === "spawn") continue;

    // Novo formato compacto
    if (ev.type === "hit" && ev.side) {
      const foeHp = isChallenger ? ev.hpB : ev.hpA;
      const selfHp = isChallenger ? ev.hpA : ev.hpB;
      if (ev.side === selfSide) {
        out.push({
          type: "attack",
          t: ev.t,
          dmg: ev.dmg,
          crit: ev.crit,
          monsterHp: foeHp,
          monsterMaxHp: foe.maxHp,
        });
      } else {
        out.push({
          type: "hurt",
          t: ev.t,
          dmg: ev.dmg,
          hp: selfHp,
          maxHp: self.maxHp,
        });
      }
      continue;
    }

    // Legado (attack/hurt separados)
    if (ev.type === "attack" && ev.side === selfSide) {
      out.push({
        type: "attack",
        t: ev.t,
        dmg: ev.dmg,
        crit: ev.crit,
        monsterHp: ev.monsterHp,
        monsterMaxHp: ev.monsterMaxHp ?? foe.maxHp,
      });
      continue;
    }

    if (ev.type === "hurt" && ev.side === selfSide) {
      out.push({
        type: "hurt",
        t: ev.t,
        dmg: ev.dmg,
        hp: ev.hp,
        maxHp: ev.maxHp ?? self.maxHp,
      });
      continue;
    }

    if (ev.type === "kill" && ev.side === selfSide) {
      out.push({ type: "kill", t: ev.t, monster: foe.name });
      continue;
    }

    if (ev.type === "faint" && ev.side === selfSide) {
      out.push({ type: "faint", t: ev.t, monster: foe.name });
    }
  }

  // Garante estado final coerente no HUD mesmo se o replay comprimiu hits
  const finalFoeHp = isChallenger ? result.opponentHp : result.challengerHp;
  const finalSelfHp = isChallenger ? result.challengerHp : result.opponentHp;
  const lastT = out.length ? out[out.length - 1].t : 0;
  if (!result.draw && result.winnerCharacterId === viewerCharacterId) {
    if (!out.some((e) => e.type === "kill")) {
      out.push({
        type: "attack",
        t: lastT + 1,
        dmg: 0,
        crit: false,
        monsterHp: 0,
        monsterMaxHp: foe.maxHp,
      });
      out.push({ type: "kill", t: lastT + 2, monster: foe.name });
    }
  } else if (!result.draw && result.winnerCharacterId !== viewerCharacterId) {
    if (!out.some((e) => e.type === "faint")) {
      out.push({
        type: "hurt",
        t: lastT + 1,
        dmg: 0,
        hp: Math.max(0, finalSelfHp),
        maxHp: self.maxHp,
      });
      out.push({ type: "faint", t: lastT + 2, monster: foe.name });
    }
  } else {
    // Empate: sincroniza barras finais
    out.push({
      type: "attack",
      t: lastT + 1,
      dmg: 0,
      monsterHp: Math.max(0, finalFoeHp),
      monsterMaxHp: foe.maxHp,
    });
    out.push({
      type: "hurt",
      t: lastT + 2,
      dmg: 0,
      hp: Math.max(0, finalSelfHp),
      maxHp: self.maxHp,
    });
  }

  return out;
}
