
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  formatGrantTargetLabel,
  type AdminActiveCharacter,
  type AdminCatalogItem,
  type AdminCatalogMeta,
  type TemplateDraft,
} from "./admin-types";
import { AdminPreviewFrame } from "./studio/admin-preview-frame";
import { useAdminPreviewBridge } from "./studio/use-admin-preview-bridge";
import {
  StudioBadge,
  StudioBtn,
  StudioCatalog,
  StudioEmpty,
  StudioField,
  StudioFormSection,
  StudioInspector,
  StudioTabs,
} from "./studio/studio-ui";

type GrantConfirmState =
  | { kind: "grant"; templateId: string; itemName: string; rarity: string }
  | { kind: "saveGrant"; itemName: string; rarity: string; event: FormEvent<HTMLFormElement> };

type AdminItemsPanelProps = {
  catalog: AdminCatalogItem[];
  catalogMeta: AdminCatalogMeta | null;
  filtered: AdminCatalogItem[];
  selected: AdminCatalogItem | null;
  target: AdminActiveCharacter | null;
  query: string;
  filterClass: string;
  filterSlot: string;
  filterTier: string;
  grantRarity: string;
  rarityOptions: string[];
  draft: TemplateDraft;
  working: boolean;
  onQueryChange: (value: string) => void;
  onFilterClassChange: (value: string) => void;
  onFilterSlotChange: (value: string) => void;
  onFilterTierChange: (value: string) => void;
  onGrantRarityChange: (value: string) => void;
  onClearFilters: () => void;
  onSelectItem: (item: AdminCatalogItem) => void;
  onDraftChange: (updater: (prev: TemplateDraft) => TemplateDraft) => void;
  onNewItem: () => void;
  onDuplicateItem: () => void;
  onGrant: (templateId?: string) => Promise<void>;
  onSaveTemplate: (event: FormEvent) => Promise<void>;
  onDelete: (item: AdminCatalogItem) => Promise<void>;
  onReset: (item: AdminCatalogItem) => Promise<void>;
};

const ITEM_TABS = [
  { id: "geral", label: "Geral" },
  { id: "atributos", label: "Atributos" },
  { id: "drop", label: "Drop" },
  { id: "visual", label: "Visual 3D" },
  { id: "avancado", label: "Avançado" },
];

const ROW_H = 52;
const LIST_H = 520;

function dropPctOf(item: AdminCatalogItem) {
  if (item.dropChance != null && Number.isFinite(Number(item.dropChance))) {
    return Math.round(Number(item.dropChance) * 10000) / 100;
  }
  if (item.consumable || item.slot === "consumable") return 0;
  return 100;
}

function StatInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <StudioField label={label}>
      <input className="studio-2-input" value={value} onChange={(e) => onChange(e.target.value)} />
    </StudioField>
  );
}

export function AdminItemsPanel({
  catalog,
  catalogMeta,
  filtered,
  selected,
  target,
  query,
  filterClass,
  filterSlot,
  filterTier,
  grantRarity,
  rarityOptions,
  draft,
  working,
  onQueryChange,
  onFilterClassChange,
  onFilterSlotChange,
  onFilterTierChange,
  onGrantRarityChange,
  onClearFilters,
  onSelectItem,
  onDraftChange,
  onNewItem,
  onDuplicateItem,
  onGrant,
  onSaveTemplate,
  onDelete,
  onReset,
}: AdminItemsPanelProps) {
  const [grantConfirm, setGrantConfirm] = useState<GrantConfirmState | null>(null);
  const [tab, setTab] = useState("geral");
  const [scrollTop, setScrollTop] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { ready, showItem } = useAdminPreviewBridge(iframeRef);

  const visualsForSlot = useMemo(
    () => (catalogMeta?.visuals || []).filter((visual) => visual.slots.includes(draft.slot)),
    [catalogMeta?.visuals, draft.slot],
  );

  useEffect(() => {
    if (!ready) return;
    showItem({
      visual: draft.visual || null,
      rarity: draft.rarity || grantRarity || "common",
      name: draft.name || "Item",
    });
  }, [ready, draft.visual, draft.rarity, draft.name, grantRarity, showItem]);

  const total = filtered.length;
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - 4);
  const visibleCount = Math.ceil(LIST_H / ROW_H) + 8;
  const end = Math.min(total, start + visibleCount);
  const slice = filtered.slice(start, end);
  const padTop = start * ROW_H;
  const padBottom = Math.max(0, (total - end) * ROW_H);

  function openGrantDialog(templateId: string, itemName: string, rarity: string) {
    setGrantConfirm({ kind: "grant", templateId, itemName, rarity });
  }

  async function confirmGrantDialog() {
    if (!grantConfirm) return;
    if (grantConfirm.kind === "grant") {
      await onGrant(grantConfirm.templateId);
    } else {
      await onSaveTemplate(grantConfirm.event);
    }
    setGrantConfirm(null);
  }

  async function handleSaveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.grant && target?.id) {
      setGrantConfirm({
        kind: "saveGrant",
        itemName: draft.name.trim() || "Novo item",
        rarity: draft.rarity,
        event,
      });
      return;
    }
    await onSaveTemplate(event);
  }

  const confirmItemName =
    grantConfirm?.kind === "grant"
      ? grantConfirm.itemName
      : grantConfirm?.kind === "saveGrant"
        ? grantConfirm.itemName
        : "";
  const confirmRarity =
    grantConfirm?.kind === "grant"
      ? grantConfirm.rarity
      : grantConfirm?.kind === "saveGrant"
        ? grantConfirm.rarity
        : "";

  return (
    <>
      <div className="studio-2-split-3">
        <StudioCatalog
          head={
            <>
              <div className="flex items-center justify-between gap-2">
                <strong className="text-sm">Catálogo</strong>
                <StudioBadge>{filtered.length}/{catalog.length}</StudioBadge>
              </div>
              <input
                className="studio-2-input"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Buscar nome ou id"
              />
              <div className="grid grid-cols-2 gap-1">
                <select className="studio-2-select" value={filterClass} onChange={(e) => onFilterClassChange(e.target.value)}>
                  <option value="all">Classes</option>
                  {(catalogMeta?.classes || []).map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
                <select className="studio-2-select" value={filterSlot} onChange={(e) => onFilterSlotChange(e.target.value)}>
                  <option value="all">Slots</option>
                  {(catalogMeta?.slots || []).map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
                <select className="studio-2-select" value={filterTier} onChange={(e) => onFilterTierChange(e.target.value)}>
                  <option value="all">Tiers</option>
                  {(catalogMeta?.tiers || []).map((tier) => (
                    <option key={tier.tier} value={String(tier.tier)}>T{tier.tier}</option>
                  ))}
                </select>
                <StudioBtn type="button" onClick={onClearFilters}>Limpar</StudioBtn>
              </div>
            </>
          }
        >
          {total === 0 ? (
            <StudioEmpty>Nenhum item</StudioEmpty>
          ) : (
            <div
              style={{ height: LIST_H, overflow: "auto" }}
              onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
            >
              <div style={{ height: padTop }} />
              {slice.map((item) => {
                const isSelected = (selected?.id || "") === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    style={{ height: ROW_H }}
                    className={cn("studio-2-catalog__row", isSelected && "is-selected")}
                    onClick={() => onSelectItem(item)}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[var(--studio-line)] text-[0.65rem] font-bold text-[var(--studio-gold)]">
                      T{item.tier}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{item.name}</span>
                      <span className="block truncate text-[0.62rem] text-[var(--studio-muted)]">
                        {item.slot} · {dropPctOf(item)}%
                        {item.custom ? " · custom" : ""}
                        {item.overridden ? " · override" : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
              <div style={{ height: padBottom }} />
            </div>
          )}
        </StudioCatalog>

        <div className="studio-2-editor-pane">
          <div className="studio-2-editor-pane__head">
            <div>
              <h3 className="studio-2-section-title mb-0">
                {draft.id ? draft.name || "Editar item" : "Novo item"}
              </h3>
              <p className="text-[0.65rem] text-[var(--studio-muted)]">
                {draft.id || "id gerado ao salvar"} · alvo {formatGrantTargetLabel(target)}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <StudioBtn type="button" onClick={onNewItem}>Novo</StudioBtn>
              <StudioBtn type="button" disabled={!draft.id} onClick={onDuplicateItem}>
                Duplicar
              </StudioBtn>
              {selected?.overridden ? (
                <StudioBtn type="button" disabled={working} onClick={() => void onReset(selected)}>
                  Reset
                </StudioBtn>
              ) : null}
              {selected?.custom ? (
                <StudioBtn type="button" variant="danger" disabled={working} onClick={() => void onDelete(selected)}>
                  Excluir
                </StudioBtn>
              ) : null}
              <StudioBtn
                type="button"
                disabled={working || !selected || !target}
                onClick={() => selected && openGrantDialog(selected.id, selected.name, grantRarity)}
              >
                Conceder
              </StudioBtn>
            </div>
          </div>

          <StudioTabs tabs={ITEM_TABS} active={tab} onChange={setTab} />

          <form onSubmit={(event) => void handleSaveTemplate(event)} className="space-y-3">
            {tab === "geral" ? (
              <StudioFormSection title="Identidade">
                <StudioField label="Nome">
                  <input
                    className="studio-2-input"
                    value={draft.name}
                    onChange={(e) => onDraftChange((p) => ({ ...p, name: e.target.value }))}
                    minLength={2}
                    maxLength={40}
                    required
                  />
                </StudioField>
                <div className="grid gap-2 sm:grid-cols-2">
                  <StudioField label="Slot">
                    <select
                      className="studio-2-select"
                      value={draft.slot}
                      onChange={(e) => onDraftChange((p) => ({ ...p, slot: e.target.value, visual: "" }))}
                    >
                      {(catalogMeta?.slots || []).map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </StudioField>
                  <StudioField label="Ícone">
                    <select
                      className="studio-2-select"
                      value={draft.icon}
                      onChange={(e) => onDraftChange((p) => ({ ...p, icon: e.target.value }))}
                    >
                      {(catalogMeta?.icons || ["sword"]).map((icon) => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </StudioField>
                </div>
                <StudioField label="Classes">
                  <div className="flex flex-wrap gap-1">
                    {(catalogMeta?.classes || []).map((classId) => {
                      const checked = draft.classes.includes(classId);
                      return (
                        <StudioBtn
                          key={classId}
                          type="button"
                          variant={checked ? "gold" : "default"}
                          onClick={() =>
                            onDraftChange((prev) => ({
                              ...prev,
                              classes: checked
                                ? prev.classes.filter((id) => id !== classId)
                                : [...prev.classes, classId],
                            }))
                          }
                        >
                          {classId}
                        </StudioBtn>
                      );
                    })}
                  </div>
                </StudioField>
                <div className="grid gap-2 sm:grid-cols-3">
                  <StudioField label="Tier">
                    <select
                      className="studio-2-select"
                      value={String(draft.tier)}
                      onChange={(e) => {
                        const tier = Number(e.target.value);
                        const level =
                          catalogMeta?.tiers?.find((row) => row.tier === tier)?.level || draft.level;
                        onDraftChange((p) => ({ ...p, tier, level }));
                      }}
                    >
                      {(catalogMeta?.tiers || [{ tier: 1, level: 1 }]).map((tier) => (
                        <option key={tier.tier} value={tier.tier}>T{tier.tier}</option>
                      ))}
                    </select>
                  </StudioField>
                  <StudioField label="Nível mín.">
                    <input
                      className="studio-2-input"
                      type="number"
                      min={1}
                      max={400}
                      value={draft.level}
                      onChange={(e) =>
                        onDraftChange((p) => ({ ...p, level: Number(e.target.value) || 1 }))
                      }
                    />
                  </StudioField>
                  <StudioField label="Preço">
                    <input
                      className="studio-2-input"
                      type="number"
                      min={1}
                      value={draft.price}
                      onChange={(e) =>
                        onDraftChange((p) => ({ ...p, price: Number(e.target.value) || 1 }))
                      }
                    />
                  </StudioField>
                </div>
              </StudioFormSection>
            ) : null}

            {tab === "atributos" ? (
              <StudioFormSection title="Atributos">
                <div className="grid gap-2 sm:grid-cols-3">
                  <StatInput label="STR" value={draft.str} onChange={(v) => onDraftChange((p) => ({ ...p, str: v }))} />
                  <StatInput label="DEX" value={draft.dex} onChange={(v) => onDraftChange((p) => ({ ...p, dex: v }))} />
                  <StatInput label="INT" value={draft.int} onChange={(v) => onDraftChange((p) => ({ ...p, int: v }))} />
                  <StatInput label="CON" value={draft.con} onChange={(v) => onDraftChange((p) => ({ ...p, con: v }))} />
                  <StatInput label="MP" value={draft.mp} onChange={(v) => onDraftChange((p) => ({ ...p, mp: v }))} />
                  <StatInput label="ATK" value={draft.attack} onChange={(v) => onDraftChange((p) => ({ ...p, attack: v }))} />
                  <StatInput label="DEF" value={draft.defense} onChange={(v) => onDraftChange((p) => ({ ...p, defense: v }))} />
                  <StatInput label="HP" value={draft.hp} onChange={(v) => onDraftChange((p) => ({ ...p, hp: v }))} />
                  <StatInput label="CRIT" value={draft.crit} onChange={(v) => onDraftChange((p) => ({ ...p, crit: v }))} />
                </div>
              </StudioFormSection>
            ) : null}

            {tab === "drop" ? (
              <StudioFormSection title="Drop">
                <StudioField label="Peso / chance % (template)">
                  <input
                    className="studio-2-input"
                    value={draft.dropPct}
                    onChange={(e) => onDraftChange((p) => ({ ...p, dropPct: e.target.value }))}
                  />
                </StudioField>
                <p className="text-[0.68rem] text-[var(--studio-muted)]">
                  Pool global por tier no motor. Loot tables por monstro: Fase 2.
                </p>
                <StudioField label="Raridade ao conceder">
                  <select
                    className="studio-2-select"
                    value={grantRarity}
                    onChange={(e) => onGrantRarityChange(e.target.value)}
                  >
                    {(rarityOptions.length ? rarityOptions : ["common"]).map((rarity) => (
                      <option key={rarity} value={rarity}>
                        {catalogMeta?.rarities?.[rarity]?.name || rarity}
                      </option>
                    ))}
                  </select>
                </StudioField>
                <label className="flex items-center gap-2 text-[0.75rem]">
                  <input
                    type="checkbox"
                    checked={draft.grant}
                    onChange={(e) => onDraftChange((p) => ({ ...p, grant: e.target.checked }))}
                  />
                  Conceder ao alvo após salvar
                </label>
              </StudioFormSection>
            ) : null}

            {tab === "visual" ? (
              <StudioFormSection title="Visual 3D">
                <StudioField label="Asset visual">
                  <select
                    className="studio-2-select"
                    value={draft.visual}
                    onChange={(e) => onDraftChange((p) => ({ ...p, visual: e.target.value }))}
                  >
                    <option value="">(padrão do slot)</option>
                    {visualsForSlot.map((v) => (
                      <option key={v.id} value={v.id}>{v.label || v.id}</option>
                    ))}
                  </select>
                </StudioField>
                <StudioField label="Raridade preview">
                  <select
                    className="studio-2-select"
                    value={draft.rarity}
                    onChange={(e) => onDraftChange((p) => ({ ...p, rarity: e.target.value }))}
                  >
                    {(rarityOptions.length ? rarityOptions : ["common"]).map((rarity) => (
                      <option key={rarity} value={rarity}>{rarity}</option>
                    ))}
                  </select>
                </StudioField>
              </StudioFormSection>
            ) : null}

            {tab === "avancado" ? (
              <StudioFormSection title="Avançado">
                <p className="text-[0.72rem] text-[var(--studio-muted)]">
                  ID: <code>{draft.id || "(novo)"}</code>
                  {selected?.custom ? " · custom" : ""}
                  {selected?.overridden ? " · override de base" : ""}
                </p>
                <p className="text-[0.68rem] text-[var(--studio-muted)]">
                  Campos extras (twoHanded, consumable, refineTargets) seguem o template do servidor
                  ao salvar — não inventados nesta UI.
                </p>
              </StudioFormSection>
            ) : null}

            <StudioBtn variant="gold" disabled={working} type="submit">
              Salvar alterações
            </StudioBtn>
          </form>
        </div>

        <StudioInspector title="Preview 3D">
          <div className="min-h-[240px] flex-1">
            <AdminPreviewFrame iframeRef={iframeRef} ready={ready} className="h-[260px]" />
          </div>
          <dl className="space-y-1 text-[0.75rem]">
            <div className="flex justify-between gap-2"><dt className="text-[var(--studio-muted)]">Tier</dt><dd>T{draft.tier}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--studio-muted)]">Slot</dt><dd>{draft.slot}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--studio-muted)]">Nível</dt><dd>{draft.level}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--studio-muted)]">Preço</dt><dd>{draft.price}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--studio-muted)]">Drop %</dt><dd>{draft.dropPct}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--studio-muted)]">Classes</dt><dd className="truncate">{draft.classes.join(", ") || "—"}</dd></div>
          </dl>
          <p className="text-[0.62rem] text-[var(--studio-muted)]">
            Controles de câmera do preview: orbitar no iframe (quando suportado pelo asset).
          </p>
        </StudioInspector>
      </div>

      <AlertDialog open={Boolean(grantConfirm)} onOpenChange={(open) => !open && setGrantConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar concessão</AlertDialogTitle>
            <AlertDialogDescription>
              Conceder <strong>{confirmItemName}</strong> ({confirmRarity}) a{" "}
              {formatGrantTargetLabel(target)}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmGrantDialog()}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
