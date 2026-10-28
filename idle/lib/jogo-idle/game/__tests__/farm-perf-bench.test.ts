/**
 * Fase 5.6 — benchmark isolado de processFarm (CPU Node, não FPS/GPU).
 * Usa personagem em memória + RNG fixo; não toca save.json real.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { processFarm } from "../combat.ts";
import { beginFarm, combatReadyCharacter, makeSeededRng } from "./test-helpers.ts";

function timeMs(fn: () => void) {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}

describe("5.6 farm backend bench (Node CPU only)", () => {
  it("processFarm 2h catch-up: tempo e ticks reportados (não é métrica visual)", () => {
    const c = combatReadyCharacter("GUERREIRO");
    beginFarm(c);
    const now = Date.parse("2026-06-01T12:00:00.000Z");
    c.lastTickAt = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    const rng = makeSeededRng(42);
    const ms = timeMs(() => {
      const r = processFarm(c, now, { rng });
      assert.ok(r.ticks >= 0);
      assert.ok(r.rewardedMs <= 2 * 60 * 60 * 1000 + 1000);
      assert.ok(Number.isFinite(r.xpGained));
    });
    // Limite folgado — falha só se regressão catastrófica (>30s em CI típico).
    assert.ok(ms < 30_000, `processFarm 2h took ${ms.toFixed(1)}ms`);
    // Expoe no título do assert para o relatório (valor medido nesta máquina).
    assert.ok(true, `bench_2h_ms=${ms.toFixed(2)}`);
  });

  it("processFarm 30s janela é bem mais barato que 2h", () => {
    const make = (agoMs: number) => {
      const c = combatReadyCharacter("GUERREIRO");
      beginFarm(c);
      const now = Date.parse("2026-06-01T12:00:00.000Z");
      c.lastTickAt = new Date(now - agoMs).toISOString();
      return { c, now };
    };
    const short = make(30_000);
    const long = make(2 * 60 * 60 * 1000);
    const shortMs = timeMs(() => {
      processFarm(short.c, short.now, { rng: makeSeededRng(1) });
    });
    const longMs = timeMs(() => {
      processFarm(long.c, long.now, { rng: makeSeededRng(1) });
    });
    assert.ok(shortMs < longMs || shortMs < 50, `short=${shortMs} long=${longMs}`);
  });
});
