/**
 * Modal Legacy Celestial — parabenização pós-ritual + revisita no lobby.
 * @param {object} legacy — ascensionLegacy do personagem
 * @param {{ celebrate?: boolean }} opts — celebrate: true = confetes até fechar
 */

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(Number(ms) / 1000) || 0);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function formatNum(n) {
  return Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('pt-BR');
}

function formatWhen(iso) {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return String(iso);
  return new Date(t).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

let confettiTimer = null;
let confettiRoot = null;

function stopConfetti() {
  if (confettiTimer) {
    clearInterval(confettiTimer);
    confettiTimer = null;
  }
  if (confettiRoot) {
    confettiRoot.remove();
    confettiRoot = null;
  }
}

function startConfetti(host) {
  stopConfetti();
  confettiRoot = document.createElement('div');
  confettiRoot.className = 'celestial-legacy__confetti';
  confettiRoot.setAttribute('aria-hidden', 'true');
  host.appendChild(confettiRoot);

  const colors = ['#f4b52b', '#ffe9b0', '#42a5f5', '#ab47bc', '#66bb6a', '#ff7043', '#e8f0f8'];
  const spawn = () => {
    if (!confettiRoot || !confettiRoot.isConnected) return;
    for (let i = 0; i < 6; i++) {
      const piece = document.createElement('span');
      piece.className = 'celestial-legacy__piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = `${2.4 + Math.random() * 2.8}s`;
      piece.style.animationDelay = `${Math.random() * 0.4}s`;
      piece.style.width = `${6 + Math.random() * 8}px`;
      piece.style.height = `${8 + Math.random() * 10}px`;
      piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
      confettiRoot.appendChild(piece);
      piece.addEventListener('animationend', () => piece.remove());
    }
  };
  spawn();
  confettiTimer = setInterval(spawn, 280);
}

/**
 * @param {object|null} legacy
 * @param {{ celebrate?: boolean }} [opts]
 */
export function openCelestialLegacy(legacy, opts = {}) {
  const celebrate = Boolean(opts.celebrate);
  const existing = document.getElementById('celestial-legacy');
  if (existing) existing.remove();
  stopConfetti();

  const L = legacy && typeof legacy === 'object' ? legacy : {};
  const name = L.characterName || 'Herói';
  const className = L.className || L.classId || 'Aventureiro';

  const root = document.createElement('div');
  root.id = 'celestial-legacy';
  root.className = `celestial-legacy${celebrate ? ' celestial-legacy--celebrate' : ''}`;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'celestial-legacy-title');

  root.innerHTML = `
    <div class="celestial-legacy__backdrop" data-act="close"></div>
    <div class="celestial-legacy__panel panel-frame">
      <header class="celestial-legacy__head">
        <p class="celestial-legacy__eyebrow">Suco Divino · Ritual concluído</p>
        <h2 id="celestial-legacy-title">Parabéns, ${escapeHtml(name)}!</h2>
        <p class="celestial-legacy__sub">
          ${escapeHtml(className)} transcendeu o limiar mortal e tornou-se <strong>Celestial</strong>.
        </p>
      </header>
      <p class="celestial-legacy__when">
        Feito em ${escapeHtml(formatWhen(L.ascendedAt))}
      </p>
      <div class="celestial-legacy__grid">
        <article class="celestial-legacy__stat">
          <span class="celestial-legacy__label">Tempo até o feito</span>
          <strong>${escapeHtml(formatDuration(L.elapsedMs))}</strong>
        </article>
        <article class="celestial-legacy__stat">
          <span class="celestial-legacy__label">Tempo em caça</span>
          <strong>${escapeHtml(formatDuration(L.playMs))}</strong>
        </article>
        <article class="celestial-legacy__stat">
          <span class="celestial-legacy__label">Monstros derrotados</span>
          <strong>${escapeHtml(formatNum(L.kills))}</strong>
        </article>
        <article class="celestial-legacy__stat">
          <span class="celestial-legacy__label">Bosses derrotados</span>
          <strong>${escapeHtml(formatNum(L.bossKills))}</strong>
        </article>
        <article class="celestial-legacy__stat">
          <span class="celestial-legacy__label">Ouro obtido</span>
          <strong>${escapeHtml(formatNum(L.goldEarned))}</strong>
        </article>
        <article class="celestial-legacy__stat">
          <span class="celestial-legacy__label">Ouro gasto</span>
          <strong>${escapeHtml(formatNum(L.goldSpent))}</strong>
        </article>
        <article class="celestial-legacy__stat">
          <span class="celestial-legacy__label">Itens comprados</span>
          <strong>${escapeHtml(formatNum(L.itemsBought))}</strong>
        </article>
        <article class="celestial-legacy__stat">
          <span class="celestial-legacy__label">Nível no ritual</span>
          <strong>${escapeHtml(formatNum(L.levelAtRitual || 500))}</strong>
        </article>
      </div>
      <footer class="celestial-legacy__foot">
        <button type="button" class="celestial-legacy__close-btn" data-act="close">Fechar</button>
      </footer>
    </div>
  `;

  const close = () => {
    stopConfetti();
    document.removeEventListener('keydown', onKey);
    root.remove();
  };

  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="close"]')) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(root);

  if (celebrate) startConfetti(root);

  root.querySelector('.celestial-legacy__close-btn')?.focus();
  return { close };
}
