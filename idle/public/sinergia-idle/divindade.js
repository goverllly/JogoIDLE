import { confirmDialog } from './confirm-dialog.js';

/**
 * NPC Divindade — ritual de ascensão (10M gold + Suco Celestial).
 */
export function createDivindadeUI({ button, onAscend, getState, onToast }) {
  const root = document.createElement('div');
  root.id = 'idle-divindade';
  root.className = 'idle-divindade hidden';
  root.innerHTML = `
    <div class="idle-divindade__backdrop" data-act="close"></div>
    <div class="idle-divindade__panel panel-frame" role="dialog" aria-modal="true" aria-labelledby="divindade-title">
      <header class="idle-divindade__head">
        <div>
          <p class="idle-divindade__eyebrow">NPC</p>
          <h2 id="divindade-title">Divindade</h2>
        </div>
        <button type="button" class="idle-divindade__close" data-act="close" aria-label="Fechar">✕</button>
      </header>
      <p class="idle-divindade__hint" id="divindade-hint">
        Ofereça ouro e o <strong>Suco Divino</strong> (MEGA BOSS da Prova Divina).
        Você vira Celestial no nível 1, mantendo atributos e equipamento.
      </p>
      <div id="divindade-status" class="idle-divindade__status"></div>
      <button type="button" class="idle-divindade__ritual" id="divindade-ritual-btn" disabled>
        Realizar ritual
      </button>
    </div>
  `;
  document.body.appendChild(root);

  const statusEl = root.querySelector('#divindade-status');
  const ritualBtn = root.querySelector('#divindade-ritual-btn');
  const hintEl = root.querySelector('#divindade-hint');

  function close() {
    root.classList.add('hidden');
  }

  function open() {
    render();
    root.classList.remove('hidden');
  }

  function render() {
    const { character } = getState() || {};
    const d = character?.divindade || {};
    const goldCost = d.goldCost || 10_000_000;
    if (hintEl) {
      hintEl.innerHTML = `Ofereça <strong>${goldCost.toLocaleString('pt-BR')} gold</strong> e o <strong>Suco Divino</strong> (MEGA BOSS da Prova Divina). Você vira Celestial no nível 1, mantendo atributos e equipamento.`;
    }
    const gold = character?.gold || 0;
    const hasSuco = Boolean(d.hasSuco);
    const isCelestial = character?.ascension === 'CELESTIAL';
    const levelOk = (character?.level || 0) >= 500;
    const eligible = Boolean(d.eligible);

    if (isCelestial) {
      statusEl.innerHTML =
        '<p class="idle-divindade__ok">Você já transcendeu. A Divindade nada mais exige.</p>';
      ritualBtn.disabled = true;
      ritualBtn.textContent = 'Já é Celestial';
      return;
    }

    const rows = [
      {
        ok: levelOk,
        label: levelOk
          ? `Nível ${character?.level} (cap mortal atingido)`
          : `Nível ${character?.level || 0} / 500`,
      },
      {
        ok: gold >= goldCost,
        label: `${gold.toLocaleString('pt-BR')} / ${goldCost.toLocaleString('pt-BR')} gold`,
      },
      {
        ok: hasSuco,
        label: hasSuco ? 'Suco Divino na mochila' : 'Suco Divino ausente (Prova Divina)',
      },
    ];

    statusEl.innerHTML = rows
      .map(
        (r) =>
          `<p class="idle-divindade__req ${r.ok ? 'is-ok' : 'is-missing'}">${r.ok ? '✓' : '○'} ${r.label}</p>`,
      )
      .join('');

    ritualBtn.disabled = !eligible;
    ritualBtn.textContent = eligible ? 'Realizar ritual' : 'Requisitos incompletos';
  }

  ritualBtn.addEventListener('click', async () => {
    if (ritualBtn.disabled) return;
    const cost =
      getState()?.character?.divindade?.goldCost || 10_000_000;
    const ok = await confirmDialog({
      title: 'Ritual da Divindade',
      message: `Consumir ${Number(cost).toLocaleString('pt-BR')} gold e o Suco Divino? Você vira Celestial no nível 1 (atributos e equipamento permanecem).`,
      confirmLabel: 'Ascender',
      cancelLabel: 'Cancelar',
    });
    if (!ok) return;
    try {
      ritualBtn.disabled = true;
      await onAscend();
      render();
      close();
    } catch (err) {
      const msg = err?.message || 'Não foi possível concluir o ritual';
      if (typeof onToast === 'function') onToast(msg, 3500);
      else console.warn('[divindade]', msg);
      render();
    }
  });

  button?.addEventListener('click', () => open());
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="close"]')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !root.classList.contains('hidden')) close();
  });

  return { open, close, render };
}
