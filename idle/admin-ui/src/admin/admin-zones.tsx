
import { FormEvent, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { StudioBtn, StudioCard } from "./studio/studio-ui";
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

  async function onClear() {
    if (!zone) return;
    if (!window.confirm(`Remover overrides da zona ${zone.name}?`)) return;
    await onSaveZoneFull({
      id: zone.id,
      minLevel: zone.minLevel,
      tier: zone.tier,
      dropChance: null,
      requiresAscension: null,
      bossHpMult: null,
      bossAtkMult: null,
      bossDropMult: null,
      refineDropChance: null,
      clear: true,
    });
  }

  return (
    <div className="studio-2-split-2">
      <div className="studio-2-catalog">
        <div className="studio-2-catalog__head">
          <strong className="text-sm">Zonas</strong>
          <p className="text-[0.68rem] text-[var(--studio-muted)]">
            Criação de zonas novas: Fase 3. Aqui só overrides.
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
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="studio-2-section-title mb-0">{zone.name}</h3>
                <p className="text-[0.68rem] text-[var(--studio-muted)]">
                  id: {zone.id}
                  {zone.chapterId ? ` · Cap. ${zone.chapterId}` : ""}
                  {zone.sceneProfileId ? ` · perfil ${zone.sceneProfileId}` : ""}
                  {zone.trial ? " · trial" : ""}
                </p>
              </div>
              <StudioBtn variant="danger" type="button" disabled={working} onClick={() => void onClear()}>
                Limpar overrides
              </StudioBtn>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="studio-2-label">Nível mínimo</label>
                <input className="studio-2-input" value={minLevel} onChange={(e) => setMinLevel(e.target.value)} />
              </div>
              <div>
                <label className="studio-2-label">Tier</label>
                <input className="studio-2-input" value={tier} onChange={(e) => setTier(e.target.value)} />
              </div>
              <div>
                <label className="studio-2-label">Drop zona % (vazio = global)</label>
                <input className="studio-2-input" value={dropPct} onChange={(e) => setDropPct(e.target.value)} />
              </div>
              <div>
                <label className="studio-2-label">Ascensão</label>
                <select className="studio-2-select" value={ascension} onChange={(e) => setAscension(e.target.value)}>
                  <option value="">Nenhuma</option>
                  <option value="CELESTIAL">CELESTIAL</option>
                </select>
              </div>
              <div>
                <label className="studio-2-label">Boss HP × (opcional)</label>
                <input className="studio-2-input" value={bossHpMult} onChange={(e) => setBossHpMult(e.target.value)} placeholder="override" />
              </div>
              <div>
                <label className="studio-2-label">Boss ATK ×</label>
                <input className="studio-2-input" value={bossAtkMult} onChange={(e) => setBossAtkMult(e.target.value)} placeholder="override" />
              </div>
              <div>
                <label className="studio-2-label">Boss drop ×</label>
                <input className="studio-2-input" value={bossDropMult} onChange={(e) => setBossDropMult(e.target.value)} placeholder="override" />
              </div>
              <div>
                <label className="studio-2-label">Refine drop %</label>
                <input className="studio-2-input" value={refinePct} onChange={(e) => setRefinePct(e.target.value)} placeholder="override" />
              </div>
            </div>
            <p className="text-[0.68rem] text-[var(--studio-muted)]">
              Boss resolvido: {zone.boss?.name || "—"} · HP {zone.boss?.hp ?? "—"} · onda{" "}
              {zone.bossWaveSize ?? "—"}
              {zone.bossWaveSizeOverridden ? " (override)" : ""}
            </p>
            <StudioBtn variant="gold" disabled={working} type="submit">
              Salvar zona
            </StudioBtn>
          </form>
        )}
      </StudioCard>
    </div>
  );
}
