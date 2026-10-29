import { useCallback, useEffect, useState } from "react";
import { StudioBtn, StudioEmpty } from "./studio/studio-ui";

type RetentionSlice = { retained: number; rate: number | null; cohortSize: number };

type RichMetrics = {
  asOfDay: string;
  generatedAt: string;
  goals: { flowtimeClaimRatePct: number; d7RetentionPct: number };
  snapshotToday: {
    activeCharacters: number;
    distinctUsersWithCharacter: number;
    checkIns: number;
    flowtimeClaims: number;
    flowtimeEligibleUsers: number;
    flowtimeClaimRate: number | null;
    bridgeOpened: number;
    bridgeRate: number | null;
    note: string;
  };
  last14Days: {
    day: string;
    checkIns: number;
    flowtimeClaims: number;
    flowtimeEligible: number;
    flowtimeClaimRate: number | null;
    bridgeOpened: number;
    bridgeRate: number | null;
  }[];
  retention: {
    cohortSize: number;
    d1: RetentionSlice;
    d7: RetentionSlice;
    d30: RetentionSlice;
    note: string;
  };
  recentClaims: { id: string; userId: number; characterId: string; kind: string; day: string; at: string }[];
};

type StubMetrics = { claimsTotal?: number; uniqueClaimers?: number; note?: string };

function pct(rate: number | null | undefined) {
  if (rate == null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function isRich(value: unknown): value is RichMetrics {
  return Boolean(value && typeof value === "object" && "snapshotToday" in value && (value as RichMetrics).snapshotToday);
}

export function AdminEngagementPanel({ idleFetch }: { idleFetch: (path: string, init?: RequestInit) => Promise<any> }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<RichMetrics | null>(null);
  const [stub, setStub] = useState<StubMetrics | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await idleFetch("/api/jogo-idle/admin/engagement-metrics");
      if (!data?.success || !data.metrics) throw new Error(data?.error || "Falha ao carregar métricas");
      if (isRich(data.metrics)) {
        setMetrics(data.metrics);
        setStub(null);
      } else {
        setMetrics(null);
        setStub(data.metrics as StubMetrics);
      }
    } catch (err) {
      setMetrics(null);
      setStub(null);
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [idleFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="ops">
      <header className="ops-head">
        <div>
          <p className="ed-kicker">Live Ops</p>
          <h2>Engajamento</h2>
        </div>
        <StudioBtn type="button" disabled={loading} onClick={() => void load()}>{loading ? "Atualizando…" : "Atualizar"}</StudioBtn>
      </header>
      {error ? <p className="ed-note">{error}</p> : null}
      {loading && !metrics && !stub ? <StudioEmpty>Carregando métricas…</StudioEmpty> : null}
      {stub ? (
        <section className="ops-panel">
          <div className="ops-panel__head">
            <h3>Métricas indisponíveis neste standalone</h3>
            <p>{stub.note || "O servidor não devolveu série histórica, metas nem retenção."}</p>
          </div>
          <dl className="ops-facts">
            <div><dt>Claims</dt><dd>{stub.claimsTotal ?? 0}</dd></div>
            <div><dt>Claimers</dt><dd>{stub.uniqueClaimers ?? 0}</dd></div>
          </dl>
        </section>
      ) : null}
      {metrics ? (
        <>
          <p className="ed-note">Dia {metrics.asOfDay} · gerado {new Date(metrics.generatedAt).toLocaleString("pt-BR")}</p>
          <div className="ops-kpis">
            <article className="ops-kpi"><span>Claim FlowTime</span><strong>{pct(metrics.snapshotToday.flowtimeClaimRate)}</strong><small>meta ≥ {metrics.goals.flowtimeClaimRatePct}%</small></article>
            <article className="ops-kpi"><span>Retenção D7</span><strong>{pct(metrics.retention.d7.rate)}</strong><small>meta ≥ {metrics.goals.d7RetentionPct}%</small></article>
            <article className="ops-kpi"><span>D1</span><strong>{pct(metrics.retention.d1.rate)}</strong><small>{metrics.retention.d1.retained}/{metrics.retention.d1.cohortSize}</small></article>
            <article className="ops-kpi"><span>D30</span><strong>{pct(metrics.retention.d30.rate)}</strong><small>{metrics.retention.d30.retained}/{metrics.retention.d30.cohortSize}</small></article>
            <article className="ops-kpi"><span>Check-ins hoje</span><strong>{metrics.snapshotToday.checkIns}</strong><small>{metrics.snapshotToday.note}</small></article>
            <article className="ops-kpi"><span>Claims hoje</span><strong>{metrics.snapshotToday.flowtimeClaims}</strong><small>{metrics.snapshotToday.flowtimeEligibleUsers} elegíveis</small></article>
          </div>
          <section className="ops-panel">
            <div className="ops-panel__head"><h3>Últimos 14 dias</h3><p>{metrics.retention.note}</p></div>
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr><th>Dia</th><th>Check-in</th><th>Claims</th><th>Elegíveis</th><th>Claim</th><th>Bridge</th></tr>
                </thead>
                <tbody>
                  {metrics.last14Days.map((row) => (
                    <tr key={row.day}>
                      <td>{row.day}</td>
                      <td>{row.checkIns}</td>
                      <td>{row.flowtimeClaims}</td>
                      <td>{row.flowtimeEligible}</td>
                      <td>{pct(row.flowtimeClaimRate)}</td>
                      <td>{pct(row.bridgeRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="ops-panel">
            <div className="ops-panel__head"><h3>Claims recentes</h3></div>
            {metrics.recentClaims.length === 0 ? <StudioEmpty>Nenhum claim gravado.</StudioEmpty> : (
              <ul className="ops-activity">
                {metrics.recentClaims.map((claim) => (
                  <li key={claim.id}>
                    <strong>{claim.kind}</strong>
                    <span>{claim.day}</span>
                    <small>{new Date(claim.at).toLocaleString("pt-BR")}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
