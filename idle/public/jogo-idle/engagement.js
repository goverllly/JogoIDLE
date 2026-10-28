/**
 * Painel de missões de engajamento ↔ IDLE (participação, não performance).
 */
export function createEngagementUI({ button, badge, eventChip, getState, onClaim, onToast }) {
  const root = document.createElement('div');
  root.id = 'idle-engagement';
  root.className = 'idle-engagement hidden';
  root.innerHTML = `
    <div class="idle-engagement__backdrop" data-act="close"></div>
    <div class="idle-engagement__panel" role="dialog" aria-modal="true" aria-labelledby="engagement-title">
      <header class="idle-engagement__head">
        <div>
          <p class="idle-engagement__eyebrow">IDLE</p>
          <h2 id="engagement-title">Missões de participação</h2>
        </div>
        <button type="button" class="idle-engagement__close" data-act="close" aria-label="Fechar">✕</button>
      </header>
      <p class="idle-engagement__hint">Bônus de engajamento — não medem desempenho.</p>
      <p class="idle-engagement__hint idle-engagement__vault">Cofre offline: o farm continua até 2h; o progresso é resgatado ao reabrir o jogo.</p>
      <div class="idle-engagement__bonus" id="engagement-bonus-line"></div>
      <div class="idle-engagement__list" id="engagement-list"></div>
    </div>
  `;
  document.body.appendChild(root);

  let lastSnapshot = '';
  /** Latch do evento admin se o poll perder o label antes de endsAt. */
  let latchedEvent = null;

  function close() {
    root.classList.add('hidden');
  }

  function open() {
    render({ force: true });
    root.classList.remove('hidden');
  }

  function missionSnapshot(engagement, titles) {
    const m = engagement?.missions || {};
    return JSON.stringify({
      xp: engagement?.xpMult,
      gold: engagement?.goldMult,
      drop: engagement?.dropMult,
      label: engagement?.label,
      eventLabel: engagement?.eventLabel,
      eventEndsAt: engagement?.eventEndsAt,
      plantao: engagement?.plantaoToday,
      titles,
      checkIn: m.checkInClaimed,
      ftAvail: m.flowtimeAvailable,
      ftClaim: m.flowtimeClaimed,
    });
  }

  function resolveEvent(engagement) {
    const now = Date.now();
    if (engagement?.eventLabel && engagement?.eventEndsAt) {
      const ends = Date.parse(engagement.eventEndsAt);
      if (Number.isFinite(ends) && ends > now) {
        latchedEvent = { label: engagement.eventLabel, endsAt: engagement.eventEndsAt };
      }
    } else if (latchedEvent) {
      const ends = Date.parse(latchedEvent.endsAt);
      if (!Number.isFinite(ends) || ends <= now) latchedEvent = null;
    }
    if (engagement?.eventLabel) {
      return { label: engagement.eventLabel, endsAt: engagement.eventEndsAt || latchedEvent?.endsAt || null };
    }
    if (latchedEvent) return latchedEvent;
    return null;
  }

  function formatEnds(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '';
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  /** Countdown vivo: mm:ss se <1h, senão Xh Ym. */
  function formatCountdown(iso) {
    if (!iso) return '';
    const ends = Date.parse(iso);
    if (!Number.isFinite(ends)) return '';
    const ms = ends - Date.now();
    if (ms <= 0) return 'encerrado';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h >= 1) return `${h}h ${String(m).padStart(2, '0')}m`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updateEventChip(event) {
    if (!eventChip) return;
    if (!event) {
      eventChip.classList.add('hidden');
      eventChip.textContent = '';
      return;
    }
    const cd = formatCountdown(event.endsAt);
    const until = formatEnds(event.endsAt);
    eventChip.classList.remove('hidden');
    if (cd && cd !== 'encerrado') {
      eventChip.textContent = `Evento: ${event.label} · ${cd}`;
      eventChip.title = until ? `Até ${until}` : event.label;
    } else {
      eventChip.textContent = until ? `Evento: ${event.label} · até ${until}` : `Evento: ${event.label}`;
      eventChip.title = eventChip.textContent;
    }
  }

  function render(opts = {}) {
    const { engagement, character } = getState() || {};
    const line = root.querySelector('#engagement-bonus-line');
    const list = root.querySelector('#engagement-list');
    if (!engagement) {
      line.textContent = 'Carregando bônus…';
      if (opts.force) list.innerHTML = '';
      return;
    }

    const titles = character?.engagementTitles || [];
    const snap = missionSnapshot(engagement, titles);
    const event = resolveEvent(engagement);
    updateEventChip(event);

    if (badge) {
      const active =
        Boolean(event?.label) ||
        Boolean(engagement.plantaoToday) ||
        engagement.xpMult > 1 ||
        engagement.goldMult > 1 ||
        engagement.dropMult > 1;
      badge.classList.toggle('hidden', !active);
      badge.textContent = engagement.plantaoToday
        ? 'Plantão'
        : event?.label
          ? 'Evento'
          : 'Bônus';
      badge.title = engagement.label || event?.label || 'Bônus de participação ativo';
    }

    if (!opts.force && snap === lastSnapshot) return;
    lastSnapshot = snap;

    const parts = [];
    if (engagement.xpMult > 1 || engagement.goldMult > 1 || engagement.dropMult > 1) {
      parts.push(
        `Farm: XP ×${engagement.xpMult} · Ouro ×${engagement.goldMult}` +
          (engagement.dropMult > 1 ? ` · Drop ×${engagement.dropMult}` : ''),
      );
    }
    if (engagement.label) parts.push(engagement.label);
    if (titles.length) parts.push(`Títulos: ${titles.join(', ')}`);
    line.textContent = parts.length ? parts.join(' · ') : 'Nenhum bônus ativo no momento.';

    const missions = engagement.missions || {};
    const cards = [
      {
        kind: 'checkin',
        title: 'Check-in do dia',
        desc: 'Abra o IDLE e resgate ouro uma vez por dia.',
        done: missions.checkInClaimed,
        enabled: !missions.checkInClaimed,
      },
      {
        kind: 'flowtime',
        title: 'Participação TicTac',
        desc: 'Com qualquer lançamento TicTac hoje: ouro + boost de drop até o fim do dia.',
        done: missions.flowtimeClaimed,
        enabled: !missions.flowtimeClaimed && missions.flowtimeAvailable,
        locked: !missions.flowtimeClaimed && !missions.flowtimeAvailable,
      },
    ];

    const modalOpen = !root.classList.contains('hidden');
    if (!modalOpen && !opts.force) {
      /* Badge/chip já atualizados; evita rebuild do modal fechado. */
      return;
    }

    list.innerHTML = '';
    for (const m of cards) {
      const card = document.createElement('div');
      card.className = 'idle-engagement__offer';
      let status = 'Resgatar';
      if (m.done) status = 'Resgatado';
      else if (m.locked) status = 'Registre no TicTac';
      card.innerHTML = `
        <div class="idle-engagement__offer-body">
          <strong>${m.title}</strong>
          <p>${m.desc}</p>
        </div>
        <button type="button" class="idle-engagement__buy" data-kind="${m.kind}" ${m.enabled ? '' : 'disabled'}>${status}</button>
      `;
      const btn = card.querySelector('button');
      btn?.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await onClaim(m.kind);
          lastSnapshot = '';
          render({ force: true });
        } catch (err) {
          onToast?.(err.message || 'Falha ao resgatar');
          btn.disabled = !m.enabled;
        }
      });
      list.appendChild(card);
    }
  }

  root.addEventListener('click', (e) => {
    if (e.target?.dataset?.act === 'close') close();
  });
  button?.addEventListener('click', () => open());

  return { open, close, render, update: render };
}
