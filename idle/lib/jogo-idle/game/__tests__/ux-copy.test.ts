/**
 * UX pós-Fase 4 — regressão de copy (atributos + offline).
 * Não altera fórmulas; só valida textos e regras de exibição.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAttrHints } from "../../../../public/jogo-idle/attr-guide.js";
import {
  OFFLINE_CATCH_UP_CAP_MS,
  OFFLINE_CATCH_UP_GENERAL,
  OFFLINE_CATCH_UP_OVER_CAP,
  offlineCatchUpNotes,
  shouldShowOfflineCapNote,
} from "../../../../public/jogo-idle/offline-report.js";

describe("UX pós-Fase 4 — hints de atributos", () => {
  it("Guerreiro / Bárbaro enfatizam FOR e CON; DES não é dano", () => {
    for (const id of ["GUERREIRO", "BARBARO"] as const) {
      const h = getAttrHints(id);
      assert.deepEqual(h.emphasize, ["str", "con"]);
      assert.match(h.str.toLowerCase(), /ataque físico|fonte principal/);
      assert.match(h.dex.toLowerCase(), /velocidade|crítico/);
      assert.doesNotMatch(h.dex.toLowerCase(), /dano básico|ataque básico/);
    }
  });

  it("Mago enfatiza INT como ataque mágico e MP", () => {
    const h = getAttrHints("MAGO");
    assert.deepEqual(h.emphasize, ["int"]);
    assert.match(h.int.toLowerCase(), /ataque mágico/);
    assert.match(h.int.toLowerCase(), /mana|mp/);
  });

  it("Arqueiro: FOR = dano das flechas; DES = velocidade/crítico (não dano básico)", () => {
    const h = getAttrHints("ARQUEIRO");
    assert.deepEqual(h.emphasize, ["str", "dex", "con"]);
    assert.match(h.str.toLowerCase(), /dano físico|flechas/);
    assert.match(h.dex.toLowerCase(), /velocidade|crítico/);
    assert.match(h.dex.toLowerCase(), /não aumenta o dano básico/);
    assert.match(h.con.toLowerCase(), /resistência|vida|defesa/);
  });
});

describe("UX pós-Fase 4 — copy offline (sem atribuir gap ao teto)", () => {
  it("sempre inclui a orientação geral de até 2h", () => {
    const short = offlineCatchUpNotes({ elapsedSinceLastMs: 30 * 60 * 1000 });
    assert.equal(short.general, OFFLINE_CATCH_UP_GENERAL);
    assert.equal(short.overCap, null);
  });

  it("ausência curta com gap (ex.: desmaio) não mostra nota do teto", () => {
    // Gap típico de faint/interrupção — elapsed < 2h; decisão NÃO usa rewardedMs.
    assert.equal(shouldShowOfflineCapNote(45 * 60 * 1000), false);
    const notes = offlineCatchUpNotes({ elapsedSinceLastMs: 45 * 60 * 1000 });
    assert.equal(notes.overCap, null);
    assert.match(notes.general, /pode ser menor/);
  });

  it("ausência > 2h apresenta a observação adicional do limite", () => {
    const long = offlineCatchUpNotes({
      elapsedSinceLastMs: OFFLINE_CATCH_UP_CAP_MS + 1,
    });
    assert.equal(long.overCap, OFFLINE_CATCH_UP_OVER_CAP);
    assert.equal(shouldShowOfflineCapNote(6 * 60 * 60 * 1000), true);
  });

  it("limite exato de 2h não dispara a nota adicional (só acima)", () => {
    assert.equal(shouldShowOfflineCapNote(OFFLINE_CATCH_UP_CAP_MS), false);
  });
});
