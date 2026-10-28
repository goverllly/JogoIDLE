import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyEditableSlice,
  computeManagedCssVars,
  editableSlice,
  isEditableDirty,
  isTrustedAdminBridgeMessage,
  mergeComponentProps,
  parseBreakpoint,
  screenDeltaToLayout,
  sliceFingerprint,
} from "../../lib/jogo-idle/hud-builder-state.ts";
import { createEmptyHudDocument } from "../../lib/jogo-idle/hud-layout.ts";

describe("hud-builder-state — dirty / undo slice", () => {
  it("alteração só em tokens gera dirty", () => {
    const doc = createEmptyHudDocument();
    const base = sliceFingerprint(editableSlice(doc));
    assert.equal(isEditableDirty(doc, base), false);
    doc.tokens = { ...(doc.tokens || {}), intro: { ...(doc.tokens?.intro || {}), fadeMs: 1200 } };
    assert.equal(isEditableDirty(doc, base), true);
  });

  it("fingerprint após 'save' limpa dirty", () => {
    const doc = createEmptyHudDocument();
    doc.tokens = { ...(doc.tokens || {}), slotRarityFillMix: 40 };
    const savedFp = sliceFingerprint(editableSlice(doc));
    assert.equal(isEditableDirty(doc, savedFp), false);
  });

  it("undo/redo com tokens restaura slice", () => {
    const doc = createEmptyHudDocument();
    const before = editableSlice(doc);
    doc.tokens = { ...(doc.tokens || {}), slotRarityFillMix: 55 };
    const after = applyEditableSlice(doc, before);
    assert.equal(after.tokens?.slotRarityFillMix, DEFAULT_MIX());
  });

  it("reload fingerprint preserva tokens salvos", () => {
    const doc = createEmptyHudDocument();
    doc.tokens = { ...(doc.tokens || {}), intro: { fadeMs: 777 } };
    const fp = sliceFingerprint(editableSlice(doc));
    const reloaded = createEmptyHudDocument();
    reloaded.tokens = { ...(reloaded.tokens || {}), intro: { fadeMs: 777 } };
    assert.equal(sliceFingerprint(editableSlice(reloaded)), fp);
  });
});

function DEFAULT_MIX() {
  return 32;
}

describe("hud-builder-state — breakpoints", () => {
  it("resize mobile não modifica desktop base", () => {
    let doc = createEmptyHudDocument();
    doc = mergeComponentProps(doc, "stage-left", { width: "300px" }, "desktop");
    doc = mergeComponentProps(doc, "stage-left", { width: "160px" }, "mobile");
    assert.equal(doc.components["stage-left"].base.width, "300px");
    assert.equal(doc.components["stage-left"].overrides?.mobile?.width, "160px");
  });

  it("reorder tablet grava em overrides.tablet", () => {
    let doc = createEmptyHudDocument();
    doc = mergeComponentProps(doc, "card-rail", { order: "2" }, "tablet");
    assert.equal(doc.components["card-rail"].base.order, undefined);
    assert.equal(doc.components["card-rail"].overrides?.tablet?.order, "2");
  });

  it("breakpoint inválido não resolve para desktop", () => {
    assert.equal(parseBreakpoint("desktop"), "desktop");
    assert.equal(parseBreakpoint("tablet"), "tablet");
    assert.equal(parseBreakpoint("mobile"), "mobile");
    assert.equal(parseBreakpoint("Desktop"), null);
    assert.equal(parseBreakpoint(""), null);
    assert.equal(parseBreakpoint(undefined), null);
  });

  it("drag com zoom usa coordenadas corretas", () => {
    const { dx, dy } = screenDeltaToLayout(20, 10, 0.5);
    assert.equal(dx, 40);
    assert.equal(dy, 20);
  });
});

describe("hud-builder-state — bridge trust", () => {
  it("rejeita origem ou source não autorizados", () => {
    const expectedSource = {} as Window;
    const other = {} as Window;
    assert.equal(
      isTrustedAdminBridgeMessage({
        origin: "http://evil",
        expectedOrigin: "http://localhost",
        source: expectedSource,
        expectedSource,
        data: { v: 1, type: "jogo-idle:hud-builder-ready" },
      }).ok,
      false,
    );
    assert.equal(
      isTrustedAdminBridgeMessage({
        origin: "http://localhost",
        expectedOrigin: "http://localhost",
        source: other,
        expectedSource,
        data: { v: 1, type: "jogo-idle:hud-builder-ready" },
      }).ok,
      false,
    );
  });

  it("ignora sessão anterior e seq stale", () => {
    const src = {} as Window;
    const okMsg = isTrustedAdminBridgeMessage({
      origin: "http://localhost",
      expectedOrigin: "http://localhost",
      source: src,
      expectedSource: src,
      data: {
        v: 1,
        type: "jogo-idle:hud-builder-transform",
        sessionId: "a",
        seq: 2,
      },
      expectedSessionId: "a",
      lastSeq: 1,
    });
    assert.equal(okMsg.ok, true);

    const stale = isTrustedAdminBridgeMessage({
      origin: "http://localhost",
      expectedOrigin: "http://localhost",
      source: src,
      expectedSource: src,
      data: {
        v: 1,
        type: "jogo-idle:hud-builder-transform",
        sessionId: "a",
        seq: 2,
      },
      expectedSessionId: "a",
      lastSeq: 2,
    });
    assert.equal(stale.ok, false);

    const oldSession = isTrustedAdminBridgeMessage({
      origin: "http://localhost",
      expectedOrigin: "http://localhost",
      source: src,
      expectedSource: src,
      data: {
        v: 1,
        type: "jogo-idle:hud-builder-transform",
        sessionId: "old",
        seq: 9,
      },
      expectedSessionId: "new",
      lastSeq: 0,
    });
    assert.equal(oldSession.ok, false);
  });
});

describe("hud-builder-state — CSS vars", () => {
  it("layout custom define side-panel-w e hud-h; default limpa", () => {
    let doc = createEmptyHudDocument();
    doc = mergeComponentProps(doc, "stage-left", { width: "280px" }, "desktop");
    doc = mergeComponentProps(doc, "unit-hero", { height: "120px" }, "desktop");
    let vars = computeManagedCssVars(doc, "desktop");
    assert.equal(vars.sidePanelW, "280px");
    assert.equal(vars.hudH, "120px");

    const empty = createEmptyHudDocument();
    vars = computeManagedCssVars(empty, "desktop");
    assert.equal(vars.sidePanelW, null);
    assert.equal(vars.hudH, null);
  });

  it("alternância custom → default → custom → outra revisão", () => {
    let a = createEmptyHudDocument();
    a = mergeComponentProps(a, "stage-left", { width: "300px" }, "desktop");
    assert.equal(computeManagedCssVars(a).sidePanelW, "300px");

    const def = createEmptyHudDocument();
    assert.equal(computeManagedCssVars(def).sidePanelW, null);

    let b = createEmptyHudDocument();
    b = mergeComponentProps(b, "stage-left", { width: "240px" }, "desktop");
    b = mergeComponentProps(b, "stage-right", { width: "260px" }, "desktop");
    assert.equal(computeManagedCssVars(b).sidePanelW, "260px");

    let c = createEmptyHudDocument();
    c = mergeComponentProps(c, "unit-target", { height: "90px" }, "desktop");
    assert.equal(computeManagedCssVars(c).hudH, "90px");
    assert.equal(computeManagedCssVars(c).sidePanelW, null);
  });
});
