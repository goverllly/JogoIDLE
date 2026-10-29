import { FormEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  formatGrantTargetLabel,
  type AdminActiveCharacter,
  type AdminCatalogItem,
  type AdminCatalogMeta,
  type AdminTabId,
} from "./admin-types";
import { AdminPreviewFrame } from "./studio/admin-preview-frame";
import { useAdminPreviewBridge } from "./studio/use-admin-preview-bridge";
import { StudioBtn, StudioEmpty, StudioField, StudioModal, StudioTabs } from "./studio/studio-ui";
import type { ItemPhase, KindFilter, OriginFilter, useItemDraft } from "./use-item-draft";

type ItemDraft = ReturnType<typeof useItemDraft>;

type AdminItemsPanelProps = {
  catalog: AdminCatalogItem[];
  catalogMeta: AdminCatalogMeta | null;
  target: AdminActiveCharacter | null;
  draftApi: ItemDraft;
  working: boolean;
  error: string | null;
  onOpenTab: (tab: AdminTabId) => void;
};

const TABS = [
  { id: "geral", label: "Geral" },
  { id: "atributos", label: "Atributos" },
  { id: "drop", label: "Drop" },
  { id: "visual", label: "Visual" },
];

const STATS: Array<{ key: "str" | "dex" | "int" | "con" | "mp" | "attack" | "defense" | "hp" | "crit"; label: string; hint: string }> = [
  { key: "str", label: "Força", hint: "STR" },
  { key: "dex", label: "Destreza", hint: "DEX" },
  { key: "int", label: "Intelecto", hint: "INT" },
  { key: "con", label: "Constituição", hint: "CON" },
  { key: "mp", label: "Mana", hint: "MP" },
  { key: "attack", label: "Ataque", hint: "ATK" },
  { key: "defense", label: "Defesa", hint: "DEF" },
  { key: "hp", label: "Vida", hint: "HP" },
  { key: "crit", label: "Crítico", hint: "CRIT" },
];

const PHASE_LABEL: Record<ItemPhase, string> = {
  saved: "Salvo",
  dirty: "Não salvo",
  saving: "Salvando",
  error: "Erro",
};

const ROW_H = 68;

function markOf(icon: string | undefined, name: string) {
  const raw = (icon || name || "?").replace(/[^a-z0-9]/gi, "");
  return (raw.slice(0, 2) || "?").toUpperCase();
}

function classesLabel(item: AdminCatalogItem) {
  const list = item.classes || [];
  if (!list.length) return "sem classe";
  if (list.length <= 2) return list.join(" · ");
  return `${list.slice(0, 2).join(" · ")} +${list.length - 2}`;
}

export function AdminItemsPanel({
  catalog,
  catalogMeta,
  target,
  draftApi,
  working,
  error,
  onOpenTab,
}: AdminItemsPanelProps) {
  const {
    selected,
    draft,
    setDraft,
    dirty,
    phase,
    query,
    setQuery,
    filterClass,
    setFilterClass,
    filterSlot,
    setFilterSlot,
    filterTier,
    setFilterTier,
    filterOrigin,
    setFilterOrigin,
    filterKind,
    setFilterKind,
    grantRarity,
    setGrantRarity,
    filtered,
    gate,
    setGate,
    requestSelect,
    requestNew,
    requestDuplicate,
    acceptGate,
    save,
    remove,
    reset,
    grant,
    clearFilters,
  } = draftApi;

  const [tab, setTab] = useState("geral");
  const [scrollTop, setScrollTop] = useState(0);
  const [listH, setListH] = useState(420);
  const [danger, setDanger] = useState<null | { kind: "delete" | "reset"; item: AdminCatalogItem }>(null);
  const [grantAsk, setGrantAsk] = useState<null | { kind: "grant" | "save"; templateId: string; name: string }>(null);
  const [modalTried, setModalTried] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { ready, showItem, framePreview } = useAdminPreviewBridge(iframeRef);
  const rarityOptions = Object.values(catalogMeta?.rarities || {}).map((rarity) => rarity.id);
  const visualsForSlot = (catalogMeta?.visuals || []).filter((visual) => visual.slots.includes(draft.slot));
  const filtersActive =
    query.trim() !== "" ||
    filterClass !== "all" ||
    filterSlot !== "all" ||
    filterTier !== "all" ||
    filterOrigin !== "all" ||
    filterKind !== "all";

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    const watch = new ResizeObserver(() => setListH(node.clientHeight || 420));
    watch.observe(node);
    setListH(node.clientHeight || 420);
    return () => watch.disconnect();
  }, []);

  useEffect(() => {
    setScrollTop(0);
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [query, filterClass, filterSlot, filterTier, filterOrigin, filterKind]);

  useEffect(() => {
    if (!ready) return;
    showItem({
      visual: draft.visual || null,
      rarity: draft.rarity || "common",
      name: draft.name || "Item",
    });
  }, [ready, draft.visual, draft.rarity, draft.name, showItem]);

  const total = filtered.length;
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - 4);
  const end = Math.min(total, start + Math.ceil(listH / ROW_H) + 8);
  const slice = filtered.slice(start, end);
  const hasModel = Boolean(draft.visual);

  function patch(partial: Partial<typeof draft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (draft.grant && target?.id) {
      setModalTried(false);
      setGrantAsk({
        kind: "save",
        templateId: draft.id || "",
        name: draft.name.trim() || "Novo item",
      });
      return;
    }
    await save();
  }

  async function confirmDanger() {
    if (!danger) return;
    setModalTried(true);
    const ok = danger.kind === "delete" ? await remove(danger.item) : await reset(danger.item);
    if (ok) {
      setDanger(null);
      setModalTried(false);
    }
  }

  async function confirmGrant() {
    if (!grantAsk) return;
    setModalTried(true);
    const ok = grantAsk.kind === "grant" ? await grant(grantAsk.templateId) : await save();
    if (ok) {
      setGrantAsk(null);
      setModalTried(false);
    }
  }

  const gateTitle =
    gate?.kind === "select"
      ? "Trocar de item"
      : gate?.kind === "new"
        ? "Novo item"
        : "Duplicar item";
  const gateBody =
    gate?.kind === "select"
      ? `O rascunho de ${draft.name || "item novo"} ainda não foi salvo. Abrir ${gate.item.name} descarta essas alterações.`
      : gate?.kind === "new"
        ? "O rascunho atual será descartado e o formulário volta a Novo item."
        : "A cópia usa o que está no formulário agora, com outro id ao salvar. O item original no catálogo não muda, e a seleção da lista é limpa.";

  return (
    <div className="ed">
      <header className="ed-top">
        <div className="ed-top__title">
          <p className="ed-kicker">Catálogo de itens</p>
          <h2>{draft.id ? draft.name || "Item" : "Novo item"}</h2>
        </div>
        <div className="ed-top__actions">
          <StudioBtn type="button" onClick={requestNew}>Novo</StudioBtn>
          <StudioBtn variant="gold" type="submit" form="item-editor" disabled={working || draft.classes.length === 0}>
            Salvar
          </StudioBtn>
        </div>
      </header>

      <aside className="ed-catalog">
        <div className="ed-catalog__head">
          <div className="ed-catalog__count">
            <strong>Biblioteca</strong>
            <span>{filtered.length} de {catalog.length}</span>
          </div>
          <input
            className="studio-2-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar nome, id ou classe"
          />
          <div className="ed-filters">
            <select className="studio-2-select" value={filterClass} onChange={(event) => setFilterClass(event.target.value)}>
              <option value="all">Classe</option>
              {(catalogMeta?.classes || []).map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
            <select className="studio-2-select" value={filterSlot} onChange={(event) => setFilterSlot(event.target.value)}>
              <option value="all">Slot</option>
              {(catalogMeta?.slots || []).map((slot) => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
            <select className="studio-2-select" value={filterTier} onChange={(event) => setFilterTier(event.target.value)}>
              <option value="all">Tier</option>
              {(catalogMeta?.tiers || []).map((tier) => (
                <option key={tier.tier} value={String(tier.tier)}>T{tier.tier}</option>
              ))}
            </select>
            <select className="studio-2-select" value={filterKind} onChange={(event) => setFilterKind(event.target.value as KindFilter)}>
              <option value="all">Tipo</option>
              <option value="gear">Equipamento</option>
              <option value="consumable">Consumível</option>
            </select>
            <select className="studio-2-select" value={filterOrigin} onChange={(event) => setFilterOrigin(event.target.value as OriginFilter)}>
              <option value="all">Origem</option>
              <option value="base">Base</option>
              <option value="override">Com override</option>
              <option value="custom">Customizado</option>
            </select>
            <StudioBtn type="button" disabled={!filtersActive} onClick={clearFilters}>Limpar filtros</StudioBtn>
          </div>
        </div>
        {total === 0 ? (
          <StudioEmpty>Nenhum item com esses filtros.</StudioEmpty>
        ) : (
          <div
            ref={listRef}
            className="ed-list"
            onScroll={(event) => setScrollTop((event.target as HTMLDivElement).scrollTop)}
          >
            <div style={{ height: start * ROW_H }} />
            {slice.map((item) => {
                const active = draft.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  style={{ height: ROW_H }}
                  className={cn("ed-row", active && "is-selected")}
                  aria-selected={active}
                  title={`${item.name} · ${item.id}`}
                  onClick={() => requestSelect(item)}
                >
                  {item.art ? (
                    <img className="ed-thumb" src={item.art} alt="" />
                  ) : (
                    <span className="ed-mark">{markOf(item.icon, item.name)}</span>
                  )}
                  <span className="ed-row__text">
                    <span className="ed-row__name">{item.name}</span>
                    <span className="ed-row__meta">
                      {classesLabel(item)} · T{item.tier} · {item.slot}
                    </span>
                    <span className="ed-row__id">{item.id}</span>
                  </span>
                  <span className="ed-row__flags">
                    {item.custom ? <em>custom</em> : null}
                    {item.overridden ? <em>override</em> : null}
                  </span>
                </button>
              );
            })}
            <div style={{ height: Math.max(0, (total - end) * ROW_H) }} />
          </div>
        )}
      </aside>

      <form id="item-editor" className="ed-main" onSubmit={(event) => void onSubmit(event)}>
        <StudioTabs tabs={TABS} active={tab} onChange={setTab} />
        <p className="ed-idline">
          {draft.id ? (
            <>Editando <code>{draft.id}</code></>
          ) : (
            "Nenhum item selecionado. Novo item recebe um id ao salvar."
          )}
          {selected?.custom ? " · customizado" : ""}
          {selected?.overridden ? " · override do original" : ""}
        </p>

        {tab === "geral" ? (
          <div className="ed-section">
            <h3>Geral</h3>
            <div className="ed-fields">
              <StudioField label="Nome" className="ed-span-2">
                <input
                  className="studio-2-input"
                  value={draft.name}
                  minLength={2}
                  maxLength={40}
                  required
                  onChange={(event) => patch({ name: event.target.value })}
                />
              </StudioField>
              <StudioField label="Slot">
                <select
                  className="studio-2-select"
                  value={draft.slot}
                  onChange={(event) => patch({ slot: event.target.value, visual: "" })}
                >
                  {(catalogMeta?.slots || []).map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </StudioField>
              <StudioField label="Ícone">
                <select className="studio-2-select" value={draft.icon} onChange={(event) => patch({ icon: event.target.value })}>
                  {(catalogMeta?.icons || ["sword"]).map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </StudioField>
              <StudioField label="Tier">
                <select
                  className="studio-2-select"
                  value={String(draft.tier)}
                  onChange={(event) => {
                    const tier = Number(event.target.value);
                    const level = catalogMeta?.tiers?.find((row) => row.tier === tier)?.level || draft.level;
                    patch({ tier, level });
                  }}
                >
                  {(catalogMeta?.tiers || [{ tier: 1, level: 1 }]).map((tier) => (
                    <option key={tier.tier} value={tier.tier}>T{tier.tier}</option>
                  ))}
                </select>
              </StudioField>
              <StudioField label="Nível mínimo">
                <input
                  className="studio-2-input"
                  type="number"
                  min={1}
                  max={700}
                  value={draft.level}
                  onChange={(event) => patch({ level: Number(event.target.value) || 1 })}
                />
              </StudioField>
              <StudioField label="Preço">
                <input
                  className="studio-2-input"
                  type="number"
                  min={1}
                  value={draft.price}
                  onChange={(event) => patch({ price: Number(event.target.value) || 1 })}
                />
              </StudioField>
            </div>
            <StudioField label="Classes">
              <div className="ed-chips">
                {(catalogMeta?.classes || []).map((classId) => {
                  const checked = draft.classes.includes(classId);
                  return (
                    <button
                      key={classId}
                      type="button"
                      className={cn("ed-chip", checked && "is-on")}
                      aria-pressed={checked}
                      onClick={() =>
                        patch({
                          classes: checked
                            ? draft.classes.filter((id) => id !== classId)
                            : [...draft.classes, classId],
                        })
                      }
                    >
                      {classId}
                    </button>
                  );
                })}
              </div>
            </StudioField>
            {draft.classes.length === 0 ? (
              <p className="ed-note">O servidor exige ao menos uma classe.</p>
            ) : null}
            <div className="ed-flags">
              {selected?.consumable || draft.slot === "consumable" ? <span>Consumível</span> : null}
              {selected?.twoHanded ? <span>Duas mãos</span> : null}
              {selected?.stackable ? <span>Empilhável</span> : null}
              {selected?.announce ? <span>Anuncia drop</span> : null}
              {selected?.requiresAscension ? <span>{selected.requiresAscension}</span> : null}
            </div>
          </div>
        ) : null}

        {tab === "atributos" ? (
          <div className="ed-section">
            <h3>Atributos</h3>
            <p className="ed-note">Vazio não entra no item. Equipamento precisa de pelo menos um valor maior que zero. Crítico aceita decimal.</p>
            <div className="ed-fields">
              {STATS.map((stat) => (
                <StudioField key={stat.key} label={`${stat.label} (${stat.hint})`}>
                  <input
                    className="studio-2-input"
                    inputMode="decimal"
                    value={draft[stat.key]}
                    onChange={(event) => patch({ [stat.key]: event.target.value })}
                  />
                </StudioField>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "drop" ? (
          <div className="ed-section">
            <h3>Drop do template</h3>
            <StudioField label="Peso no pool (%)">
              <input
                className="studio-2-input"
                value={draft.dropPct}
                onChange={(event) => patch({ dropPct: event.target.value })}
              />
            </StudioField>
            <p className="ed-note">
              Este campo é o peso deste template, de 0 a 100 no formulário e de 0 a 1 no servidor.
              A chance global de drop fica em Live Ops.
            </p>
            <StudioBtn type="button" onClick={() => onOpenTab("economy")}>Abrir drop global</StudioBtn>
            <div className="ed-fields">
              <StudioField label="Raridade ao conceder">
                <select className="studio-2-select" value={grantRarity} onChange={(event) => setGrantRarity(event.target.value)}>
                  {(rarityOptions.length ? rarityOptions : ["common"]).map((rarity) => (
                    <option key={rarity} value={rarity}>{catalogMeta?.rarities?.[rarity]?.name || rarity}</option>
                  ))}
                </select>
              </StudioField>
            </div>
            <label className="ed-check">
              <input
                type="checkbox"
                checked={draft.grant}
                onChange={(event) => patch({ grant: event.target.checked })}
              />
              Conceder ao personagem do topo depois de salvar
            </label>
            <p className="ed-note">Destino atual: {formatGrantTargetLabel(target)}</p>
          </div>
        ) : null}

        {tab === "visual" ? (
          <div className="ed-section">
            <h3>Visual</h3>
            <div className="ed-fields">
              <StudioField label="Modelo do equipamento">
                <select className="studio-2-select" value={draft.visual} onChange={(event) => patch({ visual: event.target.value })}>
                  <option value="">Sem modelo 3D</option>
                  {visualsForSlot.map((visual) => (
                    <option key={visual.id} value={visual.id}>{visual.label || visual.id}</option>
                  ))}
                </select>
              </StudioField>
              <StudioField label="Raridade do preview">
                <select className="studio-2-select" value={draft.rarity} onChange={(event) => patch({ rarity: event.target.value })}>
                  {(rarityOptions.length ? rarityOptions : ["common"]).map((rarity) => (
                    <option key={rarity} value={rarity}>{catalogMeta?.rarities?.[rarity]?.name || rarity}</option>
                  ))}
                </select>
              </StudioField>
            </div>
            <p className="ed-note">
              A lista é a de visuais de equipamento deste slot. Props de cenário não entram aqui.
              {draft.icon ? ` Ícone de interface: ${draft.icon}.` : ""}
            </p>
          </div>
        ) : null}
      </form>

      <aside className="ed-preview">
        <div className="ed-preview__stage">
          <AdminPreviewFrame iframeRef={iframeRef} ready={ready} title="Preview do item" className="ed-preview__frame" />
        </div>
        <div className="ed-preview__meta">
          <h3>Visualização</h3>
          <StudioBtn type="button" onClick={framePreview}>Enquadrar modelo</StudioBtn>
          {hasModel ? (
            <p>Modelo <code>{draft.visual}</code>. Arraste para girar e use a roda para aproximar.</p>
          ) : (
            <p>Este item não tem modelo 3D. O preview não coloca um objeto genérico no lugar.</p>
          )}
          {draft.id && selected?.art ? <img className="ed-art" src={selected.art} alt="" /> : null}
          <dl>
            <div><dt>Tier</dt><dd>T{draft.tier}</dd></div>
            <div><dt>Slot</dt><dd>{draft.slot || "—"}</dd></div>
            <div><dt>Classes</dt><dd>{draft.classes.join(", ") || "—"}</dd></div>
            <div><dt>Ícone</dt><dd>{draft.icon || "—"}</dd></div>
          </dl>
        </div>
      </aside>

      <footer className="ed-foot">
        <span className={cn("ed-phase", `is-${phase}`)}>{PHASE_LABEL[phase]}</span>
        <span className="ed-foot__hint">
          {dirty ? "Há alterações neste item." : "O formulário está igual ao último estado confirmado."}
        </span>
        <div className="ed-foot__actions">
          <StudioBtn type="button" disabled={!draft.name && !draft.id} onClick={requestDuplicate}>Duplicar</StudioBtn>
          <StudioBtn type="button" disabled={working || !selected?.overridden} onClick={() => selected && (setModalTried(false), setDanger({ kind: "reset", item: selected }))}>
            Restaurar
          </StudioBtn>
          <StudioBtn
            type="button"
            disabled={working || !selected || !target}
            onClick={() => {
              if (!selected || !target) return;
              setModalTried(false);
              setGrantAsk({ kind: "grant", templateId: selected.id, name: selected.name });
            }}
          >
            Conceder
          </StudioBtn>
          <StudioBtn
            variant="danger"
            type="button"
            disabled={working || !selected?.custom}
            onClick={() => selected && (setModalTried(false), setDanger({ kind: "delete", item: selected }))}
          >
            Excluir
          </StudioBtn>
        </div>
      </footer>

      <StudioModal
        open={gate != null}
        title={gateTitle}
        description={gateBody}
        onClose={() => setGate(null)}
        footer={
          <>
            <StudioBtn type="button" onClick={() => setGate(null)}>Cancelar</StudioBtn>
            <StudioBtn variant="gold" type="button" onClick={acceptGate}>
              {gate?.kind === "duplicate" ? "Criar cópia" : "Descartar e continuar"}
            </StudioBtn>
          </>
        }
      />

      <StudioModal
        open={danger != null}
        title={danger?.kind === "delete" ? "Excluir item" : "Restaurar item"}
        description={
          danger?.kind === "delete"
            ? `${danger.item.name} (${danger.item.id}) sai do catálogo. Esta ação não vale para o original de um override.`
            : danger
              ? `${danger.item.name} (${danger.item.id}) volta ao template original do jogo. O override deste id é removido.`
              : undefined
        }
        busy={working}
        error={modalTried ? error : null}
        onClose={() => !working && setDanger(null)}
        footer={
          <>
            <StudioBtn type="button" disabled={working} onClick={() => setDanger(null)}>Cancelar</StudioBtn>
            <StudioBtn variant={danger?.kind === "delete" ? "danger" : "gold"} type="button" loading={working} onClick={() => void confirmDanger()}>
              {danger?.kind === "delete" ? "Excluir" : "Restaurar"}
            </StudioBtn>
          </>
        }
      >
        {danger ? (
          <p className="ed-modal-id">
            {classesLabel(danger.item)} · T{danger.item.tier} · {danger.item.slot}
          </p>
        ) : null}
      </StudioModal>

      <StudioModal
        open={grantAsk != null}
        title={grantAsk?.kind === "save" ? "Salvar e conceder" : "Conceder item"}
        description={
          grantAsk
            ? `${grantAsk.name}${grantAsk.templateId ? ` (${grantAsk.templateId})` : ""} vai para ${formatGrantTargetLabel(target)}, na raridade ${grantAsk.kind === "save" ? draft.rarity : grantRarity}. Uma unidade. Personagem e item são os que estão nesta tela agora.`
            : undefined
        }
        busy={working}
        error={modalTried ? error : null}
        onClose={() => !working && setGrantAsk(null)}
        footer={
          <>
            <StudioBtn type="button" disabled={working} onClick={() => setGrantAsk(null)}>Cancelar</StudioBtn>
            <StudioBtn variant="gold" type="button" loading={working} onClick={() => void confirmGrant()}>
              {grantAsk?.kind === "save" ? "Salvar e conceder" : "Conceder"}
            </StudioBtn>
          </>
        }
      >
        {dirty && grantAsk?.kind === "grant" ? (
          <p className="ed-note">Há edições não salvas. A concessão usa o item já gravado, não o rascunho.</p>
        ) : null}
      </StudioModal>
    </div>
  );
}
