/**
 * Simulador admin — combate/farm in-memory usando fórmulas oficiais.
 * Não persiste personagem nem catálogo.
 */
import { listZones, scaleMonster, buildZoneBoss, monsterDefense } from "./game/data";
import { getBalance } from "./game/balance";
import { getDropChance } from "./game/items";

export type SimulateHeroProfile = {
  level: number;
  attack: number;
  defense: number;
  maxHp: number;
  /** Intervalo entre hits do herói (ms). */
  intervalMs?: number;
};

export type SimulateInput = {
  zoneId: string;
  /** Índice do mob na zona, ou "boss". */
  monsterKey: string | number;
  hero: SimulateHeroProfile;
  /** Quantidade de kills a simular (default 50). */
  iterations?: number;
};

export type SimulateResult = {
  zoneId: string;
  zoneName: string;
  monsterName: string;
  isBoss: boolean;
  monster: {
    level: number;
    hp: number;
    attack: number;
    defense: number;
    xp: number;
    gold: number;
  };
  hero: SimulateHeroProfile;
  iterations: number;
  avgTtkMs: number;
  avgHitsToKill: number;
  avgDamageTaken: number;
  xpPerHour: number;
  goldPerHour: number;
  estimatedDropChance: number;
  notes: string[];
};

function resolveMonster(zone: Record<string, unknown>, monsterKey: string | number) {
  if (monsterKey === "boss" || monsterKey === -1) {
    return { ...buildZoneBoss(zone), isBoss: true };
  }
  const list = Array.isArray(zone.monsters) ? zone.monsters : [];
  const idx = typeof monsterKey === "number" ? monsterKey : Number(monsterKey);
  if (!Number.isFinite(idx) || idx < 0 || idx >= list.length) {
    throw Object.assign(new Error("Monstro não encontrado na zona"), { status: 400 });
  }
  const raw = list[idx];
  // listZones já devolve scaleMonster; se vier raw, escala.
  if (raw && raw.hp != null && raw.attack != null) {
    return { ...raw, isBoss: false, defense: monsterDefense(raw) };
  }
  return { ...scaleMonster(raw, zone), isBoss: false };
}

function clampHero(hero: SimulateHeroProfile): SimulateHeroProfile {
  const b = getBalance();
  const level = Math.max(1, Math.floor(Number(hero.level) || 1));
  const attack = Math.max(1, Math.floor(Number(hero.attack) || b.baseAttack));
  const defense = Math.max(0, Math.floor(Number(hero.defense) || b.baseDefense));
  const maxHp = Math.max(1, Math.floor(Number(hero.maxHp) || b.baseHp));
  const intervalMs = Math.max(
    b.minIntervalMs,
    Math.floor(Number(hero.intervalMs) || b.baseIntervalMs),
  );
  return { level, attack, defense, maxHp, intervalMs };
}

/** Simula N kills sem RNG de crit — dano estável para estimativa de balanceamento. */
export function simulateFarmFight(input: SimulateInput): SimulateResult {
  const zoneId = String(input.zoneId || "").trim();
  const zones = listZones();
  const zone = zones.find((z: { id: string }) => z.id === zoneId);
  if (!zone) {
    throw Object.assign(new Error("Zona não encontrada"), { status: 404 });
  }

  const hero = clampHero(input.hero);
  const monster = resolveMonster(zone, input.monsterKey);
  const mDef = monsterDefense(monster);
  const chip = Math.max(1, hero.attack - mDef);
  const hitsToKill = Math.max(1, Math.ceil(Number(monster.hp) / chip));
  const interval = hero.intervalMs || getBalance().baseIntervalMs;
  const ttkMs = hitsToKill * interval;

  // Dano recebido: mob ataca no mesmo ritmo aproximado (1 hit por intervalo do herói).
  const mChip = Math.max(1, Number(monster.attack) - hero.defense);
  const damageTaken = mChip * hitsToKill;

  const iterations = Math.max(1, Math.min(500, Math.floor(Number(input.iterations) || 50)));
  const killsPerHour = ttkMs > 0 ? (3600_000 / ttkMs) : 0;
  const xpPerHour = Math.round(killsPerHour * Number(monster.xp || 0));
  const goldPerHour = Math.round(killsPerHour * Number(monster.gold || 0));

  const zoneDrop =
    zone.dropChance != null ? Number(zone.dropChance) : getDropChance();
  const bossMult = monster.isBoss
    ? Number(zone.bossDropMult ?? getBalance().bossDropMult) || 1
    : 1;
  const estimatedDropChance = Math.min(1, zoneDrop * bossMult);

  const notes: string[] = [
    "Simulação determinística (sem crit/skills/poções) — útil para TTK/XP/ouro relativo.",
    "Não altera personagens, inventário nem catálogo.",
  ];
  if (damageTaken >= hero.maxHp) {
    notes.push("Estimativa: herói morreria sem cura neste ritmo de dano recebido.");
  }

  return {
    zoneId: zone.id,
    zoneName: String(zone.name || zone.id),
    monsterName: String(monster.name || "Monstro"),
    isBoss: Boolean(monster.isBoss),
    monster: {
      level: Number(monster.level) || 1,
      hp: Number(monster.hp) || 1,
      attack: Number(monster.attack) || 1,
      defense: mDef,
      xp: Number(monster.xp) || 0,
      gold: Number(monster.gold) || 0,
    },
    hero,
    iterations,
    avgTtkMs: Math.round(ttkMs),
    avgHitsToKill: hitsToKill,
    avgDamageTaken: Math.round(damageTaken),
    xpPerHour,
    goldPerHour,
    estimatedDropChance,
    notes,
  };
}
