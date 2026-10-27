/**
 * Helpers puros do Relatório de Caça Offline (consolidação de chunks).
 * Espelhados no cliente (`public/sinergia-idle/offline-report.js`).
 */

export type FarmCatchUpChunk = {
  ticks?: number;
  kills?: number;
  xpGained?: number;
  goldGained?: number;
  drops?: number;
  dropsKept?: number;
  dropsAutoSold?: number;
  windowMs?: number;
  elapsedSinceLastMs?: number;
  rewardedMs?: number;
  zoneId?: string | null;
  zoneName?: string | null;
  levelBefore?: number | null;
  levelAfter?: number | null;
  bossKills?: number;
  faints?: number;
  eventsTruncated?: boolean;
  catchUpId?: string | null;
  catchUpPending?: boolean;
  events?: Array<Record<string, unknown>>;
  log?: string[];
};

export type OfflineReportSummary = {
  catchUpId: string;
  characterId: string;
  zoneId: string | null;
  zoneName: string | null;
  ticks: number;
  kills: number;
  xpGained: number;
  goldGained: number;
  drops: number;
  dropsKept: number;
  dropsAutoSold: number;
  /** Soma dos rewardedMs dos chunks (tempo efetivamente processado). */
  rewardedMs: number;
  /**
   * Tempo decorrido na abertura da recuperação (1º chunk).
   * Não é “ausência real” — é now−lastTickAt no início do catch-up.
   */
  elapsedSinceLastMs: number;
  levelBefore: number | null;
  levelAfter: number | null;
  bossKills: number;
  faints: number;
  eventsTruncated: boolean;
  events: Array<Record<string, unknown>>;
  log: string[];
  catchUpPending: boolean;
};

/** Relatório relevante: recuperação identificada e ≥1 min de caça contabilizada. */
export const OFFLINE_REPORT_MIN_REWARDED_MS = 60_000;

export function characterIdFromCatchUpId(catchUpId: string | null | undefined): string | null {
  if (!catchUpId || typeof catchUpId !== "string") return null;
  const idx = catchUpId.indexOf(":");
  if (idx <= 0) return null;
  return catchUpId.slice(0, idx);
}

export function emptyOfflineSummary(
  catchUpId: string,
  characterId: string,
): OfflineReportSummary {
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

/**
 * Mescla um chunk no acumulador. Não soma elapsedSinceLastMs (só o do 1º chunk).
 * Eventos: concatena com teto visual (cliente pode truncar de novo na UI).
 */
export function mergeFarmChunk(
  summary: OfflineReportSummary,
  chunk: FarmCatchUpChunk,
  opts?: { maxEvents?: number },
): OfflineReportSummary {
  if (!chunk?.catchUpId || chunk.catchUpId !== summary.catchUpId) return summary;
  const maxEvents = opts?.maxEvents ?? 80;
  const nextEvents = [...summary.events, ...(chunk.events || [])];
  const truncated =
    summary.eventsTruncated ||
    Boolean(chunk.eventsTruncated) ||
    nextEvents.length > maxEvents;

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
    events: nextEvents.slice(-maxEvents),
    log: [...summary.log, ...(chunk.log || [])].slice(-60),
    catchUpPending: Boolean(chunk.catchUpPending),
  };
}

export function shouldPresentOfflineReport(summary: OfflineReportSummary | null | undefined): boolean {
  if (!summary?.catchUpId) return false;
  if (summary.catchUpPending) return false;
  return summary.rewardedMs >= OFFLINE_REPORT_MIN_REWARDED_MS;
}

export function formatDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(Number(ms) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return s > 0 ? `${m}min ${s}s` : `${m}min`;
  return `${s}s`;
}
