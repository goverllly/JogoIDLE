
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RetentionSlice = {
  retained: number;
  rate: number | null;
  cohortSize: number;
};

export type AdminEngagementMetrics = {
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
  recentClaims: {
    id: string;
    userId: number;
    characterId: string;
    kind: string;
    day: string;
    at: string;
  }[];
};

type AdminEngagementPanelProps = {
  idleFetch: (path: string, init?: RequestInit) => Promise<any>;
};

function pct(rate: number | null) {
  if (rate == null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function GoalBadge({
  value,
  goalPct,
  label,
}: {
  value: number | null;
  goalPct: number;
  label: string;
}) {
  const ok = value != null && value * 100 >= goalPct;
  const low = value != null && value * 100 < goalPct;
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        ok && "border-emerald-500/40 bg-emerald-500/10",
        low && "border-amber-500/40 bg-amber-500/10",
        value == null && "border-border/70 bg-muted/30",
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums text-foreground">{pct(value)}</p>
      <p className="text-[11px] text-muted-foreground">meta ≥ {goalPct}%</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function AdminEngagementPanel({ idleFetch }: AdminEngagementPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AdminEngagementMetrics | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await idleFetch("/api/jogo-idle/admin/engagement-metrics");
      if (!data?.success || !data.metrics) {
        throw new Error(data?.error || "Falha ao carregar métricas");
      }
      setMetrics(data.metrics as AdminEngagementMetrics);
    } catch (err) {
      setMetrics(null);
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [idleFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-3">
          <div>
            <CardTitle className="text-base">Engajamento e retenção</CardTitle>
            <CardDescription>
              Isca de participação (check-in / FlowTime) — não mede desempenho nem horas
              trabalhadas. Metas 90 dias: claim FlowTime ≥40% e D7 ≥25%.
            </CardDescription>
          </div>
          <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void load()}>
            {loading ? "Atualizando…" : "Atualizar"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {loading && !metrics ? (
            <p className="text-sm text-muted-foreground">Carregando métricas…</p>
          ) : null}
          {metrics ? (
            <>
              <p className="text-xs text-muted-foreground">
                Dia local {metrics.asOfDay} · gerado{" "}
                {new Date(metrics.generatedAt).toLocaleString("pt-BR")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <GoalBadge
                  label="Claim FlowTime (hoje)"
                  value={metrics.snapshotToday.flowtimeClaimRate}
                  goalPct={metrics.goals.flowtimeClaimRatePct}
                />
                <GoalBadge
                  label="Retenção D7"
                  value={metrics.retention.d7.rate}
                  goalPct={metrics.goals.d7RetentionPct}
                />
                <Stat label="Check-ins hoje" value={metrics.snapshotToday.checkIns} />
                <Stat
                  label="Bridge hoje"
                  value={pct(metrics.snapshotToday.bridgeRate)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Personagens ativos" value={metrics.snapshotToday.activeCharacters} />
                <Stat
                  label="Users com personagem"
                  value={metrics.snapshotToday.distinctUsersWithCharacter}
                />
                <Stat
                  label="Elegíveis FlowTime hoje"
                  value={metrics.snapshotToday.flowtimeEligibleUsers}
                />
                <Stat label="Claims FlowTime hoje" value={metrics.snapshotToday.flowtimeClaims} />
              </div>
              <p className="text-[11px] text-muted-foreground">{metrics.snapshotToday.note}</p>
            </>
          ) : null}
        </CardContent>
      </Card>

      {metrics ? (
        <>
          <Card className="border-border/70 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Retenção D1 / D7 / D30</CardTitle>
              <CardDescription>{metrics.retention.note}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["D1", metrics.retention.d1],
                    ["D7", metrics.retention.d7],
                    ["D30", metrics.retention.d30],
                  ] as const
                ).map(([label, slice]) => (
                  <div key={label} className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <p className="text-2xl font-semibold tabular-nums">{pct(slice.rate)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {slice.retained}/{slice.cohortSize} retidos (coorte madura)
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Últimos 14 dias</CardTitle>
              <CardDescription>
                Check-ins, claims FlowTime, elegíveis TicTac e bridge (abriu IDLE).
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Dia</th>
                    <th className="py-2 pr-2 font-medium">Check-in</th>
                    <th className="py-2 pr-2 font-medium">FT claim</th>
                    <th className="py-2 pr-2 font-medium">FT elegível</th>
                    <th className="py-2 pr-2 font-medium">Claim %</th>
                    <th className="py-2 pr-2 font-medium">Bridge %</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.last14Days.map((row) => (
                    <tr key={row.day} className="border-b border-border/40">
                      <td className="py-1.5 pr-2 tabular-nums">{row.day}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{row.checkIns}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{row.flowtimeClaims}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{row.flowtimeEligible}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{pct(row.flowtimeClaimRate)}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{pct(row.bridgeRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Claims recentes</CardTitle>
              <CardDescription>Últimos eventos gravados na telemetria.</CardDescription>
            </CardHeader>
            <CardContent>
              {!metrics.recentClaims.length ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum claim gravado ainda. Aparecem após check-in / FlowTime com a migration
                  aplicada.
                </p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {metrics.recentClaims.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 px-2.5 py-1.5"
                    >
                      <span>
                        <span className="font-medium">{c.kind}</span>
                        <span className="text-muted-foreground"> · user {c.userId}</span>
                        <span className="text-muted-foreground"> · {c.day}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.at).toLocaleString("pt-BR")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
