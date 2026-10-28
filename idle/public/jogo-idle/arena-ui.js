import { confirmDialog } from './confirm-dialog.js';

/**
 * Modal da Arena — lista online, desafio com aposta, aceitar/recusar.
 */
export function createArenaUI({
  button,
  getState,
  onEnter,
  onLeave,
  onRefreshPlayers,
  onChallenge,
  onRespond,
  onForfeit,
  onToast,
}) {
  const root = document.createElement('div');
  root.id = 'idle-arena';
  root.className = 'idle-arena hidden';
  root.innerHTML = `
    <div class="idle-arena__backdrop" data-act="close"></div>
    <div class="idle-arena__panel" role="dialog" aria-modal="true" aria-labelledby="arena-title">
      <header class="idle-arena__head">
        <div>
          <p class="idle-arena__eyebrow">Arena</p>
          <h2 id="arena-title">Duelos com aposta</h2>
        </div>
        <button type="button" class="idle-arena__close" data-act="close" aria-label="Fechar">✕</button>
      </header>
      <p class="idle-arena__hint">Entre na Arena (pausa a caça), desafie alguém online e apostem gold. Só o ouro do pot muda — sem XP. Você pode sair a qualquer momento (cancela desafio / abandona duelo).</p>
      <div class="idle-arena__toolbar">
        <button type="button" class="idle-arena__btn idle-arena__btn--gold" data-act="toggle-arena">Entrar na Arena</button>
        <button type="button" class="idle-arena__btn" data-act="refresh">Atualizar</button>
      </div>
      <div id="arena-pending" class="idle-arena__pending hidden"></div>
      <div class="idle-arena__list" id="arena-list"></div>
    </div>
  `;
  document.body.appendChild(root);

  const list = root.querySelector('#arena-list');
  const pendingEl = root.querySelector('#arena-pending');
  const toggleBtn = root.querySelector('[data-act="toggle-arena"]');
  let players = [];
  let challengeTarget = null;

  function close() {
    root.classList.add('hidden');
    challengeTarget = null;
  }

  function open() {
    root.classList.remove('hidden');
    void refresh();
  }

  function toast(msg) {
    if (onToast) onToast(msg);
  }

  async function refresh() {
    const state = getState() || {};
    const inArena = Boolean(state.arena?.inArena || state.character?.arenaMode);
    toggleBtn.textContent = inArena ? 'Sair da Arena' : 'Entrar na Arena';
    toggleBtn.classList.toggle('idle-arena__btn--gold', !inArena);
    toggleBtn.classList.toggle('idle-arena__btn--danger', inArena);

    renderPending(state.duel);
    if (onRefreshPlayers) {
      try {
        players = (await onRefreshPlayers()) || [];
      } catch (err) {
        toast(err.message);
        players = [];
      }
    }
    renderList(inArena, state.character);
  }

  function renderPending(duel) {
    if (!duel || (duel.status !== 'PENDING' && duel.status !== 'ACTIVE')) {
      pendingEl.classList.add('hidden');
      pendingEl.innerHTML = '';
      return;
    }
    pendingEl.classList.remove('hidden');
    const stake = Number(duel.stake || 0).toLocaleString('pt-BR');
    if (duel.status === 'PENDING' && duel.role === 'opponent') {
      pendingEl.innerHTML = `
        <div class="idle-arena__challenge">
          <strong>${duel.foe?.name || 'Jogador'} desafiou você</strong>
          <p>Aposta: ${stake} gold (pot ${(duel.stake * 2).toLocaleString('pt-BR')})</p>
          <div class="idle-arena__challenge-actions">
            <button type="button" class="idle-arena__btn idle-arena__btn--gold" data-act="accept">Aceitar</button>
            <button type="button" class="idle-arena__btn idle-arena__btn--danger" data-act="decline">Recusar</button>
          </div>
        </div>
      `;
      pendingEl.querySelector('[data-act="accept"]')?.addEventListener('click', () => void respond(true, duel.id));
      pendingEl.querySelector('[data-act="decline"]')?.addEventListener('click', () => void respond(false, duel.id));
      return;
    }
    if (duel.status === 'PENDING' && duel.role === 'challenger') {
      pendingEl.innerHTML = `
        <div class="idle-arena__challenge">
          <strong>Aguardando ${duel.foe?.name || 'oponente'}…</strong>
          <p>Aposta: ${stake} gold · expira em até 60s</p>
          <button type="button" class="idle-arena__btn" data-act="cancel">Cancelar</button>
        </div>
      `;
      pendingEl.querySelector('[data-act="cancel"]')?.addEventListener('click', () => void forfeit());
      return;
    }
    pendingEl.innerHTML = `
      <div class="idle-arena__challenge">
        <strong>Duelo ativo contra ${duel.foe?.name || 'oponente'}</strong>
        <button type="button" class="idle-arena__btn idle-arena__btn--danger" data-act="forfeit">Desistir</button>
      </div>
    `;
    pendingEl.querySelector('[data-act="forfeit"]')?.addEventListener('click', () => void forfeit());
  }

  function renderList(inArena, character) {
    list.innerHTML = '';
    if (!inArena) {
      list.innerHTML = '<p class="idle-arena__empty">Entre na Arena para ver jogadores e desafiar.</p>';
      return;
    }
    if (!players.length) {
      list.innerHTML = '<p class="idle-arena__empty">Ninguém online no momento.</p>';
      return;
    }
    const myGold = Number(character?.gold || 0);
    for (const p of players) {
      const card = document.createElement('article');
      card.className = 'idle-arena__offer';
      const maxStake = Math.min(myGold, Number(p.gold) || 0);
      card.innerHTML = `
        <div class="idle-arena__offer-ico" aria-hidden="true">${p.inArena ? '⚔' : '○'}</div>
        <div class="idle-arena__offer-body">
          <strong></strong>
          <p></p>
          <small></small>
        </div>
        <button type="button" class="idle-arena__buy" ${maxStake < 100 ? 'disabled' : ''}>Desafiar</button>
      `;
      card.querySelector('strong').textContent = p.name;
      card.querySelector('p').textContent = `Lv. ${p.level} · ${p.classId || ''}`;
      card.querySelector('small').textContent = p.inArena
        ? `Na Arena · até ${maxStake.toLocaleString('pt-BR')} gold`
        : `Online · até ${maxStake.toLocaleString('pt-BR')} gold`;
      const btn = card.querySelector('button');
      btn.addEventListener('click', () => void openChallenge(p, maxStake));
      list.appendChild(card);
    }
  }

  async function openChallenge(player, maxStake) {
    if (maxStake < 100) {
      toast('Saldo insuficiente para duelo');
      return;
    }
    challengeTarget = player;
    const suggested = Math.min(1000, maxStake);
    const raw = window.prompt(
      `Apostar quanto gold contra ${player.name}? (mín. 100, máx. ${maxStake.toLocaleString('pt-BR')})`,
      String(suggested),
    );
    if (raw == null) return;
    const stake = Math.floor(Number(String(raw).replace(/\D/g, '')) || 0);
    if (stake < 100 || stake > maxStake) {
      toast('Aposta inválida');
      return;
    }
    const ok = await confirmDialog({
      title: 'Desafio de Arena',
      message: `Desafiar ${player.name} por ${stake.toLocaleString('pt-BR')} gold?`,
      confirmLabel: 'Desafiar',
      cancelLabel: 'Cancelar',
    });
    if (!ok) return;
    try {
      await onChallenge(player.characterId, stake);
      toast(`Desafio enviado a ${player.name}`);
      await refresh();
    } catch (err) {
      toast(err.message);
    }
  }

  async function respond(accept, duelId) {
    try {
      const data = await onRespond(duelId, accept);
      toast(data?.message || (accept ? 'Duelo iniciado' : 'Recusado'));
      await refresh();
      return data;
    } catch (err) {
      toast(err.message);
    }
  }

  async function forfeit() {
    try {
      await onForfeit();
      toast('Duelo cancelado');
      await refresh();
    } catch (err) {
      toast(err.message);
    }
  }

  toggleBtn.addEventListener('click', async () => {
    const state = getState() || {};
    const inArena = Boolean(state.arena?.inArena || state.character?.arenaMode);
    try {
      if (inArena) {
        const duel = state.duel;
        if (duel?.status === 'PENDING' || duel?.status === 'ACTIVE') {
          const ok = await confirmDialog({
            title: 'Sair da Arena',
            message:
              duel.status === 'ACTIVE'
                ? 'Há um duelo ativo. Sair abandona o combate e o adversário fica com o pot. Continuar?'
                : 'Há um desafio pendente. Sair cancela o desafio. Continuar?',
            confirmLabel: 'Sair mesmo assim',
            cancelLabel: 'Ficar',
          });
          if (!ok) return;
        }
        await onLeave();
      } else {
        await onEnter();
      }
      await refresh();
    } catch (err) {
      toast(err.message);
    }
  });

  root.querySelector('[data-act="refresh"]')?.addEventListener('click', () => void refresh());
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="close"]')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !root.classList.contains('hidden')) close();
  });
  button?.addEventListener('click', () => open());

  return {
    open,
    close,
    refresh,
    syncFromMe(data) {
      // Atualiza banner de desafio sem abrir o modal
      if (data?.duel) renderPending(data.duel);
      const inArena = Boolean(data?.arena?.inArena || data?.character?.arenaMode);
      toggleBtn.textContent = inArena ? 'Sair da Arena' : 'Entrar na Arena';
      if (data?.duel?.status === 'PENDING' && data.duel.role === 'opponent' && root.classList.contains('hidden')) {
        // Pisca atenção via toast uma vez é responsabilidade do app.js
      }
    },
  };
}
