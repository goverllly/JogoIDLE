import { StudioBtn } from "./studio/studio-ui";
import type { AdminZone } from "./admin-types";

type AdminLootPanelProps = {
  dropPct: number;
  refineDropPct: string;
  zones: AdminZone[];
  onOpenLiveOps: () => void;
  onGoSimulate: () => void;
};

export function AdminLootPanel({
  dropPct,
  refineDropPct,
  zones,
  onOpenLiveOps,
  onGoSimulate,
}: AdminLootPanelProps) {
  return (
    <div className="ops">
      <div className="ops-explain">
        <article>
          <h3>Pool por tier</h3>
          <p>O motor sorteia dentro do pool global daquele tier. Cada item entra com o próprio peso do catálogo.</p>
        </article>
        <article>
          <h3>Zona e boss</h3>
          <p>A zona pode substituir a chance global. O boss multiplica essa chance. Não existe loot individual por monstro.</p>
        </article>
        <article>
          <h3>Chance global</h3>
          <strong>{dropPct.toFixed(1)}%</strong>
          <StudioBtn type="button" variant="gold" onClick={onOpenLiveOps}>Editar em Live Ops</StudioBtn>
        </article>
        <article>
          <h3>Refinador no boss</h3>
          <strong>{refineDropPct}%</strong>
          <StudioBtn type="button" onClick={onGoSimulate}>Abrir simulador</StudioBtn>
        </article>
      </div>
      <section className="ops-panel">
        <div className="ops-panel__head">
          <h3>Chance por zona</h3>
          <p>Somente leitura. A chance de cada zona continua sendo editada em Zonas.</p>
        </div>
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Zona</th>
                <th>Chance</th>
                <th>Tier</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.id}>
                  <td>{zone.name}</td>
                  <td className={zone.dropChance == null ? "is-global" : "is-override"}>
                    {zone.dropChance == null ? "Global" : `${Math.round(Number(zone.dropChance) * 1000) / 10}%`}
                  </td>
                  <td>{zone.tier ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
