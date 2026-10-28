
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { getZoneScenePreset, ZONE_PARTICLE_MODES } from "@/lib/jogo-idle/game/zone-scene";
import {
  StudioBtn,
  StudioField,
  StudioFormSection,
  StudioInspector,
  StudioToolBtn,
  StudioToolbar,
} from "./studio/studio-ui";

/** World Builder Studio 2.0 — chrome navy/gold; engine = map-editor + scene overrides. */
export type MapDecoration = {
  pack: string;
  key: string;
  x: number;
  z: number;
  y?: number;
  scale?: number;
  rotY?: number;
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
    sunColor?: number;
    props?: string;
    particles?: string | null;
    particleColor?: number;
    propDensity?: number;
    fogNear?: number;
    fogFar?: number;
    variant?: string;
    decorations?: MapDecoration[];
  } | null;
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

const PALETTE: Record<string, string[]> = {
  dungeon: ["barrelL", "chest", "chestGold", "column", "pillar", "crates", "torch", "wall", "stairs"],
  nature: ["treeA", "treeB", "treesM", "rockA", "rockC", "hill", "hillsTrees"],
  forest: ["tree1a", "tree2a", "tree3a", "tree4a", "bush1a", "rock1a", "rock3a", "grass1a", "bare1a"],
  city: ["buildingA", "buildingC", "bench", "bush", "streetlight", "waterTower"],
  space: ["moduleA", "moduleB", "pad", "landerA", "lights", "solar"],
  halloween: ["crypt", "arch", "shrine", "lanternH", "treeL", "skullCandle", "jack"],
};

function toCssHex(n?: number | null, fallback = "#808080") {
  if (n == null || !Number.isFinite(n)) return fallback;
  return `#${Math.floor(n).toString(16).padStart(6, "0")}`;
}

function fromCssHex(css: string) {
  return Number.parseInt(css.replace(/^#/, ""), 16);
}

const STORAGE_MAP_ZONE = "jogo-idle-admin-mapZoneId";

type AdminMapEditorProps = {
  zones: ZoneRow[];
  working: boolean;
  idleFetch: (path: string, init?: RequestInit) => Promise<any>;
  onMessage: (message: string | null) => void;
  onRefresh: () => Promise<void>;
  onZonesChange?: (zones: ZoneRow[]) => void;
  run: (action: () => Promise<void>) => Promise<void>;
};

export function AdminMapEditor({
  zones,
  working,
  idleFetch,
  onMessage,
  onRefresh,
  onZonesChange,
  run,
}: AdminMapEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadedZoneRef = useRef<string>("");
  const pendingFullRef = useRef<{
    zoneId: string;
    scene: Record<string, unknown> & { decorations: MapDecoration[] };
  } | null>(null);
  const skipThemeUntilRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [fullSyncKey, setFullSyncKey] = useState(0);
  const [zoneId, setZoneId] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_MAP_ZONE) || "";
      if (saved && zones.some((z) => z.id === saved)) return saved;
    } catch {
      /* ignore */
    }
    return zones[0]?.id || "";
  });
  const [bg, setBg] = useState("#16241f");
  const [ground, setGround] = useState("#2c4226");
  const [hemiSky, setHemiSky] = useState("#9fc8a8");
  const [sun, setSun] = useState("#fff0c8");
  const [propsKind, setPropsKind] = useState("forest");
  const [particles, setParticles] = useState<string>("float");
  const [particleColor, setParticleColor] = useState("#e8ff8a");
  const [propDensity, setPropDensity] = useState("1");
  const [fogNear, setFogNear] = useState("10");
  const [fogFar, setFogFar] = useState("34");
  const [decorations, setDecorations] = useState<MapDecoration[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [pack, setPack] = useState("nature");
  const [propKey, setPropKey] = useState("treeA");
  const [scale, setScale] = useState("1");
  const [tool, setTool] = useState<"navigate" | "select" | "place">("navigate");
  const [brushArmed, setBrushArmed] = useState(false);
  const [showPlayCamera, setShowPlayCamera] = useState(false);
  const [rotYDeg, setRotYDeg] = useState("0");

  const themePayload = useCallback(
    () => ({
      bg: fromCssHex(bg),
      ground: fromCssHex(ground),
      hemiSky: fromCssHex(hemiSky),
      sunColor: fromCssHex(sun),
      props: propsKind,
      particles,
      particleColor: fromCssHex(particleColor),
      propDensity: Math.max(0.5, Math.min(2, Number(propDensity) || 1)),
      fogNear: Math.max(1, Math.min(40, Number(fogNear) || 10)),
      fogFar: Math.max(5, Math.min(80, Number(fogFar) || 34)),
    }),
    [bg, ground, hemiSky, sun, propsKind, particles, particleColor, propDensity, fogNear, fogFar],
  );

  // Decorações só no bioma bare (assado). Outros kinds usam o procedural limpo.
  const scenePayload = {
    ...themePayload(),
    ...(propsKind === "bare" ? { decorations } : {}),
  };

  function applyPresetFields(
    preset: ReturnType<typeof getZoneScenePreset>,
    keepDecorations?: MapDecoration[],
  ) {
    setBg(toCssHex(preset.bg, "#16241f"));
    setGround(toCssHex(preset.ground, "#2c4226"));
    setHemiSky(toCssHex(preset.hemiSky, "#9fc8a8"));
    setSun(toCssHex(preset.sunColor, "#fff0c8"));
    setPropsKind(typeof preset.props === "string" ? preset.props : "ruins");
    setParticles(preset.particles || "float");
    setParticleColor(toCssHex(preset.particleColor, "#e8ff8a"));
    setPropDensity(String(preset.propDensity ?? 1));
    setFogNear(String(preset.fogNear ?? 10));
    setFogFar(String(preset.fogFar ?? 34));
    if (keepDecorations) setDecorations(keepDecorations);
  }

  function loadZoneFields(z: ZoneRow) {
    const preset = getZoneScenePreset(z.id);
    const scene = z.scene;
    let nextDecorations: MapDecoration[] = [];
    let nextTheme = {
      bg: toCssHex(preset.bg, "#16241f"),
      ground: toCssHex(preset.ground, "#2c4226"),
      hemiSky: toCssHex(preset.hemiSky, "#9fc8a8"),
      sun: toCssHex(preset.sunColor, "#fff0c8"),
      propsKind: (preset.props || "ruins") as string,
      particles: (preset.particles || "float") as string,
      particleColor: toCssHex(preset.particleColor, "#e8ff8a"),
      propDensity: String(preset.propDensity ?? 1),
      fogNear: String(preset.fogNear ?? 10),
      fogFar: String(preset.fogFar ?? 34),
    };
    if (scene && Object.keys(scene).length) {
      nextTheme = {
        bg: toCssHex(scene.bg, nextTheme.bg),
        ground: toCssHex(scene.ground, nextTheme.ground),
        hemiSky: toCssHex(scene.hemiSky, nextTheme.hemiSky),
        sun: toCssHex(scene.sunColor, nextTheme.sun),
        propsKind: typeof scene.props === "string" ? scene.props : nextTheme.propsKind,
        particles:
          scene.particles === null
            ? "float"
            : typeof scene.particles === "string"
              ? scene.particles
              : nextTheme.particles,
        particleColor: toCssHex(scene.particleColor, nextTheme.particleColor),
        propDensity: String(scene.propDensity ?? (Number(nextTheme.propDensity) || 1)),
        fogNear: String(scene.fogNear ?? (Number(nextTheme.fogNear) || 10)),
        fogFar: String(scene.fogFar ?? (Number(nextTheme.fogFar) || 34)),
      };
      nextDecorations = Array.isArray(scene.decorations) ? scene.decorations : [];
    }
    setBg(nextTheme.bg);
    setGround(nextTheme.ground);
    setHemiSky(nextTheme.hemiSky);
    setSun(nextTheme.sun);
    setPropsKind(nextTheme.propsKind);
    setParticles(nextTheme.particles);
    setParticleColor(nextTheme.particleColor);
    setPropDensity(nextTheme.propDensity);
    setFogNear(nextTheme.fogNear);
    setFogFar(nextTheme.fogFar);
    setDecorations(nextDecorations);
    setSelectedIndex(-1);
    pendingFullRef.current = {
      zoneId: z.id,
      scene: {
        bg: fromCssHex(nextTheme.bg),
        ground: fromCssHex(nextTheme.ground),
        hemiSky: fromCssHex(nextTheme.hemiSky),
        sunColor: fromCssHex(nextTheme.sun),
        props: nextTheme.propsKind,
        particles: nextTheme.particles,
        particleColor: fromCssHex(nextTheme.particleColor),
        propDensity: Math.max(0.5, Math.min(2, Number(nextTheme.propDensity) || 1)),
        fogNear: Math.max(1, Math.min(40, Number(nextTheme.fogNear) || 10)),
        fogFar: Math.max(5, Math.min(80, Number(nextTheme.fogFar) || 34)),
        decorations: nextDecorations,
      },
    };
    skipThemeUntilRef.current = Date.now() + 200;
    setFullSyncKey((k) => k + 1);
  }

  // Só carrega formulário quando a zona muda — não a cada refresh de `zones`.
  useEffect(() => {
    if (!zones.length) return;
    const z = zones.find((row) => row.id === zoneId) || zones[0];
    if (!z) return;
    if (z.id !== zoneId) {
      setZoneId(z.id);
      return;
    }
    if (loadedZoneRef.current === z.id) return;
    loadedZoneRef.current = z.id;
    try {
      sessionStorage.setItem(STORAGE_MAP_ZONE, z.id);
    } catch {
      /* ignore */
    }
    loadZoneFields(z);
  }, [zoneId, zones]);

  function postToEditor(payload: Record<string, unknown>) {
    const win = iframeRef.current?.contentWindow;
    if (!win || !ready) return;
    win.postMessage({ type: "jogo-idle:map-editor", ...payload }, window.location.origin);
  }

  function postCommand(command: string, extra: Record<string, unknown> = {}) {
    const win = iframeRef.current?.contentWindow;
    if (!win || !ready) return;
    win.postMessage(
      { type: "jogo-idle:map-editor-command", command, ...extra },
      window.location.origin,
    );
  }

  function setEditorTool(next: "navigate" | "select" | "place") {
    setTool(next);
    if (next !== "place") setBrushArmed(false);
    postCommand("set-tool", { tool: next });
  }

  function armBrush(nextPack = pack, nextKey = propKey, nextScale = scale) {
    setPack(nextPack);
    setPropKey(nextKey);
    setBrushArmed(true);
    setTool("place");
    postCommand("arm-brush", {
      brush: { pack: nextPack, key: nextKey, scale: Number(nextScale) || 1 },
    });
  }

  useEffect(() => {
    function onMessageEvent(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (data?.type === "jogo-idle:map-editor-ready") {
        setReady(true);
        return;
      }
      if (data?.type === "jogo-idle:map-editor-decorations" && Array.isArray(data.decorations)) {
        setDecorations(data.decorations);
        if (typeof data.selectedIndex === "number") setSelectedIndex(data.selectedIndex);
        return;
      }
      if (data?.type === "jogo-idle:map-editor-baked") {
        skipThemeUntilRef.current = Date.now() + 250;
        if (typeof data.props === "string") setPropsKind(data.props);
        if (Array.isArray(data.decorations)) setDecorations(data.decorations);
        if (typeof data.selectedIndex === "number") setSelectedIndex(data.selectedIndex);
        onMessage(
          "Construções do bioma convertidas em decorações editáveis (bioma → bare). Salve o mapa.",
        );
        return;
      }
      if (data?.type === "jogo-idle:map-editor-toast" && data.message) {
        onMessage(String(data.message));
        return;
      }
      if (data?.type === "jogo-idle:map-editor-selection") {
        if (typeof data.selectedIndex === "number") setSelectedIndex(data.selectedIndex);
      }
      if (data?.type === "jogo-idle:map-editor-tool") {
        if (data.tool === "navigate" || data.tool === "select" || data.tool === "place") {
          setTool(data.tool);
        }
        if (typeof data.brushArmed === "boolean") setBrushArmed(data.brushArmed);
      }
    }
    window.addEventListener("message", onMessageEvent);
    return () => window.removeEventListener("message", onMessageEvent);
  }, []);

  // Carga completa (bioma + decorações) só ao trocar zona / iframe pronto.
  useEffect(() => {
    if (!ready) return;
    const pending = pendingFullRef.current;
    if (!pending || pending.zoneId !== zoneId) return;
    const t = window.setTimeout(() => {
      postToEditor({
        mode: "full",
        zoneId: pending.zoneId,
        scene: pending.scene,
        tool: "navigate",
        brushArmed: false,
      });
      setTool("navigate");
      setBrushArmed(false);
      pendingFullRef.current = null;
    }, 50);
    return () => window.clearTimeout(t);
  }, [ready, zoneId, fullSyncKey]);

  // Tema/bioma: não reenvia decorações (evita reset de posição/seleção).
  useEffect(() => {
    if (!ready || !zoneId) return;
    if (Date.now() < skipThemeUntilRef.current) return;
    if (pendingFullRef.current?.zoneId === zoneId) return;
    const t = window.setTimeout(() => {
      if (Date.now() < skipThemeUntilRef.current) return;
      postToEditor({
        mode: "theme",
        zoneId,
        scene: themePayload(),
      });
    }, 60);
    return () => window.clearTimeout(t);
  }, [
    ready,
    zoneId,
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
    themePayload,
  ]);

  // Sync scale into armed brush without auto-arming.
  useEffect(() => {
    if (!ready || !brushArmed) return;
    postToEditor({
      mode: "brush",
      brush: { pack, key: propKey, scale: Number(scale) || 1 },
      brushArmed: true,
      tool: "place",
    });
  }, [ready, pack, propKey, scale, brushArmed]);

  useEffect(() => {
    if (selectedIndex < 0 || !decorations[selectedIndex]) {
      setRotYDeg("0");
      return;
    }
    const rot = Number(decorations[selectedIndex].rotY) || 0;
    setRotYDeg(String(Math.round(((rot * 180) / Math.PI) * 10) / 10));
  }, [selectedIndex, decorations]);

  function deleteSelected() {
    postCommand("delete-selected");
  }

  function bakeBiome() {
    postCommand("bake-biome");
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!zoneId) throw new Error("Selecione uma zona");
    await run(async () => {
      const data = await idleFetch("/api/jogo-idle/admin/config", {
        method: "POST",
        body: JSON.stringify({ zone: { id: zoneId, scene: scenePayload } }),
      });
      if (Array.isArray(data.zones)) onZonesChange?.(data.zones);
      onMessage(data.message || "Mapa da zona salvo");
      // Mantém edição local; não força reload do formulário.
      loadedZoneRef.current = zoneId;
      await onRefresh();
    });
  }

  const selected =
    selectedIndex >= 0 && selectedIndex < decorations.length ? decorations[selectedIndex] : null;
  const zoneName = zones.find((z) => z.id === zoneId)?.name || zoneId;

  return (
    <form className="studio-2-wb" onSubmit={(event) => void onSave(event)}>
      <StudioToolbar>
        <select
          className="studio-2-select max-w-[200px]"
          value={zoneId}
          onChange={(event) => {
            loadedZoneRef.current = "";
            setZoneId(event.target.value);
          }}
          aria-label="Zona do mapa"
        >
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.chapterId ? `[${z.chapterId}] ` : ""}
              {z.name}
              {z.trial ? " (ritual)" : ""}
            </option>
          ))}
        </select>
        <span className="text-[0.65rem] text-[var(--studio-muted)]">
          ID: {zoneId}
          {zones.find((z) => z.id === zoneId)?.sceneProfileId
            ? ` · ${zones.find((z) => z.id === zoneId)?.sceneProfileId}`
            : ""}
        </span>
        <div className="mx-1 h-5 w-px bg-[var(--studio-line)]" aria-hidden />
        {(
          [
            ["navigate", "Navegar"],
            ["select", "Selecionar"],
            ["place", "Colocar"],
          ] as const
        ).map(([id, label]) => (
          <StudioToolBtn key={id} active={tool === id} onClick={() => setEditorTool(id)}>
            {label}
          </StudioToolBtn>
        ))}
        <StudioToolBtn disabled title="Modo dedicado não existe no map-editor (use Selecionar + arrastar)">
          Mover
        </StudioToolBtn>
        <StudioToolBtn disabled title="Rotação: Q/E no canvas ou campo Rot Y no inspetor">
          Rotacionar
        </StudioToolBtn>
        <StudioToolBtn disabled title="Escala via pincel ao armar prop (campo Escala na biblioteca)">
          Escalar
        </StudioToolBtn>
        <StudioToolBtn disabled title="Grade / snap ainda não suportados pelo motor">
          Grade
        </StudioToolBtn>
        <StudioToolBtn disabled title="Snap automático: Fase 3">
          Snap
        </StudioToolBtn>
        <div className="mx-1 h-5 w-px bg-[var(--studio-line)]" aria-hidden />
        <StudioToolBtn
          active={showPlayCamera}
          onClick={() => {
            const next = !showPlayCamera;
            setShowPlayCamera(next);
            postCommand("set-play-camera", { enabled: next });
          }}
        >
          Câm. jogador
        </StudioToolBtn>
        <StudioToolBtn onClick={() => postCommand("snap-play-camera")}>Prévia FOV</StudioToolBtn>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <StudioBtn
            type="button"
            disabled={!zoneId}
            onClick={() => applyPresetFields(getZoneScenePreset(zoneId), decorations)}
          >
            Preset
          </StudioBtn>
          <StudioBtn variant="gold" disabled={working || !zoneId} type="submit">
            Salvar
          </StudioBtn>
          <StudioBtn disabled title="Publicação versionada: Fase 4">
            Publicar
          </StudioBtn>
        </div>
      </StudioToolbar>

      <div className="studio-2-wb__stage">
        <div className="studio-2-wb__viewport">
          <iframe
            ref={iframeRef}
            title={`World Builder — ${zoneName}`}
            src="/jogo-idle/map-editor.html"
            className="absolute inset-0 h-full w-full border-0"
            tabIndex={0}
          />
          {!ready ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-[var(--studio-muted)]">
              Carregando viewport…
            </div>
          ) : null}
        </div>

        <StudioInspector title="Inspetor de zona">
          <StudioFormSection title="Aparência">
            <div className="grid grid-cols-2 gap-2">
              <StudioField label="Céu">
                <input className="studio-2-input h-8" type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
              </StudioField>
              <StudioField label="Chão">
                <input className="studio-2-input h-8" type="color" value={ground} onChange={(e) => setGround(e.target.value)} />
              </StudioField>
              <StudioField label="Ambiente">
                <input className="studio-2-input h-8" type="color" value={hemiSky} onChange={(e) => setHemiSky(e.target.value)} />
              </StudioField>
              <StudioField label="Sol">
                <input className="studio-2-input h-8" type="color" value={sun} onChange={(e) => setSun(e.target.value)} />
              </StudioField>
            </div>
            <StudioField label="Bioma (props)">
              <select className="studio-2-select" value={propsKind} onChange={(e) => setPropsKind(e.target.value)}>
                {PROP_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </StudioField>
            <div className="grid grid-cols-2 gap-2">
              <StudioField label="Partículas">
                <select className="studio-2-select" value={particles} onChange={(e) => setParticles(e.target.value)}>
                  {ZONE_PARTICLE_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </StudioField>
              <StudioField label="Cor">
                <input className="studio-2-input h-8" type="color" value={particleColor} onChange={(e) => setParticleColor(e.target.value)} />
              </StudioField>
              <StudioField label="Densidade">
                <input className="studio-2-input" type="number" min={0.5} max={2} step={0.1} value={propDensity} onChange={(e) => setPropDensity(e.target.value)} />
              </StudioField>
              <StudioField label="Fog near">
                <input className="studio-2-input" type="number" min={1} max={40} value={fogNear} onChange={(e) => setFogNear(e.target.value)} />
              </StudioField>
              <StudioField label="Fog far" className="col-span-2">
                <input className="studio-2-input" type="number" min={5} max={80} value={fogFar} onChange={(e) => setFogFar(e.target.value)} />
              </StudioField>
            </div>
          </StudioFormSection>

          <StudioFormSection title="Objeto selecionado">
            {selected ? (
              <>
                <p className="text-[0.72rem]">
                  {selected.pack}/{selected.key}
                </p>
                <StudioField label="Rotação Y (°) — ou Q/E">
                  <input
                    className="studio-2-input"
                    type="number"
                    step={5}
                    value={rotYDeg}
                    onChange={(event) => {
                      setRotYDeg(event.target.value);
                      const deg = Number(event.target.value) || 0;
                      postCommand("set-rotY", { rotY: (deg * Math.PI) / 180 });
                    }}
                  />
                </StudioField>
                <StudioBtn variant="danger" disabled={selectedIndex < 0} onClick={() => deleteSelected()}>
                  Remover
                </StudioBtn>
              </>
            ) : (
              <p className="text-[0.72rem] text-[var(--studio-muted)]">Nenhum prop selecionado.</p>
            )}
          </StudioFormSection>

          <div className="flex flex-wrap gap-1.5">
            <StudioBtn type="button" disabled={!ready || propsKind === "bare"} onClick={() => bakeBiome()}>
              Assar bioma
            </StudioBtn>
            <StudioBtn
              type="button"
              disabled={working || !zoneId}
              onClick={() =>
                void run(async () => {
                  const data = await idleFetch("/api/jogo-idle/admin/config", {
                    method: "POST",
                    body: JSON.stringify({ zone: { id: zoneId, scene: null } }),
                  });
                  if (Array.isArray(data.zones)) onZonesChange?.(data.zones);
                  onMessage("Tema visual da zona resetado");
                  loadedZoneRef.current = "";
                  await onRefresh();
                  const z = (Array.isArray(data.zones) ? data.zones : zones).find(
                    (row: ZoneRow) => row.id === zoneId,
                  );
                  if (z) {
                    loadedZoneRef.current = z.id;
                    loadZoneFields(z);
                  }
                })
              }
            >
              Resetar visual
            </StudioBtn>
          </div>
        </StudioInspector>
      </div>

      <div className="studio-2-wb__dock">
        <div className="studio-2-wb__dock-panel">
          <p className="studio-2-card__label mb-1">Biblioteca de props</p>
          <div className="mb-2 flex gap-2">
            <select
              className="studio-2-select"
              value={pack}
              onChange={(event) => {
                const next = event.target.value;
                setPack(next);
                setPropKey(PALETTE[next]?.[0] || "");
              }}
            >
              {Object.keys(PALETTE).map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
            <input
              className="studio-2-input w-20"
              type="number"
              min={0.2}
              max={4}
              step={0.1}
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              title="Escala do pincel"
            />
          </div>
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
            {(PALETTE[pack] || []).map((key) => (
              <button
                key={key}
                type="button"
                className={`studio-2-wb__prop ${brushArmed && propKey === key ? "is-armed" : ""}`}
                onClick={() => armBrush(pack, key, scale)}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
        <div className="studio-2-wb__dock-panel">
          <p className="studio-2-card__label mb-1">Camadas (info)</p>
          <ul className="space-y-1 text-[0.68rem] text-[var(--studio-muted)]">
            <li>Bioma procedural: {propsKind}</li>
            <li>Decorações assadas: {decorations.length}</li>
            <li>Toggle de camadas no motor: ainda não suportado</li>
          </ul>
        </div>
        <div className="studio-2-wb__dock-panel">
          <p className="studio-2-card__label mb-1">Log / validações</p>
          <ul className="space-y-1 text-[0.68rem]">
            <li className="text-[var(--studio-green)]">
              · Viewport {ready ? "pronto" : "carregando"}
            </li>
            <li>
              · Ferramenta: {tool}
              {brushArmed ? ` · pincel ${pack}/${propKey}` : ""}
            </li>
            <li className="text-[var(--studio-muted)]">
              · Decorações só persistem com bioma bare após Assar
            </li>
            <li className="text-[var(--studio-muted)]">· Publicar: Fase 4</li>
          </ul>
        </div>
      </div>
    </form>
  );
}
