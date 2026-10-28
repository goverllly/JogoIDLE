/**
 * Fase 4.4 — Farm online/offline: teto 2h/request, 5k ticks, pending, manutenção, relógio.
 *
 * Decisão de produto documentada: maxCatchUpMs = 2h **por request**;
 * chunks via catchUpPending podem acumular >2h em múltiplas calls.
 */
import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { processFarm } from "../combat.ts";
import { computeStats } from "../character.ts";
import { applyGameMaintenance, setGameMaintenance } from "../maintenance.ts";
import {
  beginFarm,
  combatReadyCharacter,
  makeSeededRng,
  tankFarmCharacter,
} from "./test-helpers.ts";

const TWO_H = 2 * 60 * 60 * 1000;
const RELEVANT = 60_000;

afterEach(() => {
  applyGameMaintenance(null);
});

function snapshotFarm(c: any, r: any) {
  return {
    ticks: r.ticks,
    kills: r.kills,
    xp: r.xpGained,
    gold: r.goldGained,
    rewardedMs: r.rewardedMs,
    elapsedSinceLastMs: r.elapsedSinceLastMs,
    catchUpPending: r.catchUpPending,
    catchUpId: r.catchUpId,
    lastTickAt: c.lastTickAt,
    offlineCatchUpId: c.offlineCatchUpId,
    experience: c.experience,
    goldTotal: c.gold,
    level: c.level,
    faints: r.faints,
  };
}

function runElapsed(elapsedMs: number, seed = 21, opts: Record<string, unknown> = {}) {
  const c = tankFarmCharacter("GUERREIRO");
  beginFarm(c, "bosque_sussurros", { rng: makeSeededRng(seed) });
  const t0 = Date.parse(c.lastTickAt!);
  const now = t0 + elapsedMs;
  const r = processFarm(c, now, { rng: makeSeededRng(seed), ...opts });
  return { c, r, t0, now, snap: snapshotFarm(c, r) };
}

describe("4.4 farm offline — matriz de intervalos", () => {
  const cases = [
    { label: "30m", ms: 30 * 60_000 },
    { label: "2h", ms: TWO_H },
    { label: "2h+1m", ms: TWO_H + 60_000 },
    { label: "6h", ms: 6 * 60 * 60_000 },
    { label: "24h", ms: 24 * 60 * 60_000 },
  ];

  for (const { label, ms } of cases) {
    it(`${label}: wall=elapsed; elegível ≤2h; ticks≤5000; sem NaN`, () => {
      const { snap, c, r } = runElapsed(ms, 30 + (ms % 997));
      assert.equal(snap.elapsedSinceLastMs, ms);
      assert.ok(snap.rewardedMs <= TWO_H + 1, `rewardedMs=${snap.rewardedMs}`);
      assert.ok(r.ticks <= 5000);
      assert.equal(snap.faints, 0, "tank não deve desmaiar no bosque");
      // Wall > 2h: ou esgota o teto de tempo, ou bate maxTicks (pending)
      if (ms > TWO_H) {
        assert.ok(
          snap.rewardedMs <= TWO_H && (snap.catchUpPending || snap.rewardedMs > 0),
          JSON.stringify(snap),
        );
      } else {
        assert.ok(snap.rewardedMs > 0 || r.ticks === 0);
      }
      assert.ok(Number.isFinite(snap.xp) && snap.xp >= 0);
      assert.ok(Number.isFinite(snap.gold) && snap.gold >= 0);
      assert.ok(c.lastTickAt || snap.catchUpPending === false);
    });
  }

  it("duas calls sem avanço de relógio: segunda não concede XP/ouro extras", () => {
    const c = tankFarmCharacter("BARBARO");
    const seed = 55;
    beginFarm(c, "bosque_sussurros", { rng: makeSeededRng(seed) });
    const t0 = Date.parse(c.lastTickAt!);
    const now = t0 + 45 * 60_000;
    const r1 = processFarm(c, now, { rng: makeSeededRng(seed) });
    const xp1 = c.experience;
    const gold1 = c.gold;
    const r2 = processFarm(c, now, { rng: makeSeededRng(seed) });
    assert.ok(r1.ticks > 0);
    assert.equal(r2.ticks, 0);
    assert.equal(r2.xpGained, 0);
    assert.equal(r2.goldGained, 0);
    assert.equal(c.experience, xp1);
    assert.equal(c.gold, gold1);
  });

  it("segunda call com avanço de relógio continua de lastTickAt (sem duplicar janela)", () => {
    const c = tankFarmCharacter("MAGO");
    const seed = 66;
    beginFarm(c, "bosque_sussurros", { rng: makeSeededRng(seed) });
    const t0 = Date.parse(c.lastTickAt!);
    processFarm(c, t0 + 10 * 60_000, { rng: makeSeededRng(seed) });
    const midTick = Date.parse(c.lastTickAt!);
    assert.ok(midTick > t0);
    const xpMid = c.experience;
    const goldMid = c.gold;
    const r2 = processFarm(c, midTick + 10 * 60_000, { rng: makeSeededRng(seed + 1) });
    assert.ok(Math.abs(r2.elapsedSinceLastMs - 10 * 60_000) < 5 || r2.rewardedMs <= 10 * 60_000);
    assert.ok(c.experience >= xpMid);
    assert.ok(c.gold >= goldMid);
  });
});

describe("4.4 farm offline — 5000 ticks e catchUpPending", () => {
  it("maxTicks=5000 com janela longa → catchUpPending e retoma no próximo call", () => {
    const c = tankFarmCharacter("ARQUEIRO");
    c.attributes.dex = 200;
    const seed = 88;
    beginFarm(c, "bosque_sussurros", { rng: makeSeededRng(seed) });
    const interval = computeStats(c).attackIntervalMs;
    const t0 = Date.parse(c.lastTickAt!);
    const needMs = Math.min(TWO_H, interval * 5200);
    const r1 = processFarm(c, t0 + Math.max(needMs, interval * 5200), {
      rng: makeSeededRng(seed),
      maxTicks: 5000,
    });
    assert.equal(r1.ticks, 5000);
    assert.equal(r1.catchUpPending, true);
    assert.ok(c.offlineCatchUpId, "mantém catchUpId enquanto pending");
    const last1 = Date.parse(c.lastTickAt!);
    const xp1 = c.experience;
    const id1 = r1.catchUpId;
    const r2 = processFarm(c, last1 + interval * 100, { rng: makeSeededRng(seed), maxTicks: 5000 });
    assert.ok(r2.ticks > 0);
    assert.ok(c.experience >= xp1);
    if (r2.catchUpId && id1) assert.equal(r2.catchUpId, id1);
  });

  it("catch-up < 60s não abre offlineCatchUpId", () => {
    const { c, r } = runElapsed(30_000, 12);
    assert.ok(r.elapsedSinceLastMs < RELEVANT);
    assert.equal(c.offlineCatchUpId, null);
    assert.equal(r.catchUpId, null);
  });

  it("catch-up ≥ 60s define catchUpId no resultado", () => {
    const { r } = runElapsed(90_000, 13);
    assert.ok(r.catchUpId);
  });
});

describe("4.4 farm offline — manutenção e relógio", () => {
  it("intervalo inteiro em manutenção → rewardedMs ≈ 0", () => {
    const c = tankFarmCharacter("GUERREIRO");
    const seed = 41;
    beginFarm(c, "bosque_sussurros", { rng: makeSeededRng(seed) });
    const t0 = Date.parse(c.lastTickAt!);
    setGameMaintenance({ enabled: true, message: "teste" });
    applyGameMaintenance({
      enabled: true,
      message: "teste",
      since: new Date(t0).toISOString(),
      releasedAt: null,
    });
    const r = processFarm(c, t0 + TWO_H, { rng: makeSeededRng(seed) });
    assert.equal(r.ticks, 0);
    assert.equal(r.rewardedMs, 0);
  });

  it("cliente com now no passado (clock skew): sem ticks negativos / sem regressão", () => {
    const c = tankFarmCharacter("GUERREIRO");
    beginFarm(c, "bosque_sussurros", { rng: makeSeededRng(1) });
    const t0 = Date.parse(c.lastTickAt!);
    processFarm(c, t0 + 60_000, { rng: makeSeededRng(1) });
    const xp = c.experience;
    const gold = c.gold;
    const last = Date.parse(c.lastTickAt!);
    const r = processFarm(c, last - 60_000, { rng: makeSeededRng(1) });
    assert.equal(r.ticks, 0);
    assert.equal(r.xpGained, 0);
    assert.equal(c.experience, xp);
    assert.equal(c.gold, gold);
  });

  it("cliente futuro (3h): processa até teto 2h ou 5k ticks", () => {
    const { snap } = runElapsed(3 * 60 * 60 * 1000, 99);
    assert.ok(snap.rewardedMs <= TWO_H);
    assert.equal(snap.elapsedSinceLastMs, 3 * 60 * 60 * 1000);
    assert.ok(snap.ticks > 0);
  });
});

describe("4.4 farm offline — chunks além de 2h (decisão de produto)", () => {
  it("múltiplos calls podem acumular >2h de rewardedMs total (teto é por request)", () => {
    const c = tankFarmCharacter("GUERREIRO");
    const seed = 101;
    beginFarm(c, "bosque_sussurros", { rng: makeSeededRng(seed) });
    let cursor = Date.parse(c.lastTickAt!);
    let totalRewarded = 0;
    for (let i = 0; i < 3; i += 1) {
      const now = cursor + TWO_H;
      const r = processFarm(c, now, { rng: makeSeededRng(seed + i) });
      assert.equal(r.faints, 0);
      assert.ok(c.farmZoneId, "farm continua ativo entre chunks");
      totalRewarded += r.rewardedMs;
      cursor = Date.parse(c.lastTickAt!);
    }
    assert.ok(totalRewarded > TWO_H, `totalRewarded=${totalRewarded}`);
  });

  it("personagem frágil pode faint e encerrar catch-up (integridade, não retune)", () => {
    const c = combatReadyCharacter("GUERREIRO");
    // Stats base: pode desmaiar em sessão longa — documenta comportamento
    beginFarm(c, "bosque_sussurros", { rng: makeSeededRng(7) });
    const t0 = Date.parse(c.lastTickAt!);
    const r = processFarm(c, t0 + TWO_H, { rng: makeSeededRng(7) });
    assert.ok(r.rewardedMs <= TWO_H);
    assert.ok(Number.isFinite(r.xpGained));
    // Se faint: farm pode pausar; se tank implícito: ok também
    if (r.faints > 0) {
      assert.equal(r.catchUpPending, false);
    }
  });
});
