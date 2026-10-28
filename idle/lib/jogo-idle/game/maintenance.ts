/**
 * Trava global do Jogo IDLE.
 * Persistida em `__world.maintenance` no catálogo (mesmo singleton das outras réplicas).
 * O relógio da caça desconta o intervalo [since, releasedAt) para não pagar o tempo parado.
 */

export const DEFAULT_MAINTENANCE_MESSAGE =
  "O jogo está em manutenção. Personagens e caça ficam indisponíveis até a liberação. Seus personagens continuam salvos.";

const MESSAGE_MAX = 240;

export type GameMaintenance = {
  enabled: boolean;
  message: string;
  since: string | null;
  releasedAt: string | null;
};

const EMPTY: GameMaintenance = {
  enabled: false,
  message: DEFAULT_MAINTENANCE_MESSAGE,
  since: null,
  releasedAt: null,
};

let state: GameMaintenance = { ...EMPTY };

function sanitizeMessage(value: unknown): string {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MESSAGE_MAX);
  return text;
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

export function getGameMaintenance(): GameMaintenance {
  return { ...state };
}

/** Payload público (lobby e admin). */
export function publicGameMaintenance() {
  const current = getGameMaintenance();
  return {
    enabled: current.enabled,
    message: current.message || DEFAULT_MAINTENANCE_MESSAGE,
    since: current.since,
  };
}

export function maintenanceSnapshot(): GameMaintenance {
  return getGameMaintenance();
}

export function applyGameMaintenance(raw: unknown): GameMaintenance {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    state = { ...EMPTY };
    return getGameMaintenance();
  }
  const row = raw as Record<string, unknown>;
  const enabled = row.enabled === true;
  let since = isoOrNull(row.since);
  if (enabled && !since) since = new Date(0).toISOString();
  state = {
    enabled,
    message: sanitizeMessage(row.message) || DEFAULT_MAINTENANCE_MESSAGE,
    since,
    releasedAt: isoOrNull(row.releasedAt),
  };
  return getGameMaintenance();
}

export function setGameMaintenance(input: {
  enabled: boolean;
  message?: string;
}): GameMaintenance {
  const enabled = input.enabled === true;
  const message =
    sanitizeMessage(input.message) || state.message || DEFAULT_MAINTENANCE_MESSAGE;
  if (enabled) {
    state = {
      enabled: true,
      message,
      since: state.enabled && state.since ? state.since : new Date().toISOString(),
      releasedAt: null,
    };
  } else if (state.enabled) {
    state = {
      enabled: false,
      message,
      since: state.since,
      releasedAt: new Date().toISOString(),
    };
  } else {
    state = { ...state, enabled: false, message };
  }
  return getGameMaintenance();
}

/**
 * Milissegundos de [lastMs, nowMs] que caem dentro da manutenção e não devem virar caça.
 */
export function maintenanceSkippedMs(
  lastMs: number,
  nowMs: number,
  maintenance: GameMaintenance = getGameMaintenance(),
): number {
  if (!Number.isFinite(lastMs) || !Number.isFinite(nowMs) || nowMs <= lastMs) return 0;
  if (!maintenance.since) {
    return maintenance.enabled ? nowMs - lastMs : 0;
  }
  const since = Date.parse(maintenance.since);
  if (!Number.isFinite(since)) return maintenance.enabled ? nowMs - lastMs : 0;
  const lockEnd = maintenance.enabled
    ? nowMs
    : maintenance.releasedAt
      ? Date.parse(maintenance.releasedAt)
      : NaN;
  if (!Number.isFinite(lockEnd)) return 0;
  const start = Math.max(lastMs, since);
  const stop = Math.min(nowMs, lockEnd);
  return Math.max(0, stop - start);
}
