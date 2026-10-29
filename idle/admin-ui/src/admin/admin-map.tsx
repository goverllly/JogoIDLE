import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { getZoneScenePreset, ZONE_PARTICLE_MODES } from "@/lib/jogo-idle/game/zone-scene";
import {
  categoryLabel,
  categoriesIn,
  packsIn,
  placeablesFromManifest,
  searchPlaceables,
  type PropLibraryAsset,
} from "./prop-library";
import { StudioIcon } from "./studio/studio-icons";
import { StudioBtn, StudioModal } from "./studio/studio-ui";

export type MapDecoration = {
  pack: string;
  key: string;
  x: number;
  z: number;
  y?: number;
  scale?: number;
  rotY?: number;
  tint?: number | null;
  /** Camada gravada. Ausente: o editor infere pela categoria. */
  layer?: "vegetacao" | "estrutura" | "decoracao" | "efeito";
  /** Identificador só da sessão de edição. Não entra no save. */
  editorId?: string;
};

type ZoneRow = {
  id: string;
  name: string;
  minLevel: number;
  maxLevel?: number | null;
  chapterId?: string | null;
  sceneProfileId?: string | null;
  trial?: boolean;
  tier: number;
  scene?: {
    bg?: number;
    ground?: number;
    hemiSky?: number;
    hemiGround?: number;
    hemiIntensity?: number;
    sunColor?: number;
    sunIntensity?: number;
    props?: string;
    particles?: string | null;
    particleColor?: number;
    propDensity?: number;
    fogNear?: number;
    fogFar?: number;
    variant?: string;
    decorationMode?: "off" | "overlay";
    decorations?: MapDecoration[];
  } | null;
};

type SceneDraft = {
  bg: string;
  ground: string;
  hemiSky: string;
  sun: string;
  propsKind: string;
  particles: string;
  particleColor: string;
  propDensity: string;
  fogNear: string;
  fogFar: string;
  decorations: MapDecoration[];
  decorationMode: "off" | "overlay" | null;
  variant?: string;
  hemiGround?: number;
  hemiIntensity?: number;
  sunIntensity?: number;
};

export type MapSavePhase = "saved" | "dirty" | "saving" | "error";

export type AdminMapHandle = {
  save: () => Promise<boolean>;
  allowLeave: () => void;
};

type AdminMapEditorProps = {
  zones: ZoneRow[];
  zoneId: string;
  onZoneChange: (id: string) => void;
  working: boolean;
  idleFetch: (path: string, init?: RequestInit) => Promise<any>;
  onMessage: (message: string | null) => void;
  onRefresh: () => Promise<void>;
  onZonesChange?: (zones: ZoneRow[]) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSavePhase?: (phase: MapSavePhase) => void;
};

const PROP_KINDS = [
  "bare",
  "ruins",
  "forest",
  "graveyard",
  "garden",
  "swamp",
  "crypt",
  "ice",
  "abyss",
  "fortress",
  "volcano",
  "tomb",
  "mist",
  "relic",
  "throne",
  "ether",
  "firmament",
  "nexus",
] as const;

const FALLBACK_PALETTE: Record<string, string[]> = {
  dungeon: ["barrelL", "chest", "chestGold", "column", "pillar", "crates", "torch", "wall", "stairs"],
  nature: ["treeA", "treeB", "treesM", "rockA", "rockC", "hill", "hillsTrees"],
  forest: ["tree1a", "tree2a", "tree3a", "tree4a", "bush1a", "rock1a", "rock3a", "grass1a", "bare1a"],
  city: ["buildingA", "buildingC", "bench", "bush", "streetlight", "waterTower"],
  space: ["moduleA", "moduleB", "pad", "landerA", "lights", "solar"],
  halloween: ["crypt", "arch", "shrine", "lanternH", "treeL", "skullCandle", "jack"],
};

const MAX_DECORATIONS = 160;
const HISTORY_LIMIT = 100;
const PREFS_KEY = "jogo-idle-map-editor-prefs";
const LAYER_PREFS_KEY = "jogo-idle-map-editor-layers";
const LAYERS = ["vegetacao", "estrutura", "decoracao", "efeito"] as const;
type LayerId = (typeof LAYERS)[number];
type LayerView = Record<LayerId, { hidden: boolean; locked: boolean }>;
const LAYER_LABEL: Record<LayerId, string> = {
  vegetacao: "Vegetação",
  estrutura: "Estruturas",
  decoracao: "Decoração",
  efeito: "Efeitos",
};
const CATEGORY_LAYER: Record<string, LayerId> = {
  arvores: "vegetacao",
  arbustos: "vegetacao",
  vegetacao: "vegetacao",
  rochas: "vegetacao",
  terrenos: "estrutura",
  pisos: "estrutura",
  paredes: "estrutura",
  portas: "estrutura",
  pontes: "estrutura",
  construcoes: "estrutura",
  ruinas: "estrutura",
  tochas: "efeito",
  fogueiras: "efeito",
  iluminacao: "efeito",
};
const FOREST_VARIANTS = ["", "clearing", "dense", "cursed", "heart", "swamp", "ruins"];

function emptyLayerView(): LayerView {
  return {
    vegetacao: { hidden: false, locked: false },
    estrutura: { hidden: false, locked: false },
    decoracao: { hidden: false, locked: false },
    efeito: { hidden: false, locked: false },
  };
}

function loadLayerView(): LayerView {
  const base = emptyLayerView();
  try {
    const raw = localStorage.getItem(LAYER_PREFS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<LayerView>) : {};
    for (const id of LAYERS) {
      const row = parsed[id];
      if (!row || typeof row !== "object") continue;
      base[id] = { hidden: Boolean(row.hidden), locked: Boolean(row.locked) };
    }
  } catch {
    /* preferência local inválida volta ao padrão */
  }
  return base;
}

function resolvedLayer(item: MapDecoration, category?: string): LayerId {
  if (item.layer && (LAYERS as readonly string[]).includes(item.layer)) return item.layer;
  return CATEGORY_LAYER[category || ""] || "decoracao";
}

function manualsInPlay(propsKind: string, mode: "off" | "overlay" | null) {
  return mode === "overlay" || propsKind === "bare";
}
const POS_STEPS = [0.25, 0.5, 1, 2];
const ROT_STEPS = [5, 15, 30, 45, 90];
const SCALE_STEPS = [0.05, 0.1, 0.25];

type EditorTool = "navigate" | "select" | "move" | "rotate" | "scale" | "place";
type ThemeSnap = Omit<SceneDraft, "decorations">;
type HistSnap = { decorations: MapDecoration[]; theme: ThemeSnap; selectedId: string | null };
type EditorPrefs = { grid: boolean; snap: boolean; posStep: number; rotStep: number; scaleStep: number };

const DEFAULT_PREFS: EditorPrefs = { grid: false, snap: false, posStep: 1, rotStep: 15, scaleStep: 0.1 };

let editorSeq = 1;

function loadPrefs(): EditorPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<EditorPrefs>) : {};
    return {
      grid: Boolean(parsed.grid),
      snap: Boolean(parsed.snap),
      posStep: POS_STEPS.includes(Number(parsed.posStep)) ? Number(parsed.posStep) : 1,
      rotStep: ROT_STEPS.includes(Number(parsed.rotStep)) ? Number(parsed.rotStep) : 15,
      scaleStep: SCALE_STEPS.includes(Number(parsed.scaleStep)) ? Number(parsed.scaleStep) : 0.1,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function toCssHex(n?: number | null, fallback = "#808080") {
  if (n == null || !Number.isFinite(n)) return fallback;
  return `#${Math.floor(n).toString(16).padStart(6, "0")}`;
}

function fromCssHex(css: string) {
  return Number.parseInt(css.replace(/^#/, ""), 16);
}

function round3(n: number) {
  return Math.round((Number(n) || 0) * 1000) / 1000;
}

function copyDeco(d: MapDecoration): MapDecoration {
  const item: MapDecoration = {
    pack: d.pack,
    key: d.key,
    x: Number(d.x) || 0,
    z: Number(d.z) || 0,
  };
  if (typeof d.y === "number") item.y = d.y;
  if (typeof d.scale === "number") item.scale = d.scale;
  if (typeof d.rotY === "number") item.rotY = d.rotY;
  if (typeof d.tint === "number" || d.tint === null) item.tint = d.tint;
  if (d.layer && (LAYERS as readonly string[]).includes(d.layer)) item.layer = d.layer;
  return item;
}

function copyEditorDeco(d: MapDecoration): MapDecoration {
  const item = copyDeco(d);
  item.editorId = d.editorId || `ed${(editorSeq += 1).toString(36)}`;
  return item;
}

function themeFrom(draft: SceneDraft): ThemeSnap {
  const { decorations: _decorations, ...theme } = draft;
  return theme;
}

function fingerprint(draft: SceneDraft) {
  return JSON.stringify({
    bg: draft.bg,
    ground: draft.ground,
    hemiSky: draft.hemiSky,
    sun: draft.sun,
    props: draft.propsKind,
    particles: draft.particles,
    particleColor: draft.particleColor,
    propDensity: round3(Number(draft.propDensity)),
    fogNear: round3(Number(draft.fogNear)),
    fogFar: round3(Number(draft.fogFar)),
    variant: draft.variant || "",
    decorationMode: draft.decorationMode || "",
    hemiGround: draft.hemiGround ?? null,
    hemiIntensity: draft.hemiIntensity ?? null,
    sunIntensity: draft.sunIntensity ?? null,
    decorations: draft.decorations.map((d) => ({
      pack: d.pack,
      key: d.key,
      x: round3(d.x),
      z: round3(d.z),
      y: d.y == null ? null : round3(d.y),
      scale: round3(d.scale ?? 1),
      rotY: round3(d.rotY ?? 0),
      tint: d.tint ?? null,
      layer: d.layer || "",
    })),
  });
}

function derive(zone: ZoneRow): SceneDraft {
  const preset = getZoneScenePreset(zone.id) as ZoneRow["scene"];
  const scene = zone.scene;
  const particles =
    scene?.particles === null
      ? "float"
      : typeof scene?.particles === "string"
        ? scene.particles
        : typeof preset?.particles === "string"
          ? preset.particles
          : "float";
  return {
    bg: toCssHex(scene?.bg ?? preset?.bg, "#1a2744"),
    ground: toCssHex(scene?.ground ?? preset?.ground, "#243044"),
    hemiSky: toCssHex(scene?.hemiSky ?? preset?.hemiSky, "#c9d4e8"),
    sun: toCssHex(scene?.sunColor ?? preset?.sunColor, "#fff4d0"),
    propsKind: typeof scene?.props === "string" ? scene.props : preset?.props || "forest",
    particles,
    particleColor: toCssHex(scene?.particleColor ?? preset?.particleColor, "#e8ff8a"),
    propDensity: String(scene?.propDensity ?? preset?.propDensity ?? 1),
    fogNear: String(scene?.fogNear ?? preset?.fogNear ?? 10),
    fogFar: String(scene?.fogFar ?? preset?.fogFar ?? 34),
    decorations: Array.isArray(scene?.decorations) ? scene.decorations.map(copyDeco) : [],
    variant: typeof scene?.variant === "string" ? scene.variant : undefined,
    decorationMode: scene?.decorationMode === "overlay" || scene?.decorationMode === "off" ? scene.decorationMode : null,
    hemiGround: typeof scene?.hemiGround === "number" ? scene.hemiGround : undefined,
    hemiIntensity: typeof scene?.hemiIntensity === "number" ? scene.hemiIntensity : undefined,
    sunIntensity: typeof scene?.sunIntensity === "number" ? scene.sunIntensity : undefined,
  };
}

function toScenePayload(draft: SceneDraft) {
  const scene: Record<string, unknown> = {
    bg: fromCssHex(draft.bg),
    ground: fromCssHex(draft.ground),
    hemiSky: fromCssHex(draft.hemiSky),
    sunColor: fromCssHex(draft.sun),
    props: draft.propsKind,
    particles: draft.particles,
    particleColor: fromCssHex(draft.particleColor),
    propDensity: Math.max(0.5, Math.min(2, Number(draft.propDensity) || 1)),
    fogNear: Math.max(1, Math.min(40, Number(draft.fogNear) || 10)),
    fogFar: Math.max(5, Math.min(80, Number(draft.fogFar) || 34)),
  };
  if (draft.variant) scene.variant = draft.variant;
  if (draft.decorationMode === "off" || draft.decorationMode === "overlay") scene.decorationMode = draft.decorationMode;
  if (draft.hemiGround != null) scene.hemiGround = draft.hemiGround;
  if (draft.hemiIntensity != null) scene.hemiIntensity = draft.hemiIntensity;
  if (draft.sunIntensity != null) scene.sunIntensity = draft.sunIntensity;
  if (draft.decorations.length) scene.decorations = draft.decorations.map(copyDeco);
  return scene;
}

function toEditorScene(draft: SceneDraft) {
  const scene = toScenePayload(draft);
  scene.decorations = draft.decorations.map(copyEditorDeco);
  scene.decorationMode = draft.decorationMode ?? null;
  scene.variant = draft.variant || "";
  return scene;
}

function fallbackAssets(): PropLibraryAsset[] {
  const out: PropLibraryAsset[] = [];
  for (const [pack, keys] of Object.entries(FALLBACK_PALETTE)) {
    for (const key of keys) {
      out.push({
        id: `${pack}/${key}`,
        pack,
        key,
        name: key,
        category: "especiais",
        url: "",
        thumb: null,
        defaultScale: pack === "kenneyNature" ? 0.18 : 1,
      });
    }
  }
  return out;
}

function fmt(n: number) {
  return String(Math.round(n * 100) / 100);
}

export const AdminMapEditor = forwardRef<AdminMapHandle, AdminMapEditorProps>(function AdminMapEditor(
  {
    zones,
    zoneId,
    onZoneChange,
    working,
    idleFetch,
    onMessage,
    onRefresh,
    onZonesChange,
    onDirtyChange,
    onSavePhase,
  },
  ref,
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const loadedZoneRef = useRef("");
  const skipThemeUntilRef = useRef(0);
  const baselineRef = useRef("");
  const dirtyRef = useRef(false);
  const echoRef = useRef("");
  const ignoredServerRef = useRef("");
  const hydratingRef = useRef(false);
  const skipUnloadRef = useRef(false);
  const savingRef = useRef(false);
  const draftRef = useRef<SceneDraft | null>(null);
  const zoneIdRef = useRef(zoneId);
  const onDirtyChangeRef = useRef(onDirtyChange);
  const onSavePhaseRef = useRef(onSavePhase);
  const onMessageRef = useRef(onMessage);
  const previewReadyRef = useRef(false);
  const previewAssetRef = useRef<PropLibraryAsset | null>(null);
  const syncSceneRef = useRef<Record<string, unknown> | null>(null);

  const [ready, setReady] = useState(false);
  const [fullSyncKey, setFullSyncKey] = useState(0);
  const [chapter, setChapter] = useState("all");
  const [baseline, setBaseline] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [bg, setBg] = useState("#1a2744");
  const [ground, setGround] = useState("#243044");
  const [hemiSky, setHemiSky] = useState("#c9d4e8");
  const [sun, setSun] = useState("#fff4d0");
  const [propsKind, setPropsKind] = useState("forest");
  const [particles, setParticles] = useState("float");
  const [particleColor, setParticleColor] = useState("#e8ff8a");
  const [propDensity, setPropDensity] = useState("1");
  const [fogNear, setFogNear] = useState("10");
  const [fogFar, setFogFar] = useState("34");
  const [variant, setVariant] = useState<string | undefined>(undefined);
  const [decorationMode, setDecorationMode] = useState<"off" | "overlay" | null>(null);
  const [layerView, setLayerView] = useState<LayerView>(loadLayerView);
  const [overlayAsk, setOverlayAsk] = useState<null | { kind: "enable" | "place"; count: number }>(null);
  const [bakeAsk, setBakeAsk] = useState(false);
  const [hemiGround, setHemiGround] = useState<number | undefined>(undefined);
  const [hemiIntensity, setHemiIntensity] = useState<number | undefined>(undefined);
  const [sunIntensity, setSunIntensity] = useState<number | undefined>(undefined);
  const [decorations, setDecorations] = useState<MapDecoration[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<EditorPrefs>(loadPrefs);
  const [histVersion, setHistVersion] = useState(0);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [tool, setTool] = useState<EditorTool>("navigate");
  const [brushArmed, setBrushArmed] = useState(false);
  const [showPlayCamera, setShowPlayCamera] = useState(false);
  const [library, setLibrary] = useState<PropLibraryAsset[]>([]);
  const [libraryNote, setLibraryNote] = useState("Carregando biblioteca…");
  const [packFilter, setPackFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("");
  const [brushScale, setBrushScale] = useState("1");
  const [dockOpen, setDockOpen] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [pendingZone, setPendingZone] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ZoneRow | null>(null);
  const [fields, setFields] = useState({ x: "0", z: "0", rot: "0", scale: "1" });
  const editingRef = useRef(false);
  const epochRef = useRef(0);
  const pastRef = useRef<HistSnap[]>([]);
  const futureRef = useRef<HistSnap[]>([]);
  const committedRef = useRef<HistSnap | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const shortcutAtRef = useRef(0);

  const draft = useMemo<SceneDraft>(
    () => ({
      bg,
      ground,
      hemiSky,
      sun,
      propsKind,
      particles,
      particleColor,
      propDensity,
      fogNear,
      fogFar,
      decorations,
      decorationMode,
      variant,
      hemiGround,
      hemiIntensity,
      sunIntensity,
    }),
    [
      bg,
      ground,
      hemiSky,
      sun,
      propsKind,
      particles,
      particleColor,
      propDensity,
      fogNear,
      fogFar,
      decorations,
      decorationMode,
      variant,
      hemiGround,
      hemiIntensity,
      sunIntensity,
    ],
  );
  draftRef.current = draft;
  zoneIdRef.current = zoneId;
  onDirtyChangeRef.current = onDirtyChange;
  onSavePhaseRef.current = onSavePhase;
  onMessageRef.current = onMessage;

  const fp = useMemo(() => fingerprint(draft), [draft]);
  const dirty = baseline !== "" && fp !== baseline;
  dirtyRef.current = dirty;
  const phase: MapSavePhase = saving ? "saving" : saveError ? "error" : dirty ? "dirty" : "saved";

  const zone = zones.find((row) => row.id === zoneId) || null;
  const chapters = useMemo(() => {
    const ids = new Set<string>();
    for (const row of zones) if (row.chapterId) ids.add(row.chapterId);
    return [...ids];
  }, [zones]);
  const zoneOptions = useMemo(() => {
    if (chapter === "all") return zones;
    return zones.filter((row) => row.chapterId === chapter || row.id === zoneId);
  }, [zones, chapter, zoneId]);

  const filtered = useMemo(
    () => searchPlaceables(library, { query, pack: packFilter, category: categoryFilter }),
    [library, query, packFilter, categoryFilter],
  );
  const packs = useMemo(() => packsIn(library), [library]);
  const categories = useMemo(() => categoriesIn(library, packFilter || undefined), [library, packFilter]);
  const byId = useMemo(() => {
    const map = new Map<string, PropLibraryAsset>();
    for (const asset of library) map.set(`${asset.pack}/${asset.key}`, asset);
    return map;
  }, [library]);
  const activeAsset = library.find((asset) => asset.id === activeId) || null;
  const selectedIndex = decorations.findIndex((item) => item.editorId && item.editorId === selectedId);
  const selected = selectedIndex >= 0 ? decorations[selectedIndex] : null;
  selectedIdRef.current = selected?.editorId || null;
  const selectedAsset = selected ? byId.get(`${selected.pack}/${selected.key}`) : undefined;

  function pushLog(line: string) {
    setLog((prev) => [`${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}  ${line}`, ...prev].slice(0, 8));
  }

  function sceneKey(snap: HistSnap) {
    return fingerprint({ ...snap.theme, decorations: snap.decorations });
  }

  function noteCommit(nextDecorations: MapDecoration[], nextSelected: string | null, theme?: ThemeSnap) {
    const now: HistSnap = {
      decorations: nextDecorations.map(copyEditorDeco),
      theme: theme || themeFrom(draftRef.current || draft),
      selectedId: nextSelected,
    };
    const current = committedRef.current;
    if (!current) {
      committedRef.current = now;
      return;
    }
    if (sceneKey(now) === sceneKey(current)) {
      committedRef.current = { ...current, selectedId: nextSelected };
      return;
    }
    pastRef.current.push(current);
    if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
    futureRef.current = [];
    committedRef.current = now;
    setHistVersion((value) => value + 1);
  }
  const noteCommitRef = useRef(noteCommit);
  noteCommitRef.current = noteCommit;

  function applySnap(snap: HistSnap) {
    const nextDecorations = snap.decorations.map(copyEditorDeco);
    const nextSelected = snap.selectedId && nextDecorations.some((item) => item.editorId === snap.selectedId) ? snap.selectedId : null;
    setBg(snap.theme.bg);
    setGround(snap.theme.ground);
    setHemiSky(snap.theme.hemiSky);
    setSun(snap.theme.sun);
    setPropsKind(snap.theme.propsKind);
    setParticles(snap.theme.particles);
    setParticleColor(snap.theme.particleColor);
    setPropDensity(snap.theme.propDensity);
    setFogNear(snap.theme.fogNear);
    setFogFar(snap.theme.fogFar);
    setVariant(snap.theme.variant);
    setDecorationMode(snap.theme.decorationMode ?? null);
    setHemiGround(snap.theme.hemiGround);
    setHemiIntensity(snap.theme.hemiIntensity);
    setSunIntensity(snap.theme.sunIntensity);
    setDecorations(nextDecorations);
    setSelectedId(nextSelected);
    skipThemeUntilRef.current = Date.now() + 300;
    const nextDraft: SceneDraft = { ...snap.theme, decorations: nextDecorations };
    syncSceneRef.current = toEditorScene(nextDraft);
    postCommand("apply-editor-state", {
      decorations: nextDecorations,
      selectedId: nextSelected,
      scene: toEditorScene(nextDraft),
    });
  }

  function undo() {
    const now = Date.now();
    if (now - shortcutAtRef.current < 40) return;
    shortcutAtRef.current = now;
    const prev = pastRef.current.pop();
    if (!prev || !committedRef.current) return;
    futureRef.current.push(committedRef.current);
    committedRef.current = prev;
    applySnap(prev);
    setHistVersion((value) => value + 1);
    pushLog("Desfazer.");
  }

  function redo() {
    const now = Date.now();
    if (now - shortcutAtRef.current < 40) return;
    shortcutAtRef.current = now;
    const next = futureRef.current.pop();
    if (!next || !committedRef.current) return;
    pastRef.current.push(committedRef.current);
    committedRef.current = next;
    applySnap(next);
    setHistVersion((value) => value + 1);
    pushLog("Refazer.");
  }
  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  undoRef.current = undo;
  redoRef.current = redo;

  function adoptBaseline(next: string) {
    baselineRef.current = next;
    setBaseline(next);
  }

  function applyDraft(zoneRow: ZoneRow) {
    const next = derive(zoneRow);
    next.decorations = next.decorations.map(copyEditorDeco);
    epochRef.current += 1;
    setBg(next.bg);
    setGround(next.ground);
    setHemiSky(next.hemiSky);
    setSun(next.sun);
    setPropsKind(next.propsKind);
    setParticles(next.particles);
    setParticleColor(next.particleColor);
    setPropDensity(next.propDensity);
    setFogNear(next.fogNear);
    setFogFar(next.fogFar);
    setVariant(next.variant);
    setDecorationMode(next.decorationMode);
    setHemiGround(next.hemiGround);
    setHemiIntensity(next.hemiIntensity);
    setSunIntensity(next.sunIntensity);
    setDecorations(next.decorations);
    setSelectedId(null);
    setTool("navigate");
    setBrushArmed(false);
    setSaveError(false);
    setFieldError(null);
    pastRef.current = [];
    futureRef.current = [];
    committedRef.current = {
      decorations: next.decorations.map(copyEditorDeco),
      theme: themeFrom(next),
      selectedId: null,
    };
    setHistVersion((value) => value + 1);
    hydratingRef.current = false;
    skipThemeUntilRef.current = Date.now() + 250;
    syncSceneRef.current = toEditorScene(next);
    adoptBaseline(fingerprint(next));
    setFullSyncKey((key) => key + 1);
  }

  function postCommand(command: string, extra: Record<string, unknown> = {}) {
    const win = iframeRef.current?.contentWindow;
    if (!win || !ready) return;
    win.postMessage(
      { type: "jogo-idle:map-editor-command", command, epoch: epochRef.current, ...extra },
      window.location.origin,
    );
  }

  function showPreview(asset: PropLibraryAsset) {
    previewAssetRef.current = asset;
    const win = previewRef.current?.contentWindow;
    if (!win || !previewReadyRef.current) return;
    win.postMessage(
      {
        type: "jogo-idle:prop-preview",
        pack: asset.pack,
        key: asset.key,
        scale: asset.defaultScale || 1,
      },
      window.location.origin,
    );
  }

  useEffect(() => {
    let cancelled = false;
    void fetch("/jogo-idle/admin-studio/prop-manifest.json")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("manifesto"))))
      .then((data) => {
        if (cancelled) return;
        const assets = placeablesFromManifest(data);
        if (!assets.length) throw new Error("vazio");
        setLibrary(assets);
        setLibraryNote(`${assets.length} modelos`);
        setActiveId((current) => current || assets[0].id);
      })
      .catch(() => {
        if (cancelled) return;
        const assets = fallbackAssets();
        setLibrary(assets);
        setLibraryNote("Manifesto indisponível. Lista reduzida.");
        setActiveId((current) => current || assets[0]?.id || "");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeAsset) showPreview(activeAsset);
  }, [activeAsset?.id, ready]);

  useEffect(() => {
    onDirtyChangeRef.current?.(dirty);
  }, [dirty]);

  useEffect(() => {
    onSavePhaseRef.current?.(phase);
  }, [phase]);

  useEffect(() => () => {
    onDirtyChangeRef.current?.(false);
    onSavePhaseRef.current?.("saved");
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      if (skipUnloadRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  useEffect(() => {
    if (!zoneId || !zones.length) return;
    const row = zones.find((item) => item.id === zoneId);
    if (!row) return;
    const serverFp = fingerprint(derive(row));
    if (loadedZoneRef.current !== row.id) {
      loadedZoneRef.current = row.id;
      applyDraft(row);
      return;
    }
    if (echoRef.current === row.id) {
      echoRef.current = "";
      ignoredServerRef.current = "";
      if (dirtyRef.current && serverFp !== baselineRef.current) {
        setConflict(row);
        return;
      }
      if (!dirtyRef.current && serverFp !== baselineRef.current) applyDraft(row);
      return;
    }
    if (ignoredServerRef.current && serverFp === ignoredServerRef.current) return;
    if (serverFp === baselineRef.current) return;
    if (dirtyRef.current) {
      setConflict(row);
      return;
    }
    applyDraft(row);
  }, [zoneId, zones]);

  useEffect(() => {
    function onMessageEvent(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (data?.type === "jogo-idle:prop-preview-ready") {
        previewReadyRef.current = true;
        if (previewAssetRef.current) showPreview(previewAssetRef.current);
        return;
      }
      if (data?.type === "jogo-idle:prop-preview-error") {
        pushLog(`Não foi possível abrir ${data.pack}/${data.key}.`);
        return;
      }
      if (data?.type === "jogo-idle:map-editor-ready") {
        setReady(true);
        return;
      }
      if (data?.type === "jogo-idle:map-editor-decorations" && Array.isArray(data.decorations)) {
        if (typeof data.epoch === "number" && data.epoch !== epochRef.current) return;
        if (data.zoneId && data.zoneId !== zoneIdRef.current) return;
        const next = (data.decorations as MapDecoration[]).map(copyEditorDeco);
        setDecorations(next);
        const id = typeof data.selectedId === "string" ? data.selectedId : null;
        if (data.selectedId === null || id) setSelectedId(id);
        if (data.commit) noteCommitRef.current(next, id);
        return;
      }
      if (data?.type === "jogo-idle:map-editor-selection") {
        if (typeof data.epoch === "number" && data.epoch !== epochRef.current) return;
        if (data.zoneId && data.zoneId !== zoneIdRef.current) return;
        const id = typeof data.selectedId === "string" ? data.selectedId : null;
        setSelectedId(id);
        if (committedRef.current) committedRef.current = { ...committedRef.current, selectedId: id };
        return;
      }
      if (data?.type === "jogo-idle:map-editor-tool" && typeof data.tool === "string") {
        if (typeof data.epoch === "number" && data.epoch !== epochRef.current) return;
        if (data.zoneId && data.zoneId !== zoneIdRef.current) return;
        if (data.tool === "navigate" || data.tool === "select" || data.tool === "move" || data.tool === "rotate" || data.tool === "scale" || data.tool === "place") {
          setTool(data.tool);
        }
        if (typeof data.brushArmed === "boolean") setBrushArmed(data.brushArmed);
        return;
      }
      if (data?.type === "jogo-idle:map-editor-shortcut") {
        if (typeof data.epoch === "number" && data.epoch !== epochRef.current) return;
        if (data.zoneId && data.zoneId !== zoneIdRef.current) return;
        if (data.action === "undo") undoRef.current();
        if (data.action === "redo") redoRef.current();
        return;
      }
      if (data?.type === "jogo-idle:map-editor-prefs" && typeof data.grid === "boolean") {
        setPrefs((prev) => (prev.grid === data.grid ? prev : { ...prev, grid: data.grid }));
        return;
      }
      if (data?.type === "jogo-idle:map-editor-baked") {
        if (typeof data.epoch === "number" && data.epoch !== epochRef.current) return;
        if (data.zoneId && data.zoneId !== zoneIdRef.current) return;
        skipThemeUntilRef.current = Date.now() + 250;
        const props = typeof data.props === "string" ? data.props : draftRef.current?.propsKind || "bare";
        if (typeof data.props === "string") setPropsKind(data.props);
        const next = Array.isArray(data.decorations) ? (data.decorations as MapDecoration[]).map(copyEditorDeco) : draftRef.current?.decorations || [];
        setDecorations(next);
        const id = typeof data.selectedId === "string" ? data.selectedId : null;
        setSelectedId(id);
        if (draftRef.current) noteCommitRef.current(next, id, { ...themeFrom(draftRef.current), propsKind: props });
        pushLog("Bioma assado no rascunho. Salve para gravar.");
        return;
      }
      if (data?.type === "jogo-idle:map-editor-toast" && typeof data.message === "string") {
        pushLog(data.message);
      }
      if (data?.type === "jogo-idle:map-editor-overlay-offer") {
        if (typeof data.epoch === "number" && data.epoch !== epochRef.current) return;
        if (data.zoneId && data.zoneId !== zoneIdRef.current) return;
        setOverlayAsk({ kind: "place", count: Number(data.count) || 1 });
      }
    }
    window.addEventListener("message", onMessageEvent);
    return () => window.removeEventListener("message", onMessageEvent);
  }, []);

  useEffect(() => {
    if (!ready || !syncSceneRef.current) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      {
        type: "jogo-idle:map-editor",
        mode: "full",
        zoneId: zoneIdRef.current,
        epoch: epochRef.current,
        scene: syncSceneRef.current,
        tool,
      },
      window.location.origin,
    );
  }, [ready, fullSyncKey]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
    if (!ready) return;
    postCommand("set-grid", { enabled: prefs.grid, step: prefs.posStep });
    postCommand("set-snap", {
      enabled: prefs.snap,
      posStep: prefs.posStep,
      rotStep: prefs.rotStep,
      scaleStep: prefs.scaleStep,
    });
  }, [ready, prefs]);

  useEffect(() => {
    try {
      localStorage.setItem(LAYER_PREFS_KEY, JSON.stringify(layerView));
    } catch {
      /* ignore */
    }
    if (!ready) return;
    const hidden = LAYERS.filter((id) => layerView[id].hidden);
    const locked = LAYERS.filter((id) => layerView[id].locked);
    postCommand("set-layer-view", { hidden, locked });
  }, [ready, layerView]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "IFRAME" || target?.isContentEditable) return;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (!event.repeat) (event.shiftKey ? redoRef.current() : undoRef.current());
        return;
      }
      if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        if (!event.repeat) redoRef.current();
        return;
      }
      if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault();
        if (!event.repeat) postCommand("duplicate-selected");
        return;
      }
      if (!mod && (event.key === "Delete" || event.key === "Backspace")) {
        if (!selectedIdRef.current || event.repeat) return;
        event.preventDefault();
        postCommand("delete-id", { editorId: selectedIdRef.current });
        return;
      }
      if (!mod && (event.key === "q" || event.key === "Q")) {
        event.preventDefault();
        if (!event.repeat) postCommand("nudge-rot", { direction: -1 });
        return;
      }
      if (!mod && (event.key === "e" || event.key === "E")) {
        event.preventDefault();
        if (!event.repeat) postCommand("nudge-rot", { direction: 1 });
        return;
      }
      if (!mod && (event.key === "f" || event.key === "F")) {
        if (event.repeat) return;
        postCommand(event.shiftKey ? "focus-scene" : "focus-selection");
        return;
      }
      if (!mod && (event.key === "g" || event.key === "G")) {
        if (event.repeat) return;
        setPrefs((prev) => ({ ...prev, grid: !prev.grid }));
        return;
      }
      if (!mod && event.key >= "1" && event.key <= "6") {
        if (event.repeat) return;
        const order: EditorTool[] = ["navigate", "select", "place", "move", "rotate", "scale"];
        const next = order[Number(event.key) - 1];
        setTool(next);
        postCommand("set-tool", { tool: next });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready]);

  useEffect(() => {
    if (!ready || Date.now() < skipThemeUntilRef.current) return;
    const win = iframeRef.current?.contentWindow;
    if (!win || !draftRef.current) return;
    const handle = window.setTimeout(() => {
      if (!draftRef.current) return;
      win.postMessage(
        {
          type: "jogo-idle:map-editor",
          mode: "theme",
          zoneId,
          scene: {
            ...toScenePayload(draftRef.current),
            decorationMode: draftRef.current.decorationMode ?? null,
            variant: draftRef.current.variant || "",
          },
        },
        window.location.origin,
      );
    }, 120);
    return () => window.clearTimeout(handle);
  }, [ready, zoneId, bg, ground, hemiSky, sun, propsKind, particles, particleColor, propDensity, fogNear, fogFar, variant, decorationMode, hemiGround, hemiIntensity, sunIntensity]);

  useEffect(() => {
    if (!selected || editingRef.current) return;
    setFields({
      x: fmt(selected.x),
      z: fmt(selected.z),
      rot: fmt(((selected.rotY || 0) * 180) / Math.PI),
      scale: fmt(selected.scale ?? 1),
    });
  }, [selectedIndex, selected?.x, selected?.z, selected?.rotY, selected?.scale]);

  async function saveDraft() {
    const id = zoneIdRef.current;
    const current = draftRef.current;
    if (!id || !current || savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setSaveError(false);
    const sentFp = fingerprint(current);
    try {
      const data = await idleFetch("/api/jogo-idle/admin/config", {
        method: "POST",
        body: JSON.stringify({ zone: { id, scene: toScenePayload(current) } }),
      });
      if (Array.isArray(data.zones)) onZonesChange?.(data.zones);
      echoRef.current = id;
      adoptBaseline(sentFp);
      const playShows = manualsInPlay(current.propsKind, current.decorationMode);
      const note = !playShows && current.decorations.length
        ? "Mapa salvo. O overlay está desligado: o jogo não desenha estes objetos neste bioma."
        : current.decorationMode === "overlay"
          ? "Mapa salvo. O jogo desenha o bioma e os objetos manuais."
          : "Mapa salvo.";
      onMessageRef.current(note);
      pushLog(note);
      await onRefresh();
      return true;
    } catch (err) {
      setSaveError(true);
      const message = err instanceof Error ? err.message : "Falha ao salvar o mapa";
      pushLog(message);
      onMessageRef.current(null);
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  useImperativeHandle(ref, () => ({
    save: () => saveDraft(),
    allowLeave: () => {
      skipUnloadRef.current = true;
    },
  }));

  function requestZone(nextId: string) {
    if (!nextId || nextId === zoneId) return;
    if (dirty) {
      setPendingZone(nextId);
      return;
    }
    loadedZoneRef.current = "";
    onZoneChange(nextId);
  }

  function discardTo(row: ZoneRow) {
    loadedZoneRef.current = row.id;
    ignoredServerRef.current = "";
    applyDraft(row);
    setPendingZone(null);
    setConflict(null);
    pushLog("Rascunho descartado.");
  }

  function chooseAsset(asset: PropLibraryAsset) {
    setActiveId(asset.id);
    setBrushScale(String(asset.defaultScale || 1));
    showPreview(asset);
  }

  function insertAsset(asset: PropLibraryAsset) {
    if (decorations.length >= MAX_DECORATIONS) {
      pushLog(`Limite de ${MAX_DECORATIONS} decorações. Nada foi inserido.`);
      return;
    }
    const scale = asset.id === activeId ? Number(brushScale) || asset.defaultScale || 1 : asset.defaultScale || 1;
    setActiveId(asset.id);
    if (asset.id !== activeId) setBrushScale(String(asset.defaultScale || 1));
    setBrushArmed(true);
    setTool("place");
    postCommand("arm-brush", {
      brush: { pack: asset.pack, key: asset.key, scale },
    });
    pushLog(`Pincel: ${asset.name}. Clique no chão.`);
  }

  function chooseTool(next: EditorTool) {
    setTool(next);
    if (next !== "place") setBrushArmed(false);
    postCommand("set-tool", { tool: next });
  }

  function readTransform(next: { x: string; z: string; rot: string; scale: string }) {
    const numeric = /^-?\d+(\.\d+)?$/;
    const x = numeric.test(next.x.trim()) ? Number(next.x) : Number.NaN;
    const z = numeric.test(next.z.trim()) ? Number(next.z) : Number.NaN;
    const rot = numeric.test(next.rot.trim()) ? Number(next.rot) : Number.NaN;
    const scale = numeric.test(next.scale.trim()) ? Number(next.scale) : Number.NaN;
    if (![x, z, rot, scale].every((value) => Number.isFinite(value))) {
      return "Valor inválido. A cena não foi alterada.";
    }
    if (x < -24 || x > 24 || z < -24 || z > 24) return "X e Z ficam entre -24 e 24.";
    if (rot < -720 || rot > 720) return "A rotação fica entre -720° e 720°.";
    if (scale < 0.15 || scale > 4) return "A escala fica entre 0,15 e 4.";
    return { x, z, rot, scale };
  }

  function commitTransform(commit = true, next = fields) {
    if (!selected?.editorId) return;
    if (commit) editingRef.current = false;
    const parsed = readTransform(next);
    if (typeof parsed === "string") {
      if (commit) setFieldError(parsed);
      return;
    }
    setFieldError(null);
    postCommand("patch-selected", {
      editorId: selected.editorId,
      x: parsed.x,
      z: parsed.z,
      rotY: (parsed.rot * Math.PI) / 180,
      scale: parsed.scale,
      commit,
    });
  }

  function commitTheme(partial: Partial<ThemeSnap> = {}) {
    if (!draftRef.current) return;
    noteCommit(draftRef.current.decorations, selectedIdRef.current, { ...themeFrom(draftRef.current), ...partial });
  }

  function applyDecorationMode(next: "off" | "overlay" | null) {
    setDecorationMode(next);
    commitTheme({ decorationMode: next });
    if (next === "overlay") pushLog("Overlay ativo: o jogo passa a desenhar o bioma e os objetos manuais.");
  }

  function requestDecorationMode(next: "off" | "overlay" | null) {
    if (next === decorationMode) return;
    const revealing = next === "overlay" && decorationMode !== "overlay" && propsKind !== "bare" && decorations.length > 0;
    if (revealing) {
      setOverlayAsk({ kind: "enable", count: decorations.length });
      return;
    }
    applyDecorationMode(next);
  }

  function applyPreset() {
    if (!zone || !draftRef.current) return;
    const preset = derive({ ...zone, scene: getZoneScenePreset(zone.id) as ZoneRow["scene"] });
    setBg(preset.bg);
    setGround(preset.ground);
    setHemiSky(preset.hemiSky);
    setSun(preset.sun);
    setPropsKind(preset.propsKind);
    setParticles(preset.particles);
    setParticleColor(preset.particleColor);
    setPropDensity(preset.propDensity);
    setFogNear(preset.fogNear);
    setFogFar(preset.fogFar);
    noteCommit(draftRef.current.decorations, selectedIdRef.current, {
      ...themeFrom(draftRef.current),
      bg: preset.bg,
      ground: preset.ground,
      hemiSky: preset.hemiSky,
      sun: preset.sun,
      propsKind: preset.propsKind,
      particles: preset.particles,
      particleColor: preset.particleColor,
      propDensity: preset.propDensity,
      fogNear: preset.fogNear,
      fogFar: preset.fogFar,
    });
    pushLog("Preset aplicado ao rascunho. Salve para gravar.");
  }

  const canUndo = histVersion >= 0 && pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  const statusLabel =
    phase === "saving" ? "Salvando" : phase === "error" ? "Erro ao salvar" : phase === "dirty" ? "Não salvo" : "Salvo";
  const uniqueModels = new Set(decorations.map((item) => `${item.pack}/${item.key}`)).size;
  const zonePreset = zone ? (getZoneScenePreset(zone.id) as ZoneRow["scene"]) : null;

  function layerOf(item: MapDecoration) {
    return resolvedLayer(item, byId.get(`${item.pack}/${item.key}`)?.category);
  }

  function layerIsLocked(item: MapDecoration) {
    return layerView[layerOf(item)].locked;
  }

  return (
    <div className={`wb${libraryOpen ? " is-library" : ""}${inspectorOpen ? " is-inspector" : ""}${dockOpen ? "" : " is-dock-collapsed"}`}>
      <header className="wb-top">
        <div className="wb-top__title">
          <strong>Mundo</strong>
          <span>Editor de mapas</span>
        </div>
        <div className="wb-top__zones">
          <select className="wb-select" aria-label="Capítulo" value={chapter} onChange={(event) => setChapter(event.target.value)}>
            <option value="all">Todos os capítulos</option>
            {chapters.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <select className="wb-select" aria-label="Zona" value={zoneId} onChange={(event) => requestZone(event.target.value)}>
            {zoneOptions.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </div>
        <div className="wb-drawers">
          <StudioBtn type="button" onClick={() => setLibraryOpen((value) => !value)}>
            Biblioteca
          </StudioBtn>
          <StudioBtn type="button" onClick={() => setInspectorOpen((value) => !value)}>
            Inspetor
          </StudioBtn>
        </div>
        <div className="wb-top__actions">
          <span className={`studio-3__status${phase === "dirty" ? " studio-3__status--dirty" : ""}${phase === "error" ? " studio-3__status--error" : ""}${phase === "saving" ? " studio-3__status--saving" : ""}`}>
            {phase === "saving" ? <span className="studio-3-spinner" aria-hidden /> : null}
            {statusLabel}
          </span>
          <StudioBtn type="button" disabled={!dirty || saving} onClick={() => zone && discardTo(zone)}>
            Descartar
          </StudioBtn>
          <StudioBtn variant="gold" type="button" loading={saving} disabled={!dirty || saving || working || !zoneId} onClick={() => void saveDraft()}>
            Salvar
          </StudioBtn>
        </div>
      </header>

      <aside className="wb-library">
        <input
          className="wb-input"
          placeholder="Pesquisar árvore, pedra, baú…"
          value={query}
          aria-label="Pesquisar assets"
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="wb-filters">
          <select
            className="wb-select"
            aria-label="Categoria"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories.map((id) => (
              <option key={id} value={id}>
                {categoryLabel(id)}
              </option>
            ))}
          </select>
          <select
            className="wb-select"
            aria-label="Pacote"
            value={packFilter}
            onChange={(event) => {
              setPackFilter(event.target.value);
              setCategoryFilter("");
            }}
          >
            <option value="">Todos os packs</option>
            {packs.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
        <p className="wb-muted">
          {filtered.length} de {library.length || "…"} · {libraryNote}
        </p>
        <AssetGrid items={filtered} activeId={activeId} onSelect={chooseAsset} onInsert={insertAsset} />
        <div className="wb-preview">
          <div className="wb-preview__frame">
            <iframe ref={previewRef} title="Prévia do asset" src="/jogo-idle/admin-studio/prop-preview.html" />
          </div>
          <div className="wb-preview__meta">
            <strong>{activeAsset?.name || "Nenhum asset"}</strong>
            <span className="wb-muted">{activeAsset ? categoryLabel(activeAsset.category) : "Selecione um card"}</span>
          </div>
          <div className="wb-actions">
            <label className="wb-muted">
              Escala
              <input
                className="wb-input"
                type="number"
                min={0.15}
                max={4}
                step={0.05}
                value={brushScale}
                onChange={(event) => setBrushScale(event.target.value)}
              />
            </label>
            <StudioBtn variant="gold" type="button" disabled={!activeAsset || !ready} onClick={() => activeAsset && insertAsset(activeAsset)}>
              Inserir no mapa
            </StudioBtn>
          </div>
        </div>
      </aside>

      <section className="wb-stage">
        <div className="wb-toolbar" role="toolbar" aria-label="Ferramentas do mapa">
          <div className="wb-toolbar__group">
            <button type="button" className={`wb-tool${tool === "navigate" ? " is-active" : ""}`} title="Navegar na câmera (1)" onClick={() => chooseTool("navigate")}>
              <StudioIcon name="navigate" /> <span className="wb-tool__label">Navegar</span>
            </button>
            <button type="button" className={`wb-tool${tool === "select" ? " is-active" : ""}`} title="Selecionar e arrastar no chão (2)" onClick={() => chooseTool("select")}>
              <StudioIcon name="select" /> <span className="wb-tool__label">Selecionar</span>
            </button>
          </div>
          <div className="wb-toolbar__group">
            <button type="button" className={`wb-tool${tool === "move" ? " is-active" : ""}`} title="Mover no plano X/Z (4)" onClick={() => chooseTool("move")}>
              <StudioIcon name="move" /> <span className="wb-tool__label">Mover</span>
            </button>
            <button type="button" className={`wb-tool${tool === "rotate" ? " is-active" : ""}`} title="Rotacionar no eixo Y (5). Q/E giram o passo atual" onClick={() => chooseTool("rotate")}>
              <StudioIcon name="rotate" /> <span className="wb-tool__label">Rotacionar</span>
            </button>
            <button type="button" className={`wb-tool${tool === "scale" ? " is-active" : ""}`} title="Escala uniforme (6)" onClick={() => chooseTool("scale")}>
              <StudioIcon name="scale" /> <span className="wb-tool__label">Escala</span>
            </button>
          </div>
          <div className="wb-toolbar__group">
            <button type="button" className={`wb-tool${tool === "place" || brushArmed ? " is-active" : ""}`} title="Inserir o asset escolhido (3)" onClick={() => activeAsset && insertAsset(activeAsset)}>
              <StudioIcon name="place" /> <span className="wb-tool__label">Inserir</span>
            </button>
            <button type="button" className="wb-tool" title="Duplicar (Ctrl/Cmd+D)" disabled={!selected || decorations.length >= MAX_DECORATIONS || layerIsLocked(selected)} onClick={() => postCommand("duplicate-selected")}>
              <StudioIcon name="duplicate" /> <span className="wb-tool__label">Duplicar</span>
            </button>
            <button type="button" className="wb-tool" title="Excluir (Delete)" disabled={!selected || layerIsLocked(selected)} onClick={() => selected && postCommand("delete-selected")}>
              <StudioIcon name="trash" /> <span className="wb-tool__label">Excluir</span>
            </button>
          </div>
          <div className="wb-toolbar__group">
            <button type="button" className={`wb-tool${prefs.grid ? " is-active" : ""}`} title="Grade de referência (G). Não entra no save" onClick={() => setPrefs((prev) => ({ ...prev, grid: !prev.grid }))}>
              <StudioIcon name="grid" /> <span className="wb-tool__label">Grade</span>
            </button>
            <button type="button" className={`wb-tool${prefs.snap ? " is-active" : ""}`} title="Encaixe na grade e nos passos de rotação e escala" onClick={() => setPrefs((prev) => ({ ...prev, snap: !prev.snap }))}>
              <StudioIcon name="snap" /> <span className="wb-tool__label">Snap</span>
            </button>
            <select className="wb-select wb-select--tiny" aria-label="Passo do snap de posição" value={prefs.posStep} onChange={(event) => setPrefs((prev) => ({ ...prev, posStep: Number(event.target.value) }))}>
              {POS_STEPS.map((step) => <option key={step} value={step}>{step}</option>)}
            </select>
            <select className="wb-select wb-select--tiny" aria-label="Passo do snap de rotação" value={prefs.rotStep} onChange={(event) => setPrefs((prev) => ({ ...prev, rotStep: Number(event.target.value) }))}>
              {ROT_STEPS.map((step) => <option key={step} value={step}>{step}°</option>)}
            </select>
            <select className="wb-select wb-select--tiny" aria-label="Passo do snap de escala" value={prefs.scaleStep} onChange={(event) => setPrefs((prev) => ({ ...prev, scaleStep: Number(event.target.value) }))}>
              {SCALE_STEPS.map((step) => <option key={step} value={step}>{step}</option>)}
            </select>
          </div>
          <div className="wb-toolbar__group">
            <button type="button" className="wb-tool" title="Desfazer (Ctrl/Cmd+Z)" disabled={!canUndo} onClick={() => undo()}>
              <StudioIcon name="undo" /> <span className="wb-tool__label">Desfazer</span>
            </button>
            <button type="button" className="wb-tool" title="Refazer (Ctrl/Cmd+Shift+Z)" disabled={!canRedo} onClick={() => redo()}>
              <StudioIcon name="redo" /> <span className="wb-tool__label">Refazer</span>
            </button>
          </div>
          <div className="wb-toolbar__group">
            <button type="button" className="wb-tool" title="Enquadrar seleção (F)" disabled={!selected} onClick={() => postCommand("focus-selection")}>
              <StudioIcon name="focus" /> <span className="wb-tool__label">Seleção</span>
            </button>
            <button type="button" className="wb-tool" title="Enquadrar cenário (Shift+F)" onClick={() => postCommand("focus-scene")}>
              <StudioIcon name="map" /> <span className="wb-tool__label">Cenário</span>
            </button>
            <button
              type="button"
              className={`wb-tool${showPlayCamera ? " is-active" : ""}`}
              title="Câmera do jogador"
              onClick={() => {
                const next = !showPlayCamera;
                setShowPlayCamera(next);
                postCommand("set-play-camera", { enabled: next });
                if (next) postCommand("snap-play-camera");
              }}
            >
              <StudioIcon name="camera" /> <span className="wb-tool__label">Jogador</span>
            </button>
            <button type="button" className="wb-tool" title="Assar converte o bioma procedural em objetos editáveis e troca o bioma para bare. O overlay, ao contrário, mantém o bioma e soma os objetos manuais." disabled={!ready || propsKind === "bare"} onClick={() => setBakeAsk(true)}>
              <StudioIcon name="bake" /> <span className="wb-tool__label">Assar</span>
            </button>
          </div>
        </div>
        {decorations.length > 0 && !manualsInPlay(propsKind, decorationMode) ? (
          <p className="wb-banner">
            {decorations.length} objeto(s) estão no rascunho e o jogo não os desenha neste bioma.
            Ative “Decorações manuais sobre o bioma” para combiná-los com o cenário procedural.
          </p>
        ) : decorationMode === "overlay" ? (
          <p className="wb-banner">
            Overlay ativo: o editor e o jogo desenham o bioma <b>{propsKind}</b> junto com os objetos manuais.
          </p>
        ) : null}
        <div className="wb-viewport">
          <div className="wb-viewport__chrome">
            <span>{zone?.name || "Zona"} · {propsKind} · {ready ? "cena pronta" : "carregando"}</span>
            <span>
              Decorações: {decorations.length}/{MAX_DECORATIONS} · {uniqueModels} modelos
              {prefs.snap ? ` · snap ${prefs.posStep}` : ""}
              {brushArmed && activeAsset ? ` · pincel ${activeAsset.name}` : ""}
            </span>
          </div>
          <iframe ref={iframeRef} title={`World Builder — ${zone?.name || "zona"}`} src="/jogo-idle/map-editor.html" />
          {!ready ? <div className="wb-viewport__chrome" style={{ top: "auto", bottom: "0.6rem" }}>Abrindo o cenário…</div> : null}
        </div>
      </section>

      <aside className="wb-inspector">
        <section className="wb-block">
          <h3>Objeto</h3>
          {selected ? (
            <>
              <div className="wb-kv">
                <span>Nome</span>
                <b>{selectedAsset?.name || selected.key}</b>
                <span>Pack</span>
                <b>{selected.pack}</b>
                <span>Key</span>
                <b>{selected.key}</b>
                <span>Categoria</span>
                <b>{selectedAsset ? categoryLabel(selectedAsset.category) : "—"}</b>
                <span>Camada</span>
                <b>{selected ? LAYER_LABEL[layerOf(selected)] : "—"}</b>
              </div>
              <label className="wb-field">
                Camada gravada
                <select
                  className="wb-select"
                  value={selected.layer || ""}
                  onChange={(event) => {
                    const layer = event.target.value;
                    if (!(LAYERS as readonly string[]).includes(layer)) return;
                    postCommand("set-layer", { editorId: selected.editorId, layer });
                  }}
                >
                  <option value="">Pela categoria ({LAYER_LABEL[layerOf(selected)]})</option>
                  {LAYERS.map((id) => (
                    <option key={id} value={id}>{LAYER_LABEL[id]}</option>
                  ))}
                </select>
              </label>
              <div className="wb-fields">
                <label>
                  Posição X
                  <input className={`wb-input${fieldError ? " is-invalid" : ""}`} value={fields.x} onFocus={() => { editingRef.current = true; }} onBlur={() => commitTransform(true)} onChange={(event) => { const next = { ...fields, x: event.target.value }; setFields(next); commitTransform(false, next); }} />
                </label>
                <label>
                  Posição Z
                  <input className={`wb-input${fieldError ? " is-invalid" : ""}`} value={fields.z} onFocus={() => { editingRef.current = true; }} onBlur={() => commitTransform(true)} onChange={(event) => { const next = { ...fields, z: event.target.value }; setFields(next); commitTransform(false, next); }} />
                </label>
                <label>
                  Rotação Y
                  <input className={`wb-input${fieldError ? " is-invalid" : ""}`} value={fields.rot} onFocus={() => { editingRef.current = true; }} onBlur={() => commitTransform(true)} onChange={(event) => { const next = { ...fields, rot: event.target.value }; setFields(next); commitTransform(false, next); }} />
                </label>
                <label>
                  Escala
                  <input className={`wb-input${fieldError ? " is-invalid" : ""}`} value={fields.scale} onFocus={() => { editingRef.current = true; }} onBlur={() => commitTransform(true)} onChange={(event) => { const next = { ...fields, scale: event.target.value }; setFields(next); commitTransform(false, next); }} />
                </label>
              </div>
              {fieldError ? <p className="wb-muted">{fieldError}</p> : null}
              <div className="wb-actions">
                <StudioBtn type="button" onClick={() => commitTransform(true)}>Aplicar</StudioBtn>
                <StudioBtn type="button" disabled={layerIsLocked(selected) || decorations.length >= MAX_DECORATIONS} onClick={() => postCommand("duplicate-selected")}>Duplicar</StudioBtn>
                <StudioBtn variant="danger" type="button" disabled={layerIsLocked(selected)} onClick={() => postCommand("delete-selected")}>Excluir</StudioBtn>
                <StudioBtn type="button" onClick={() => postCommand("clear-selection")}>Limpar seleção</StudioBtn>
              </div>
            </>
          ) : (
            <p className="wb-muted">Nenhum objeto selecionado. Clique no cenário ou na lista.</p>
          )}
        </section>
        <details className="wb-block" open>
          <summary>Bioma</summary>
          <label className="wb-field">
            Bioma atual
            <select className="wb-select" value={propsKind} onChange={(event) => { setPropsKind(event.target.value); commitTheme({ propsKind: event.target.value }); }}>
              {PROP_KINDS.map((kind) => (
                <option key={kind} value={kind}>{kind}</option>
              ))}
            </select>
          </label>
          <label className="wb-field">
            Variante
            <select className="wb-select" value={variant || ""} onChange={(event) => { const next = event.target.value || undefined; setVariant(next); commitTheme({ variant: next }); }}>
              {FOREST_VARIANTS.map((id) => (
                <option key={id || "none"} value={id}>{id || "padrão do motor"}</option>
              ))}
              {variant && !FOREST_VARIANTS.includes(variant) ? <option value={variant}>{variant}</option> : null}
            </select>
          </label>
          <label className="wb-field">
            Densidade do bioma
            <span className="wb-slider">
              <input type="range" min={0.5} max={2} step={0.05} value={Number(propDensity) || 1} onChange={(event) => setPropDensity(event.target.value)} onPointerUp={(event) => commitTheme({ propDensity: (event.target as HTMLInputElement).value })} onBlur={(event) => commitTheme({ propDensity: (event.target as HTMLInputElement).value })} />
              <b>{propDensity}</b>
            </span>
          </label>
          <label className="wb-field">
            Decorações manuais sobre o bioma
            <select
              className="wb-select"
              value={decorationMode || ""}
              onChange={(event) => {
                const value = event.target.value;
                requestDecorationMode(value === "overlay" || value === "off" ? value : null);
              }}
            >
              <option value="">Como o save antigo</option>
              <option value="off">Desativado</option>
              <option value="overlay">Ativado</option>
            </select>
          </label>
          <p className="wb-muted">
            {decorationMode === "overlay"
              ? "O bioma procedural continua e os objetos manuais entram no jogo."
              : propsKind === "bare"
                ? "Bioma bare: o jogo desenha a lista manual e não gera uma floresta por cima."
                : "Desativado ou save antigo: o jogo esconde a lista manual fora de bare."}
          </p>
        </details>
        <details className="wb-block">
          <summary>Iluminação</summary>
          <label className="wb-color">
            <span>Ambiente</span>
            <input type="color" aria-label="Cor da iluminação ambiente" value={hemiSky} onChange={(event) => setHemiSky(event.target.value)} onBlur={() => commitTheme()} />
            <code>{hemiSky}</code>
          </label>
          <label className="wb-field">
            Intensidade ambiente
            <span className="wb-slider">
              <input type="range" min={0.1} max={2} step={0.05} value={hemiIntensity ?? 0.7} onChange={(event) => setHemiIntensity(Number(event.target.value))} onPointerUp={(event) => { const n = Number((event.target as HTMLInputElement).value); if (n !== (hemiIntensity ?? 0.7)) commitTheme({ hemiIntensity: n }); }} onBlur={(event) => { const n = Number((event.target as HTMLInputElement).value); if (n !== (hemiIntensity ?? 0.7)) commitTheme({ hemiIntensity: n }); }} />
              <b>{(hemiIntensity ?? 0.7).toFixed(2)}</b>
            </span>
          </label>
          <label className="wb-color">
            <span>Chão da luz</span>
            <input type="color" aria-label="Cor do chão da luz ambiente" value={hemiGround == null ? "#1a2414" : toCssHex(hemiGround)} onChange={(event) => setHemiGround(fromCssHex(event.target.value))} onBlur={() => commitTheme()} />
            <code>{hemiGround == null ? "padrão" : toCssHex(hemiGround)}</code>
          </label>
          <label className="wb-color">
            <span>Luz principal</span>
            <input type="color" aria-label="Cor da luz principal" value={sun} onChange={(event) => setSun(event.target.value)} onBlur={() => commitTheme()} />
            <code>{sun}</code>
          </label>
          <label className="wb-field">
            Intensidade principal
            <span className="wb-slider">
              <input type="range" min={0.1} max={3} step={0.05} value={sunIntensity ?? 1.4} onChange={(event) => setSunIntensity(Number(event.target.value))} onPointerUp={(event) => { const n = Number((event.target as HTMLInputElement).value); if (n !== (sunIntensity ?? 1.4)) commitTheme({ sunIntensity: n }); }} onBlur={(event) => { const n = Number((event.target as HTMLInputElement).value); if (n !== (sunIntensity ?? 1.4)) commitTheme({ sunIntensity: n }); }} />
              <b>{(sunIntensity ?? 1.4).toFixed(2)}</b>
            </span>
          </label>
        </details>
        <details className="wb-block">
          <summary>Atmosfera</summary>
          <label className="wb-color">
            <span>Céu</span>
            <input type="color" aria-label="Cor do céu" value={bg} onChange={(event) => setBg(event.target.value)} onBlur={() => commitTheme()} />
            <code>{bg}</code>
          </label>
          <label className="wb-color">
            <span>Chão</span>
            <input type="color" aria-label="Cor do chão" value={ground} onChange={(event) => setGround(event.target.value)} onBlur={() => commitTheme()} />
            <code>{ground}</code>
          </label>
          <label className="wb-field">
            Névoa perto
            <span className="wb-slider">
              <input type="range" min={1} max={40} step={1} value={Number(fogNear) || 10} onChange={(event) => setFogNear(event.target.value)} onPointerUp={(event) => commitTheme({ fogNear: (event.target as HTMLInputElement).value })} onBlur={(event) => commitTheme({ fogNear: (event.target as HTMLInputElement).value })} />
              <b>{fogNear}</b>
            </span>
          </label>
          <label className="wb-field">
            Névoa longe
            <span className="wb-slider">
              <input type="range" min={5} max={80} step={1} value={Number(fogFar) || 34} onChange={(event) => setFogFar(event.target.value)} onPointerUp={(event) => commitTheme({ fogFar: (event.target as HTMLInputElement).value })} onBlur={(event) => commitTheme({ fogFar: (event.target as HTMLInputElement).value })} />
              <b>{fogFar}</b>
            </span>
          </label>
          <label className="wb-field">
            Partículas
            <select className="wb-select" value={particles} onChange={(event) => { setParticles(event.target.value); commitTheme({ particles: event.target.value }); }}>
              {ZONE_PARTICLE_MODES.map((mode) => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </label>
          <label className="wb-color">
            <span>Cor das partículas</span>
            <input type="color" aria-label="Cor das partículas" value={particleColor} onChange={(event) => setParticleColor(event.target.value)} onBlur={() => commitTheme()} />
            <code>{particleColor}</code>
          </label>
          <p className="wb-muted">O jogo anima as partículas. O editor grava o modo e a cor e aplica a névoa e as luzes na hora.</p>
        </details>
        <details className="wb-block">
          <summary>Preset</summary>
          <article className="wb-preset">
            <strong>{zone?.name || "Zona"}</strong>
            <p className="wb-muted">
              {zonePreset?.props || "bioma do preset"}
              {zonePreset?.variant ? ` · ${zonePreset.variant}` : ""}
              {zonePreset?.particles ? ` · partículas ${zonePreset.particles}` : ""}
            </p>
            <p className="wb-muted">Restaura céu, chão, bioma, névoa e partículas desta zona. Não apaga os objetos manuais.</p>
            <StudioBtn type="button" disabled={!zone} onClick={applyPreset}>Restaurar preset</StudioBtn>
          </article>
          <p className="wb-muted">{zone?.name || "Zona"} · {statusLabel}</p>
        </details>
      </aside>

      <footer className="wb-dock">
        <div style={{ display: "flex", flexDirection: "column", width: "100%", minWidth: 0 }}>
          <button type="button" className="wb-dock__bar" onClick={() => setDockOpen((value) => !value)}>
            <StudioIcon name="chevron" />
            Objetos da zona · {decorations.length}
            <span className="wb-muted">{dockOpen ? "recolher" : "abrir"}</span>
          </button>
          <div className="wb-dock__body">
            <div className="wb-hierarchy">
              {decorations.length === 0 ? <p className="wb-muted">Nenhum objeto nesta zona.</p> : null}
              {LAYERS.map((id) => {
                const items = decorations.filter((item) => layerOf(item) === id);
                if (!items.length) return null;
                const view = layerView[id];
                return (
                  <section key={id} className={`wb-layer${view.hidden ? " is-hidden" : ""}${view.locked ? " is-locked" : ""}`}>
                    <div className="wb-layer__head">
                      <span>{LAYER_LABEL[id]} ({items.length})</span>
                      <button type="button" className="wb-icon-btn" title={view.hidden ? "Mostrar no editor" : "Ocultar no editor"} onClick={() => setLayerView((prev) => ({ ...prev, [id]: { ...prev[id], hidden: !prev[id].hidden } }))}>
                        <StudioIcon name={view.hidden ? "eyeOff" : "eye"} />
                      </button>
                      <button type="button" className="wb-icon-btn" title={view.locked ? "Desbloquear" : "Bloquear transformações"} onClick={() => setLayerView((prev) => ({ ...prev, [id]: { ...prev[id], locked: !prev[id].locked } }))}>
                        <StudioIcon name={view.locked ? "lock" : "unlock"} />
                      </button>
                    </div>
                    {items.map((item) => {
                      const asset = byId.get(`${item.pack}/${item.key}`);
                      const current = item.editorId === selectedId;
                      const hiddenInPlay = !manualsInPlay(propsKind, decorationMode);
                      return (
                        <div
                          key={item.editorId || `${item.pack}-${item.key}`}
                          className={`wb-row${current ? " is-selected" : ""}${view.hidden || hiddenInPlay ? " is-muted" : ""}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => postCommand("select-id", { editorId: item.editorId })}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") postCommand("select-id", { editorId: item.editorId });
                          }}
                        >
                          <span>{asset?.name || item.key}</span>
                          <span>{asset ? categoryLabel(asset.category) : "—"}</span>
                          <span>{hiddenInPlay ? "oculto no jogo" : item.pack}</span>
                          <span className="wb-row__actions">
                            <button type="button" className="wb-icon-btn" title="Duplicar" disabled={view.locked || decorations.length >= MAX_DECORATIONS} onClick={(event) => { event.stopPropagation(); if (!view.locked) postCommand("duplicate-id", { editorId: item.editorId }); }}>
                              <StudioIcon name="duplicate" />
                            </button>
                            <button type="button" className="wb-icon-btn" title={view.locked ? "Camada bloqueada" : "Excluir"} disabled={view.locked} onClick={(event) => { event.stopPropagation(); if (!view.locked) postCommand("delete-id", { editorId: item.editorId }); }}>
                              <StudioIcon name="trash" />
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </section>
                );
              })}
            </div>
            <div className="wb-log">
              {log.length === 0 ? <p>Sem eventos.</p> : log.map((line) => <p key={line}>{line}</p>)}
            </div>
          </div>
        </div>
      </footer>

      <StudioModal
        open={pendingZone != null}
        title="Alterações não salvas"
        description="Esta zona tem um rascunho. Trocar de zona sem salvar descarta o que ainda não foi gravado."
        onClose={() => setPendingZone(null)}
        busy={saving}
        footer={
          <>
            <StudioBtn type="button" disabled={saving} onClick={() => setPendingZone(null)}>Cancelar</StudioBtn>
            <StudioBtn
              type="button"
              disabled={saving}
              onClick={() => {
                const next = pendingZone;
                setPendingZone(null);
                if (!next) return;
                loadedZoneRef.current = "";
                onZoneChange(next);
              }}
            >
              Descartar e trocar
            </StudioBtn>
            <StudioBtn
              variant="gold"
              type="button"
              loading={saving}
              onClick={() => {
                const next = pendingZone;
                void saveDraft().then((ok) => {
                  if (!ok || !next) return;
                  setPendingZone(null);
                  loadedZoneRef.current = "";
                  onZoneChange(next);
                });
              }}
            >
              Salvar e trocar
            </StudioBtn>
          </>
        }
      />

      <StudioModal
        open={conflict != null}
        title="A zona mudou no servidor"
        description="Chegou outra versão desta cena enquanto o rascunho local estava aberto. Escolha qual fica no editor."
        dismissable={!saving}
        onClose={() => setConflict(null)}
        footer={
          <>
            <StudioBtn
              type="button"
              onClick={() => {
                if (conflict) ignoredServerRef.current = fingerprint(derive(conflict));
                setConflict(null);
              }}
            >
              Manter rascunho
            </StudioBtn>
            <StudioBtn
              variant="gold"
              type="button"
              onClick={() => {
                if (conflict) discardTo(conflict);
              }}
            >
                Usar versão do servidor
              </StudioBtn>
            </>
          }
        />
      <StudioModal
        open={overlayAsk != null}
        title="Ativar decorações sobre o bioma"
        description={
          overlayAsk?.kind === "place"
            ? (overlayAsk.count > 1
              ? `Este objeto não entra no jogo com o overlay desligado. Ativar mostra os ${overlayAsk.count} objetos manuais junto com o bioma.`
              : "Este objeto não entra no jogo com o overlay desligado. Ativar combina ele com o bioma procedural.")
            : `Há ${overlayAsk?.count || 0} objeto(s) gravados que o jogo hoje esconde. Ativar o overlay faz todos aparecerem junto com o bioma.`
        }
        onClose={() => {
          setOverlayAsk(null);
          if (overlayAsk?.kind === "place") pushLog("Objeto ficou no rascunho. O jogo só o desenha com o overlay ou no bioma bare.");
        }}
        footer={
          <>
            <StudioBtn type="button" onClick={() => {
              const kind = overlayAsk?.kind;
              setOverlayAsk(null);
              if (kind === "place") pushLog("Objeto ficou no rascunho. O jogo só o desenha com o overlay ou no bioma bare.");
            }}>Manter desativado</StudioBtn>
            <StudioBtn variant="gold" type="button" onClick={() => { setOverlayAsk(null); applyDecorationMode("overlay"); }}>Ativar overlay</StudioBtn>
          </>
        }
      />
      <StudioModal
        open={bakeAsk}
        title="Assar o bioma"
        description="Assar extrai os elementos procedurais suportados para a lista de objetos e troca o bioma para bare. A floresta gerada deixa de existir; ficam os objetos editáveis. Isso não é o overlay. Dá para desfazer antes de salvar."
        onClose={() => setBakeAsk(false)}
        footer={
          <>
            <StudioBtn type="button" onClick={() => setBakeAsk(false)}>Cancelar</StudioBtn>
            <StudioBtn variant="gold" type="button" onClick={() => { setBakeAsk(false); postCommand("bake-biome"); }}>Assar</StudioBtn>
          </>
        }
      />
    </div>
  );
});

function AssetGrid({
  items,
  activeId,
  onSelect,
  onInsert,
}: {
  items: PropLibraryAsset[];
  activeId: string;
  onSelect: (asset: PropLibraryAsset) => void;
  onInsert: (asset: PropLibraryAsset) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(280);
  const cols = 2;
  const rowH = 86;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.clientHeight || 280));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = 0;
    setScrollTop(0);
  }, [items]);

  const rows = Math.ceil(items.length / cols);
  const start = Math.max(0, Math.floor(scrollTop / rowH) - 1);
  const visible = Math.ceil(height / rowH) + 3;
  const slice = items.slice(start * cols, (start + visible) * cols);

  return (
    <div
      ref={scrollerRef}
      className="wb-grid-scroll"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: Math.max(rows, 1) * rowH, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: start * rowH,
            left: 0,
            right: 0,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
          }}
        >
          {slice.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className={`wb-card${asset.id === activeId ? " is-selected" : ""}`}
              onClick={() => onSelect(asset)}
              onDoubleClick={() => onInsert(asset)}
            >
              <span className="wb-card__visual">
                <span className="wb-card__fallback">{categoryLabel(asset.category).slice(0, 3)}</span>
                {asset.thumb ? (
                  <img
                    src={asset.thumb}
                    alt=""
                    onError={(event) => event.currentTarget.remove()}
                  />
                ) : null}
              </span>
              <strong>{asset.name}</strong>
              <em>{categoryLabel(asset.category)}</em>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
