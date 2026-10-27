/**
 * Confirmação in-game não bloqueante (não usa window.confirm — o farm continua).
 * @returns {Promise<boolean>}
 */
export function confirmDialog({
  title = 'Confirmar',
  message = '',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  rarity = null,
} = {}) {
  return new Promise((resolve) => {
    const existing = document.getElementById('idle-confirm');
    if (existing) existing.remove();

    const root = document.createElement('div');
    root.id = 'idle-confirm';
    root.className = 'idle-confirm';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML = `
      <div class="idle-confirm__backdrop" data-act="cancel"></div>
      <div class="idle-confirm__panel${rarity ? ` r-${rarity}` : ''}">
        <p class="idle-confirm__eyebrow">${escapeHtml(title)}</p>
        <p class="idle-confirm__msg">${escapeHtml(message)}</p>
        <div class="idle-confirm__actions">
          <button type="button" class="idle-confirm__btn idle-confirm__btn--ghost" data-act="cancel">${escapeHtml(cancelLabel)}</button>
          <button type="button" class="idle-confirm__btn idle-confirm__btn--ok${danger ? ' idle-confirm__btn--danger' : ''}" data-act="ok">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;

    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKey);
      root.remove();
      resolve(value);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') finish(false);
      if (e.key === 'Enter') finish(true);
    };

    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'ok') finish(true);
      if (act === 'cancel') finish(false);
    });

    document.addEventListener('keydown', onKey);
    document.body.appendChild(root);
    root.querySelector('.idle-confirm__btn--ok')?.focus();
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
