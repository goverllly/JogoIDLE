
import { FormEvent } from "react";
import { StudioBadge, StudioBtn, StudioCard } from "./studio/studio-ui";
import type { AdminZone } from "./admin-types";

type AdminLootPanelProps = {
  dropPct: number;
  zones: AdminZone[];
  working: boolean;
  onDropPctChange: (value: number) => void;
  onSaveDrop: (event: FormEvent) => void;
  onGoSimulate: () => void;
};

export function AdminLootPanel({
  dropPct,
  zones,
  working,
  onDropPctChange,
  onSaveDrop,
  onGoSimulate,
}: AdminLootPanelProps) {
  return (
    <div className="space-y-4">
      <StudioCard>
        <h3 className="studio-2-section-title">Modelo atual de drops</h3>
        <p className="text-[0.78rem] text-[var(--studio-muted)]">
          O motor usa um <strong>pool global por tier</strong> (templates do catálogo) e a
          chance da zona (ou o drop global). Boss multiplica a chance. Não há loot table
          por monstro nesta fase — isso chega na Fase 2 via Content Facade.
        </p>
        <ul className="mt-3 space-y-1 text-[0.78rem]">
          <li>
            <StudioBadge>Gear</StudioBadge> rollDrop(tier, classe) com peso{" "}
            <code>template.dropChance</code>
          </li>
          <li>
            <StudioBadge>Refinador</StudioBadge> chance no boss (
            <code>refineDropChance</code>)
          </li>
          <li>
            <StudioBadge>Poção / Suco</StudioBadge> regras especiais no combate
          </li>
        </ul>
      </StudioCard>

      <div className="grid gap-3 lg:grid-cols-2">
        <StudioCard>
          <h3 className="studio-2-section-title">Drop global</h3>
          <form onSubmit={onSaveDrop} className="mt-2 flex flex-wrap items-end gap-2">
            <div>
              <label className="studio-2-label" htmlFor="loot-drop-pct">
                Chance base (%)
              </label>
              <input
                id="loot-drop-pct"
                className="studio-2-input w-28"
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={dropPct}
                onChange={(e) => onDropPctChange(Number(e.target.value))}
              />
            </div>
            <StudioBtn variant="gold" disabled={working} type="submit">
              Salvar drop global
            </StudioBtn>
          </form>
        </StudioCard>

        <StudioCard>
          <h3 className="studio-2-section-title">Simulação</h3>
          <p className="mb-2 text-[0.72rem] text-[var(--studio-muted)]">
            Use o Simulador para estimar TTK e chance efetiva de drop (zona × boss).
          </p>
          <StudioBtn variant="gold" onClick={onGoSimulate}>
            Abrir simulador →
          </StudioBtn>
        </StudioCard>
      </div>

      <StudioCard>
        <h3 className="studio-2-section-title">Drop por zona</h3>
        <div className="max-h-[40vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--studio-muted)]">
              <tr className="border-b border-[rgba(96,140,190,0.25)]">
                <th className="px-2 py-2">Zona</th>
                <th className="px-2 py-2">Tier</th>
                <th className="px-2 py-2">Drop</th>
                <th className="px-2 py-2">Boss drop ×</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr
                  key={z.id}
                  className="border-t border-[rgba(96,140,190,0.15)]"
                >
                  <td className="px-2 py-2 font-medium">{z.name}</td>
                  <td className="px-2 py-2 tabular-nums">T{z.tier}</td>
                  <td className="px-2 py-2 tabular-nums">
                    {z.dropChance != null
                      ? `${(Math.round(Number(z.dropChance) * 1000) / 10).toFixed(1)}%`
                      : "global"}
                  </td>
                  <td className="px-2 py-2 tabular-nums">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[0.68rem] text-[var(--studio-muted)]">
          Edite o % por zona no módulo Zonas. Loot tables editáveis: Fase 2.
        </p>
      </StudioCard>
    </div>
  );
}
