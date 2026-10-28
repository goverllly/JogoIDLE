import { randomUUID } from "crypto";

export const SEASON_STATUS = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;

export type SeasonStatus = (typeof SEASON_STATUS)[keyof typeof SEASON_STATUS];

export type SeasonIdentity = {
  year: number;
  quarter: number;
  slug: string;
  label: string;
};

/** Quarter 1–4 a partir de um Date (UTC). */
export function quarterFromDate(date = new Date()): number {
  return Math.floor(date.getUTCMonth() / 3) + 1;
}

export function seasonIdentity(year: number, quarter: number): SeasonIdentity {
  const q = Math.max(1, Math.min(4, Math.floor(quarter)));
  const y = Math.floor(year);
  return {
    year: y,
    quarter: q,
    slug: `${y}-T${q}`,
    label: `Temporada ${y} · T${q}`,
  };
}

export function currentSeasonIdentity(date = new Date()): SeasonIdentity {
  return seasonIdentity(date.getUTCFullYear(), quarterFromDate(date));
}

/** Próxima temporada após year/quarter (T4 → T1 do ano seguinte). */
export function nextSeasonIdentity(year: number, quarter: number): SeasonIdentity {
  if (quarter >= 4) return seasonIdentity(year + 1, 1);
  return seasonIdentity(year, quarter + 1);
}

export function newSeasonId(): string {
  return randomUUID();
}

export function newRankingRowId(): string {
  return randomUUID();
}

/** Encerrar temporada exige exatamente uma OPEN. */
export function assertExactlyOneOpenSeason(openCount: number): void {
  if (openCount === 1) return;
  const error = new Error(
    openCount === 0
      ? "Nenhuma temporada aberta"
      : "Há mais de uma temporada OPEN — corrija antes de encerrar",
  );
  (error as Error & { status?: number }).status = 409;
  throw error;
}
