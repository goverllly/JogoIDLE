/**
 * Schema + persistência in-memory do layout da HUD (`catalog.overrides.__hud`).
 */
import {
  HUD_COMPONENT_IDS,
  getHudComponent,
  isHudComponentId,
  type HudEditableProp,
} from "./hud-registry";

export const HUD_CONFIG_KEY = "__hud";
export const HUD_LAYOUT_SCHEMA_VERSION = 1;
export const HUD_HISTORY_LIMIT = 20;

export type HudBreakpointId = "desktop" | "tablet" | "mobile";

export type HudStyleProps = Partial<{
  width: string;
  height: string;
  minWidth: string;
  maxWidth: string;
  minHeight: string;
  maxHeight: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  gap: string;
  fontSize: string;
  fontWeight: string;
  color: string;
  opacity: string;
  borderRadius: string;
  gridTemplateColumns: string;
  aspectRatio: string;
  visible: boolean;
  order: string;
  position: string;
  left: string;
  top: string;
  right: string;
  bottom: string;
  zIndex: string;
  flexGrow: string;
  alignSelf: string;
}>;

export type HudComponentLayout = {
  base: HudStyleProps;
  overrides?: Partial<Record<"tablet" | "mobile", HudStyleProps>>;
};

export type HudIntroTokens = {
  enabled?: boolean;
  fadeMs?: number;
  titleMs?: number;
  hudMs?: number;
  offsetY?: number;
  easing?: string;
  showChapterName?: boolean;
  showRegionName?: boolean;
  allowSkip?: boolean;
};

export type HudThemeTokens = {
  /** Intensidade do fundo tintado pela raridade nos slots (0–60). Default 32. */
  slotRarityFillMix?: number;
  /** Intro cinematográfica ao abrir play.html. */
  intro?: HudIntroTokens;
};

export const DEFAULT_HUD_INTRO_TOKENS: Required<HudIntroTokens> = {
  enabled: true,
  fadeMs: 500,
  titleMs: 900,
  hudMs: 700,
  offsetY: -80,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  showChapterName: true,
  showRegionName: true,
  allowSkip: true,
};

export type HudLayoutDocument = {
  schemaVersion: number;
  layoutId: string;
  name: string;
  revision: number;
  status: "draft" | "published" | "archived";
  updatedAt: string;
  updatedBy: string;
  basedOnRevision?: number;
  breakpoints: { desktop: number; tablet: number; mobile: number };
  components: Record<string, HudComponentLayout>;
  tokens?: HudThemeTokens;
};

export const DEFAULT_SLOT_RARITY_FILL_MIX = 32;

function sanitizeIntroTokens(raw: unknown): HudIntroTokens | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const out: HudIntroTokens = {};
  if (typeof src.enabled === "boolean") out.enabled = src.enabled;
  const fadeMs = Number(src.fadeMs);
  if (Number.isFinite(fadeMs)) out.fadeMs = Math.max(100, Math.min(3000, Math.round(fadeMs)));
  const titleMs = Number(src.titleMs);
  if (Number.isFinite(titleMs)) out.titleMs = Math.max(0, Math.min(5000, Math.round(titleMs)));
  const hudMs = Number(src.hudMs);
  if (Number.isFinite(hudMs)) out.hudMs = Math.max(100, Math.min(3000, Math.round(hudMs)));
  const offsetY = Number(src.offsetY);
  if (Number.isFinite(offsetY)) out.offsetY = Math.max(-200, Math.min(0, Math.round(offsetY)));
  if (typeof src.easing === "string" && src.easing.trim()) {
    out.easing = src.easing.trim().slice(0, 80);
  }
  if (typeof src.showChapterName === "boolean") out.showChapterName = src.showChapterName;
  if (typeof src.showRegionName === "boolean") out.showRegionName = src.showRegionName;
  if (typeof src.allowSkip === "boolean") out.allowSkip = src.allowSkip;
  return Object.keys(out).length ? out : undefined;
}

export function sanitizeHudThemeTokens(raw: unknown): HudThemeTokens | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const out: HudThemeTokens = {};
  const mix = Number(src.slotRarityFillMix);
  if (Number.isFinite(mix)) {
    out.slotRarityFillMix = Math.max(0, Math.min(60, Math.round(mix)));
  }
  const intro = sanitizeIntroTokens(src.intro);
  if (intro) out.intro = intro;
  return Object.keys(out).length ? out : undefined;
}

export type HudCatalogPayload = {
  draft: HudLayoutDocument | null;
  published: HudLayoutDocument | null;
  history: HudLayoutDocument[];
};

const CSS_LENGTH_RE = /^-?\d+(\.\d+)?(px|%|rem|em|vh|vw|vmin|vmax)$/;
const CSS_COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.\s%,./]+\s*\)|var\(--[a-zA-Z0-9_-]+\))$/;
const OPACITY_RE = /^(0(\.\d+)?|1(\.0+)?)$/;
const FONT_WEIGHT_RE = /^(normal|bold|[1-9]00)$/;
const ASPECT_RE = /^(\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?|\d+(\.\d+)?)$/;
const GRID_COLS_RE = /^(repeat\(\s*\d+\s*,\s*minmax\(0,\s*1fr\)\s*\)|[\d.]+\w+(\s+[\d.]+\w+)*)$/;
const ORDER_RE = /^-?\d+$/;
const ZINDEX_RE = /^(0|[1-9]\d?|100)$/;
const FLEX_GROW_RE = /^(0|1|2|3|4|5|[01](\.\d+)?)$/;
const ALIGN_SELF_RE = /^(auto|flex-start|flex-end|center|stretch|baseline)$/;
const POSITION_RE = /^(relative|absolute)$/;

const PROP_KEYS: readonly HudEditableProp[] = [
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "gap",
  "fontSize",
  "fontWeight",
  "color",
  "opacity",
  "borderRadius",
  "gridTemplateColumns",
  "aspectRatio",
  "visible",
  "order",
  "position",
  "left",
  "top",
  "right",
  "bottom",
  "zIndex",
  "flexGrow",
  "alignSelf",
];

const LENGTH_PROPS = new Set<HudEditableProp>([
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "gap",
  "fontSize",
  "borderRadius",
  "left",
  "top",
  "right",
  "bottom",
]);

const IMPORTANT_PROPS = new Set<string>([
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "gap",
  "order",
  "position",
  "left",
  "top",
  "right",
  "bottom",
  "zIndex",
  "flexGrow",
  "alignSelf",
  "gridTemplateColumns",
  "aspectRatio",
]);

/** @type {HudCatalogPayload} */
let hudState: HudCatalogPayload = {
  draft: null,
  published: null,
  history: [],
};

export function createEmptyHudDocument(
  email = "system",
  status: HudLayoutDocument["status"] = "draft",
): HudLayoutDocument {
  return {
    schemaVersion: HUD_LAYOUT_SCHEMA_VERSION,
    layoutId: "combat-default",
    name: "HUD Principal",
    revision: 0,
    status,
    updatedAt: new Date().toISOString(),
    updatedBy: String(email || "system").slice(0, 191),
    breakpoints: { desktop: 1024, tablet: 768, mobile: 0 },
    components: {},
    tokens: {
      slotRarityFillMix: DEFAULT_SLOT_RARITY_FILL_MIX,
      intro: { ...DEFAULT_HUD_INTRO_TOKENS },
    },
  };
}

function clampLengthValue(raw: string): string | null {
  const s = String(raw).trim();
  if (!CSS_LENGTH_RE.test(s)) return null;
  const num = Number.parseFloat(s);
  if (!Number.isFinite(num)) return null;
  if (Math.abs(num) > 4000) return null;
  return s;
}

export function sanitizeHudStyleProps(
  raw: unknown,
  allowlist?: readonly HudEditableProp[],
): HudStyleProps {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const src = raw as Record<string, unknown>;
  const allowed = new Set(allowlist || PROP_KEYS);
  const out: HudStyleProps = {};

  for (const key of PROP_KEYS) {
    if (!allowed.has(key)) continue;
    if (!(key in src)) continue;
    const val = src[key];
    if (key === "visible") {
      if (typeof val === "boolean") out.visible = val;
      continue;
    }
    if (typeof val !== "string" && typeof val !== "number") continue;
    const trimmed = String(val).trim();
    if (!trimmed || trimmed.length > 64) continue;
    if (/[;{}]|expression|javascript:|url\s*\(/i.test(trimmed)) continue;

    if (LENGTH_PROPS.has(key)) {
      const ok = clampLengthValue(trimmed);
      if (ok) (out as Record<string, string>)[key] = ok;
      continue;
    }
    if (key === "opacity") {
      if (OPACITY_RE.test(trimmed)) out.opacity = trimmed;
      continue;
    }
    if (key === "fontWeight") {
      if (FONT_WEIGHT_RE.test(trimmed)) out.fontWeight = trimmed;
      continue;
    }
    if (key === "color") {
      if (CSS_COLOR_RE.test(trimmed)) out.color = trimmed;
      continue;
    }
    if (key === "aspectRatio") {
      if (ASPECT_RE.test(trimmed)) out.aspectRatio = trimmed;
      continue;
    }
    if (key === "gridTemplateColumns") {
      if (GRID_COLS_RE.test(trimmed)) out.gridTemplateColumns = trimmed;
      continue;
    }
    if (key === "order") {
      if (ORDER_RE.test(trimmed)) {
        const n = Number(trimmed);
        if (n >= -20 && n <= 40) out.order = String(n);
      }
      continue;
    }
    if (key === "position") {
      if (POSITION_RE.test(trimmed)) out.position = trimmed;
      continue;
    }
    if (key === "zIndex") {
      if (ZINDEX_RE.test(trimmed)) out.zIndex = trimmed;
      continue;
    }
    if (key === "flexGrow") {
      if (FLEX_GROW_RE.test(trimmed)) out.flexGrow = trimmed;
      continue;
    }
    if (key === "alignSelf") {
      if (ALIGN_SELF_RE.test(trimmed)) out.alignSelf = trimmed;
      continue;
    }
  }
  return out;
}

export function sanitizeHudLayoutDocument(
  raw: unknown,
  email = "system",
): HudLayoutDocument | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const src = raw as Record<string, unknown>;
  const base = createEmptyHudDocument(email, "draft");
  const schemaVersion = Number(src.schemaVersion);
  if (Number.isFinite(schemaVersion) && schemaVersion >= 1) {
    base.schemaVersion = Math.min(Math.floor(schemaVersion), HUD_LAYOUT_SCHEMA_VERSION);
  }
  if (typeof src.layoutId === "string" && src.layoutId.trim()) {
    base.layoutId = src.layoutId.trim().slice(0, 64);
  }
  if (typeof src.name === "string" && src.name.trim()) {
    base.name = src.name.trim().slice(0, 80);
  }
  const revision = Number(src.revision);
  if (Number.isFinite(revision) && revision >= 0) {
    base.revision = Math.floor(revision);
  }
  if (src.status === "draft" || src.status === "published" || src.status === "archived") {
    base.status = src.status;
  }
  if (typeof src.updatedAt === "string") base.updatedAt = src.updatedAt.slice(0, 40);
  if (typeof src.updatedBy === "string") base.updatedBy = src.updatedBy.slice(0, 191);
  const basedOn = Number(src.basedOnRevision);
  if (Number.isFinite(basedOn) && basedOn >= 0) base.basedOnRevision = Math.floor(basedOn);

  if (src.breakpoints && typeof src.breakpoints === "object" && !Array.isArray(src.breakpoints)) {
    const bp = src.breakpoints as Record<string, unknown>;
    const desktop = Number(bp.desktop);
    const tablet = Number(bp.tablet);
    const mobile = Number(bp.mobile);
    if (Number.isFinite(desktop)) base.breakpoints.desktop = Math.max(0, Math.floor(desktop));
    if (Number.isFinite(tablet)) base.breakpoints.tablet = Math.max(0, Math.floor(tablet));
    if (Number.isFinite(mobile)) base.breakpoints.mobile = Math.max(0, Math.floor(mobile));
  }

  const tokens = sanitizeHudThemeTokens(src.tokens);
  if (tokens) base.tokens = { ...base.tokens, ...tokens };

  const components: Record<string, HudComponentLayout> = {};
  const rawComponents =
    src.components && typeof src.components === "object" && !Array.isArray(src.components)
      ? (src.components as Record<string, unknown>)
      : {};

  for (const id of HUD_COMPONENT_IDS) {
    const entry = rawComponents[id];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const def = getHudComponent(id);
    const e = entry as Record<string, unknown>;
    const layout: HudComponentLayout = {
      base: sanitizeHudStyleProps(e.base, def?.editableProps),
    };
    if (e.overrides && typeof e.overrides === "object" && !Array.isArray(e.overrides)) {
      const ov = e.overrides as Record<string, unknown>;
      const overrides: HudComponentLayout["overrides"] = {};
      if (ov.tablet) {
        const t = sanitizeHudStyleProps(ov.tablet, def?.editableProps);
        if (Object.keys(t).length) overrides.tablet = t;
      }
      if (ov.mobile) {
        const m = sanitizeHudStyleProps(ov.mobile, def?.editableProps);
        if (Object.keys(m).length) overrides.mobile = m;
      }
      if (Object.keys(overrides).length) layout.overrides = overrides;
    }
    if (Object.keys(layout.base).length || layout.overrides) {
      components[id] = layout;
    }
  }
  base.components = components;
  return base;
}

export function resolveComponentProps(
  layout: HudLayoutDocument | null | undefined,
  componentId: string,
  breakpoint: HudBreakpointId = "desktop",
): HudStyleProps {
  if (!layout || !isHudComponentId(componentId)) return {};
  const entry = layout.components[componentId];
  if (!entry) return {};
  const merged: HudStyleProps = { ...entry.base };
  if (breakpoint === "tablet" || breakpoint === "mobile") {
    Object.assign(merged, entry.overrides?.tablet || {});
  }
  if (breakpoint === "mobile") {
    Object.assign(merged, entry.overrides?.mobile || {});
  }
  return merged;
}

/** CSS property map (camelCase → applied as style[key]). */
export function stylePropsToInline(props: HudStyleProps): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "visible") {
      out.visibility = value === false ? "hidden" : "visible";
      if (value === false) out.pointerEvents = "none";
      continue;
    }
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

export function usesImportantStyle(prop: string): boolean {
  return IMPORTANT_PROPS.has(prop);
}

export function getHudCatalogPayload(): HudCatalogPayload {
  return {
    draft: hudState.draft ? structuredClone(hudState.draft) : null,
    published: hudState.published ? structuredClone(hudState.published) : null,
    history: hudState.history.map((h) => structuredClone(h)),
  };
}

export function applyHudCatalogPayload(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    hudState = { draft: null, published: null, history: [] };
    return;
  }
  const src = raw as Record<string, unknown>;
  const draft = src.draft != null ? sanitizeHudLayoutDocument(src.draft) : null;
  const published = src.published != null ? sanitizeHudLayoutDocument(src.published) : null;
  const historyRaw = Array.isArray(src.history) ? src.history : [];
  const history: HudLayoutDocument[] = [];
  for (const item of historyRaw.slice(0, HUD_HISTORY_LIMIT)) {
    const doc = sanitizeHudLayoutDocument(item);
    if (doc) history.push(doc);
  }
  hudState = { draft, published, history };
}

export function getHudDraft(): HudLayoutDocument | null {
  return hudState.draft ? structuredClone(hudState.draft) : null;
}

export function getHudPublished(): HudLayoutDocument | null {
  return hudState.published ? structuredClone(hudState.published) : null;
}

export function getHudHistory(): HudLayoutDocument[] {
  return hudState.history.map((h) => structuredClone(h));
}

export function setHudDraft(doc: HudLayoutDocument | null) {
  hudState.draft = doc ? structuredClone(doc) : null;
}

export function setHudPublished(doc: HudLayoutDocument | null) {
  hudState.published = doc ? structuredClone(doc) : null;
}

export function pushHudHistory(doc: HudLayoutDocument) {
  const archived = structuredClone(doc);
  archived.status = "archived";
  hudState.history = [archived, ...hudState.history].slice(0, HUD_HISTORY_LIMIT);
}

export function findHudHistoryRevision(revision: number): HudLayoutDocument | null {
  const hit = hudState.history.find((h) => h.revision === revision);
  return hit ? structuredClone(hit) : null;
}
