
import { useEffect, useState } from "react";
import { StudioBadge, StudioCard, StudioEmpty } from "./studio/studio-ui";
import type { AdminZone, SeasonSummary } from "./admin-types";

type AdminActionRow = {
  id: string;
  at: string;
  adminEmail: string;
  action: string;
  summary: string;
};

type AdminOverviewProps = {
  zones: AdminZone[];
  itemCount: number;
  dropChance: number;
  activeCharacterCount: number;
  currentSeason: SeasonSummary | null;
  targetLabel?: string;
  idleFetch: (path: string, init?: RequestInit) => Promise<any>;
};

export function AdminOverviewPanel({
  zones,
  itemCount,
  dropChance,
  activeCharacterCount,
  currentSeason,
  targetLabel,
  idleFetch,
}: AdminOverviewProps) {
  const [actions, setActions] = useState<AdminActionRow[]>([]);
  const [creatureCount, setCreatureCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [act, snap] = await Promise.all([
          idleFetch("/api/jogo-idle/admin/actions?limit=12"),
          idleFetch("/api/jogo-idle/admin/world-snapshot"),
        ]);
        if (cancelled) return;
        setActions(Array.isArray(act?.actions) ? act.actions : []);
        const n = snap?.snapshot?.counts?.creatures;
        setCreatureCount(typeof n === "number" ? n : null);
      } catch {
        if (!cancelled) {
          setActions([]);
          setCreatureCount(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idleFetch]);

  const monsterFallback = zones.reduce(
    (acc, z) => acc + (z.monsters?.length || 0) + (z.boss ? 1 : 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="studio-2-section-title mb-0 text-[1.15rem] text-[var(--studio-gold)]">
            Visão Geral
          </h2>
          <p className="text-[0.72rem] text-[var(--studio-muted)]">
            Central operacional — apenas métricas com fonte real no backend.
          </p>
        </div>
        {targetLabel ? (
          <StudioCard className="min-w-[180px] py-2" label="Alvo ativo" value={<span className="text-base">{targetLabel}</span>} />
        ) : null}
      </div>
      <div className="studio-2-kpi-grid">
        <StudioCard label="Zonas" value={zones.length} hint="IDs fixos (Fase 1)" />
        <StudioCard
          label="Monstros"
          value={creatureCount ?? monsterFallback}
          hint="Projetados das zonas"
        />
        <StudioCard label="Itens" value={itemCount} hint="Templates do catálogo" />
        <StudioCard
          label="Drop global"
          value={`${(Math.round(dropChance * 1000) / 10).toFixed(1)}%`}
          hint="Chance base de gear"
        />
        <StudioCard
          label="Temporada"
          value={currentSeason ? `${currentSeason.year}-T${currentSeason.quarter}` : "—"}
          hint={currentSeason?.status || "Sem temporada OPEN"}
        />
        <StudioCard
          label="Personagens ativos"
          value={activeCharacterCount}
          hint="Com sessão recente no admin"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <StudioCard>
          <h3 className="studio-2-section-title">Atividade recente</h3>
          {loading ? (
            <StudioEmpty>Carregando auditoria…</StudioEmpty>
          ) : actions.length === 0 ? (
            <StudioEmpty>Nenhuma ação administrativa registrada.</StudioEmpty>
          ) : (
            <ul className="space-y-2 text-sm">
              {actions.map((a) => (
                <li
                  key={a.id}
                  className="border-b border-[rgba(96,140,190,0.2)] pb-2 last:border-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StudioBadge>{a.action}</StudioBadge>
                    <span className="text-[0.7rem] text-[var(--studio-muted)]">
                      {new Date(a.at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.78rem]">{a.summary}</p>
                  <p className="text-[0.65rem] text-[var(--studio-muted)]">{a.adminEmail}</p>
                </li>
              ))}
            </ul>
          )}
        </StudioCard>

        <StudioCard>
          <h3 className="studio-2-section-title">Pipeline de conteúdo</h3>
          <p className="mb-2 text-[0.72rem] text-[var(--studio-muted)]">
            Fluxo draft → revisão → publicado chega na Fase 4. Hoje as alterações
            aplicam-se ao vivo via overrides.
          </p>
          <div className="studio-2-pipeline" aria-disabled="true">
            {["Rascunho", "Em revisão", "Publicado"].map((col) => (
              <div key={col} className="studio-2-pipeline__col">
                <h4>{col}</h4>
                <p className="text-[0.68rem] text-[var(--studio-muted)]">Disponível na Fase 4</p>
              </div>
            ))}
          </div>
        </StudioCard>
      </div>
    </div>
  );
}
