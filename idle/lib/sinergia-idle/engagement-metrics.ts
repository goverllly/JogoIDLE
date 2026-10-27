/** Standalone: telemetria de missões SinergIA desligada. */

export async function computeIdleEngagementMetrics() {
  return {
    days: [],
    claimRate: 0,
    note: "Métricas de engajamento SinergIA não estão ativas neste standalone.",
  };
}

export async function recordEngagementClaimEvent(_input: {
  userId: number;
  characterId: string;
  kind: string;
  day: string;
}) {
  /* no-op */
}
