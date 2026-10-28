/**
 * Bridge HUD Builder Fase 2 — seleção, 8 alças, drag organizado/livre, snap.
 * Só carrega com ?hudBuilder=1. Sem React.
 */
(function () {
  "use strict";

  var MSG_V = 1;
  var ORIGIN = window.location.origin;
  var DRAG_THRESHOLD = 4;
  var SESSION_ID =
    "hb-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36);
  var seqCounter = 0;
  var currentBreakpoint = "desktop";
  var ALLOWED_PROP_KEYS = {
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
    fontWeight: 1,
    color: 1,
    opacity: 1,
    borderRadius: 1,
    gridTemplateColumns: 1,
    aspectRatio: 1,
    visible: 1,
    order: 1,
    position: 1,
    left: 1,
    top: 1,
    right: 1,
    bottom: 1,
    zIndex: 1,
    flexGrow: 1,
    alignSelf: 1,
  };
  var PARENT_TYPES = {
    "jogo-idle:hud-builder-select": 1,
    "jogo-idle:hud-builder-patch": 1,
    "jogo-idle:hud-builder-set-layout": 1,
    "jogo-idle:hud-builder-mode": 1,
    "jogo-idle:hud-builder-layout-mode": 1,
    "jogo-idle:hud-builder-snap": 1,
    "jogo-idle:hud-builder-viewport": 1,
  };

  function parseBreakpoint(raw) {
    if (raw === "desktop" || raw === "tablet" || raw === "mobile") return raw;
    return null;
  }

  function filterProps(props) {
    var out = {};
    if (!props || typeof props !== "object") return out;
    Object.keys(props).forEach(function (k) {
      if (!ALLOWED_PROP_KEYS[k]) return;
      var v = props[k];
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        out[k] = v;
      }
    });
    return out;
  }

  /** Meta espelhada do registry (minSize / dragModes). */
  var META = {
    "stage-left": { dragModes: ["resize"], minSize: { w: 220, h: 200 } },
    "card-rail": { dragModes: ["reorder", "free", "resize"], minSize: { w: 200, h: 160 } },
    "stage-center": { dragModes: ["resize"], minSize: { w: 320, h: 240 } },
    "zone-plaque": { dragModes: ["reorder", "free", "resize"], minSize: { w: 160, h: 40 } },
    "stage-viewport": { dragModes: ["reorder", "free", "resize"], minSize: { w: 200, h: 160 } },
    "combat-actions": { dragModes: ["reorder", "free", "resize"], minSize: { w: 120, h: 36 } },
    "unit-hero": { dragModes: ["reorder", "free", "resize"], minSize: { w: 140, h: 160 } },
    "unit-skills": { dragModes: ["reorder", "free", "resize"], minSize: { w: 120, h: 160 } },
    "unit-target": { dragModes: ["reorder", "free", "resize"], minSize: { w: 160, h: 160 } },
    "stage-right": { dragModes: ["resize"], minSize: { w: 220, h: 200 } },
    "card-bag": { dragModes: ["reorder", "free", "resize"], minSize: { w: 200, h: 180 } },
    "inv-grid": { dragModes: ["reorder", "free", "resize"], minSize: { w: 120, h: 80 } },
    "card-log": { dragModes: ["reorder", "free", "resize"], minSize: { w: 180, h: 80 } },
  };

  var HANDLE_DEFS = [
    { id: "nw", cursor: "nwse-resize", x: 0, y: 0 },
    { id: "n", cursor: "ns-resize", x: 0.5, y: 0 },
    { id: "ne", cursor: "nesw-resize", x: 1, y: 0 },
    { id: "e", cursor: "ew-resize", x: 1, y: 0.5 },
    { id: "se", cursor: "nwse-resize", x: 1, y: 1 },
    { id: "s", cursor: "ns-resize", x: 0.5, y: 1 },
    { id: "sw", cursor: "nesw-resize", x: 0, y: 1 },
    { id: "w", cursor: "ew-resize", x: 0, y: 0.5 },
  ];

  var selectedId = null;
  var editMode = "edit"; // edit | preview
  var layoutMode = "organized"; // organized | free
  var snapEnabled = true;
  var snapGrid = 8;
  var allowOverflow = false;

  var chrome = null;
  var badge = null;
  var guidesLayer = null;
  var handles = {};

  var gesture = null; // active gesture state
  var rafPending = false;
  var snapshotBefore = null;

  function post(type, payload) {
    try {
      seqCounter += 1;
      window.parent.postMessage(
        Object.assign(
          { type: type, v: MSG_V, sessionId: SESSION_ID, seq: seqCounter },
          payload || {},
        ),
        ORIGIN,
      );
    } catch (e) {}
  }

  function metaFor(id) {
    return META[id] || { dragModes: ["resize"], minSize: { w: 40, h: 40 } };
  }

  function elById(id) {
    if (!id) return null;
    return document.querySelector('[data-hud-id="' + CSS.escape(id) + '"]');
  }

  function stageEl() {
    return document.querySelector(".stage") || document.querySelector("#game-panel") || document.body;
  }

  function runtime() {
    return window.JogoIdleHudLayout;
  }

  function ensureChrome() {
    if (chrome) return chrome;
    chrome = document.createElement("div");
    chrome.id = "hud-builder-chrome";
    chrome.setAttribute("aria-hidden", "true");
    chrome.style.cssText =
      "position:fixed;pointer-events:none;z-index:2147483000;border:2px solid #3b82c4;" +
      "box-shadow:0 0 0 1px rgba(244,181,43,0.55);display:none;box-sizing:border-box;";

    HANDLE_DEFS.forEach(function (h) {
      var node = document.createElement("div");
      node.dataset.handle = h.id;
      node.style.cssText =
        "position:absolute;width:10px;height:10px;background:#f4b52b;border:1px solid #061323;" +
        "border-radius:2px;pointer-events:auto;box-sizing:border-box;z-index:2;" +
        "cursor:" +
        h.cursor +
        ";transform:translate(-50%,-50%);left:" +
        h.x * 100 +
        "%;top:" +
        h.y * 100 +
        "%;";
      node.addEventListener("pointerdown", onHandlePointerDown);
      chrome.appendChild(node);
      handles[h.id] = node;
    });

    badge = document.createElement("div");
    badge.style.cssText =
      "position:absolute;left:0;top:-22px;background:#061323;color:#f4b52b;font:600 11px/1.2 ui-sans-serif,system-ui,sans-serif;" +
      "padding:2px 6px;border-radius:4px;white-space:nowrap;pointer-events:none;border:1px solid rgba(244,181,43,0.4);";
    chrome.appendChild(badge);

    document.body.appendChild(chrome);

    guidesLayer = document.createElement("div");
    guidesLayer.id = "hud-builder-guides";
    guidesLayer.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:2147482999;display:none;";
    document.body.appendChild(guidesLayer);

    return chrome;
  }

  function clearGuides() {
    if (!guidesLayer) return;
    guidesLayer.innerHTML = "";
    guidesLayer.style.display = "none";
  }

  function drawGuide(axis, pos) {
    if (!guidesLayer) return;
    guidesLayer.style.display = "block";
    var line = document.createElement("div");
    if (axis === "x") {
      line.style.cssText =
        "position:absolute;top:0;bottom:0;width:1px;background:rgba(244,181,43,0.85);left:" +
        pos +
        "px;";
    } else {
      line.style.cssText =
        "position:absolute;left:0;right:0;height:1px;background:rgba(244,181,43,0.85);top:" +
        pos +
        "px;";
    }
    guidesLayer.appendChild(line);
  }

  function syncChrome() {
    var box = ensureChrome();
    if (!selectedId || editMode !== "edit") {
      box.style.display = "none";
      clearGuides();
      return;
    }
    var el = elById(selectedId);
    if (!el) {
      box.style.display = "none";
      return;
    }
    var r = el.getBoundingClientRect();
    box.style.display = "block";
    box.style.left = r.left + "px";
    box.style.top = r.top + "px";
    box.style.width = Math.max(1, r.width) + "px";
    box.style.height = Math.max(1, r.height) + "px";
    var m = metaFor(selectedId);
    var canResize = m.dragModes.indexOf("resize") >= 0;
    Object.keys(handles).forEach(function (hid) {
      handles[hid].style.display = canResize ? "block" : "none";
    });
    var label =
      Math.round(r.width) + " × " + Math.round(r.height);
    if (layoutMode === "free" || (el.style.position === "absolute")) {
      var stage = stageEl().getBoundingClientRect();
      label +=
        "  ·  " +
        Math.round(r.left - stage.left) +
        ", " +
        Math.round(r.top - stage.top);
    }
    badge.textContent = label;
  }

  function readComputed(el) {
    var cs = window.getComputedStyle(el);
    return {
      width: cs.width,
      height: cs.height,
      minWidth: cs.minWidth,
      maxWidth: cs.maxWidth,
      minHeight: cs.minHeight,
      maxHeight: cs.maxHeight,
      marginTop: cs.marginTop,
      marginRight: cs.marginRight,
      marginBottom: cs.marginBottom,
      marginLeft: cs.marginLeft,
      paddingTop: cs.paddingTop,
      paddingRight: cs.paddingRight,
      paddingBottom: cs.paddingBottom,
      paddingLeft: cs.paddingLeft,
      gap: cs.gap,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      color: cs.color,
      opacity: cs.opacity,
      borderRadius: cs.borderRadius,
      gridTemplateColumns: cs.gridTemplateColumns,
      aspectRatio: cs.aspectRatio,
      order: cs.order,
      position: cs.position,
      left: cs.left,
      top: cs.top,
      right: cs.right,
      bottom: cs.bottom,
      zIndex: cs.zIndex,
      flexGrow: cs.flexGrow,
      alignSelf: cs.alignSelf,
    };
  }

  function emitSelection(id) {
    selectedId = id;
    syncChrome();
    var el = id ? elById(id) : null;
    if (!el) {
      post("jogo-idle:hud-builder-selection", { id: null, rect: null, computed: null });
      return;
    }
    var r = el.getBoundingClientRect();
    post("jogo-idle:hud-builder-selection", {
      id: id,
      rect: { x: r.left, y: r.top, width: r.width, height: r.height },
      computed: readComputed(el),
    });
  }

  function findHudIdFromTarget(target) {
    if (target && target.closest && target.closest("#hud-builder-chrome")) return selectedId;
    var node = target;
    while (node && node !== document.body && node !== document.documentElement) {
      if (node.getAttribute && node.getAttribute("data-hud-id")) {
        return node.getAttribute("data-hud-id");
      }
      node = node.parentElement;
    }
    return null;
  }

  function listIds() {
    return Array.prototype.map.call(document.querySelectorAll("[data-hud-id]"), function (el) {
      return el.getAttribute("data-hud-id");
    });
  }

  function captureSnapshot(id) {
    var rt = runtime();
    var layout = rt && rt.getLayout ? rt.getLayout() : null;
    var entry = layout && layout.components ? layout.components[id] : null;
    return {
      id: id,
      entry: entry ? JSON.parse(JSON.stringify(entry)) : { base: {} },
      layoutJson: layout ? JSON.stringify(layout) : null,
    };
  }

  function restoreSnapshot(snap) {
    if (!snap || !snap.layoutJson) return;
    var rt = runtime();
    if (!rt || !rt.setLayout) return;
    try {
      rt.setLayout(JSON.parse(snap.layoutJson), currentBreakpoint);
    } catch (e) {}
    syncChrome();
  }

  function applyLivePatch(id, props) {
    var rt = runtime();
    if (rt && rt.patch) rt.patch(id, filterProps(props), currentBreakpoint);
    scheduleChromeSync();
  }

  function scheduleChromeSync() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      syncChrome();
    });
  }

  function px(n) {
    return Math.round(n) + "px";
  }

  function snapValue(v, guides, axis) {
    if (!snapEnabled) return v;
    var g = snapGrid || 8;
    var gridSnapped = Math.round(v / g) * g;
    var best = gridSnapped;
    var bestDist = Math.abs(v - gridSnapped);
    var threshold = 6;
    (guides || []).forEach(function (gpos) {
      var d = Math.abs(v - gpos);
      if (d < bestDist && d <= threshold) {
        bestDist = d;
        best = gpos;
      }
    });
    if (bestDist <= threshold) drawGuide(axis, best);
    return best;
  }

  function collectEdgeGuides(excludeId) {
    var xs = [];
    var ys = [];
    document.querySelectorAll("[data-hud-id]").forEach(function (el) {
      var id = el.getAttribute("data-hud-id");
      if (id === excludeId) return;
      var r = el.getBoundingClientRect();
      xs.push(r.left, r.right, r.left + r.width / 2);
      ys.push(r.top, r.bottom, r.top + r.height / 2);
    });
    return { xs: xs, ys: ys };
  }

  /* —— Resize —— */
  function onHandlePointerDown(event) {
    if (editMode !== "edit" || !selectedId) return;
    event.preventDefault();
    event.stopPropagation();
    var handle = event.currentTarget.dataset.handle;
    var el = elById(selectedId);
    if (!el) return;
    var m = metaFor(selectedId);
    if (m.dragModes.indexOf("resize") < 0) return;

    snapshotBefore = captureSnapshot(selectedId);
    var r = el.getBoundingClientRect();
    var stage = stageEl().getBoundingClientRect();
    var isAbs = window.getComputedStyle(el).position === "absolute";

    gesture = {
      kind: "resize",
      handle: handle,
      id: selectedId,
      startX: event.clientX,
      startY: event.clientY,
      startRect: {
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        stageLeft: r.left - stage.left,
        stageTop: r.top - stage.top,
      },
      isAbs: isAbs,
      minW: m.minSize.w,
      minH: m.minSize.h,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    window.addEventListener("pointermove", onGestureMove);
    window.addEventListener("pointerup", onGestureUp);
    window.addEventListener("pointercancel", onGestureUp);
  }

  function computeResize(g, clientX, clientY) {
    clearGuides();
    var dx = clientX - g.startX;
    var dy = clientY - g.startY;
    var left = g.startRect.left;
    var top = g.startRect.top;
    var width = g.startRect.width;
    var height = g.startRect.height;
    var h = g.handle;

    if (h.indexOf("e") >= 0) width = g.startRect.width + dx;
    if (h.indexOf("s") >= 0) height = g.startRect.height + dy;
    if (h.indexOf("w") >= 0) {
      width = g.startRect.width - dx;
      left = g.startRect.left + dx;
    }
    if (h.indexOf("n") >= 0) {
      height = g.startRect.height - dy;
      top = g.startRect.top + dy;
    }

    var edges = collectEdgeGuides(g.id);
    if (h.indexOf("e") >= 0) {
      var right = snapValue(left + width, edges.xs, "x");
      width = right - left;
    }
    if (h.indexOf("s") >= 0) {
      var bottom = snapValue(top + height, edges.ys, "y");
      height = bottom - top;
    }
    if (h.indexOf("w") >= 0) {
      left = snapValue(left, edges.xs, "x");
      width = g.startRect.left + g.startRect.width - left;
    }
    if (h.indexOf("n") >= 0) {
      top = snapValue(top, edges.ys, "y");
      height = g.startRect.top + g.startRect.height - top;
    }

    width = Math.max(g.minW, width);
    height = Math.max(g.minH, height);

    var stage = stageEl().getBoundingClientRect();
    var props = { width: px(width), height: px(height) };
    if (g.isAbs || layoutMode === "free") {
      props.position = "absolute";
      props.left = px(left - stage.left);
      props.top = px(top - stage.top);
    }
    return props;
  }

  /* —— Drag move / reorder —— */
  function onBodyPointerDown(event) {
    if (editMode !== "edit") return;
    if (event.button != null && event.button !== 0) return;
    if (event.target && event.target.closest && event.target.closest("#hud-builder-chrome [data-handle]")) {
      return;
    }
    var id = findHudIdFromTarget(event.target);
    if (!id) return;

    // Always select first
    if (id !== selectedId) emitSelection(id);

    var m = metaFor(id);
    var canFree = m.dragModes.indexOf("free") >= 0;
    var canReorder = m.dragModes.indexOf("reorder") >= 0;
    if (layoutMode === "free" && !canFree) return;
    if (layoutMode === "organized" && !canReorder && !canFree) return;
    // Columns: no body-drag in organized (resize only via handles)
    if (layoutMode === "organized" && m.dragModes.indexOf("reorder") < 0) return;

    event.preventDefault();
    event.stopPropagation();

    snapshotBefore = captureSnapshot(id);
    var el = elById(id);
    var r = el.getBoundingClientRect();
    var stage = stageEl().getBoundingClientRect();

    gesture = {
      kind: "pending",
      id: id,
      startX: event.clientX,
      startY: event.clientY,
      startRect: {
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        stageLeft: r.left - stage.left,
        stageTop: r.top - stage.top,
      },
      pointerId: event.pointerId,
      siblings: null,
    };
    window.addEventListener("pointermove", onGestureMove);
    window.addEventListener("pointerup", onGestureUp);
    window.addEventListener("pointercancel", onGestureUp);
  }

  function pinAbsolute(g) {
    var props = {
      position: "absolute",
      left: px(g.startRect.stageLeft),
      top: px(g.startRect.stageTop),
      width: px(g.startRect.width),
      height: px(g.startRect.height),
      zIndex: "20",
    };
    applyLivePatch(g.id, props);
    return props;
  }

  function getHudSiblings(el) {
    var parent = el.parentElement;
    if (!parent) return [];
    return Array.prototype.filter.call(parent.children, function (child) {
      return child.getAttribute && child.getAttribute("data-hud-id");
    });
  }

  function reorderByPointer(g, clientX, clientY) {
    var el = elById(g.id);
    if (!el) return null;
    var siblings = g.siblings || getHudSiblings(el);
    g.siblings = siblings;
    if (siblings.length < 2) return null;

    var centers = siblings.map(function (sib) {
      var r = sib.getBoundingClientRect();
      return {
        id: sib.getAttribute("data-hud-id"),
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        el: sib,
      };
    });

    // Determine primary axis from parent
    var parentCs = window.getComputedStyle(el.parentElement);
    var horizontal =
      parentCs.display.indexOf("grid") >= 0 ||
      parentCs.flexDirection === "row" ||
      parentCs.flexDirection === "row-reverse";

    centers.sort(function (a, b) {
      return horizontal ? a.cx - b.cx : a.cy - b.cy;
    });

    var targetIndex = 0;
    for (var i = 0; i < centers.length; i++) {
      var c = centers[i];
      if (horizontal ? clientX >= c.cx : clientY >= c.cy) targetIndex = i;
    }

    var ids = centers.map(function (c) {
      return c.id;
    });
    var from = ids.indexOf(g.id);
    if (from < 0) return null;
    ids.splice(from, 1);
    ids.splice(targetIndex, 0, g.id);

    var orders = {};
    ids.forEach(function (sid, idx) {
      orders[sid] = idx;
      applyLivePatch(sid, { order: String(idx) });
    });
    return orders;
  }

  function computeFreeMove(g, clientX, clientY) {
    clearGuides();
    var dx = clientX - g.startX;
    var dy = clientY - g.startY;
    var stage = stageEl().getBoundingClientRect();
    var left = g.startRect.stageLeft + dx;
    var top = g.startRect.stageTop + dy;

    var edges = collectEdgeGuides(g.id);
    // Convert absolute viewport edges to stage-relative for snap comparison:
    // guides are in viewport coords; convert left/top to viewport then snap then back
    var viewLeft = left + stage.left;
    var viewTop = top + stage.top;
    viewLeft = snapValue(viewLeft, edges.xs, "x");
    viewTop = snapValue(viewTop, edges.ys, "y");
    left = viewLeft - stage.left;
    top = viewTop - stage.top;

    if (!allowOverflow) {
      left = Math.max(0, Math.min(left, stage.width - g.startRect.width));
      top = Math.max(0, Math.min(top, stage.height - g.startRect.height));
    }

    return {
      position: "absolute",
      left: px(left),
      top: px(top),
      width: px(g.startRect.width),
      height: px(g.startRect.height),
      zIndex: "20",
    };
  }

  function onGestureMove(event) {
    if (!gesture) return;
    var g = gesture;

    if (g.kind === "pending") {
      var dist = Math.hypot(event.clientX - g.startX, event.clientY - g.startY);
      if (dist < DRAG_THRESHOLD) return;
      if (layoutMode === "free") {
        g.kind = "move";
        pinAbsolute(g);
        document.body.style.cursor = "grabbing";
      } else {
        g.kind = "reorder";
        document.body.style.cursor = "grabbing";
      }
    }

    if (g.kind === "resize") {
      var props = computeResize(g, event.clientX, event.clientY);
      g.lastProps = props;
      applyLivePatch(g.id, props);
      post("jogo-idle:hud-builder-transform", { id: g.id, props: props, kind: "resize" });
      return;
    }

    if (g.kind === "move") {
      var moveProps = computeFreeMove(g, event.clientX, event.clientY);
      g.lastProps = moveProps;
      applyLivePatch(g.id, moveProps);
      post("jogo-idle:hud-builder-transform", { id: g.id, props: moveProps, kind: "move" });
      return;
    }

    if (g.kind === "reorder") {
      var orders = reorderByPointer(g, event.clientX, event.clientY);
      g.lastOrders = orders;
      syncChrome();
    }
  }

  function onGestureUp() {
    if (!gesture) return;
    var g = gesture;
    cleanupGestureListeners();
    document.body.style.cursor = "";
    clearGuides();

    if (g.kind === "pending") {
      gesture = null;
      snapshotBefore = null;
      emitSelection(g.id);
      return;
    }

    if (g.kind === "resize" || g.kind === "move") {
      post("jogo-idle:hud-builder-transform-end", {
        id: g.id,
        kind: g.kind,
        props: filterProps(g.lastProps || {}),
        breakpoint: currentBreakpoint,
      });
      emitSelection(g.id);
    } else if (g.kind === "reorder") {
      post("jogo-idle:hud-builder-transform-end", {
        id: g.id,
        kind: "reorder",
        props: {},
        orders: g.lastOrders || {},
        breakpoint: currentBreakpoint,
      });
      emitSelection(g.id);
    }

    gesture = null;
    snapshotBefore = null;
    syncChrome();
  }

  function cleanupGestureListeners() {
    window.removeEventListener("pointermove", onGestureMove);
    window.removeEventListener("pointerup", onGestureUp);
    window.removeEventListener("pointercancel", onGestureUp);
  }

  function cancelGesture() {
    if (!gesture) return;
    cleanupGestureListeners();
    document.body.style.cursor = "";
    clearGuides();
    restoreSnapshot(snapshotBefore);
    post("jogo-idle:hud-builder-transform-cancel", { id: gesture.id });
    gesture = null;
    snapshotBefore = null;
    syncChrome();
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      if (gesture) {
        event.preventDefault();
        cancelGesture();
      }
    }
  }

  function onMessage(event) {
    if (event.origin !== ORIGIN) return;
    if (event.source !== window.parent) return;
    var data = event.data;
    if (!data || typeof data !== "object" || data.v !== MSG_V) return;
    var type = data.type;
    if (typeof type !== "string" || !PARENT_TYPES[type]) return;

    if (type === "jogo-idle:hud-builder-select") {
      var sid = typeof data.id === "string" && META[data.id] ? data.id : null;
      if (data.id != null && data.id !== "" && !sid) return;
      emitSelection(sid);
      return;
    }
    if (type === "jogo-idle:hud-builder-patch") {
      if (typeof data.id !== "string" || !META[data.id]) return;
      if (!data.props || typeof data.props !== "object") return;
      var bpPatch = parseBreakpoint(data.breakpoint);
      if (data.breakpoint != null && !bpPatch) return;
      var rt = runtime();
      if (rt && rt.patch) rt.patch(data.id, filterProps(data.props), bpPatch || currentBreakpoint);
      if (selectedId === data.id) syncChrome();
      return;
    }
    if (type === "jogo-idle:hud-builder-set-layout") {
      var bpSet = parseBreakpoint(data.breakpoint);
      if (data.breakpoint != null && !bpSet) return;
      if (bpSet) currentBreakpoint = bpSet;
      var rt2 = runtime();
      if (rt2 && rt2.setLayout) rt2.setLayout(data.layout || null, bpSet || currentBreakpoint);
      syncChrome();
      return;
    }
    if (type === "jogo-idle:hud-builder-mode") {
      editMode = data.mode === "preview" ? "preview" : "edit";
      document.documentElement.classList.toggle("hud-builder-preview-mode", editMode === "preview");
      if (editMode === "preview") cancelGesture();
      syncChrome();
      return;
    }
    if (type === "jogo-idle:hud-builder-layout-mode") {
      layoutMode = data.mode === "free" ? "free" : "organized";
      return;
    }
    if (type === "jogo-idle:hud-builder-snap") {
      snapEnabled = data.enabled !== false;
      if (typeof data.grid === "number" && data.grid >= 2 && data.grid <= 64) {
        snapGrid = Math.floor(data.grid);
      }
      if (typeof data.allowOverflow === "boolean") allowOverflow = data.allowOverflow;
      return;
    }
    if (type === "jogo-idle:hud-builder-viewport") {
      var bpVp = parseBreakpoint(data.breakpoint);
      if (!bpVp) return;
      currentBreakpoint = bpVp;
      var rt3 = runtime();
      if (rt3 && rt3.setBreakpoint) rt3.setBreakpoint(bpVp);
      syncChrome();
    }
  }

  function boot() {
    ensureChrome();
    document.addEventListener("pointerdown", onBodyPointerDown, true);
    window.addEventListener("message", onMessage);
    window.addEventListener("resize", syncChrome);
    window.addEventListener("scroll", syncChrome, true);
    window.addEventListener("keydown", onKeyDown);
    post("jogo-idle:hud-builder-ready", { ids: listIds(), meta: META, sessionId: SESSION_ID });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
