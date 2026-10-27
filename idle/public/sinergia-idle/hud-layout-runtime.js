/**
 * Aplica o layout HUD publicado (allowlist) nos nós [data-hud-id].
 * Falha silenciosa → HUD clássica intacta. Sem React.
 */
(function () {
  "use strict";

  var LENGTH_PROPS = {
    width: 1,
    height: 1,
    minWidth: 1,
    maxWidth: 1,
    minHeight: 1,
    maxHeight: 1,
    marginTop: 1,
    marginRight: 1,
    marginBottom: 1,
    marginLeft: 1,
    paddingTop: 1,
    paddingRight: 1,
    paddingBottom: 1,
    paddingLeft: 1,
    gap: 1,
    fontSize: 1,
    borderRadius: 1,
    left: 1,
    top: 1,
    right: 1,
    bottom: 1,
  };

  var IMPORTANT_PROPS = {
    width: 1,
    height: 1,
    minWidth: 1,
    maxWidth: 1,
    minHeight: 1,
    maxHeight: 1,
    marginTop: 1,
    marginRight: 1,
    marginBottom: 1,
    marginLeft: 1,
    paddingTop: 1,
    paddingRight: 1,
    paddingBottom: 1,
    paddingLeft: 1,
    gap: 1,
    order: 1,
    position: 1,
    left: 1,
    top: 1,
    right: 1,
    bottom: 1,
    zIndex: 1,
    flexGrow: 1,
    alignSelf: 1,
    gridTemplateColumns: 1,
    aspectRatio: 1,
  };

  var CSS_LENGTH_RE = /^-?\d+(\.\d+)?(px|%|rem|em|vh|vw|vmin|vmax)$/;
  var CSS_COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.\s%,./]+\s*\)|var\(--[a-zA-Z0-9_-]+\))$/;
  var OPACITY_RE = /^(0(\.\d+)?|1(\.0+)?)$/;
  var FONT_WEIGHT_RE = /^(normal|bold|[1-9]00)$/;
  var ASPECT_RE = /^(\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?|\d+(\.\d+)?)$/;
  var GRID_COLS_RE = /^(repeat\(\s*\d+\s*,\s*minmax\(0,\s*1fr\)\s*\)|[\d.]+\w+(\s+[\d.]+\w+)*)$/;
  var ORDER_RE = /^-?\d+$/;
  var ZINDEX_RE = /^(0|[1-9]\d?|100)$/;
  var FLEX_GROW_RE = /^(0|1|2|3|4|5|[01](\.\d+)?)$/;
  var ALIGN_SELF_RE = /^(auto|flex-start|flex-end|center|stretch|baseline)$/;
  var POSITION_RE = /^(relative|absolute)$/;

  var CAMEL_TO_KEBAB = {
    minWidth: "min-width",
    maxWidth: "max-width",
    minHeight: "min-height",
    maxHeight: "max-height",
    marginTop: "margin-top",
    marginRight: "margin-right",
    marginBottom: "margin-bottom",
    marginLeft: "margin-left",
    paddingTop: "padding-top",
    paddingRight: "padding-right",
    paddingBottom: "padding-bottom",
    paddingLeft: "padding-left",
    fontSize: "font-size",
    fontWeight: "font-weight",
    borderRadius: "border-radius",
    gridTemplateColumns: "grid-template-columns",
    aspectRatio: "aspect-ratio",
    zIndex: "z-index",
    flexGrow: "flex-grow",
    alignSelf: "align-self",
    pointerEvents: "pointer-events",
  };

  function toKebab(key) {
    return CAMEL_TO_KEBAB[key] || key.replace(/[A-Z]/g, function (m) {
      return "-" + m.toLowerCase();
    });
  }

  function sanitizeProp(key, value) {
    if (key === "visible") return typeof value === "boolean" ? value : null;
    if (typeof value === "number" && Number.isFinite(value)) value = String(value);
    if (typeof value !== "string") return null;
    var trimmed = value.trim();
    if (!trimmed || trimmed.length > 64) return null;
    if (/[;{}]|expression|javascript:|url\s*\(/i.test(trimmed)) return null;
    if (LENGTH_PROPS[key]) return CSS_LENGTH_RE.test(trimmed) ? trimmed : null;
    if (key === "opacity") return OPACITY_RE.test(trimmed) ? trimmed : null;
    if (key === "fontWeight") return FONT_WEIGHT_RE.test(trimmed) ? trimmed : null;
    if (key === "color") return CSS_COLOR_RE.test(trimmed) ? trimmed : null;
    if (key === "aspectRatio") return ASPECT_RE.test(trimmed) ? trimmed : null;
    if (key === "gridTemplateColumns") return GRID_COLS_RE.test(trimmed) ? trimmed : null;
    if (key === "order") {
      if (!ORDER_RE.test(trimmed)) return null;
      var n = Number(trimmed);
      return n >= -20 && n <= 40 ? trimmed : null;
    }
    if (key === "position") return POSITION_RE.test(trimmed) ? trimmed : null;
    if (key === "zIndex") return ZINDEX_RE.test(trimmed) ? trimmed : null;
    if (key === "flexGrow") return FLEX_GROW_RE.test(trimmed) ? trimmed : null;
    if (key === "alignSelf") return ALIGN_SELF_RE.test(trimmed) ? trimmed : null;
    return null;
  }

  function resolveProps(entry, breakpoint) {
    if (!entry || typeof entry !== "object") return {};
    var merged = Object.assign({}, entry.base || {});
    var ov = entry.overrides || {};
    if (breakpoint === "tablet" || breakpoint === "mobile") {
      Object.assign(merged, ov.tablet || {});
    }
    if (breakpoint === "mobile") {
      Object.assign(merged, ov.mobile || {});
    }
    return merged;
  }

  function currentBreakpoint(layout) {
    var bp = (layout && layout.breakpoints) || { desktop: 1024, tablet: 768, mobile: 0 };
    var w = window.innerWidth || 1920;
    if (w < (bp.tablet || 768)) return "mobile";
    if (w < (bp.desktop || 1024)) return "tablet";
    return "desktop";
  }

  function stageRoot() {
    return document.querySelector(".play-stage") || document.documentElement;
  }

  function syncCssVars(id, props) {
    var root = stageRoot();
    if (id === "stage-left" || id === "stage-right") {
      if (props.width) root.style.setProperty("--side-panel-w", props.width);
    }
    if (id === "unit-hero" || id === "unit-skills" || id === "unit-target") {
      if (props.height) {
        var combat = document.querySelector(".stage__combat, .duel--trio");
        if (combat) combat.style.setProperty("--hud-h", props.height);
      }
    }
  }

  function clearHudInline(el) {
    if (!el || !el.dataset) return;
    var keys = (el.dataset.hudApplied || "").split(",").filter(Boolean);
    keys.forEach(function (k) {
      el.style.removeProperty(toKebab(k));
      el.style[k] = "";
    });
    el.dataset.hudApplied = "";
  }

  function setStyleProp(el, key, val) {
    var kebab = toKebab(key);
    if (IMPORTANT_PROPS[key]) {
      el.style.setProperty(kebab, val, "important");
    } else {
      el.style[key] = val;
    }
  }

  function applyPropsToEl(el, props) {
    clearHudInline(el);
    var applied = [];
    var id = el.getAttribute("data-hud-id") || "";
    Object.keys(props || {}).forEach(function (key) {
      var val = sanitizeProp(key, props[key]);
      if (val == null) return;
      if (key === "visible") {
        setStyleProp(el, "visibility", val === false ? "hidden" : "visible");
        setStyleProp(el, "pointerEvents", val === false ? "none" : "auto");
        applied.push("visibility", "pointerEvents");
        return;
      }
      setStyleProp(el, key, val);
      applied.push(key);
    });
    el.dataset.hudApplied = applied.join(",");
    syncCssVars(id, props || {});
  }

  function applyThemeTokens(layout) {
    var root = stageRoot();
    var mix = 32;
    if (layout && layout.tokens && layout.tokens.slotRarityFillMix != null) {
      var n = Number(layout.tokens.slotRarityFillMix);
      if (Number.isFinite(n)) mix = Math.max(0, Math.min(60, Math.round(n)));
    }
    root.style.setProperty("--slot-rarity-fill", mix + "%");
  }

  function applyLayout(layout, breakpoint) {
    if (!layout || !layout.components) return;
    var bp = breakpoint || currentBreakpoint(layout);
    applyThemeTokens(layout);
    document.querySelectorAll("[data-hud-id]").forEach(function (el) {
      var id = el.getAttribute("data-hud-id");
      if (!id) return;
      var props = resolveProps(layout.components[id], bp);
      applyPropsToEl(el, props);
    });
    try {
      window.dispatchEvent(new Event("resize"));
    } catch (e) {}
  }

  function patchComponent(layout, id, props, breakpoint) {
    if (!layout) layout = { components: {}, breakpoints: { desktop: 1024, tablet: 768, mobile: 0 } };
    if (!layout.components) layout.components = {};
    var entry = layout.components[id] || { base: {} };
    var bp = breakpoint || "desktop";
    var cleaned = {};
    Object.keys(props || {}).forEach(function (k) {
      if (props[k] === null || props[k] === undefined || props[k] === "") {
        if (bp === "desktop") {
          delete entry.base[k];
        } else if (entry.overrides && entry.overrides[bp]) {
          delete entry.overrides[bp][k];
        }
      } else {
        cleaned[k] = props[k];
      }
    });
    if (bp === "desktop") {
      entry.base = Object.assign({}, entry.base || {}, cleaned);
    } else {
      entry.overrides = entry.overrides || {};
      entry.overrides[bp] = Object.assign({}, entry.overrides[bp] || {}, cleaned);
    }
    layout.components[id] = entry;
    var el = document.querySelector('[data-hud-id="' + CSS.escape(id) + '"]');
    if (el) applyPropsToEl(el, resolveProps(entry, bp));
    try {
      window.dispatchEvent(new Event("resize"));
    } catch (e) {}
    return layout;
  }

  var state = {
    layout: null,
    breakpoint: "desktop",
  };

  async function loadPublished() {
    if (new URLSearchParams(location.search).get("hudBuilder") === "1") return;
    try {
      var res = await fetch("/api/sinergia-idle/hud-layout", { credentials: "same-origin" });
      if (!res.ok) return;
      var data = await res.json();
      if (!data || !data.success || !data.layout) return;
      state.layout = data.layout;
      state.breakpoint = currentBreakpoint(data.layout);
      applyLayout(state.layout, state.breakpoint);
    } catch (e) {
      /* fallback: HUD clássica */
    }
  }

  window.SinergiaHudLayout = {
    getLayout: function () {
      return state.layout;
    },
    setLayout: function (layout, breakpoint) {
      state.layout = layout || null;
      state.breakpoint = breakpoint || currentBreakpoint(layout);
      if (layout) applyLayout(layout, state.breakpoint);
      else {
        document.querySelectorAll("[data-hud-id]").forEach(clearHudInline);
        applyThemeTokens(null);
      }
    },
    patch: function (id, props, breakpoint) {
      state.layout = patchComponent(
        state.layout || { components: {}, breakpoints: { desktop: 1024, tablet: 768, mobile: 0 } },
        id,
        props,
        breakpoint || state.breakpoint,
      );
      return state.layout;
    },
    setTokens: function (tokens) {
      if (!state.layout) {
        state.layout = { components: {}, breakpoints: { desktop: 1024, tablet: 768, mobile: 0 }, tokens: {} };
      }
      state.layout.tokens = Object.assign({}, state.layout.tokens || {}, tokens || {});
      applyThemeTokens(state.layout);
      return state.layout;
    },
    setBreakpoint: function (bp) {
      state.breakpoint = bp || "desktop";
      if (state.layout) applyLayout(state.layout, state.breakpoint);
    },
    applyLayout: applyLayout,
    applyThemeTokens: applyThemeTokens,
    resolveProps: resolveProps,
    applyPropsToEl: applyPropsToEl,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadPublished);
  } else {
    loadPublished();
  }
})();
