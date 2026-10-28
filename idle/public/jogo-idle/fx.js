import { sfx } from './audio.js';

/**
 * Reproduz os eventos de combate do servidor em sequência, respeitando
 * um intervalo mínimo por tipo para as animações não se sobreporem.
 */
export function createTimeline(handlers, { minGap = {}, maxBacklogMs = 2500, spanMs = 1900 } = {}) {
  let busyUntil = 0;
  const timers = new Set();

  function later(ms, fn) {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  }

  function clear() {
    timers.forEach(clearTimeout);
    timers.clear();
    busyUntil = 0;
  }

  function busy() {
    return busyUntil > performance.now();
  }

  /** `sync` aplica o estado final sem animação (aba oculta, atraso grande, sem eventos). */
  function play(events, sync, opts = {}) {
    const now = performance.now();
    const backlogCap = opts.maxBacklogMs ?? maxBacklogMs;
    const playSpan = opts.spanMs ?? spanMs;
    if (document.hidden) {
      clear();
      sync?.();
      return;
    }
    if (!events?.length) {
      if (!busy()) sync?.();
      return;
    }
    if (busyUntil - now > backlogCap) {
      clear();
      sync?.();
    }

    const base = events[0].t;
    const span = events[events.length - 1].t - base;
    const scale = span > playSpan ? playSpan / span : 1;
    let cursor = Math.max(now, busyUntil);
    const start = cursor;

    for (const e of events) {
      const at = Math.max(start + (e.t - base) * scale, cursor);
      cursor = at + (minGap[e.type] ?? 150);
      later(at - now, () => handlers[e.type]?.(e));
    }
    busyUntil = cursor;
    later(Math.max(0, cursor - now), () => sync?.());
  }

  return { play, clear, later, busy };
}

export function floatText(layer, x, y, text, cls = '') {
  const el = document.createElement('div');
  el.className = `float-text ${cls}`;
  el.textContent = text;
  el.style.left = `${x + (Math.random() * 40 - 20)}px`;
  el.style.top = `${y}px`;
  layer.appendChild(el);
  el.animate(
    [
      { transform: 'translate(-50%, 0) scale(0.6)', opacity: 0 },
      { transform: 'translate(-50%, -18px) scale(1.15)', opacity: 1, offset: 0.2 },
      { transform: 'translate(-50%, -70px) scale(1)', opacity: 0 },
    ],
    { duration: cls.includes('crit') ? 1200 : 900, easing: 'cubic-bezier(.2,.7,.3,1)' },
  ).onfinish = () => el.remove();
}

/** `from` é um ponto em coordenadas de viewport. */
export function flyCoins(from, goldTarget, count) {
  if (!goldTarget) return;
  const to = goldTarget.getBoundingClientRect();
  const tx = to.left + to.width / 2;
  const ty = to.top + to.height / 2;
  for (let i = 0; i < count; i++) {
    const coin = document.createElement('div');
    coin.className = 'coin';
    coin.style.left = `${from.x}px`;
    coin.style.top = `${from.y}px`;
    document.body.appendChild(coin);
    const spread = (Math.random() - 0.5) * 120;
    coin.animate(
      [
        { transform: 'translate(-50%,-50%) scale(0.4)', opacity: 0 },
        { transform: `translate(calc(-50% + ${spread}px), calc(-50% - 60px)) scale(1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(calc(-50% + ${tx - from.x}px), calc(-50% + ${ty - from.y}px)) scale(0.6)`, opacity: 0.9 },
      ],
      { duration: 750 + i * 60, delay: i * 45, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'backwards' },
    ).onfinish = () => {
      coin.remove();
      if (i === 0) {
        sfx('coin');
        goldTarget.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.25)', color: '#ffe680' }, { transform: 'scale(1)' }],
          { duration: 300 },
        );
      }
    };
  }
}

export function coinCount(gold) {
  return Math.min(6, Math.max(1, Math.ceil(gold / 8)));
}

export function levelUpBurst(layer, x, y, level) {
  const burst = document.createElement('div');
  burst.className = 'levelup';
  burst.style.left = `${x}px`;
  burst.style.top = `${y}px`;
  burst.innerHTML = `<span class="levelup__ring"></span><span class="levelup__ring delay"></span><strong>Nível ${level}!</strong>`;
  layer.appendChild(burst);
  setTimeout(() => burst.remove(), 1600);
}

export function shake(el, strength = 6) {
  el.animate(
    [
      { transform: 'translate(0,0)' },
      { transform: `translate(${-strength}px,${strength / 2}px)` },
      { transform: `translate(${strength - 1}px,${-strength / 2}px)` },
      { transform: 'translate(0,0)' },
    ],
    { duration: 220 },
  );
}
