/**
 * Fase 5.4 — ordenação de snapshots /me vs mutações (sem browser).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareRevision,
  createClientSync,
  farmBatchKey,
} from "../../../../public/jogo-idle/client-sync.js";

describe("5.4 client-sync — revision ordering", () => {
  it("compareRevision ordena ISO#seq", () => {
    assert.ok(compareRevision("2026-01-01T00:00:00.000Z#1", "2026-01-01T00:00:00.000Z#2") < 0);
    assert.equal(compareRevision("2026-01-01T00:00:00.000Z#2", "2026-01-01T00:00:00.000Z#2"), 0);
    assert.ok(compareRevision("2026-01-02T00:00:00.000Z#1", "2026-01-01T00:00:00.000Z#9") > 0);
  });

  it("ISO#2 < ISO#10 (seq numérico, não lexicográfico)", () => {
    const iso = "2026-01-01T00:00:00.000Z";
    // Lexicográfico: "#10" < "#2" (errado). Numérico: 2 < 10 (correto).
    assert.ok(`${iso}#10` < `${iso}#2`, "premissa: ordem string lex é invertida");
    assert.ok(compareRevision(`${iso}#2`, `${iso}#10`) < 0);
    assert.ok(compareRevision(`${iso}#10`, `${iso}#2`) > 0);
    const sync = createClientSync();
    assert.equal(
      sync.acceptCharacterSnapshot({ id: "c1", revision: `${iso}#10` }),
      true,
    );
    assert.equal(
      sync.acceptCharacterSnapshot({ id: "c1", revision: `${iso}#2` }),
      false,
      "snapshot atrasado #2 não sobrescreve #10",
    );
  });

  it("reset após troca de personagem descarta revision anterior", () => {
    const sync = createClientSync();
    sync.acceptCharacterSnapshot({ id: "c1", revision: "2026-01-01T00:00:00.000Z#10" });
    sync.reset();
    assert.equal(sync.getAppliedRevision(), null);
    assert.equal(
      sync.acceptCharacterSnapshot({ id: "c2", revision: "2026-01-01T00:00:00.000Z#1" }),
      true,
    );
  });

  it("resposta /me atrasada não sobrescreve mutação mais nova", () => {
    const sync = createClientSync();
    sync.beginMutation();
    sync.noteMutationResult({ revision: "2026-01-01T00:00:00.000Z#5" });
    assert.equal(
      sync.acceptCharacterSnapshot({
        id: "c1",
        revision: "2026-01-01T00:00:00.000Z#3",
      }),
      false,
    );
    assert.equal(sync.getAppliedRevision(), "2026-01-01T00:00:00.000Z#5");
  });

  it("aceita /me mais novo após mutação", () => {
    const sync = createClientSync();
    sync.beginMutation();
    sync.noteMutationResult({ revision: "2026-01-01T00:00:00.000Z#5" });
    assert.equal(
      sync.acceptCharacterSnapshot({
        id: "c1",
        revision: "2026-01-01T00:00:00.000Z#6",
      }),
      true,
    );
  });

  it("durante mutação pendente, /me com mesma revision é bloqueado", () => {
    const sync = createClientSync();
    assert.equal(
      sync.acceptCharacterSnapshot({ id: "c1", revision: "2026-01-01T00:00:00.000Z#1" }),
      true,
    );
    sync.beginMutation();
    assert.equal(
      sync.acceptCharacterSnapshot({ id: "c1", revision: "2026-01-01T00:00:00.000Z#1" }),
      false,
    );
    sync.endMutation();
  });

  it("farm presentation rejeita lote obsoleto e deduplica", () => {
    const sync = createClientSync();
    sync.acceptCharacterSnapshot({ id: "c1", revision: "2026-01-01T00:00:00.000Z#4" });
    const farm = {
      ticks: 10,
      kills: 2,
      rewardedMs: 1000,
      events: [{ type: "attack", t: 1 }],
    };
    assert.equal(sync.acceptFarmPresentation(farm, "2026-01-01T00:00:00.000Z#4"), true);
    assert.equal(sync.acceptFarmPresentation(farm, "2026-01-01T00:00:00.000Z#4"), false);
    assert.equal(
      sync.acceptFarmPresentation(farm, "2026-01-01T00:00:00.000Z#2"),
      false,
    );
  });

  it("runRefreshExclusive coalesces overlapping calls into at most one trailing run", async () => {
    const sync = createClientSync();
    let runs = 0;
    const slow = async () => {
      runs += 1;
      await new Promise((r) => setTimeout(r, 20));
    };
    const p1 = sync.runRefreshExclusive(slow);
    const p2 = sync.runRefreshExclusive(slow);
    const p3 = sync.runRefreshExclusive(slow);
    await Promise.all([p1, p2, p3]);
    assert.ok(runs >= 1 && runs <= 2, `expected 1–2 runs, got ${runs}`);
  });

  it("farmBatchKey é estável", () => {
    const a = farmBatchKey({
      catchUpId: "c:1",
      ticks: 3,
      kills: 1,
      rewardedMs: 50,
      events: [{ type: "kill", t: 9 }],
    });
    const b = farmBatchKey({
      catchUpId: "c:1",
      ticks: 3,
      kills: 1,
      rewardedMs: 50,
      events: [{ type: "kill", t: 9 }],
    });
    assert.equal(a, b);
  });
});
