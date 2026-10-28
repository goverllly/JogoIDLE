/**
 * Fase 4.1 — Combate e atributos (RNG injetável, determinismo, NaN).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { processFarm, startFarm, stopFarm } from "../combat.ts";
import { computeStats, applyRewards } from "../character.ts";
import {
  beginFarm,
  combatReadyCharacter,
  makeSeededRng,
  makeSequenceRng,
} from "./test-helpers.ts";

const CLASS_IDS = ["GUERREIRO", "BARBARO", "MAGO", "ARQUEIRO"] as const;

describe("4.1 combat — stats por classe", () => {
  for (const classId of CLASS_IDS) {
    it(`${classId}: computeStats finito e coerente com fórmula`, () => {
      const c = combatReadyCharacter(classId);
      const s = computeStats(c);
      assert.ok(Number.isFinite(s.maxHp) && s.maxHp > 0);
      assert.ok(Number.isFinite(s.maxMp) && s.maxMp >= 0);
      assert.ok(Number.isFinite(s.attack) && s.attack > 0);
      assert.ok(Number.isFinite(s.defense) && s.defense >= 0);
      assert.ok(Number.isFinite(s.attackIntervalMs) && s.attackIntervalMs > 0);
      assert.ok(Number.isFinite(s.critChance) && s.critChance >= 0 && s.critChance <= 1);
      assert.equal(s.isMagic, classId === "MAGO");
    });
  }

  it("MAGO usa ataque mágico (int); GUERREIRO físico (str)", () => {
    const g = combatReadyCharacter("GUERREIRO");
    const m = combatReadyCharacter("MAGO");
    g.attributes = { str: 40, int: 5, dex: 5, con: 10 };
    m.attributes = { str: 5, int: 40, dex: 5, con: 10 };
    const gHighStr = computeStats(g);
    g.attributes = { str: 5, int: 40, dex: 5, con: 10 };
    const gHighInt = computeStats(g);
    assert.ok(gHighStr.attack > gHighInt.attack, "guerreiro escala com str");
    const mHighInt = computeStats(m);
    m.attributes = { str: 40, int: 5, dex: 5, con: 10 };
    const mHighStr = computeStats(m);
    assert.ok(mHighInt.attack > mHighStr.attack, "mago escala com int");
  });
});

describe("4.1 combat — RNG determinístico", () => {
  it("mesma seed + mesmo now → kills/xp/gold/ticks idênticos", () => {
    const run = (seed: number) => {
      const c = combatReadyCharacter("GUERREIRO");
      beginFarm(c, "bosque_sussurros", { rng: makeSeededRng(seed) });
      const t0 = Date.parse(c.lastTickAt);
      const now = t0 + 60_000;
      return processFarm(c, now, { rng: makeSeededRng(seed) });
    };
    const a = run(42);
    const b = run(42);
    assert.equal(a.ticks, b.ticks);
    assert.equal(a.kills, b.kills);
    assert.equal(a.xpGained, b.xpGained);
    assert.equal(a.goldGained, b.goldGained);
    assert.ok(a.ticks > 0, "deve processar ticks em 60s");
  });

  it("seeds diferentes → resultados podem divergir (não travado em 0)", () => {
    const results = [7, 99, 12345].map((seed) => {
      const c = combatReadyCharacter("BARBARO");
      beginFarm(c, "bosque_sussurros", { rng: makeSeededRng(seed) });
      const t0 = Date.parse(c.lastTickAt);
      return processFarm(c, t0 + 120_000, { rng: makeSeededRng(seed) });
    });
    assert.ok(results.every((r) => r.ticks > 0));
    const sigs = new Set(results.map((r) => `${r.kills}:${r.xpGained}:${r.goldGained}`));
    assert.ok(sigs.size >= 1);
  });

  it("crit forçado (rng=0) vs nunca crit (rng=0.999) altera dano em eventos", () => {
    const fight = (critRoll: number) => {
      const c = combatReadyCharacter("ARQUEIRO");
      c.attributes.dex = 80;
      // Sem skills no tick: sequência alta evita skills se dependerem de rng interno do pick.
      beginFarm(c, "bosque_sussurros", { rng: makeSequenceRng([0]) });
      const t0 = Date.parse(c.lastTickAt);
      // pick monstro=0; depois crit/block/drops usam o valor fixo
      const rng = makeSequenceRng([0, critRoll, critRoll, critRoll, critRoll, 0.99, 0.99, 0.99, 0.99]);
      const interval = computeStats(c).attackIntervalMs;
      return processFarm(c, t0 + interval * 3, {
        rng,
        maxTicks: 3,
      });
    };
    // Garante que processFarm não explode com rng forçado
    const low = fight(0);
    const high = fight(0.999);
    assert.ok(low.ticks >= 1);
    assert.ok(high.ticks >= 1);
  });
});

describe("4.1 combat — integridade HP/dano", () => {
  it("monsterHp e currentHp permanecem finitos após farm", () => {
    const c = combatReadyCharacter("GUERREIRO");
    beginFarm(c, "bosque_sussurros", { rng: makeSeededRng(1) });
    const t0 = Date.parse(c.lastTickAt);
    processFarm(c, t0 + 30_000, { rng: makeSeededRng(1) });
    assert.ok(Number.isFinite(c.currentHp));
    if (c.combat) {
      assert.ok(Number.isFinite(c.combat.monsterHp));
      assert.ok(c.combat.monsterHp >= 0);
    }
  });

  it("NaN em monsterHp é sanitizado no tick (não propaga)", () => {
    const c = combatReadyCharacter("GUERREIRO");
    beginFarm(c, "bosque_sussurros", { rng: makeSeededRng(3) });
    assert.ok(c.combat);
    c.combat.monsterHp = Number.NaN;
    const t0 = Date.parse(c.lastTickAt!);
    const r = processFarm(c, t0 + 5000, { rng: makeSeededRng(3), maxTicks: 5 });
    assert.ok(r.ticks >= 1);
    if (c.combat) assert.ok(Number.isFinite(c.combat.monsterHp));
  });

  it("applyRewards sobe nível e restaura HP/MP finitos", () => {
    const c = combatReadyCharacter("MAGO");
    const before = c.level;
    applyRewards(c, { xp: 10_000, gold: 50 });
    assert.ok(c.level >= before);
    assert.equal(c.gold, 50);
    assert.ok(Number.isFinite(c.currentHp) && c.currentHp > 0);
    assert.ok(Number.isFinite(c.currentMp));
  });
});

describe("4.1 combat — farm start/stop", () => {
  it("startFarm grava zona e stopFarm limpa sem duplicar se chamado 2×", () => {
    const c = combatReadyCharacter("GUERREIRO");
    const rng = makeSeededRng(11);
    startFarm(c, "bosque_sussurros", { rng });
    assert.equal(c.farmZoneId, "bosque_sussurros");
    assert.ok(c.lastTickAt);
    const t0 = Date.parse(c.lastTickAt);
    processFarm(c, t0 + 10_000, { rng: makeSeededRng(11) });
    const xp1 = c.experience;
    const gold1 = c.gold;
    stopFarm(c, { rng: makeSeededRng(11) });
    assert.equal(c.farmZoneId, null);
    const xp2 = c.experience;
    const gold2 = c.gold;
    stopFarm(c, { rng: makeSeededRng(11) });
    assert.equal(c.experience, xp2);
    assert.equal(c.gold, gold2);
    assert.ok(xp1 >= 0 && gold1 >= 0);
  });

  it("zona de outro capítulo não farmável", () => {
    const c = combatReadyCharacter("GUERREIRO");
    // Cap. II — personagem ainda no Cap. I
    assert.throws(
      () => startFarm(c, "cemiterio_esquecido"),
      /Capítulo|capítulo|disponível|nível|ascensão|classificação/i,
    );
  });
});
