import { FormEvent } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { StudioBtn, StudioModal } from "./studio/studio-ui";
import { useLiveOpsDraft, type MerchantOffers } from "./use-liveops-draft";

type Ops = ReturnType<typeof useLiveOpsDraft>;

const PHASE = { saved: "Salvo", dirty: "Não salvo", saving: "Salvando", error: "Erro" } as const;

const OFFERS: Array<{
  sku: keyof MerchantOffers;
  name: string;
  price: "bagPrice" | "refinerPrice" | "attrResetPrice" | "petDogPrice" | "petCatPrice" | "petParrotPrice";
  hint: string;
}> = [
  { sku: "bag_upgrade", name: "Expansão de mochila", price: "bagPrice", hint: "bag_upgrade" },
  { sku: "refiner", name: "Refinador", price: "refinerPrice", hint: "refiner" },
  { sku: "attr_reset", name: "Reset de pontos", price: "attrResetPrice", hint: "attr_reset" },
  { sku: "pet_dog", name: "Cão", price: "petDogPrice", hint: "pet_dog" },
  { sku: "pet_cat", name: "Gato", price: "petCatPrice", hint: "pet_cat" },
  { sku: "pet_parrot", name: "Papagaio", price: "petParrotPrice", hint: "pet_parrot" },
];

export function AdminEconomyPanel({ ops, working }: { ops: Ops; working: boolean }) {
  const [clearAsk, setClearAsk] = useState(false);
  const busy = working || ops.saving;
  const phase = ops.phase as keyof typeof PHASE;

  function saveBalance(event: FormEvent) {
    void ops.saveBalance(event);
  }
  function saveMerchant(event: FormEvent) {
    void ops.saveMerchant(event);
  }
  function saveEvent(event: FormEvent) {
    void ops.saveEvent(event);
  }

  return (
    <div className="ops">
      <header className="ops-head">
        <div>
          <p className="ed-kicker">Live Ops</p>
          <h2>Economia</h2>
        </div>
        <span className={cn("ed-phase", `is-${phase}`)}>{PHASE[phase] || "Salvo"}</span>
      </header>

      <section className="ops-panel">
        <div className="ops-panel__head">
          <h3>Drop e balanceamento</h3>
          <p>Único editor destes valores. Loot, Visão Geral e Simulador só leem.</p>
        </div>
        <form onSubmit={saveBalance} className="ops-form">
          <label>
            Drop global (%)
            <input className="studio-2-input" type="number" min={0} max={100} step={0.1} value={ops.dropPct} onChange={(e) => ops.setDropPct(Number(e.target.value))} />
          </label>
          <label>
            Golpes para abater um mob
            <input className="studio-2-input" type="number" min={3} value={ops.mobHits} onChange={(e) => ops.setMobHits(e.target.value)} />
          </label>
          <label>
            Golpes para abater um boss
            <input className="studio-2-input" type="number" min={3} value={ops.bossHits} onChange={(e) => ops.setBossHits(e.target.value)} />
          </label>
          <label>
            Chance do Refinador no boss (%)
            <input className="studio-2-input" type="number" min={0} max={100} step={0.1} value={ops.refineDropPct} onChange={(e) => ops.setRefineDropPct(e.target.value)} />
          </label>
          <div className="ops-form__bar">
            <span>{ops.balanceDirty ? "Há alterações nesta seção." : "Igual ao último valor confirmado."}</span>
            <StudioBtn variant="gold" type="submit" disabled={busy || !ops.balanceDirty}>Salvar drop e TTK</StudioBtn>
          </div>
        </form>
      </section>

      <section className="ops-panel">
        <div className="ops-panel__head">
          <h3>Mercador</h3>
          <p>Preço inteiro a partir de zero. Desmarcar “À venda” oculta a oferta. O restante da configuração não entra neste envio.</p>
        </div>
        <form onSubmit={saveMerchant}>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Oferta</th>
                  <th>Identificador</th>
                  <th>Preço</th>
                  <th>À venda</th>
                </tr>
              </thead>
              <tbody>
                {OFFERS.map((row) => (
                  <tr key={row.sku}>
                    <td>{row.name}</td>
                    <td><code>{row.hint}</code></td>
                    <td>
                      <input
                        className="studio-2-input"
                        inputMode="numeric"
                        value={String(ops[row.price] ?? "")}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (row.price === "bagPrice") ops.setBagPrice(value);
                          if (row.price === "refinerPrice") ops.setRefinerPrice(value);
                          if (row.price === "attrResetPrice") ops.setAttrResetPrice(value);
                          if (row.price === "petDogPrice") ops.setPetDogPrice(value);
                          if (row.price === "petCatPrice") ops.setPetCatPrice(value);
                          if (row.price === "petParrotPrice") ops.setPetParrotPrice(value);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={ops.offers[row.sku]}
                        onChange={(event) => ops.setOffer(row.sku, event.target.checked)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ops-form__bar">
            <span>{ops.merchantDirty ? "Há alterações no mercador." : "Preços iguais ao servidor."}</span>
            <StudioBtn variant="gold" type="submit" disabled={busy || !ops.merchantDirty}>Salvar mercador</StudioBtn>
          </div>
        </form>
      </section>

      <section className="ops-panel">
        <div className="ops-panel__head">
          <h3>Evento de farm</h3>
          <p>
            {ops.eventActive
              ? `Ativo: ${ops.eventActiveLabel} até ${ops.eventActiveUntil ? new Date(ops.eventActiveUntil).toLocaleString("pt-BR") : "—"}.`
              : "Nenhum evento ativo."}{" "}
            Multiplica XP, ouro e drop do farm até a data. Não há agendamento além dessa data.
          </p>
        </div>
        <form onSubmit={saveEvent} className="ops-form">
          <label className="ops-span-2">
            Nome
            <input className="studio-2-input" maxLength={80} value={ops.eventLabel} onChange={(e) => ops.setEventLabel(e.target.value)} />
          </label>
          <label>
            XP ×
            <input className="studio-2-input" type="number" min={1} max={3} step={0.05} value={ops.eventXp} onChange={(e) => ops.setEventXp(e.target.value)} />
          </label>
          <label>
            Ouro ×
            <input className="studio-2-input" type="number" min={1} max={3} step={0.05} value={ops.eventGold} onChange={(e) => ops.setEventGold(e.target.value)} />
          </label>
          <label>
            Drop ×
            <input className="studio-2-input" type="number" min={1} max={3} step={0.05} value={ops.eventDrop} onChange={(e) => ops.setEventDrop(e.target.value)} />
          </label>
          <label>
            Termina em
            <input className="studio-2-input" type="datetime-local" value={ops.eventEndsAt} onChange={(e) => ops.setEventEndsAt(e.target.value)} />
          </label>
          <div className="ops-form__bar ops-span-2">
            <span>{ops.eventDirty ? "Há alterações no evento." : "Formulário igual ao último estado."}</span>
            <StudioBtn type="button" disabled={busy || !ops.eventActive} onClick={() => setClearAsk(true)}>Encerrar evento</StudioBtn>
            <StudioBtn variant="gold" type="submit" disabled={busy || !ops.eventLabel.trim()}>Ativar evento</StudioBtn>
          </div>
        </form>
      </section>

      <StudioModal
        open={clearAsk}
        title="Encerrar evento de farm"
        description={ops.eventActiveLabel ? `“${ops.eventActiveLabel}” deixa de multiplicar XP, ouro e drop. As outras configurações permanecem.` : "Não há evento ativo."}
        busy={busy}
        onClose={() => !busy && setClearAsk(false)}
        footer={
          <>
            <StudioBtn type="button" disabled={busy} onClick={() => setClearAsk(false)}>Cancelar</StudioBtn>
            <StudioBtn variant="danger" type="button" loading={busy} onClick={() => void ops.clearEvent().then((ok) => ok && setClearAsk(false))}>Encerrar</StudioBtn>
          </>
        }
      />
    </div>
  );
}
