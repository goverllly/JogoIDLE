/**
 * Checks de fidelidade: constantes/fórmulas do motor vs espelho do simulador.
 * Não altera produção.
 */
import {
  DEFAULT_BALANCE,
  xpToNextLevel,
  totalXpToReach,
  MORTAL_LEVEL_CAP,
  CELESTIAL_LEVEL_CAP,
} from "../../lib/jogo-idle/game/balance.ts";
import { CLASSES, BASE_ZONES, scaleMonster, expectedPlayerPower } from "../../lib/jogo-idle/game/data.ts";
import { DROP_CHANCE, RARITIES } from "../../lib/jogo-idle/game/items.ts";
import { computeStatsMirror } from "./lib.mjs";

const MAGE_BASIC = 0.55;
const CRIT_MULT = 1.8;
const WARRIOR_BLOCK = 0.12;
const MAX_CATCH_UP_MS = 2 * 60 * 60 * 1000;
const MAX_TICKS = 5000;

export function runFidelityChecks() {
  const checks = [];
  const ok = (id, pass, detail) => checks.push({ id, pass: Boolean(pass), detail });

  ok("xp_L100", xpToNextLevel(100) === Math.floor(120 * Math.pow(100, 1.32)), `got ${xpToNextLevel(100)}`);
  ok("xp_L1", xpToNextLevel(1) === 100, `got ${xpToNextLevel(1)}`);
  ok("total_to_500", totalXpToReach(500) === 96696680 || totalXpToReach(500) > 90_000_000, `got ${totalXpToReach(500)}`);
  ok("caps", MORTAL_LEVEL_CAP === 500 && CELESTIAL_LEVEL_CAP === 700, "caps");
  ok("kAtk", DEFAULT_BALANCE.kAtk === 2.2, String(DEFAULT_BALANCE.kAtk));
  ok("drop_default", DROP_CHANCE === 0.11, String(DROP_CHANCE));
  ok("rarities_5", Object.keys(RARITIES).length === 5, String(Object.keys(RARITIES).length));
  ok("zones_17", BASE_ZONES.length === 17, String(BASE_ZONES.length));
  ok("classes_4", Object.keys(CLASSES).length === 4, String(Object.keys(CLASSES).length));

  const z = BASE_ZONES.find((x) => x.id === "hidra");
  const mob = scaleMonster({ ...z.monsters[0], isBoss: false }, z);
  ok("scale_monster_hp_positive", mob.hp > 0 && mob.xp > 0, JSON.stringify({ hp: mob.hp, xp: mob.xp }));

  const st = computeStatsMirror(CLASSES.GUERREIRO.base, 1, DEFAULT_BALANCE, { classId: "GUERREIRO" });
  ok("stats_mirror_hp", st.maxHp > 0 && st.attack > 0, JSON.stringify(st));

  const dexSoftSpeed = Math.ceil((DEFAULT_BALANCE.baseIntervalMs - DEFAULT_BALANCE.minIntervalMs) / DEFAULT_BALANCE.kSpeed);
  const dexSoftCrit = Math.ceil(DEFAULT_BALANCE.maxCrit / DEFAULT_BALANCE.critPerDex);
  ok("dex_speed_softcap", dexSoftSpeed === 148 || dexSoftSpeed === 147, `dex≈${dexSoftSpeed}`);
  ok("dex_crit_softcap", dexSoftCrit === 180, `dex=${dexSoftCrit}`);

  const eter = BASE_ZONES.find((x) => x.id === "eter");
  const firm = BASE_ZONES.find((x) => x.id === "firmamento");
  ok(
    "celestial_gate",
    eter?.requiresAscension === "CELESTIAL" &&
      eter?.minLevel === 500 &&
      firm?.minLevel === 560,
    `eter=${eter?.minLevel}/${eter?.requiresAscension} firm=${firm?.minLevel}`,
  );

  const failed = checks.filter((c) => !c.pass);
  return {
    passed: failed.length === 0,
    checks,
    failed,
    motorConstants: {
      DEFAULT_BALANCE,
      DROP_CHANCE,
      MAGE_BASIC,
      CRIT_MULT,
      WARRIOR_BLOCK,
      MAX_CATCH_UP_MS,
      MAX_TICKS,
      dexSoftSpeed,
      dexSoftCrit,
      expectedPlayerPowerL50: expectedPlayerPower(50),
    },
    approximations: [
      "Skills de barra: usa 1 skill rotativa com damageMult médio da classe (não todos os 9 efeitos especiais).",
      "Loot: modelo probabilístico por raridade; templates exatos de tier não são sorteados um a um.",
      "Gear gradual: attrs flat derivados de raridade/refine esperados, não inventário real UID.",
      "Farm tree XP mult: aplicado como xpMult externo (1 / 1.15 / 1.25), não árvore unlock step-by-step.",
      "Poções/auto-heal: não modeladas (faint = restart imediato com HP cheio).",
      "Produção Prisma/catalog_state: não acessível — só defaults + save.json standalone.",
      "Engagement xpMult servidor: assumido 1.0.",
    ],
  };
}
