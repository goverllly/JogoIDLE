
import { FormEvent } from "react";
import { StudioBtn, StudioCard } from "./studio/studio-ui";

type AdminSettingsPanelProps = {
  mobHits: string;
  bossHits: string;
  refineDropPct: string;
  working: boolean;
  onMobHitsChange: (v: string) => void;
  onBossHitsChange: (v: string) => void;
  onRefineDropPctChange: (v: string) => void;
  onSaveBalance: (event: FormEvent) => void;
};

export function AdminSettingsPanel({
  mobHits,
  bossHits,
  refineDropPct,
  working,
  onMobHitsChange,
  onBossHitsChange,
  onRefineDropPctChange,
  onSaveBalance,
}: AdminSettingsPanelProps) {
  return (
    <div className="space-y-3">
      <StudioCard>
        <h3 className="studio-2-section-title">Balanceamento global (TTK)</h3>
        <p className="mb-3 text-[0.72rem] text-[var(--studio-muted)]">
          Ajusta <code>__world.balance</code> — mesmas chaves da aba Economia. Afeta{" "}
          <code>scaleMonster</code> no motor.
        </p>
        <form onSubmit={onSaveBalance} className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="studio-2-label">Hits mob</label>
            <input
              className="studio-2-input"
              value={mobHits}
              onChange={(e) => onMobHitsChange(e.target.value)}
            />
          </div>
          <div>
            <label className="studio-2-label">Hits boss</label>
            <input
              className="studio-2-input"
              value={bossHits}
              onChange={(e) => onBossHitsChange(e.target.value)}
            />
          </div>
          <div>
            <label className="studio-2-label">Refinador %</label>
            <input
              className="studio-2-input"
              value={refineDropPct}
              onChange={(e) => onRefineDropPctChange(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <StudioBtn variant="gold" disabled={working} type="submit">
              Salvar balanceamento
            </StudioBtn>
          </div>
        </form>
      </StudioCard>
      <StudioCard>
        <h3 className="studio-2-section-title">Runtime</h3>
        <p className="text-[0.78rem] text-[var(--studio-muted)]">
          Persistência atual: singleton <code>jogo_idle_catalog_state</code>. Draft /
          publish e histórico de revisões: Fase 4. Contratos em{" "}
          <code>lib/jogo-idle/content/</code>.
        </p>
      </StudioCard>
    </div>
  );
}
