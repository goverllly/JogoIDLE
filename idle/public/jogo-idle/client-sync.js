/**
 * Ordenação de snapshots /me vs mutações do jogador.
 *
 * Separação:
 * 1. Snapshot do personagem — só se revision for mais nova que a aplicada.
 * 2. Eventos de farm — só se a revision da resposta não for mais antiga que a HUD
 *    e o lote ainda não foi apresentado (fingerprint).
 * 3. Visual (scene.play) — segue a política de eventos.
 * 4. Respostas obsoletas — character/events ignorados.
 *
 * AbortController no browser NÃO cancela processFarm já iniciado no servidor.
 */

/**
 * Compara revisions do store (`ISO` ou `ISO#seq`).
 * @param {string | null | undefined} a
 * @param {string | null | undefined} b
 * @returns {number} negative se a<b, 0 se iguais, positive se a>b
 */
export function compareRevision(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  const sa = String(a);
  const sb = String(b);
  if (sa === sb) return 0;

  const parse = (s) => {
    const i = s.lastIndexOf('#');
    if (i <= 0) return { iso: s, seq: 0 };
    const seq = Number(s.slice(i + 1));
    return {
      iso: s.slice(0, i),
      seq: Number.isFinite(seq) ? seq : 0,
    };
  };
  const pa = parse(sa);
  const pb = parse(sb);
  if (pa.iso < pb.iso) return -1;
  if (pa.iso > pb.iso) return 1;
  return pa.seq - pb.seq;
}

/**
 * Fingerprint de um lote de eventos (sem cookies/tokens).
 * @param {{ catchUpId?: string|null, events?: any[], ticks?: number, kills?: number, rewardedMs?: number }} farm
 */
export function farmBatchKey(farm) {
  if (!farm) return '';
  const ev = farm.events || [];
  const last = ev[ev.length - 1];
  return [
    farm.catchUpId || '',
    farm.ticks || 0,
    farm.kills || 0,
    farm.rewardedMs || 0,
    ev.length,
    last?.type || '',
    last?.t ?? '',
  ].join('|');
}

export function createClientSync() {
  /** @type {string | null} */
  let appliedRevision = null;
  /** @type {string} */
  let lastFarmKey = '';
  let refreshEpoch = 0;
  let pendingMutations = 0;
  let inFlight = false;
  let queued = false;
  /** @type {Promise<void>} */
  let gate = Promise.resolve();

  function getAppliedRevision() {
    return appliedRevision;
  }

  function beginMutation() {
    pendingMutations += 1;
    return pendingMutations;
  }

  function endMutation() {
    pendingMutations = Math.max(0, pendingMutations - 1);
  }

  /**
   * @param {{ id?: string, revision?: string|null } | null | undefined} character
   */
  function acceptCharacterSnapshot(character) {
    if (!character?.id) return false;
    const rev = character.revision ?? null;
    if (rev == null) {
      if (pendingMutations > 0) return false;
      return true;
    }
    const cmp = compareRevision(rev, appliedRevision);
    if (appliedRevision != null && cmp < 0) return false;
    if (appliedRevision != null && cmp === 0 && pendingMutations > 0) return false;
    appliedRevision = rev;
    return true;
  }

  /**
   * @param {{ revision?: string|null } | null | undefined} character
   */
  function noteMutationResult(character) {
    endMutation();
    if (character?.revision) {
      if (appliedRevision == null || compareRevision(character.revision, appliedRevision) >= 0) {
        appliedRevision = character.revision;
      }
    }
  }

  /**
   * @param {object | null | undefined} farm
   * @param {string | null | undefined} responseRevision
   */
  function acceptFarmPresentation(farm, responseRevision) {
    if (!farm) return false;
    if (responseRevision != null && appliedRevision != null) {
      if (compareRevision(responseRevision, appliedRevision) < 0) return false;
    }
    const key = farmBatchKey(farm);
    if (!key || key === lastFarmKey) return false;
    const hasWork =
      (farm.events && farm.events.length > 0) ||
      Boolean(farm.catchUpId) ||
      (Number(farm.ticks) || 0) > 0;
    if (!hasWork) {
      lastFarmKey = key;
      return false;
    }
    lastFarmKey = key;
    return true;
  }

  function beginRefresh() {
    refreshEpoch += 1;
    return refreshEpoch;
  }

  function isRefreshCurrent(epoch) {
    return epoch === refreshEpoch;
  }

  /**
   * Uma refresh por vez; se chegar outra durante o voo, executa exatamente mais uma ao final.
   * Callers coalescidos recebem a mesma Promise (inclui a execução trailing).
   * @param {(epoch: number) => Promise<void>} fn
   * @returns {Promise<void>}
   */
  function runRefreshExclusive(fn) {
    if (inFlight) {
      queued = true;
      return gate;
    }
    inFlight = true;
    gate = (async () => {
      try {
        do {
          queued = false;
          const epoch = beginRefresh();
          await fn(epoch);
        } while (queued);
      } finally {
        inFlight = false;
      }
    })();
    return gate;
  }

  function reset() {
    appliedRevision = null;
    lastFarmKey = '';
    refreshEpoch = 0;
    pendingMutations = 0;
    inFlight = false;
    queued = false;
    gate = Promise.resolve();
  }

  return {
    getAppliedRevision,
    beginMutation,
    endMutation,
    noteMutationResult,
    acceptCharacterSnapshot,
    acceptFarmPresentation,
    beginRefresh,
    isRefreshCurrent,
    runRefreshExclusive,
    reset,
  };
}
