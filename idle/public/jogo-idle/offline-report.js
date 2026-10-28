/**
 * Relatório de Caça Offline — modal navy/dourado.
 * Consolida chunks pelo catchUpId do servidor até catchUpPending=false.
 * sessionStorage só evita reexibir o mesmo relatório na sessão do browser.
 *
 * Copy de limite: comunica o teto de 2h sem atribuir qualquer gap
 * elapsed−rewarded só ao teto (desmaio, manutenção, pending, etc.).
 */

const SHOWN_PREFIX = 'jogo_idle_offline_shown:';
const MIN_REWARDED_MS = 60_000;
const MAX_EVENTS = 80;

/** Espelha o teto de catch-up do motor (comunicação apenas — não altera farm). */
export const OFFLINE_CATCH_UP_CAP_MS = 2 * 60 * 60 * 1000;

export const OFFLINE_CATCH_UP_GENERAL =
  'Você pode recuperar até 2 horas de caça offline por período de ausência. O tempo efetivamente recompensado depende das condições do personagem e pode ser menor.';

export const OFFLINE_CATCH_UP_OVER_CAP =
  'O tempo além do limite de 2 horas não gera recompensas de caça.';

/**
 * Observação do teto só quando a ausência ultrapassa 2h — nunca por
 * `elapsed > rewarded` isoladamente (faint/manutenção/pending também encurtam).
 * @param {number} elapsedSinceLastMs
 */
export function shouldShowOfflineCapNote(elapsedSinceLastMs) {
  return Number(elapsedSinceLastMs) > OFFLINE_CATCH_UP_CAP_MS;
}

/**
 * @param {{ elapsedSinceLastMs?: number }} summary
 * @returns {{ general: string, overCap: string | null }}
 */
export function offlineCatchUpNotes(summary) {
  const elapsed = Number(summary?.elapsedSinceLastMs) || 0;
  return {
    general: OFFLINE_CATCH_UP_GENERAL,
    overCap: shouldShowOfflineCapNote(elapsed) ? OFFLINE_CATCH_UP_OVER_CAP : null,
  };
}

function characterIdFromCatchUpId(catchUpId) {
  if (!catchUpId || typeof catchUpId !== 'string') return null;
  const idx = catchUpId.indexOf(':');
  if (idx <= 0) return null;
  return catchUpId.slice(0, idx);
}

function formatDurationMs(ms) {
  const totalSec = Math.max(0, Math.floor(Number(ms) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return s > 0 ? `${m}min ${s}s` : `${m}min`;
  return `${s}s`;
}

function fmt(n) {
  return new Intl.NumberFormat('pt-BR').format(Math.floor(Number(n) || 0));
}

function emptySummary(catchUpId, characterId) {
  return {
    catchUpId,
    characterId,
    zoneId: null,
    zoneName: null,
    ticks: 0,
    kills: 0,
    xpGained: 0,
    goldGained: 0,
    drops: 0,
    dropsKept: 0,
    dropsAutoSold: 0,
    rewardedMs: 0,
    elapsedSinceLastMs: 0,
    levelBefore: null,
    levelAfter: null,
    bossKills: 0,
    faints: 0,
    eventsTruncated: false,
    events: [],
    log: [],
    catchUpPending: true,
  };
}

function mergeFarmChunk(summary, chunk) {
  if (!chunk?.catchUpId || chunk.catchUpId !== summary.catchUpId) return summary;
  const nextEvents = [...summary.events, ...(chunk.events || [])];
  const truncated =
    summary.eventsTruncated || Boolean(chunk.eventsTruncated) || nextEvents.length > MAX_EVENTS;
  const levelBefore =
    summary.levelBefore == null
      ? chunk.levelBefore ?? null
      : chunk.levelBefore != null
        ? Math.min(summary.levelBefore, chunk.levelBefore)
        : summary.levelBefore;
  const levelAfter =
    chunk.levelAfter != null
      ? summary.levelAfter == null
        ? chunk.levelAfter
        : Math.max(summary.levelAfter, chunk.levelAfter)
      : summary.levelAfter;

  return {
    ...summary,
    zoneId: chunk.zoneId ?? summary.zoneId,
    zoneName: chunk.zoneName ?? summary.zoneName,
    ticks: summary.ticks + (Number(chunk.ticks) || 0),
    kills: summary.kills + (Number(chunk.kills) || 0),
    xpGained: summary.xpGained + (Number(chunk.xpGained) || 0),
    goldGained: summary.goldGained + (Number(chunk.goldGained) || 0),
    drops: summary.drops + (Number(chunk.drops) || 0),
    dropsKept: summary.dropsKept + (Number(chunk.dropsKept) || 0),
    dropsAutoSold: summary.dropsAutoSold + (Number(chunk.dropsAutoSold) || 0),
    rewardedMs: summary.rewardedMs + (Number(chunk.rewardedMs) || Number(chunk.windowMs) || 0),
    elapsedSinceLastMs:
      summary.elapsedSinceLastMs > 0
        ? summary.elapsedSinceLastMs
        : Number(chunk.elapsedSinceLastMs) || 0,
    levelBefore,
    levelAfter,
    bossKills: summary.bossKills + (Number(chunk.bossKills) || 0),
    faints: summary.faints + (Number(chunk.faints) || 0),
    eventsTruncated: truncated,
    events: nextEvents.slice(-MAX_EVENTS),
    log: [...summary.log, ...(chunk.log || [])].slice(-60),
    catchUpPending: Boolean(chunk.catchUpPending),
  };
}

function shouldPresent(summary) {
  if (!summary?.catchUpId || summary.catchUpPending) return false;
  return summary.rewardedMs >= MIN_REWARDED_MS;
}

function wasShown(catchUpId) {
  try {
    return Boolean(sessionStorage.getItem(SHOWN_PREFIX + catchUpId));
  } catch {
    return false;
  }
}

function markShown(catchUpId) {
  try {
    sessionStorage.setItem(SHOWN_PREFIX + catchUpId, '1');
  } catch {
    /* private mode */
  }
}

function rarityClass(rarity) {
  const r = String(rarity || 'common').toLowerCase();
  if (['legendary', 'epic', 'rare', 'uncommon', 'common'].includes(r)) return r;
  return 'common';
}

function collectTreasureRows(summary) {
  const rows = [];
  for (const ev of summary.events || []) {
    if (!ev || typeof ev !== 'object') continue;
    if (ev.type === 'drop' || ev.type === 'drop_held') {
      rows.push({
        kind: 'drop',
        name: ev.name || 'Item',
        rarity: rarityClass(ev.rarity),
        autoSold: Number(ev.autoSoldFor) > 0,
        autoSoldFor: Number(ev.autoSoldFor) || 0,
        held: Boolean(ev.held),
        special: ['rare', 'epic', 'legendary'].includes(rarityClass(ev.rarity)),
      });
    } else if (ev.type === 'pet_equip') {
      rows.push({
        kind: 'pet_equip',
        name: ev.name || 'Equipado pelo pet',
        rarity: rarityClass(ev.rarity),
        special: false,
      });
    } else if (ev.type === 'pet_sell' && Number(ev.count) > 0) {
      rows.push({
        kind: 'pet_sell',
        name: `Pet vendeu ${ev.count} item(ns)`,
        rarity: 'common',
        autoSoldFor: Number(ev.gold) || 0,
        special: false,
      });
    }
  }
  return rows;
}

/**
 * @param {{ getCharacterId?: () => string | null }} opts
 */
export function createOfflineReportUI(opts = {}) {
  let accum = null;
  let refreshSeq = 0;

  const root = document.createElement('div');
  root.id = 'idle-offline-report';
  root.className = 'idle-offline-report hidden';
  root.innerHTML = `
    <div class="idle-offline-report__backdrop" data-act="close"></div>
    <div class="idle-offline-report__panel panel-frame" role="dialog" aria-modal="true" aria-labelledby="offline-report-title">
      <header class="idle-offline-report__head">
        <div>
          <p class="idle-offline-report__eyebrow">Relatório de caça</p>
          <h2 id="offline-report-title">Caça offline</h2>
        </div>
        <button type="button" class="idle-offline-report__close" data-act="close" aria-label="Fechar">✕</button>
      </header>
      <div class="idle-offline-report__body" id="offline-report-body"></div>
      <footer class="idle-offline-report__foot">
        <button type="button" class="idle-offline-report__cta" data-act="close">Continuar aventura</button>
      </footer>
    </div>
  `;
  document.body.appendChild(root);

  const body = root.querySelector('#offline-report-body');

  function close() {
    root.classList.add('hidden');
  }

  root.addEventListener('click', (e) => {
    const act = e.target?.closest?.('[data-act]')?.getAttribute('data-act');
    if (act === 'close') close();
  });

  function render(summary, characterName) {
    const treasures = collectTreasureRows(summary);
    const levelLine =
      summary.levelBefore != null &&
      summary.levelAfter != null &&
      summary.levelAfter > summary.levelBefore
        ? `<li><span>Níveis</span><strong>${summary.levelBefore} → ${summary.levelAfter}</strong></li>`
        : summary.levelAfter != null
          ? `<li><span>Nível</span><strong>${summary.levelAfter}</strong></li>`
          : '';

    const combatExtra = [];
    if (summary.bossKills > 0) {
      combatExtra.push(
        `<li><span>Bosses</span><strong>${fmt(summary.bossKills)}</strong></li>`,
      );
    }
    if (summary.faints > 0) {
      combatExtra.push(
        `<li><span>Desmaios</span><strong>${fmt(summary.faints)}</strong></li>`,
      );
    }

    const treasureHtml =
      treasures.length === 0
        ? `<p class="idle-offline-report__empty">Nenhum item destacado neste trecho do histórico.</p>`
        : `<ul class="idle-offline-report__loot">${treasures
            .map((t) => {
              const tags = [];
              if (t.autoSold) tags.push(`vendido +${fmt(t.autoSoldFor)} ouro`);
              if (t.held) tags.push('pet segurou');
              if (t.kind === 'pet_equip') tags.push('pet equipou');
              if (t.kind === 'pet_sell') tags.push('ação do pet');
              return `<li class="rarity-${t.rarity}${t.special ? ' is-special' : ''}">
                <span class="loot-name">${escapeHtml(t.name)}</span>
                ${tags.length ? `<small>${tags.join(' · ')}</small>` : ''}
              </li>`;
            })
            .join('')}</ul>`;

    const partialNote = summary.eventsTruncated
      ? `<p class="idle-offline-report__note">Histórico visual parcial — contadores de XP, ouro e abates refletem o processamento completo.</p>`
      : '';

    const keptNote =
      summary.dropsKept > 0 || summary.dropsAutoSold > 0
        ? `<p class="idle-offline-report__note muted">Drops: ${fmt(summary.dropsKept)} guardados · ${fmt(summary.dropsAutoSold)} vendidos automaticamente (totais do processamento).</p>`
        : '';

    const catchUpNotes = offlineCatchUpNotes(summary);
    const catchUpNoteHtml = `
      <p class="idle-offline-report__note idle-offline-report__catchup">${escapeHtml(catchUpNotes.general)}</p>
      ${
        catchUpNotes.overCap
          ? `<p class="idle-offline-report__note idle-offline-report__catchup-cap">${escapeHtml(catchUpNotes.overCap)}</p>`
          : ''
      }
    `;

    body.innerHTML = `
      <section class="idle-offline-report__meta">
        <p><span>Personagem</span><strong>${escapeHtml(characterName || 'Heroi')}</strong></p>
        <p><span>Área</span><strong>${escapeHtml(summary.zoneName || 'Caça')}</strong></p>
        <p><span>Tempo de caça contabilizado</span><strong>${formatDurationMs(summary.rewardedMs)}</strong></p>
        ${
          summary.elapsedSinceLastMs > summary.rewardedMs + 5_000
            ? `<p><span>Tempo decorrido</span><strong>${formatDurationMs(summary.elapsedSinceLastMs)}</strong></p>`
            : ''
        }
        ${catchUpNoteHtml}
      </section>

      <section class="idle-offline-report__block">
        <h3>Progressão</h3>
        <ul class="idle-offline-report__stats">
          <li><span>XP</span><strong>+${fmt(summary.xpGained)}</strong></li>
          <li><span>Ouro</span><strong>+${fmt(summary.goldGained)}</strong></li>
          ${levelLine}
        </ul>
      </section>

      <section class="idle-offline-report__block">
        <h3>Combate</h3>
        <ul class="idle-offline-report__stats">
          <li><span>Monstros derrotados</span><strong>${fmt(summary.kills)}</strong></li>
          ${combatExtra.join('')}
        </ul>
      </section>

      <section class="idle-offline-report__block">
        <h3>Tesouros encontrados</h3>
        ${treasureHtml}
        ${keptNote}
        ${partialNote}
      </section>
    `;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function open(summary, characterName) {
    try {
      render(summary, characterName);
      root.classList.remove('hidden');
      markShown(summary.catchUpId);
    } catch (err) {
      console.warn('[idle] falha ao exibir relatório offline', err);
      close();
    }
  }

  /**
   * Chamado a cada /me. Deve ser seguro: erros não quebram o jogo.
   * @returns {number} seq da chamada (para descartar respostas fora de ordem)
   */
  function beginRefresh() {
    refreshSeq += 1;
    return refreshSeq;
  }

  function ingest(farm, character, seq) {
    try {
      if (seq != null && seq !== refreshSeq) return; // resposta velha
      const characterId = character?.id || opts.getCharacterId?.() || null;
      if (!characterId) return;

      if (accum && accum.characterId !== characterId) {
        accum = null;
      }

      if (!farm?.catchUpId) return;
      const owner = characterIdFromCatchUpId(farm.catchUpId);
      if (owner && owner !== characterId) return;
      if (wasShown(farm.catchUpId)) return;

      if (!accum || accum.catchUpId !== farm.catchUpId) {
        accum = emptySummary(farm.catchUpId, characterId);
      }
      accum = mergeFarmChunk(accum, farm);

      if (!farm.catchUpPending && shouldPresent(accum)) {
        open(accum, character?.name);
        accum = null;
      } else if (!farm.catchUpPending) {
        accum = null;
      }
    } catch (err) {
      console.warn('[idle] ingest relatório offline', err);
    }
  }

  function reset() {
    accum = null;
  }

  return { ingest, beginRefresh, reset, close, open };
}
