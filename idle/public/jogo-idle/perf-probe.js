/**
 * Diagnóstico de performance — impacto mínimo, só com permissão do servidor.
 *
 * Ativação (todas necessárias):
 * 1. GET /api/meta → perfDiagnostics === true (IDLE_AUTH_MODE=local + IDLE_PERF_DIAGNOSTICS=1)
 * 2. localStorage.idle_perf === '1' OU ?idle_perf=1
 *
 * Nunca envia dados a serviços externos. Não registra cookies/tokens/payloads.
 *
 * Distinções:
 * - browserFps: rAF wall-clock (aba visível)
 * - webglFrames: contagem no ciclo do renderer (após render válido)
 * - renderer.info: draw calls / tris / geos / textures (não = VRAM bytes)
 * - JS/GPU time: use DevTools; este probe não substitui profiling
 */

const SAMPLE_MS = 1000;
const MAX_FRAME_SAMPLES = 240;
const MAX_MARKS = 80;

/** @type {null | ReturnType<typeof createProbeState>} */
let state = null;
let serverAllows = false;
let clientWants = false;
let started = false;

function createProbeState() {
  return {
    browserFrames: 0,
    webglFrames: 0,
    hiddenBrowserFrames: 0,
    hiddenWebglFrames: 0,
    frameDts: /** @type {number[]} */ ([]),
    lastRaf: 0,
    marks: /** @type {{ name: string, t: number, detail?: Record<string, number|string|boolean|null> }[]} */ ([]),
    longTasks: 0,
    longTaskMs: 0,
    fetchCount: 0,
    fetchMsTotal: 0,
    lastInfo: null,
    rafId: 0,
    longObs: /** @type {PerformanceObserver | null} */ (null),
    overlay: /** @type {HTMLElement | null} */ (null),
  };
}

function clientOptIn() {
  try {
    if (typeof location !== 'undefined') {
      const q = new URLSearchParams(location.search);
      if (q.get('idle_perf') === '1') return true;
    }
    if (typeof localStorage !== 'undefined' && localStorage.getItem('idle_perf') === '1') return true;
  } catch {
    /* private mode */
  }
  return false;
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

function mean(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function ensureOverlay(s) {
  if (s.overlay || typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.id = 'idle-perf-overlay';
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText =
    'position:fixed;z-index:99999;left:8px;bottom:8px;padding:6px 8px;font:11px/1.35 ui-monospace,monospace;' +
    'background:rgba(0,0,0,.72);color:#d8e0e8;border-radius:6px;pointer-events:none;max-width:min(92vw,320px);';
  document.body.appendChild(el);
  s.overlay = el;
}

function paintOverlay(s) {
  if (!s.overlay) return;
  const dts = [...s.frameDts].sort((a, b) => a - b);
  const avg = mean(dts);
  const fps = avg ? 1000 / avg : null;
  const info = s.lastInfo;
  s.overlay.textContent = [
    `idle-perf (diag)`,
    fps != null ? `rAF~${fps.toFixed(0)} fps  p95 ${percentile(dts, 95)?.toFixed?.(1) ?? '—'}ms` : 'rAF —',
    `webgl ${s.webglFrames}  hiddenWebgl ${s.hiddenWebglFrames}`,
    info
      ? `calls ${info.calls} tris ${info.triangles} geo ${info.geometries} tex ${info.textures}`
      : 'renderer.info —',
    `fetch ${s.fetchCount} (${s.fetchMsTotal.toFixed(0)}ms) longTasks ${s.longTasks}`,
  ].join('\n');
}

function tickRaf(now) {
  if (!state || !started) return;
  const s = state;
  const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
  if (s.lastRaf > 0) {
    const dt = now - s.lastRaf;
    if (dt > 0 && dt < 1000) {
      if (hidden) {
        s.hiddenBrowserFrames += 1;
      } else {
        s.browserFrames += 1;
        s.frameDts.push(dt);
        if (s.frameDts.length > MAX_FRAME_SAMPLES) s.frameDts.shift();
      }
    }
  }
  s.lastRaf = now;
  if (s.browserFrames % 30 === 0) paintOverlay(s);
  s.rafId = requestAnimationFrame(tickRaf);
}

/**
 * @param {{ perfDiagnostics?: boolean }} meta
 */
export function applyPerfMeta(meta) {
  serverAllows = Boolean(meta?.perfDiagnostics);
  clientWants = clientOptIn();
  if (serverAllows && clientWants) startProbe();
  else stopProbe();
}

export function isPerfProbeActive() {
  return started;
}

function startProbe() {
  if (started || typeof window === 'undefined') return;
  started = true;
  state = createProbeState();
  ensureOverlay(state);
  state.lastRaf = 0;
  state.rafId = requestAnimationFrame(tickRaf);
  try {
    if (typeof PerformanceObserver !== 'undefined') {
      state.longObs = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          state.longTasks += 1;
          state.longTaskMs += e.duration;
        }
      });
      state.longObs.observe({ type: 'longtask', buffered: true });
    }
  } catch {
    state.longObs = null;
  }
  mark('probe_start', {
    dpr: typeof window !== 'undefined' ? window.devicePixelRatio : null,
    w: typeof screen !== 'undefined' ? screen.width : null,
    h: typeof screen !== 'undefined' ? screen.height : null,
  });
  window.__idlePerf = { snapshot, mark, noteFetch };
}

function stopProbe() {
  if (!started || !state) {
    started = false;
    return;
  }
  cancelAnimationFrame(state.rafId);
  try {
    state.longObs?.disconnect();
  } catch {
    /* ignore */
  }
  state.overlay?.remove();
  started = false;
  state = null;
  try {
    if (window.__idlePerf) delete window.__idlePerf;
  } catch {
    /* ignore */
  }
}

/**
 * Chamado após renderer.render válido.
 * @param {import('three').WebGLRenderer | { info?: { render?: { calls?: number, triangles?: number }, memory?: { geometries?: number, textures?: number } } }} renderer
 */
export function noteWebglFrame(renderer) {
  if (!started || !state) return;
  const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
  if (hidden) {
    state.hiddenWebglFrames += 1;
    return;
  }
  state.webglFrames += 1;
  const info = renderer?.info;
  if (info) {
    state.lastInfo = {
      calls: info.render?.calls ?? null,
      triangles: info.render?.triangles ?? null,
      geometries: info.memory?.geometries ?? null,
      textures: info.memory?.textures ?? null,
      // Não interpretar como bytes de VRAM.
    };
  }
}

export function mark(name, detail) {
  if (!started || !state) return;
  state.marks.push({ name: String(name), t: performance.now(), detail: detail || undefined });
  if (state.marks.length > MAX_MARKS) state.marks.shift();
}

/** Conta fetch sem path/headers/body. */
export function noteFetch(durationMs) {
  if (!started || !state) return;
  state.fetchCount += 1;
  state.fetchMsTotal += Math.max(0, Number(durationMs) || 0);
}

export function snapshot() {
  if (!state) {
    return {
      active: false,
      serverAllows,
      clientWants,
      note: 'Probe inactive — needs server perfDiagnostics + idle_perf opt-in',
    };
  }
  const dts = [...state.frameDts].sort((a, b) => a - b);
  const avg = mean(dts);
  return {
    active: true,
    sampleWindowMs: SAMPLE_MS,
    browserFpsAvg: avg ? 1000 / avg : null,
    frameMsAvg: avg,
    frameMsP50: percentile(dts, 50),
    frameMsP95: percentile(dts, 95),
    frameMsMin: dts[0] ?? null,
    frameMsMax: dts[dts.length - 1] ?? null,
    browserFrames: state.browserFrames,
    webglFrames: state.webglFrames,
    hiddenBrowserFrames: state.hiddenBrowserFrames,
    hiddenWebglFrames: state.hiddenWebglFrames,
    rendererInfoLast: state.lastInfo,
    rendererInfoNote: 'geometries/textures are object counts, not VRAM bytes',
    longTasks: state.longTasks,
    longTaskMs: state.longTaskMs,
    fetchCount: state.fetchCount,
    fetchMsTotal: state.fetchMsTotal,
    marks: [...state.marks],
    env: {
      devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : null,
      screen: typeof screen !== 'undefined' ? { w: screen.width, h: screen.height } : null,
      visibility: typeof document !== 'undefined' ? document.visibilityState : null,
    },
  };
}
