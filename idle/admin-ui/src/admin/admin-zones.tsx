
import { FormEvent, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { StudioBtn, StudioCard, StudioModal } from "./studio/studio-ui";
import type { AdminZone } from "./admin-types";

type AdminZonesPanelProps = {
  zones: AdminZone[];
  zoneId: string;
  working: boolean;
  onZoneSelect: (id: string) => void;
  onSaveZoneFull: (payload: {
    id: string;
    minLevel: number;
    tier: number;
    dropChance: number | null;
    requiresAscension: string | null;
    bossHpMult: number | null;
    bossAtkMult: number | null;
    bossDropMult: number | null;
    refineDropChance: number | null;
    clear?: boolean;
  }) => Promise<void>;
};

export function AdminZonesPanel({
  zones,
  zoneId,
  working,
  onZoneSelect,
  onSaveZoneFull,
}: AdminZonesPanelProps) {
  const zone = zones.find((z) => z.id === zoneId) || zones[0];
  const [minLevel, setMinLevel] = useState("1");
  const [tier, setTier] = useState("1");
  const [dropPct, setDropPct] = useState("");
  const [ascension, setAscension] = useState("");
  const [bossHpMult, setBossHpMult] = useState("");
  const [bossAtkMult, setBossAtkMult] = useState("");
  const [bossDropMult, setBossDropMult] = useState("");
  const [refinePct, setRefinePct] = useState("");
  const [clearAsk, setClearAsk] = useState<null | { id: string; name: string; minLevel: number; tier: number }>(null);

  useEffect(() => {
    if (!zone) return;
    setMinLevel(String(zone.minLevel ?? 1));
    setTier(String(zone.tier ?? 1));
    setDropPct(
      zone.dropChance != null && Number.isFinite(Number(zone.dropChance))
        ? String(Math.round(Number(zone.dropChance) * 1000) / 10)
        : "",
    );
    setAscension(zone.requiresAscension || "");
    setBossHpMult("");
    setBossAtkMult("");
    setBossDropMult("");
    setRefinePct("");
  }, [zone?.id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!zone) return;
    await onSaveZoneFull({
      id: zone.id,
      minLevel: Number(minLevel),
      tier: Number(tier),
      dropChance: dropPct === "" ? null : Number(dropPct) / 100,
      requiresAscension: ascension === "" ? null : ascension,
      bossHpMult: bossHpMult === "" ? null : Number(bossHpMult),
      bossAtkMult: bossAtkMult === "" ? null : Number(bossAtkMult),
      bossDropMult: bossDropMult === "" ? null : Number(bossDropMult),
      refineDropChance: refinePct === "" ? null : Number(refinePct) / 100,
    });
  }

  function requestClear() {
    if (!zone) return;
    setClearAsk({ id: zone.id, name: zone.name, minLevel: zone.minLevel, tier: zone.tier });
  }

  async function confirmClear() {
    if (!clearAsk) return;
    const target = clearAsk;
    await onSaveZoneFull({
      id: target.id,
      minLevel: target.minLevel,
      tier: target.tier,
      dropChance: null,
      requiresAscension: null,
      bossHpMult: null,
      bossAtkMult: null,
      bossDropMult: null,
      refineDropChance: null,
      clear: true,
    });
    setClearAsk(null);
  }

  return (
    <div className="studio-2-split-2">
      <div className="studio-2-catalog">
        <div className="studio-2-catalog__head">
          <strong className="text-sm">Zonas</strong>
          <p className="text-[0.68rem] text-[var(--studio-muted)]">
            Overrides das zonas existentes. A cena do mapa não entra nesta limpeza.
          </p>
        </div>
        <div className="studio-2-catalog__list">
          {zones.map((z) => (
            <button
              key={z.id}
              type="button"
              className={cn(
                "studio-2-catalog__row",
                (zone?.id || zoneId) === z.id && "is-selected",
              )}
              onClick={() => onZoneSelect(z.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{z.name}</div>
                <div className="text-[0.65rem] text-[var(--studio-muted)]">
                  {z.chapterId ? `Cap.${z.chapterId} · ` : ""}
                  Lv {z.minLevel}
                  {z.maxLevel != null ? `–${z.maxLevel}` : ""} · T{z.tier}
                  {z.trial ? " · Ritual" : ""}
                  {z.requiresAscension ? ` · ${z.requiresAscension}` : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <StudioCard>
        {!zone ? (
          <p className="text-[var(--studio-muted)]">Selecione uma zona.</p>
        ) : (
            <form onSubmit={onSubmit} className="zone-form">
              <div className="zone-form__head">
                <div>
                  <h3 className="studio-2-section-title mb-0">{zone.name}</h3>
                  <p className="text-[0.68rem] text-[var(--studio-muted)]">
                    {zone.id}
                    {zone.chapterId ? ` · Cap. ${zone.chapterId}` : ""}
                    {zone.sceneProfileId ? ` · perfil ${zone.sceneProfileId}` : ""}
                    {zone.trial ? " · trial" : ""}
                  </p>
                </div>
                <div className="zone-form__actions">
                  <StudioBtn variant="danger" type="button" disabled={working} onClick={requestClear}>
                    Limpar overrides
                  </StudioBtn>
                  <StudioBtn variant="gold" disabled={working} type="submit">
                    Salvar zona
                  </StudioBtn>
                </div>
              </div>
              <section className="zone-group">
                <h4>Progressão</h4>
                <div className="zone-group__grid">
                  <div>
                    <label className="studio-2-label">Nível mínimo</label>
                    <input className="studio-2-input" value={minLevel} onChange={(e) => setMinLevel(e.target.value)} />
                  </div>
                  <div>
                    <label className="studio-2-label">Tier</label>
                    <input className="studio-2-input" value={tier} onChange={(e) => setTier(e.target.value)} />
                  </div>
                  <div>
                    <label className="studio-2-label">Ascensão</label>
                    <select className="studio-2-select" value={ascension} onChange={(e) => setAscension(e.target.value)}>
                      <option value="">Nenhuma</option>
                      <option value="CELESTIAL">CELESTIAL</option>
                    </select>
                  </div>
                </div>
              </section>
              <section className="zone-group">
                <h4>Recompensas</h4>
                <div className="zone-group__grid">
                  <div>
                    <label className="studio-2-label">Drop da zona % (vazio = global)</label>
                    <input className="studio-2-input" value={dropPct} onChange={(e) => setDropPct(e.target.value)} />
                  </div>
                  <div>
                    <label className="studio-2-label">Refine drop %</label>
                    <input className="studio-2-input" value={refinePct} onChange={(e) => setRefinePct(e.target.value)} placeholder="override" />
                  </div>
                </div>
              </section>
              <section className="zone-group">
                <h4>Boss</h4>
                <div className="zone-group__grid">
                  <div>
                    <label className="studio-2-label">HP ×</label>
                    <input className="studio-2-input" value={bossHpMult} onChange={(e) => setBossHpMult(e.target.value)} placeholder="override" />
                  </div>
                  <div>
                    <label className="studio-2-label">ATK ×</label>
                    <input className="studio-2-input" value={bossAtkMult} onChange={(e) => setBossAtkMult(e.target.value)} placeholder="override" />
                  </div>
                  <div>
                    <label className="studio-2-label">Drop ×</label>
                    <input className="studio-2-input" value={bossDropMult} onChange={(e) => setBossDropMult(e.target.value)} placeholder="override" />
                  </div>
                </div>
                <p className="text-[0.68rem] text-[var(--studio-muted)]">
                  Boss resolvido: {zone.boss?.name || "—"} · HP {zone.boss?.hp ?? "—"} · onda{" "}
                  {zone.bossWaveSize ?? "—"}
                  {zone.bossWaveSizeOverridden ? " (override)" : ""}
                </p>
              </section>
            </form>
        )}
      </StudioCard>
      <StudioModal
        open={clearAsk != null}
        title="Limpar overrides da zona"
        description={clearAsk ? `${clearAsk.name} · ${clearAsk.id}` : undefined}
        busy={working}
        onClose={() => !working && setClearAsk(null)}
        footer={
          <>
            <StudioBtn type="button" disabled={working} onClick={() => setClearAsk(null)}>Cancelar</StudioBtn>
            <StudioBtn variant="danger" type="button" loading={working} onClick={() => void confirmClear()}>Limpar overrides</StudioBtn>
          </>
        }
      >
        <p>
          Voltam ao padrão o nível mínimo, o tier, o drop da zona, a ascensão exigida e os multiplicadores de boss e refinador.
          A cena, os monstros e as decorações não entram neste envio.
        </p>
      </StudioModal>
    </div>
  );
}
