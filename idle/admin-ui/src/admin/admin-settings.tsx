import { useState } from "react";
import { StudioBtn, StudioModal } from "./studio/studio-ui";

type AdminSettingsPanelProps = {
  working: boolean;
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  onSetMaintenance: (enabled: boolean) => Promise<boolean>;
  onOpenLiveOps: () => void;
};

export function AdminSettingsPanel({
  working,
  maintenanceEnabled,
  maintenanceMessage,
  onSetMaintenance,
  onOpenLiveOps,
}: AdminSettingsPanelProps) {
  const [ask, setAsk] = useState(false);
  const next = !maintenanceEnabled;

  return (
    <div className="ops ops--compact">
      <div className="ops-settings">
      <section className="ops-panel">
        <div className="ops-panel__head">
          <h3>Manutenção</h3>
          <span className={maintenanceEnabled ? "ed-phase is-error" : "ed-phase is-saved"}>
            {maintenanceEnabled ? "Manutenção" : "Liberado"}
          </span>
        </div>
        <p className="ed-note">
          {maintenanceEnabled
            ? "A manutenção está ativa. Desligar libera o jogo de novo."
            : "O jogo está disponível. Ligar a manutenção bloqueia personagens e caça até você desligar."}
        </p>
        {maintenanceEnabled && maintenanceMessage ? (
          <p className="ed-note">Texto que o jogador vê: {maintenanceMessage}</p>
        ) : null}
        <StudioBtn type="button" variant={next ? "danger" : "gold"} disabled={working} onClick={() => setAsk(true)}>
          {maintenanceEnabled ? "Liberar o jogo" : "Colocar em manutenção"}
        </StudioBtn>
      </section>
      <section className="ops-panel">
        <div className="ops-panel__head">
          <h3>Drop, TTK e refinador</h3>
        </div>
        <p className="ed-note">Esses valores têm um único editor, em Live Ops. Aqui eles não são alterados.</p>
        <StudioBtn type="button" onClick={onOpenLiveOps}>Abrir Live Ops</StudioBtn>
      </section>
      </div>
      <StudioModal
        open={ask}
        title={next ? "Colocar o jogo em manutenção" : "Liberar o jogo"}
        description={next ? "Jogadores deixam de abrir personagens e de caçar até a manutenção ser desligada." : "Os jogadores voltam a entrar no jogo."}
        busy={working}
        onClose={() => !working && setAsk(false)}
        footer={
          <>
            <StudioBtn type="button" disabled={working} onClick={() => setAsk(false)}>Cancelar</StudioBtn>
            <StudioBtn
              variant={next ? "danger" : "gold"}
              type="button"
              loading={working}
              onClick={() => void onSetMaintenance(next).then((ok) => ok && setAsk(false))}
            >
              Confirmar
            </StudioBtn>
          </>
        }
      />
    </div>
  );
}
