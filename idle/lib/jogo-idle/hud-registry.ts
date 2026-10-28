/**
 * Registro estável de componentes editáveis da HUD.
 * Espelhado no Admin via alias `@/lib/jogo-idle/hud-registry`.
 */

export type HudEditableProp =
  | "width"
  | "height"
  | "minWidth"
  | "maxWidth"
  | "minHeight"
  | "maxHeight"
  | "marginTop"
  | "marginRight"
  | "marginBottom"
  | "marginLeft"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
  | "gap"
  | "fontSize"
  | "fontWeight"
  | "color"
  | "opacity"
  | "borderRadius"
  | "gridTemplateColumns"
  | "aspectRatio"
  | "visible"
  | "order"
  | "position"
  | "left"
  | "top"
  | "right"
  | "bottom"
  | "zIndex"
  | "flexGrow"
  | "alignSelf";

export type HudDragMode = "reorder" | "free" | "resize";

export type HudComponentDef = {
  id: string;
  label: string;
  group: string;
  parentId: string | null;
  /** Seletor CSS legado (documentação); runtime usa data-hud-id. */
  selector: string;
  editableProps: readonly HudEditableProp[];
  essential: boolean;
  dragModes: readonly HudDragMode[];
  minSize: { w: number; h: number };
};

const LAYOUT_PROPS = [
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "gap",
  "visible",
  "order",
  "position",
  "left",
  "top",
  "right",
  "bottom",
  "zIndex",
  "flexGrow",
  "alignSelf",
] as const satisfies readonly HudEditableProp[];

const PANEL_PROPS = [...LAYOUT_PROPS, "opacity", "borderRadius"] as const;

const COLUMN_MODES = ["resize"] as const satisfies readonly HudDragMode[];
const PANEL_MODES = ["reorder", "free", "resize"] as const satisfies readonly HudDragMode[];

function def(
  partial: Omit<HudComponentDef, "editableProps" | "essential" | "dragModes" | "minSize"> & {
    editableProps?: readonly HudEditableProp[];
    dragModes?: readonly HudDragMode[];
    minSize?: { w: number; h: number };
    essential?: boolean;
  },
): HudComponentDef {
  return {
    essential: true,
    editableProps: PANEL_PROPS,
    dragModes: PANEL_MODES,
    minSize: { w: 80, h: 48 },
    ...partial,
  };
}

export const HUD_COMPONENTS: readonly HudComponentDef[] = [
  def({
    id: "stage-left",
    label: "Coluna Personagem",
    group: "HUD Principal",
    parentId: null,
    selector: ".stage__left",
    dragModes: COLUMN_MODES,
    minSize: { w: 220, h: 200 },
  }),
  def({
    id: "card-rail",
    label: "Painel do Personagem",
    group: "Personagem",
    parentId: "stage-left",
    selector: ".card--rail",
    minSize: { w: 200, h: 160 },
  }),
  def({
    id: "stage-center",
    label: "Coluna Combate",
    group: "HUD Principal",
    parentId: null,
    selector: ".stage__center",
    dragModes: COLUMN_MODES,
    minSize: { w: 320, h: 240 },
  }),
  def({
    id: "zone-plaque",
    label: "Cabeçalho da Área",
    group: "Combate",
    parentId: "stage-center",
    selector: ".zone-plaque",
    minSize: { w: 160, h: 40 },
  }),
  def({
    id: "stage-viewport",
    label: "Visualização 3D",
    group: "Combate",
    parentId: "stage-center",
    selector: ".stage__viewport",
    minSize: { w: 200, h: 160 },
  }),
  def({
    id: "combat-actions",
    label: "Controles de Combate",
    group: "Combate",
    parentId: "stage-center",
    selector: ".combat-actions",
    editableProps: LAYOUT_PROPS,
    minSize: { w: 120, h: 36 },
  }),
  def({
    id: "unit-hero",
    label: "Painel do Herói",
    group: "Combate",
    parentId: "stage-center",
    selector: ".unit--hero",
    minSize: { w: 140, h: 160 },
  }),
  def({
    id: "unit-skills",
    label: "Habilidades",
    group: "Combate",
    parentId: "stage-center",
    selector: ".unit--skills",
    minSize: { w: 120, h: 160 },
  }),
  def({
    id: "unit-target",
    label: "Painel do Inimigo",
    group: "Combate",
    parentId: "stage-center",
    selector: ".unit--target",
    minSize: { w: 160, h: 160 },
  }),
  def({
    id: "stage-right",
    label: "Coluna Inventário",
    group: "HUD Principal",
    parentId: null,
    selector: ".stage__right",
    dragModes: COLUMN_MODES,
    minSize: { w: 220, h: 200 },
  }),
  def({
    id: "card-bag",
    label: "Mochila",
    group: "Inventário",
    parentId: "stage-right",
    selector: ".card--bag",
    minSize: { w: 200, h: 180 },
  }),
  def({
    id: "inv-grid",
    label: "Grid de Itens",
    group: "Inventário",
    parentId: "card-bag",
    selector: "#inv-grid",
    minSize: { w: 120, h: 80 },
  }),
  def({
    id: "card-log",
    label: "Painel de Acontecimentos",
    group: "Inventário",
    parentId: "stage-right",
    selector: ".card--log",
    minSize: { w: 180, h: 80 },
  }),
];

export const HUD_COMPONENT_IDS = HUD_COMPONENTS.map((c) => c.id);

/** Meta espelhada no bridge (JS puro) — ids → minSize/dragModes. */
export const HUD_BRIDGE_META: Record<
  string,
  { dragModes: HudDragMode[]; minSize: { w: number; h: number } }
> = Object.fromEntries(
  HUD_COMPONENTS.map((c) => [c.id, { dragModes: [...c.dragModes], minSize: { ...c.minSize } }]),
);

const BY_ID = new Map(HUD_COMPONENTS.map((c) => [c.id, c]));

export function getHudComponent(id: string): HudComponentDef | undefined {
  return BY_ID.get(id);
}

export function isHudComponentId(id: string): boolean {
  return BY_ID.has(id);
}

/** Árvore para o painel de camadas (raiz = parentId null). */
export function buildHudLayerTree(): Array<HudComponentDef & { children: HudComponentDef[] }> {
  const roots = HUD_COMPONENTS.filter((c) => !c.parentId);
  return roots.map((root) => ({
    ...root,
    children: HUD_COMPONENTS.filter((c) => c.parentId === root.id),
  }));
}
