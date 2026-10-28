/**
 * Pure helpers for HUD Builder editor state (dirty, undo, breakpoints, bridge trust).
 * Shared by admin-ui and Node tests — no DOM.
 */
import type { HudLayoutDocument, HudStyleProps, HudThemeTokens } from "./hud-layout";

export type HudBp = "desktop" | "tablet" | "mobile";

export type EditableHudSlice = {
  name: string;
  breakpoints: HudLayoutDocument["breakpoints"];
  components: HudLayoutDocument["components"];
  tokens?: HudThemeTokens;
};

const FREE_CLEAR_KEYS = ["position", "left", "top", "right", "bottom", "zIndex"] as const;

export function editableSlice(doc: HudLayoutDocument | null | undefined): EditableHudSlice {
  const d = doc || ({} as HudLayoutDocument);
  return {
    name: typeof d.name === "string" ? d.name : "",
    breakpoints: d.breakpoints
      ? { ...d.breakpoints }
      : { desktop: 1024, tablet: 768, mobile: 0 },
    components: structuredClone(d.components || {}),
    tokens: d.tokens ? structuredClone(d.tokens) : undefined,
  };
}

export function sliceFingerprint(slice: EditableHudSlice): string {
  return JSON.stringify({
    name: slice.name,
    breakpoints: slice.breakpoints,
    components: slice.components || {},
    tokens: slice.tokens || {},
  });
}

export function isEditableDirty(
  doc: HudLayoutDocument | null | undefined,
  baselineFingerprint: string,
): boolean {
  return sliceFingerprint(editableSlice(doc)) !== baselineFingerprint;
}

export function applyEditableSlice(
  doc: HudLayoutDocument,
  slice: EditableHudSlice,
): HudLayoutDocument {
  return {
    ...doc,
    name: slice.name,
    breakpoints: structuredClone(slice.breakpoints),
    components: structuredClone(slice.components),
    tokens: slice.tokens ? structuredClone(slice.tokens) : doc.tokens,
  };
}

/** Reject invalid breakpoint — never silently fall back to desktop. */
export function parseBreakpoint(raw: unknown): HudBp | null {
  if (raw === "desktop" || raw === "tablet" || raw === "mobile") return raw;
  return null;
}

export function mergeComponentProps(
  draft: HudLayoutDocument,
  id: string,
  props: HudStyleProps,
  breakpoint: HudBp,
): HudLayoutDocument {
  const next = structuredClone(draft);
  const entry = next.components[id] || { base: {} };
  if (breakpoint === "desktop") {
    entry.base = { ...entry.base, ...props };
  } else {
    entry.overrides = entry.overrides || {};
    entry.overrides[breakpoint] = { ...(entry.overrides[breakpoint] || {}), ...props };
  }
  next.components[id] = entry;
  return next;
}

export function applyOrders(
  draft: HudLayoutDocument,
  orders: Record<string, number>,
  breakpoint: HudBp,
): HudLayoutDocument {
  let next = draft;
  for (const [id, order] of Object.entries(orders)) {
    next = mergeComponentProps(next, id, { order: String(order) }, breakpoint);
  }
  return next;
}

export function resolvedProps(
  draft: HudLayoutDocument,
  id: string,
  breakpoint: HudBp,
): HudStyleProps {
  const entry = draft.components[id];
  if (!entry) return {};
  const merged = { ...entry.base };
  if (breakpoint === "tablet" || breakpoint === "mobile") {
    Object.assign(merged, entry.overrides?.tablet || {});
  }
  if (breakpoint === "mobile") {
    Object.assign(merged, entry.overrides?.mobile || {});
  }
  return merged;
}

export function clearFreeProps(
  draft: HudLayoutDocument,
  id: string,
  breakpoint: HudBp,
): HudLayoutDocument {
  const next = structuredClone(draft);
  const entry = next.components[id] || { base: {} };
  if (breakpoint === "desktop") {
    for (const key of FREE_CLEAR_KEYS) {
      delete (entry.base as Record<string, unknown>)[key];
    }
  } else {
    entry.overrides = entry.overrides || {};
    const ov = { ...(entry.overrides[breakpoint] || {}) };
    for (const key of FREE_CLEAR_KEYS) {
      delete (ov as Record<string, unknown>)[key];
    }
    entry.overrides[breakpoint] = ov;
  }
  next.components[id] = entry;
  return next;
}

/** Convert pointer delta in screen px to layout px given CSS zoom/scale on the canvas. */
export function screenDeltaToLayout(
  dx: number,
  dy: number,
  scale: number,
): { dx: number; dy: number } {
  const s = Number.isFinite(scale) && scale > 0.01 ? scale : 1;
  return { dx: dx / s, dy: dy / s };
}

/**
 * Deterministic shared CSS vars for a layout (mirrors hud-layout-runtime recompute).
 * Empty/missing contributors → null (caller should removeProperty).
 */
export function computeManagedCssVars(
  layout: HudLayoutDocument | null | undefined,
  breakpoint: HudBp = "desktop",
): { sidePanelW: string | null; hudH: string | null } {
  if (!layout?.components) return { sidePanelW: null, hudH: null };
  let maxSide: string | null = null;
  let maxSidePx = -1;
  for (const id of ["stage-left", "stage-right"] as const) {
    const props = resolvedProps(layout, id, breakpoint);
    if (!props.width) continue;
    const n = Number.parseFloat(props.width);
    if (!Number.isFinite(n)) continue;
    if (n > maxSidePx) {
      maxSidePx = n;
      maxSide = props.width;
    }
  }
  let hudH: string | null = null;
  for (const id of ["unit-hero", "unit-skills", "unit-target"] as const) {
    const props = resolvedProps(layout, id, breakpoint);
    if (props.height) hudH = props.height;
  }
  return { sidePanelW: maxSide, hudH };
}

const INBOUND_TYPES = new Set<string>([
  "jogo-idle:hud-builder-ready",
  "jogo-idle:hud-builder-selection",
  "jogo-idle:hud-builder-transform",
  "jogo-idle:hud-builder-transform-end",
  "jogo-idle:hud-builder-transform-cancel",
]);

export function isTrustedAdminBridgeMessage(opts: {
  origin: string;
  expectedOrigin: string;
  source: MessageEventSource | null;
  expectedSource: Window | null | undefined;
  data: unknown;
  expectedSessionId?: string | null;
  lastSeq?: number;
}): { ok: true; data: Record<string, unknown>; seq: number } | { ok: false; reason: string } {
  if (opts.origin !== opts.expectedOrigin) return { ok: false, reason: "origin" };
  if (!opts.expectedSource || opts.source !== opts.expectedSource) {
    return { ok: false, reason: "source" };
  }
  const data = opts.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, reason: "payload" };
  }
  const rec = data as Record<string, unknown>;
  if (rec.v !== 1) return { ok: false, reason: "version" };
  if (typeof rec.type !== "string" || !INBOUND_TYPES.has(rec.type)) {
    return { ok: false, reason: "type" };
  }
  if (opts.expectedSessionId) {
    if (rec.sessionId !== opts.expectedSessionId) return { ok: false, reason: "session" };
  }
  const seq = typeof rec.seq === "number" && Number.isFinite(rec.seq) ? rec.seq : 0;
  if (opts.lastSeq != null && seq > 0 && seq <= opts.lastSeq) {
    return { ok: false, reason: "stale" };
  }
  return { ok: true, data: rec, seq };
}
