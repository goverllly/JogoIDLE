/**
 * Intro cinematográfica ao boot de play.html.
 * Anima overlay + wrapper `.frame` sem mutar layouts do HUD Builder.
 */

const FALLBACK_BG = '/jogo-idle/assets/hud/fundo-jogo.png';
const HARD_TIMEOUT_MS = 8000;

const DEFAULT_INTRO = {
  enabled: true,
  fadeMs: 500,
  titleMs: 900,
  hudMs: 700,
  offsetY: -80,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  showChapterName: true,
  showRegionName: true,
  allowSkip: true,
};

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function isHudBuilderPreview() {
  try {
    return (
      document.documentElement.classList.contains('hud-builder-preview') ||
      new URLSearchParams(location.search).get('hudBuilder') === '1'
    );
  } catch {
    return false;
  }
}

function readIntroConfig() {
  const layout = window.JogoIdleHudLayout?.getLayout?.();
  const raw = layout?.tokens?.intro;
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_INTRO };
  return {
    enabled: raw.enabled !== false,
    fadeMs: clampMs(raw.fadeMs, DEFAULT_INTRO.fadeMs, 100, 3000),
    titleMs: clampMs(raw.titleMs, DEFAULT_INTRO.titleMs, 0, 5000),
    hudMs: clampMs(raw.hudMs, DEFAULT_INTRO.hudMs, 100, 3000),
    offsetY: Number.isFinite(Number(raw.offsetY))
      ? Math.max(-200, Math.min(0, Math.round(Number(raw.offsetY))))
      : DEFAULT_INTRO.offsetY,
    easing:
      typeof raw.easing === 'string' && raw.easing.trim()
        ? raw.easing.trim().slice(0, 80)
        : DEFAULT_INTRO.easing,
    showChapterName: raw.showChapterName !== false,
    showRegionName: raw.showRegionName !== false,
    allowSkip: raw.allowSkip !== false,
  };
}

async function waitForHudTokens(maxMs) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      if (window.JogoIdleHudLayout?.getLayout?.()?.tokens) return;
    } catch {
      /* ignore */
    }
    await sleep(40);
  }
}

function clampMs(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function sleep(ms, signal) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener?.(
      'abort',
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
}

function preloadImage(url) {
  if (!url) return Promise.resolve(false);
  return new Promise((resolve) => {
    const img = new Image();
    const done = (ok) => resolve(ok);
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = url;
  });
}

function applyCssVars(cfg) {
  const root = document.documentElement;
  root.style.setProperty('--play-intro-fade-ms', `${cfg.fadeMs}ms`);
  root.style.setProperty('--play-intro-title-ms', `${cfg.titleMs}ms`);
  root.style.setProperty('--play-intro-hud-ms', `${cfg.hudMs}ms`);
  root.style.setProperty('--play-intro-offset-y', `${cfg.offsetY}px`);
  root.style.setProperty('--play-intro-easing', cfg.easing);
}

function clearCssVars() {
  const root = document.documentElement;
  [
    '--play-intro-fade-ms',
    '--play-intro-title-ms',
    '--play-intro-hud-ms',
    '--play-intro-offset-y',
    '--play-intro-easing',
    '--play-intro-bg',
    '--play-intro-veil',
  ].forEach((k) => root.style.removeProperty(k));
}

function ensureDom() {
  let root = document.getElementById('play-intro');
  if (root) return root;
  root = document.createElement('div');
  root.id = 'play-intro';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Introdução do capítulo');
  root.innerHTML = `
    <div class="play-intro__bg" aria-hidden="true"></div>
    <div class="play-intro__card">
      <span class="play-intro__eyebrow" data-intro-eyebrow></span>
      <h1 class="play-intro__title" data-intro-title></h1>
      <div class="play-intro__ornament" aria-hidden="true"></div>
      <p class="play-intro__region" data-intro-region hidden></p>
      <p class="play-intro__line" data-intro-line hidden></p>
    </div>
    <button type="button" class="play-intro__skip" data-intro-skip>Pular introdução</button>
    <p class="play-intro__hint" data-intro-hint>Preparando o campo de batalha…</p>
  `;
  document.body.appendChild(root);
  return root;
}

function fillCard(root, payload, cfg) {
  const eyebrow = root.querySelector('[data-intro-eyebrow]');
  const title = root.querySelector('[data-intro-title]');
  const region = root.querySelector('[data-intro-region]');
  const line = root.querySelector('[data-intro-line]');
  const skip = root.querySelector('[data-intro-skip]');

  if (eyebrow) {
    eyebrow.textContent = payload.chapterNumber
      ? `Capítulo ${payload.chapterNumber}`
      : 'Capítulo';
  }
  if (title) {
    title.textContent = cfg.showChapterName ? payload.chapterName || '' : '';
    title.hidden = !cfg.showChapterName || !payload.chapterName;
  }
  if (region) {
    const show = cfg.showRegionName && payload.regionName;
    region.hidden = !show;
    region.textContent = show ? payload.regionName : '';
  }
  if (line) {
    const show = Boolean(payload.introLine);
    line.hidden = !show;
    line.textContent = show ? `“${payload.introLine}”` : '';
  }
  if (skip) {
    skip.hidden = !cfg.allowSkip;
  }
}

function setBodyPhase(phase) {
  const b = document.body;
  b.classList.remove('play-intro-pending', 'play-intro-hud-enter', 'play-intro-done');
  if (phase) b.classList.add(phase);
}

/**
 * @param {{
 *   payload: {
 *     chapterId?: string;
 *     chapterNumber?: string;
 *     chapterName?: string;
 *     bgUrl?: string;
 *     introLine?: string;
 *     regionName?: string | null;
 *   };
 *   ready: Promise<unknown>;
 * }} opts
 */
export async function runPlayIntro({ payload, ready }) {
  if (isHudBuilderPreview()) {
    setBodyPhase('play-intro-done');
    await Promise.resolve(ready).catch(() => {});
    return { skipped: true, reason: 'hud-builder' };
  }

  // Layout publicado carrega async; aguarda um pouco para honrar tokens.intro.
  await waitForHudTokens(450);
  const cfg = readIntroConfig();
  if (!cfg.enabled) {
    setBodyPhase('play-intro-done');
    await Promise.resolve(ready).catch(() => {});
    return { skipped: true, reason: 'disabled' };
  }

  const reduced = prefersReducedMotion();
  const fadeMs = reduced ? 80 : cfg.fadeMs;
  const titleMs = reduced ? 120 : cfg.titleMs;
  const hudMs = reduced ? 80 : cfg.hudMs;
  applyCssVars({ ...cfg, fadeMs, titleMs, hudMs });

  const root = ensureDom();
  fillCard(root, payload || {}, cfg);

  const bgUrl = payload?.bgUrl || FALLBACK_BG;
  document.documentElement.style.setProperty('--play-intro-bg', `url('${bgUrl}')`);
  if (payload?.chapterId) {
    document.body.dataset.chapter = String(payload.chapterId).toUpperCase();
  }

  setBodyPhase('play-intro-pending');
  root.classList.remove('is-visible', 'is-titled', 'is-leaving', 'is-waiting');

  const ac = new AbortController();
  let skipCinematic = false;
  let finished = false;

  const skipBtn = root.querySelector('[data-intro-skip]');
  const onSkip = () => {
    if (!cfg.allowSkip) return;
    skipCinematic = true;
    ac.abort();
  };
  skipBtn?.addEventListener('click', onSkip);

  const hardTimer = setTimeout(() => {
    skipCinematic = true;
    ac.abort();
  }, HARD_TIMEOUT_MS);

  const readyGate = Promise.resolve(ready)
    .then(() => true)
    .catch(() => true);

  try {
    await preloadImage(bgUrl);
    // Force reflow then fade in
    void root.offsetWidth;
    root.classList.add('is-visible');
    await sleep(fadeMs, ac.signal);

    if (!skipCinematic) {
      root.classList.add('is-titled');
      await sleep(titleMs, ac.signal);
    }

    if (!skipCinematic) {
      root.classList.add('is-waiting');
    }

    // Wait for technical readiness (never unlock early on skip)
    await readyGate;

    root.classList.remove('is-waiting');
    root.classList.add('is-leaving');
    await sleep(reduced ? 40 : 200, ac.signal);

    setBodyPhase('play-intro-hud-enter');
    await sleep(hudMs, ac.signal);

    finished = true;
  } finally {
    clearTimeout(hardTimer);
    skipBtn?.removeEventListener('click', onSkip);
    finishIntro(root);
  }

  return { skipped: skipCinematic, finished };
}

function finishIntro(root) {
  setBodyPhase('play-intro-done');
  if (root) {
    root.classList.remove('is-visible', 'is-titled', 'is-leaving', 'is-waiting');
    root.remove();
  }
  clearCssVars();
  // Strip residual transform on frame after transition class removed
  const frame = document.querySelector('.frame');
  if (frame) {
    frame.style.removeProperty('opacity');
    frame.style.removeProperty('transform');
    frame.style.removeProperty('pointer-events');
  }
}

export function getDefaultPlayIntroConfig() {
  return { ...DEFAULT_INTRO };
}
