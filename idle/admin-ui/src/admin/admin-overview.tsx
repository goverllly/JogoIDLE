import { useEffect, useState } from "react";
import { StudioIcon } from "./studio/studio-icons";
import { StudioBtn, StudioEmpty } from "./studio/studio-ui";
import type { AdminTabId, AdminZone, SeasonSummary } from "./admin-types";

type AdminActionRow = {
  id?: string;
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
  maintenanceEnabled: boolean;
  idleFetch: (path: string, init?: RequestInit) => Promise<any>;
  onOpenTab: (tab: AdminTabId) => void;
};

export function AdminOverviewPanel({
  zones,
  itemCount,
  dropChance,
  activeCharacterCount,
  currentSeason,
  maintenanceEnabled,
  idleFetch,
  onOpenTab,
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
          idleFetch("/api/jogo-idle/admin/actions?limit=8"),
          idleFetch("/api/jogo-idle/admin/world-snapshot"),
        ]);
        if (cancelled) return;
        setActions(Array.isArray(act?.actions) ? act.actions.slice(0, 8) : []);
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

  const monsterFallback = zones.reduce((acc, zone) => acc + (zone.monsters?.length || 0) + (zone.boss ? 1 : 0), 0);
  const cards: Array<{ icon: "zones" | "monsters" | "items" | "characters" | "season"; label: string; value: string | number; hint: string }> = [
    { icon: "zones", label: "Zonas", value: zones.length, hint: "Zonas carregadas no admin" },
    { icon: "monsters", label: "Monstros", value: creatureCount ?? monsterFallback, hint: creatureCount == null ? "Soma das listas de zona" : "Contagem do snapshot" },
    { icon: "items", label: "Itens", value: itemCount, hint: "Templates do catálogo" },
    { icon: "characters", label: "Jogadores", value: activeCharacterCount, hint: "Personagens ativos nesta sessão" },
    { icon: "season", label: "Temporada", value: currentSeason ? `${currentSeason.year} T${currentSeason.quarter}` : "—", hint: currentSeason ? `${currentSeason.status} · ${currentSeason.slug}` : "Nenhuma temporada aberta" },
  ];

  return (
    <div className="ops">
      <div className="ops-kpis">
        {cards.map((card) => (
          <article key={card.label} className="ops-kpi">
            <StudioIcon name={card.icon} />
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.hint}</small>
          </article>
        ))}
        <article className="ops-kpi">
          <StudioIcon name="loot" />
          <span>Drop global</span>
          <strong>{(Math.round(dropChance * 1000) / 10).toFixed(1)}%</strong>
          <small>Somente leitura. Edição em Live Ops.</small>
        </article>
      </div>
      <div className="ops-shortcuts" aria-label="Acesso rápido">
        <button type="button" onClick={() => onOpenTab("map")}><StudioIcon name="map" /><span><strong>Mundo</strong><small>Cenário da zona</small></span></button>
        <button type="button" onClick={() => onOpenTab("items")}><StudioIcon name="items" /><span><strong>Catálogo</strong><small>Itens e modelos</small></span></button>
        <button type="button" onClick={() => onOpenTab("characters")}><StudioIcon name="characters" /><span><strong>Jogadores</strong><small>Personagens ativos</small></span></button>
        <button type="button" onClick={() => onOpenTab("economy")}><StudioIcon name="economy" /><span><strong>Live Ops</strong><small>Drop, TTK e eventos</small></span></button>
      </div>
      <section className="ops-panel ops-activity-panel">
          <div className="ops-panel__head">
            <h3>Atividade recente</h3>
            <StudioBtn type="button" onClick={() => onOpenTab("logs")}>Abrir logs</StudioBtn>
          </div>
          {loading ? <StudioEmpty>Carregando auditoria…</StudioEmpty> : null}
          {!loading && actions.length === 0 ? <StudioEmpty>Nenhuma ação administrativa registrada.</StudioEmpty> : null}
          <ul className="ops-activity">
            {actions.map((row, index) => (
              <li key={row.id || `${row.at}-${index}`}>
                <strong>{row.action}</strong>
                <span>{row.summary}</span>
                <small>{row.adminEmail || "—"} · {row.at ? new Date(row.at).toLocaleString("pt-BR") : "—"}</small>
              </li>
            ))}
          </ul>
      </section>
    </div>
  );
}
