import { StudioEmpty } from "./studio/studio-ui";
import type { SeasonSummary } from "./admin-types";

type AdminSeasonPanelProps = {
  seasonLoading: boolean;
  currentSeason: SeasonSummary | null;
};

export function AdminSeasonPanel({ seasonLoading, currentSeason }: AdminSeasonPanelProps) {
  return (
    <div className="ops">
      <header className="ops-head">
        <div>
          <p className="ed-kicker">Live Ops</p>
          <h2>Temporada</h2>
        </div>
        <span className="ed-phase is-dirty">Reset indisponível</span>
      </header>
      {seasonLoading ? <StudioEmpty>Carregando temporada…</StudioEmpty> : null}
      {!seasonLoading && !currentSeason ? (
        <StudioEmpty>Nenhuma temporada aberta foi devolvida pelo servidor.</StudioEmpty>
      ) : null}
      {currentSeason ? (
        <section className="ops-panel">
          <div className="ops-panel__head">
            <h3>{currentSeason.label || currentSeason.slug}</h3>
            <p>Identificador {currentSeason.slug}. O encerramento com reset de personagens não está implementado neste standalone. Não há botão para essa operação.</p>
          </div>
          <dl className="ops-facts">
            <div><dt>Estado</dt><dd>{currentSeason.status}</dd></div>
            <div><dt>Ano</dt><dd>{currentSeason.year}</dd></div>
            <div><dt>Trimestre</dt><dd>T{currentSeason.quarter}</dd></div>
            <div><dt>Aberta em</dt><dd>{currentSeason.openedAt ? new Date(currentSeason.openedAt).toLocaleString("pt-BR") : "—"}</dd></div>
            <div><dt>Encerrada em</dt><dd>{currentSeason.closedAt ? new Date(currentSeason.closedAt).toLocaleString("pt-BR") : "—"}</dd></div>
            <div><dt>Notas</dt><dd>{currentSeason.notes || "—"}</dd></div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}
