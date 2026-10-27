/**
 * Painel Desempenho de Caça — navy/dourado.
 * Comparação: Registrar referência salva snapshot e reinicia a janela no servidor
 * (períodos independentes).
 */

const REF_KEY_PREFIX = 'sinergia_idle_hunt_ref:';

function fmt(n, digits = 0) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(n));
}

function fmtDuration(ms) {
  const totalSec = Math.max(0, Math.floor(Number(ms) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return s > 0 ? `${m}min ${s}s` : `${m}min`;
  return `${s}s`;
}

function fmtTtk(ms) {
  if (ms == null || !Number.isFinite(ms)) return '—';
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
}

function rateOrCollecting(value, ready, digits = 0) {
  if (!ready || value == null) return 'Coletando…';
  return fmt(value, digits);
}

function deltaPct(curr, ref) {
  if (curr == null || ref == null || !Number.isFinite(curr) || !Number.isFinite(ref) || ref === 0) {
    return null;
  }
  return ((curr - ref) / Math.abs(ref)) * 100;
}

function loadRef(characterId) {
  if (!characterId) return null;
  try {
    const raw = localStorage.getItem(REF_KEY_PREFIX + characterId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1 || parsed.characterId !== characterId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveRef(characterId, payload) {
  try {
    localStorage.setItem(REF_KEY_PREFIX + characterId, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
}

function clearRef(characterId) {
  try {
    localStorage.removeItem(REF_KEY_PREFIX + characterId);
  } catch {
    /* */
  }
}

/**
 * @param {{ api: Function, onToast?: Function, getCharacter?: Function }} opts
 */
export function createHuntPerfUI(opts = {}) {
  const root = document.createElement('div');
  root.id = 'idle-hunt-perf';
  root.className = 'idle-hunt-perf hidden';
  root.innerHTML = `
    <div class="idle-hunt-perf__backdrop" data-act="close"></div>
    <div class="idle-hunt-perf__panel panel-frame" role="dialog" aria-modal="true" aria-labelledby="hunt-perf-title">
      <header class="idle-hunt-perf__head">
        <div>
          <p class="idle-hunt-perf__eyebrow">Desempenho de caça</p>
          <h2 id="hunt-perf-title">Eficiência da caça</h2>
        </div>
        <button type="button" class="idle-hunt-perf__close" data-act="close" aria-label="Fechar">✕</button>
      </header>
      <p class="idle-hunt-perf__disclaimer" id="hunt-perf-disclaimer"></p>
      <div class="idle-hunt-perf__body" id="hunt-perf-body"></div>
      <footer class="idle-hunt-perf__foot">
        <button type="button" class="idle-hunt-perf__btn" data-act="ref" title="Salva esta janela e inicia uma nova medição">Registrar referência</button>
        <button type="button" class="idle-hunt-perf__btn idle-hunt-perf__btn--ghost" data-act="reset">Reiniciar medição</button>
        <button type="button" class="idle-hunt-perf__btn idle-hunt-perf__btn--ghost" data-act="clear-ref">Limpar referência</button>
      </footer>
    </div>
  `;
  document.body.appendChild(root);

  const body = root.querySelector('#hunt-perf-body');
  const disclaimer = root.querySelector('#hunt-perf-disclaimer');
  let lastCharacter = null;

  function close() {
    root.classList.add('hidden');
  }

  function open() {
    render();
    root.classList.remove('hidden');
  }

  function card(label, value, unit, tip) {
    return `<article class="idle-hunt-perf__card" title="${escapeAttr(tip || '')}">
      <p class="idle-hunt-perf__card-label">${escapeHtml(label)}</p>
      <p class="idle-hunt-perf__card-value"><strong>${escapeHtml(value)}</strong>${
        unit ? `<span>${escapeHtml(unit)}</span>` : ''
      }</p>
    </article>`;
  }

  function row(label, value, tip) {
    return `<li title="${escapeAttr(tip || '')}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></li>`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  function render() {
    const c = opts.getCharacter?.() || lastCharacter;
    lastCharacter = c;
    const hp = c?.huntPerf;
    if (!hp) {
      body.innerHTML = `<p class="idle-hunt-perf__empty">Sem dados de desempenho ainda. Inicie uma caça.</p>`;
      disclaimer.textContent = '';
      return;
    }
    disclaimer.textContent = hp.disclaimer || '';

    const av = hp.availability || {};
    const dpsMain = av.dpsCombat
      ? { v: fmt(hp.dpsCombat, 1), u: 'DPS combate', tip: 'Dano efetivo ÷ tempo de combate processado' }
      : av.dpsEstimated
        ? {
            v: fmt(hp.dpsEstimated, 1),
            u: 'DPS estimado',
            tip: 'Estimativa de ataque básico (atributos + DEF do alvo). Não inclui skills.',
          }
        : { v: 'Coletando…', u: 'DPS', tip: 'Aguardando amostra' };

    const ref = loadRef(c.id);
    let compareHtml = '';
    if (ref) {
      const zoneWarn = ref.zoneId && hp.zoneId && ref.zoneId !== hp.zoneId;
      const diffs = [
        ['XP/h', deltaPct(hp.xpPerHour, ref.xpPerHour)],
        ['Ouro/h', deltaPct(hp.goldPerHour, ref.goldPerHour)],
        ['Kills/h', deltaPct(hp.killsPerHour, ref.killsPerHour)],
        ['DPS combate', deltaPct(hp.dpsCombat, ref.dpsCombat)],
      ]
        .filter(([, d]) => d != null)
        .map(([label, d]) => {
          const sign = d > 0 ? '+' : '';
          const cls = d > 0 ? 'is-up' : d < 0 ? 'is-down' : '';
          return `<li class="${cls}"><span>${label}</span><strong>${sign}${fmt(d, 1)}%</strong></li>`;
        })
        .join('');
      compareHtml = `
        <section class="idle-hunt-perf__block">
          <h3>Comparação com referência</h3>
          <p class="idle-hunt-perf__note">Ref. ${escapeHtml(ref.zoneName || '—')} · ${escapeHtml(
            fmtDuration(ref.huntMs),
          )} · ${escapeHtml(ref.capturedAt ? new Date(ref.capturedAt).toLocaleString('pt-BR') : '')}</p>
          ${
            zoneWarn
              ? `<p class="idle-hunt-perf__warn">Zona diferente da referência — comparação limitada (outros fatores também podem ter mudado).</p>`
              : ''
          }
          ${
            av.rates
              ? `<ul class="idle-hunt-perf__stats">${diffs || '<li><span>Aguardando amostra na nova janela</span><strong>—</strong></li>'}</ul>`
              : `<p class="idle-hunt-perf__note">Nova janela ainda coletando dados…</p>`
          }
          <p class="idle-hunt-perf__note">Diferenças não provam causa (equipamento, buffs, sorte de spawns, etc.).</p>
        </section>`;
    }

    body.innerHTML = `
      <ul class="idle-hunt-perf__meta">
        ${row('Janela', hp.windowLabel || 'Caça atual', 'Desde o início desta medição (não é wall-clock)')}
        ${row('Zona', hp.zoneName || '—', 'Área associada à medição')}
        ${row('Tempo de caça contabilizado', fmtDuration(hp.huntMs), 'Tempo processado pelo simulador (ticks)')}
        ${row('Tempo de combate', fmtDuration(hp.combatMs), 'Soma dos ticks em confronto com inimigos')}
        ${
          hp.offlineExcludedMs > 0
            ? row(
                'Catch-up offline excluído',
                fmtDuration(hp.offlineExcludedMs),
                'Recuperação offline não entra nas taxas deste painel',
              )
            : ''
        }
      </ul>

      <div class="idle-hunt-perf__grid">
        ${card('Experiência / hora', rateOrCollecting(hp.xpPerHour, av.rates, 0), 'XP/h', 'XP de combate ÷ tempo de caça contabilizado')}
        ${card('Ouro / hora', rateOrCollecting(hp.goldPerHour, av.rates, 0), 'Gold/h', 'Ouro de caça (combate + vendas auto) ÷ tempo de caça')}
        ${card('Abates / hora', rateOrCollecting(hp.killsPerHour, av.rates, 0), 'Inimigos/h', 'Abates ÷ tempo de caça contabilizado')}
        ${card(dpsMain.u, dpsMain.v, '', dpsMain.tip)}
      </div>

      <section class="idle-hunt-perf__block">
        <h3>Detalhes</h3>
        <ul class="idle-hunt-perf__stats">
          ${row('Monstros comuns', fmt(hp.killsCommon), 'Abates não-boss nesta janela')}
          ${row('Bosses', fmt(hp.bossKills), 'Chefes derrotados nesta janela')}
          ${row('Mortes', fmt(hp.faints), 'Desmaios durante a medição')}
          ${row('Ouro de combate', fmt(hp.goldCombat), 'Recompensa direta dos abates')}
          ${row('Ouro vendas auto', fmt((hp.goldPetSell || 0) + (hp.goldDropSold || 0)), 'Pet + drops vendidos automaticamente')}
          ${row(
            'TTK comuns',
            av.ttkCommon ? fmtTtk(hp.ttkCommonMs) : 'Coletando…',
            'Duração média dos confrontos concluídos (comuns)',
          )}
          ${row(
            'TTK bosses',
            av.ttkBoss ? fmtTtk(hp.ttkBossMs) : 'Coletando…',
            'Duração média dos confrontos de boss concluídos',
          )}
          ${row(
            'DPS estimado',
            av.dpsEstimated ? fmt(hp.dpsEstimated, 1) : '—',
            'Ataque básico esperado vs alvo atual (sem skills)',
          )}
          ${row(
            'Dano / s de caça',
            av.dpsHunt ? fmt(hp.dpsHunt, 1) : 'Coletando…',
            'Dano efetivo ÷ tempo de caça (não é DPS de combate)',
          )}
        </ul>
      </section>
      ${compareHtml}
    `;
  }

  async function resetMeasurement({ asReference } = {}) {
    const c = opts.getCharacter?.() || lastCharacter;
    if (!c?.id) return;
    if (asReference) {
      const hp = c.huntPerf;
      if (!hp?.availability?.rates) {
        opts.onToast?.('Amostra insuficiente para referência — continue caçando.');
        return;
      }
      saveRef(c.id, {
        v: 1,
        capturedAt: new Date().toISOString(),
        characterId: c.id,
        characterName: c.name,
        zoneId: hp.zoneId,
        zoneName: hp.zoneName,
        huntMs: hp.huntMs,
        combatMs: hp.combatMs,
        xpPerHour: hp.xpPerHour,
        goldPerHour: hp.goldPerHour,
        killsPerHour: hp.killsPerHour,
        dpsCombat: hp.dpsCombat,
        dpsEstimated: hp.dpsEstimated,
        ttkCommonMs: hp.ttkCommonMs,
        ttkBossMs: hp.ttkBossMs,
        faints: hp.faints,
        kills: hp.kills,
        bossKills: hp.bossKills,
      });
    }
    try {
      const data = await opts.api('/api/me/hunt-perf/reset', { method: 'POST', body: '{}' });
      if (data.character) {
        lastCharacter = data.character;
        opts.onCharacter?.(data.character);
      }
      opts.onToast?.(
        asReference
          ? 'Referência salva — nova janela de medição iniciada'
          : data.message || 'Medição reiniciada',
      );
      render();
    } catch (err) {
      opts.onToast?.(err.message || 'Falha ao reiniciar medição');
    }
  }

  root.addEventListener('click', (e) => {
    const act = e.target?.closest?.('[data-act]')?.getAttribute('data-act');
    if (act === 'close') close();
    else if (act === 'reset') void resetMeasurement({ asReference: false });
    else if (act === 'ref') void resetMeasurement({ asReference: true });
    else if (act === 'clear-ref') {
      const c = opts.getCharacter?.() || lastCharacter;
      if (c?.id) clearRef(c.id);
      opts.onToast?.('Referência limpa');
      render();
    }
  });

  function sync(character) {
    lastCharacter = character;
    if (!root.classList.contains('hidden')) render();
  }

  return { open, close, sync, render };
}
