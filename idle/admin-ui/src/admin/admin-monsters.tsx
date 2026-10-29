import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { AdminMonsterVisualOption, AdminZone, MonsterDraftRow } from "./admin-types";
import { AdminPreviewFrame } from "./studio/admin-preview-frame";
import { useAdminPreviewBridge } from "./studio/use-admin-preview-bridge";
import { StudioBtn, StudioEmpty, StudioField, StudioModal, StudioTabs } from "./studio/studio-ui";
import type { MonsterPhase, useMonsterDraft } from "./use-monster-draft";

type MonsterApi = ReturnType<typeof useMonsterDraft>;

type AdminMonstersPanelProps = {
  zones: AdminZone[];
  zoneId: string;
  monsterApi: MonsterApi;
  monsterVisuals?: AdminMonsterVisualOption[];
  working: boolean;
  error: string | null;
};

const DEFAULT_VISUALS: AdminMonsterVisualOption[] = [
  { id: "skeleton_minion", label: "Esqueleto Minion" },
  { id: "skeleton_rogue", label: "Esqueleto Rogue" },
  { id: "skeleton_warrior", label: "Esqueleto Guerreiro" },
  { id: "skeleton_mage", label: "Esqueleto Mago" },
];

const TABS = [
  { id: "geral", label: "Geral" },
  { id: "atributos", label: "Atributos" },
  { id: "onda", label: "Onda" },
];

const STATS: Array<{ key: keyof MonsterDraftRow; label: string }> = [
  { key: "level", label: "Nível" },
  { key: "hp", label: "HP" },
  { key: "attack", label: "Ataque" },
  { key: "defense", label: "Defesa" },
  { key: "xp", label: "XP" },
  { key: "gold", label: "Ouro" },
];

const PHASE_LABEL: Record<MonsterPhase, string> = {
  saved: "Salvo",
  dirty: "Não salvo",
  saving: "Salvando",
  error: "Erro",
};

export function AdminMonstersPanel({
  zones,
  zoneId,
  monsterApi,
  monsterVisuals,
  working,
  error,
}: AdminMonstersPanelProps) {
  const {
    drafts,
    setDrafts,
    boss,
    setBoss,
    wave,
    setWave,
    bossOverridden,
    waveOverridden,
    selectedKey,
    setSelectedKey,
    dirty,
    phase,
    ready,
    zoneGate,
    setZoneGate,
    requestZone,
    confirmZoneDiscard,
    save,
    saveAndSwitchZone,
    resetBoss,
    resetWave,
  } = monsterApi;

  const visuals = monsterVisuals?.length ? monsterVisuals : DEFAULT_VISUALS;
  const zone = zones.find((row) => row.id === zoneId) || null;
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("geral");
  const [resetAsk, setResetAsk] = useState<null | "boss" | "wave">(null);
  const [modalTried, setModalTried] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { ready: previewReady, showMonster, framePreview } = useAdminPreviewBridge(iframeRef);
  const autoWave = Math.max(2, (drafts.length || 2) * 2);

  const allEntries = useMemo(() => {
    const rows: Array<{ id: string; kind: "mob" | "boss"; index: number; name: string; level: string; visualId: string }> = [];
    if (boss) {
      rows.push({
        id: "boss",
        kind: "boss",
        index: -1,
        name: boss.name,
        level: boss.level,
        visualId: boss.visualId,
      });
    }
    drafts.forEach((mob, index) => {
      rows.push({
        id: `mob:${index}`,
        kind: "mob",
        index,
        name: mob.name,
        level: mob.level,
        visualId: mob.visualId,
      });
    });
    return rows;
  }, [boss, drafts]);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allEntries;
    return allEntries.filter((row) => row.name.toLowerCase().includes(q) || row.visualId.toLowerCase().includes(q));
  }, [allEntries, query]);

  const selected = allEntries.find((row) => row.id === selectedKey) || null;
  const active: MonsterDraftRow | null =
    selected?.kind === "boss" ? boss : selected ? drafts[selected.index] || null : null;

  useEffect(() => {
    if (!previewReady || !active) return;
    showMonster({
      visualId: active.visualId || "skeleton_minion",
      name: active.name || "Monstro",
    });
  }, [previewReady, active?.visualId, active?.name, showMonster]);

  function updateActive(key: keyof MonsterDraftRow, value: string) {
    if (!selected) return;
    if (selected.kind === "boss") {
      setBoss((prev) => (prev ? { ...prev, [key]: value } : prev));
      return;
    }
    setDrafts((prev) => prev.map((row, index) => (index === selected.index ? { ...row, [key]: value } : row)));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await save();
  }

  async function confirmReset() {
    if (!resetAsk) return;
    setModalTried(true);
    const ok = resetAsk === "boss" ? await resetBoss() : await resetWave();
    if (ok) {
      setResetAsk(null);
      setModalTried(false);
    }
  }

  const zoneName = zoneGate ? zones.find((row) => row.id === zoneGate)?.name || zoneGate : "";
  const visualLabel = visuals.find((visual) => visual.id === active?.visualId)?.label || active?.visualId || "—";

  return (
    <div className="ed">
      <header className="ed-top">
        <div className="ed-top__title">
          <p className="ed-kicker">Editor de monstros</p>
          <h2>{zone?.name || "Zona"}</h2>
        </div>
        <div className="ed-top__actions">
          <StudioBtn variant="gold" type="submit" form="monster-editor" disabled={working || !ready}>
            Salvar zona
          </StudioBtn>
        </div>
      </header>

      <aside className="ed-catalog">
        <div className="ed-catalog__head">
          <div className="ed-catalog__count">
            <strong>Criaturas</strong>
            <span>{query.trim() ? `${entries.length} de ${allEntries.length}` : allEntries.length}</span>
          </div>
          <label className="ed-note">
            Zona do Mundo
            <select className="studio-2-select" value={zoneId} onChange={(event) => requestZone(event.target.value)}>
              {zones.map((row) => (
                <option key={row.id} value={row.id}>{row.name}</option>
              ))}
            </select>
          </label>
          <input
            className="studio-2-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar nesta zona"
          />
        </div>
        {entries.length === 0 ? (
          <StudioEmpty>{drafts.length || boss ? "Nenhuma criatura com essa busca." : "Esta zona não tem monstros."}</StudioEmpty>
        ) : (
          <div className="ed-list">
            {entries.map((row) => (
              <button
                key={row.id}
                type="button"
                className={cn("ed-row", row.kind === "boss" && "is-boss", selectedKey === row.id && "is-selected")}
                aria-selected={selectedKey === row.id}
                onClick={() => setSelectedKey(row.id)}
              >
                <span className={cn("ed-mark", row.kind === "boss" && "is-boss")}>
                  {row.kind === "boss" ? "B" : String(row.index + 1)}
                </span>
                <span className="ed-row__text">
                  <span className="ed-row__name">{row.name || (row.kind === "boss" ? "Boss" : "Monstro")}</span>
                  <span className="ed-row__meta">
                    {row.kind === "boss" ? "Boss" : "Comum"} · Nv {row.level || "—"} · {row.visualId}
                  </span>
                </span>
                {row.kind === "boss" && bossOverridden ? <em className="ed-flag">override</em> : null}
              </button>
            ))}
          </div>
        )}
      </aside>

      <form id="monster-editor" className="ed-main" onSubmit={(event) => void onSubmit(event)}>
        <StudioTabs tabs={TABS} active={tab} onChange={setTab} />
        {!active ? (
          <StudioEmpty>Selecione uma criatura da zona.</StudioEmpty>
        ) : (
          <>
            <p className="ed-idline">
              {selected?.kind === "boss" ? "Boss desta zona" : `Monstro ${((selected?.index ?? 0) + 1)} de ${drafts.length}`}
              {selected?.kind === "boss" && bossOverridden ? " · override gravado" : ""}
            </p>
            {tab === "geral" ? (
              <div className="ed-section">
                <h3>Geral</h3>
                <StudioField label="Nome">
                  <input className="studio-2-input" value={active.name} onChange={(event) => updateActive("name", event.target.value)} />
                </StudioField>
                <p className="ed-note">Modelos aceitos pelo jogo. Árvores e props de cenário não são criaturas.</p>
                <div className="ed-models">
                  {visuals.map((visual) => (
                    <button
                      key={visual.id}
                      type="button"
                      className={cn("ed-model", active.visualId === visual.id && "is-on")}
                      onClick={() => updateActive("visualId", visual.id)}
                    >
                      <strong>{visual.label}</strong>
                      <span>{visual.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {tab === "atributos" ? (
              <div className="ed-section">
                <h3>Atributos</h3>
                <div className="ed-fields">
                  {STATS.map((stat) => (
                    <StudioField key={stat.key} label={stat.label}>
                      <input
                        className="studio-2-input"
                        inputMode="numeric"
                        value={active[stat.key]}
                        onChange={(event) => updateActive(stat.key, event.target.value)}
                      />
                    </StudioField>
                  ))}
                </div>
                <p className="ed-note">HP, ataque, defesa, XP e ouro são gravados como override da criatura. O encontro continua sendo a lista da zona, sem posição no mapa.</p>
              </div>
            ) : null}
            {tab === "onda" ? (
              <div className="ed-section">
                <h3>Onda</h3>
                <StudioField label="Abates até o boss">
                  <input
                    className="studio-2-input"
                    inputMode="numeric"
                    value={wave}
                    onChange={(event) => setWave(event.target.value)}
                  />
                </StudioField>
                <p className="ed-note">
                  {waveOverridden ? "Esta zona tem override de onda." : `Sem override, o padrão fica em torno de ${autoWave}.`}
                  {" "}O valor aceito vai de 1 a 200. Vale para a zona inteira.
                </p>
                <div className="ed-foot__actions">
                  <StudioBtn type="button" disabled={!waveOverridden || working} onClick={() => { setModalTried(false); setResetAsk("wave"); }}>
                    Restaurar onda
                  </StudioBtn>
                  <StudioBtn type="button" disabled={!bossOverridden || working} onClick={() => { setModalTried(false); setResetAsk("boss"); }}>
                    Restaurar boss
                  </StudioBtn>
                </div>
              </div>
            ) : null}
          </>
        )}
      </form>

      <aside className="ed-preview">
        <div className="ed-preview__stage">
          <AdminPreviewFrame iframeRef={iframeRef} ready={previewReady} title="Preview do monstro" className="ed-preview__frame" />
        </div>
        <div className="ed-preview__meta">
          <h3>{active?.name || "Criatura"}</h3>
          <StudioBtn type="button" onClick={framePreview}>Enquadrar modelo</StudioBtn>
          <p>
            {selected?.kind === "boss" ? "Boss" : "Monstro comum"} · modelo <code>{active?.visualId || "—"}</code>
            {visualLabel !== active?.visualId ? ` (${visualLabel})` : ""}. Arraste para girar e use a roda para aproximar.
          </p>
          <dl>
            <div><dt>HP</dt><dd>{active?.hp || "—"}</dd></div>
            <div><dt>ATK</dt><dd>{active?.attack || "—"}</dd></div>
            <div><dt>DEF</dt><dd>{active?.defense || "—"}</dd></div>
            <div><dt>XP</dt><dd>{active?.xp || "—"}</dd></div>
            <div><dt>Ouro</dt><dd>{active?.gold || "—"}</dd></div>
          </dl>
        </div>
      </aside>

      <footer className="ed-foot">
        <span className={cn("ed-phase", `is-${phase}`)}>{PHASE_LABEL[phase]}</span>
        <span className="ed-foot__hint">
          Salvar envia os monstros, o boss e a onda desta zona. A cena 3D, o nível e o drop da zona ficam de fora.
        </span>
      </footer>

      <StudioModal
        open={zoneGate != null}
        title="Trocar de zona"
        description={`${zone?.name || "A zona atual"} tem alterações de monstros que ainda não foram salvas. Abrir ${zoneName} sem salvar descarta esse rascunho.`}
        busy={working}
        error={modalTried ? error : null}
        onClose={() => !working && setZoneGate(null)}
        footer={
          <>
            <StudioBtn type="button" disabled={working} onClick={() => setZoneGate(null)}>Cancelar</StudioBtn>
            <StudioBtn type="button" disabled={working} onClick={confirmZoneDiscard}>Descartar e trocar</StudioBtn>
            <StudioBtn variant="gold" type="button" loading={working} onClick={() => { setModalTried(true); void saveAndSwitchZone(); }}>
              Salvar e trocar
            </StudioBtn>
          </>
        }
      />

      <StudioModal
        open={resetAsk != null}
        title={resetAsk === "boss" ? "Restaurar boss" : "Restaurar onda"}
        description={
          resetAsk === "boss"
            ? `O boss de ${zone?.name || "esta zona"} perde o override e volta ao derivado do jogo. Os monstros comuns e a cena não são apagados.`
            : `A onda de ${zone?.name || "esta zona"} volta ao padrão, perto de ${autoWave} abates. Os monstros e o boss permanecem.`
        }
        busy={working}
        error={modalTried ? error : null}
        onClose={() => !working && setResetAsk(null)}
        footer={
          <>
            <StudioBtn type="button" disabled={working} onClick={() => setResetAsk(null)}>Cancelar</StudioBtn>
            <StudioBtn variant="danger" type="button" loading={working} onClick={() => void confirmReset()}>Restaurar</StudioBtn>
          </>
        }
      />
    </div>
  );
}
