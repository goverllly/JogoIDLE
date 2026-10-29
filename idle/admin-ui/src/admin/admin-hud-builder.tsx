import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  HUD_COMPONENTS,
  buildHudLayerTree,
  getHudComponent,
  type HudComponentDef,
} from "@/lib/jogo-idle/hud-registry";
import type { HudLayoutDocument, HudStyleProps } from "@/lib/jogo-idle/hud-layout";
import {
  DEFAULT_HUD_INTRO_TOKENS,
  DEFAULT_SLOT_RARITY_FILL_MIX,
} from "@/lib/jogo-idle/hud-layout";
import {
  applyEditableSlice,
  applyOrders,
  clearFreeProps,
  editableSlice,
  isEditableDirty,
  isTrustedAdminBridgeMessage,
  mergeComponentProps,
  parseBreakpoint,
  resolvedProps,
  sliceFingerprint,
  type EditableHudSlice,
  type HudBp,
} from "@/lib/jogo-idle/hud-builder-state";
import {
  StudioBadge,
  StudioBtn,
  StudioEmpty,
  StudioField,
  StudioFormSection,
  StudioModal,
} from "./studio/studio-ui";
import { StudioIcon } from "./studio/studio-icons";

const MSG_V = 1;
const VIEWPORT_PRESETS = [
  { id: "fullhd", label: "1920×1080", w: 1920, h: 1080, breakpoint: "desktop" as const },
  { id: "laptop", label: "1366×768", w: 1366, h: 768, breakpoint: "desktop" as const },
  { id: "tablet", label: "768×1024", w: 768, h: 1024, breakpoint: "tablet" as const },
  { id: "mobile", label: "390×844", w: 390, h: 844, breakpoint: "mobile" as const },
];

type IdleFetch = (path: string, init?: RequestInit) => Promise<any>;
type LayoutMode = "organized" | "free";

type AdminHudBuilderProps = {
  working: boolean;
  idleFetch: IdleFetch;
  onMessage: (message: string | null) => void;
  run: (action: () => Promise<void>) => Promise<boolean>;
  onStatus?: (status: { dirty: boolean }) => void;
};

export type AdminHudHandle = {
  save: () => Promise<boolean>;
  discard: () => Promise<void>;
};

type HudAsk =
  | { kind: "conflict" }
  | { kind: "publish" }
  | { kind: "restore-default" }
  | { kind: "restore-revision"; revision: number };

function emptyDraft(): HudLayoutDocument {
  return {
    schemaVersion: 1,
    layoutId: "combat-default",
    name: "HUD Principal",
    revision: 0,
    draftRevision: 0,
    status: "draft",
    updatedAt: new Date().toISOString(),
    updatedBy: "admin",
    breakpoints: { desktop: 1024, tablet: 768, mobile: 0 },
    components: {},
    tokens: {
      slotRarityFillMix: DEFAULT_SLOT_RARITY_FILL_MIX,
      intro: { ...DEFAULT_HUD_INTRO_TOKENS },
    },
  };
}

export const AdminHudBuilder = forwardRef<AdminHudHandle, AdminHudBuilderProps>(function AdminHudBuilder(
  { working, idleFetch, onMessage, run, onStatus },
  ref,
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const draftRef = useRef<HudLayoutDocument>(emptyDraft());
  const baselineRef = useRef("");
  const suppressSyncRef = useRef(false);
  const nudgeOriginRef = useRef<EditableHudSlice | null>(null);
  const bridgeSessionRef = useRef<string | null>(null);
  const lastBridgeSeqRef = useRef(0);
  const [historyEntries, setHistoryEntries] = useState<
    Array<{ revision: number; name: string; updatedAt: string }>
  >([]);

  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<HudLayoutDocument>(emptyDraft);
  const [publishedRevision, setPublishedRevision] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [computed, setComputed] = useState<Record<string, string> | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("organized");
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapGrid, setSnapGrid] = useState(8);
  const [presetId, setPresetId] = useState("fullhd");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [past, setPast] = useState<EditableHudSlice[]>([]);
  const [future, setFuture] = useState<EditableHudSlice[]>([]);
  const [layersOpen, setLayersOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [zoom, setZoom] = useState<number | null>(null);
  const [fitScale, setFitScale] = useState(0.45);
  const [ask, setAsk] = useState<HudAsk | null>(null);
  const askResolveRef = useRef<((ok: boolean) => void) | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ save: () => Promise<boolean>; discard: () => Promise<void> }>({
    save: async () => false,
    discard: async () => undefined,
  });

  const preset = VIEWPORT_PRESETS.find((p) => p.id === presetId) || VIEWPORT_PRESETS[0];
  const breakpoint: HudBp = preset.breakpoint;

  draftRef.current = draft;

  const markDirtyFromDoc = useCallback((doc: HudLayoutDocument) => {
    setDirty(isEditableDirty(doc, baselineRef.current));
  }, []);

  const pushHistory = useCallback((before: EditableHudSlice) => {
    setPast((p) => [...p.slice(-49), structuredClone(before)]);
    setFuture([]);
  }, []);

  const commitDraft = useCallback(
    (next: HudLayoutDocument, opts?: { history?: boolean; sync?: boolean }) => {
      if (opts?.history !== false) {
        pushHistory(editableSlice(draftRef.current));
      }
      if (opts?.sync === false) suppressSyncRef.current = true;
      setDraft(next);
      markDirtyFromDoc(next);
    },
    [markDirtyFromDoc, pushHistory],
  );

  function applyServerDraft(next: HudLayoutDocument) {
    baselineRef.current = sliceFingerprint(editableSlice(next));
    setDraft(next);
    setDirty(false);
  }

  const postToHud = useCallback(
    (payload: Record<string, unknown>) => {
      const win = iframeRef.current?.contentWindow;
      if (!win || !ready) return;
      win.postMessage({ ...payload, v: MSG_V }, window.location.origin);
    },
    [ready],
  );

  const loadDraft = useCallback(async () => {
    const data = await idleFetch("/api/jogo-idle/admin/hud-layout");
    const next = (data.draft as HudLayoutDocument) || emptyDraft();
    applyServerDraft(next);
    setPast([]);
    setFuture([]);
    setPublishedRevision(
      typeof data.publishedRevision === "number" ? data.publishedRevision : null,
    );
    const hist = Array.isArray(data.history) ? data.history : [];
    setHistoryEntries(
      hist.map((h: { revision?: number; name?: string; updatedAt?: string }) => ({
        revision: Number(h.revision) || 0,
        name: String(h.name || ""),
        updatedAt: String(h.updatedAt || ""),
      })),
    );
  }, [idleFetch]);

  useEffect(() => {
    void loadDraft().catch((err) => onMessage(String(err?.message || err)));
  }, [loadDraft, onMessage]);

  useEffect(() => {
    function onMessageEvent(event: MessageEvent) {
      const trusted = isTrustedAdminBridgeMessage({
        origin: event.origin,
        expectedOrigin: window.location.origin,
        source: event.source,
        expectedSource: iframeRef.current?.contentWindow,
        data: event.data,
        expectedSessionId: bridgeSessionRef.current,
        lastSeq: lastBridgeSeqRef.current,
      });
      // ready may arrive before session is known — allow first ready without session
      let data: Record<string, unknown>;
      if (trusted.ok === false) {
        const raw = event.data;
        if (
          trusted.reason === "session" &&
          raw &&
          typeof raw === "object" &&
          (raw as { type?: string }).type === "jogo-idle:hud-builder-ready" &&
          event.origin === window.location.origin &&
          event.source === iframeRef.current?.contentWindow
        ) {
          data = raw as Record<string, unknown>;
        } else {
          return;
        }
      } else if (trusted.ok === true) {
        data = trusted.data;
        if (trusted.seq > 0) lastBridgeSeqRef.current = trusted.seq;
      } else {
        return;
      }

      if (data.type === "jogo-idle:hud-builder-ready") {
        if (typeof data.sessionId === "string" && data.sessionId) {
          bridgeSessionRef.current = data.sessionId;
          lastBridgeSeqRef.current = 0;
        }
        setReady(true);
        return;
      }
      if (data.type === "jogo-idle:hud-builder-selection") {
        setSelectedId(typeof data.id === "string" ? data.id : null);
        setComputed(data.computed && typeof data.computed === "object" ? (data.computed as Record<string, string>) : null);
        return;
      }
      if (data.type === "jogo-idle:hud-builder-transform") {
        if (data.props && typeof data.props === "object") {
          setComputed((prev) => ({ ...(prev || {}), ...(data.props as Record<string, string>) }));
        }
        return;
      }
      if (data.type === "jogo-idle:hud-builder-transform-end") {
        const id = typeof data.id === "string" ? data.id : null;
        if (!id) return;
        const bp = parseBreakpoint(data.breakpoint) || breakpoint;
        let next = structuredClone(draftRef.current);
        if (data.kind === "reorder" && data.orders && typeof data.orders === "object") {
          next = applyOrders(next, data.orders as Record<string, number>, bp);
        } else if (data.props && typeof data.props === "object") {
          next = mergeComponentProps(next, id, data.props as HudStyleProps, bp);
        }
        commitDraft(next, { sync: false });
        setComputed((prev) => ({ ...(prev || {}), ...((data.props as object) || {}) }));
        return;
      }
      if (data.type === "jogo-idle:hud-builder-transform-cancel") {
        postToHud({
          type: "jogo-idle:hud-builder-set-layout",
          layout: draftRef.current,
          breakpoint,
        });
      }
    }
    window.addEventListener("message", onMessageEvent);
    return () => window.removeEventListener("message", onMessageEvent);
  }, [breakpoint, commitDraft, postToHud]);

  useEffect(() => {
    if (!ready) return;
    if (suppressSyncRef.current) {
      suppressSyncRef.current = false;
      return;
    }
    postToHud({ type: "jogo-idle:hud-builder-set-layout", layout: draft, breakpoint });
  }, [ready, draft, breakpoint, postToHud]);

  useEffect(() => {
    if (!ready) return;
    postToHud({ type: "jogo-idle:hud-builder-mode", mode });
  }, [ready, mode, postToHud]);

  useEffect(() => {
    if (!ready) return;
    postToHud({ type: "jogo-idle:hud-builder-layout-mode", mode: layoutMode });
  }, [ready, layoutMode, postToHud]);

  useEffect(() => {
    if (!ready) return;
    postToHud({
      type: "jogo-idle:hud-builder-snap",
      enabled: snapEnabled,
      grid: snapGrid,
      allowOverflow: false,
    });
  }, [ready, snapEnabled, snapGrid, postToHud]);

  useEffect(() => {
    if (!ready) return;
    postToHud({
      type: "jogo-idle:hud-builder-viewport",
      breakpoint,
      width: preset.w,
      height: preset.h,
    });
  }, [ready, breakpoint, preset.w, preset.h, postToHud]);

  function selectComponent(id: string) {
    setSelectedId(id);
    postToHud({ type: "jogo-idle:hud-builder-select", id });
  }

  function patchSelected(props: HudStyleProps, opts?: { history?: boolean }) {
    if (!selectedId) return;
    const next = mergeComponentProps(draft, selectedId, props, breakpoint);
    commitDraft(next, { history: opts?.history !== false, sync: true });
  }

  function undo() {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [editableSlice(draftRef.current), ...f].slice(0, 50));
      const next = applyEditableSlice(draftRef.current, prev);
      setDraft(next);
      markDirtyFromDoc(next);
      return p.slice(0, -1);
    });
  }

  function redo() {
    setFuture((f) => {
      if (!f.length) return f;
      const nxt = f[0];
      setPast((p) => [...p, editableSlice(draftRef.current)].slice(-50));
      const next = applyEditableSlice(draftRef.current, nxt);
      setDraft(next);
      markDirtyFromDoc(next);
      return f.slice(1);
    });
  }

  function returnToFlow() {
    if (!selectedId) return;
    const next = clearFreeProps(draft, selectedId, breakpoint);
    commitDraft(next, { sync: true });
    onMessage("Componente voltou ao fluxo (sem position absolute).");
  }

  async function onSaveDraft() {
    const ok = await run(async () => {
      try {
        const data = await idleFetch("/api/jogo-idle/admin/hud-layout/draft", {
          method: "PUT",
          body: JSON.stringify({
            layout: draft,
            expectedDraftRevision: draft.draftRevision ?? 0,
          }),
        });
        const saved = (data.draft as HudLayoutDocument) || draft;
        applyServerDraft(saved);
        if (typeof data.publishedRevision === "number") setPublishedRevision(data.publishedRevision);
        onMessage(data.message || "Rascunho salvo");
      } catch (err) {
        const msg = String((err as Error)?.message || err);
        if (/409|HUD_DRAFT_CONFLICT|conflito/i.test(msg)) {
          const reload = await confirmAsk({ kind: "conflict" });
          if (reload) await loadDraft();
          throw err;
        }
        throw err;
      }
    });
    return ok && !isEditableDirty(draftRef.current, baselineRef.current);
  }

  async function doPublish() {
    setAsk(null);
    await run(async () => {
      const data = await idleFetch("/api/jogo-idle/admin/hud-layout/publish", {
        method: "POST",
        body: JSON.stringify({
          expectedPublishedRevision: publishedRevision ?? 0,
          expectedDraftRevision: draft.draftRevision ?? 0,
        }),
      });
      const savedDraft = (data.draft as HudLayoutDocument) || draft;
      applyServerDraft(savedDraft);
      if (data.published && typeof data.published.revision === "number") {
        setPublishedRevision(data.published.revision);
      }
      await loadDraft();
      onMessage(data.message || "HUD publicada");
    });
  }

  function requestPublish() {
    if (dirty) {
      onMessage("Salve o rascunho antes de publicar.");
      return;
    }
    setAsk({ kind: "publish" });
  }

  async function doRestoreDefault() {
    setAsk(null);
    await run(async () => {
      pushHistory(editableSlice(draftRef.current));
      const data = await idleFetch("/api/jogo-idle/admin/hud-layout/restore", {
        method: "POST",
        body: JSON.stringify({
          toDefault: true,
          expectedDraftRevision: draftRef.current.draftRevision ?? 0,
        }),
      });
      const next = (data.draft as HudLayoutDocument) || emptyDraft();
      applyServerDraft(next);
      onMessage(data.message || "Layout padrão restaurado");
    });
  }

  async function doRestoreRevision(revision: number) {
    setAsk(null);
    await run(async () => {
      pushHistory(editableSlice(draftRef.current));
      const data = await idleFetch("/api/jogo-idle/admin/hud-layout/restore", {
        method: "POST",
        body: JSON.stringify({
          revision,
          expectedDraftRevision: draftRef.current.draftRevision ?? 0,
        }),
      });
      const next = (data.draft as HudLayoutDocument) || emptyDraft();
      applyServerDraft(next);
      onMessage(data.message || `Rascunho restaurado da rev ${revision}`);
    });
  }

  function confirmAsk(next: HudAsk) {
    return new Promise<boolean>((resolve) => {
      askResolveRef.current = resolve;
      setAsk(next);
    });
  }

  function settleAsk(ok: boolean) {
    const resolve = askResolveRef.current;
    askResolveRef.current = null;
    setAsk(null);
    resolve?.(ok);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!working && dirty) void onSaveDraft();
        return;
      }
      if (meta && e.key.toLowerCase() === "z") {
        if (typing) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (typing || mode !== "edit" || !selectedId) return;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 8 : 1;
        const cur = resolvedProps(draftRef.current, selectedId, breakpoint);
        if (layoutMode === "free" || cur.position === "absolute") {
          if (!nudgeOriginRef.current) {
            nudgeOriginRef.current = editableSlice(draftRef.current);
          }
          const left = Number.parseFloat(String(cur.left || "0")) || 0;
          const top = Number.parseFloat(String(cur.top || "0")) || 0;
          let nextLeft = left;
          let nextTop = top;
          if (e.key === "ArrowLeft") nextLeft -= step;
          if (e.key === "ArrowRight") nextLeft += step;
          if (e.key === "ArrowUp") nextTop -= step;
          if (e.key === "ArrowDown") nextTop += step;
          const next = mergeComponentProps(
            draftRef.current,
            selectedId,
            {
              position: "absolute",
              left: `${Math.round(nextLeft)}px`,
              top: `${Math.round(nextTop)}px`,
            },
            breakpoint,
          );
          suppressSyncRef.current = false;
          setDraft(next);
          markDirtyFromDoc(next);
          postToHud({
            type: "jogo-idle:hud-builder-patch",
            id: selectedId,
            props: {
              position: "absolute",
              left: `${Math.round(nextLeft)}px`,
              top: `${Math.round(nextTop)}px`,
            },
            breakpoint,
          });
        } else {
          if (!nudgeOriginRef.current) {
            nudgeOriginRef.current = editableSlice(draftRef.current);
          }
          const mt = Number.parseFloat(String(cur.marginTop || "0")) || 0;
          const ml = Number.parseFloat(String(cur.marginLeft || "0")) || 0;
          let nextMt = mt;
          let nextMl = ml;
          if (e.key === "ArrowUp") nextMt -= step;
          if (e.key === "ArrowDown") nextMt += step;
          if (e.key === "ArrowLeft") nextMl -= step;
          if (e.key === "ArrowRight") nextMl += step;
          const props = {
            marginTop: `${Math.round(nextMt)}px`,
            marginLeft: `${Math.round(nextMl)}px`,
          };
          const next = mergeComponentProps(draftRef.current, selectedId, props, breakpoint);
          setDraft(next);
          markDirtyFromDoc(next);
          postToHud({
            type: "jogo-idle:hud-builder-patch",
            id: selectedId,
            props,
            breakpoint,
          });
        }
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      if (nudgeOriginRef.current) {
        setPast((p) => [...p.slice(-49), nudgeOriginRef.current!]);
        setFuture([]);
        nudgeOriginRef.current = null;
      }
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [breakpoint, dirty, layoutMode, markDirtyFromDoc, mode, postToHud, selectedId, working]);

  useEffect(() => {
    onStatus?.({ dirty });
  }, [dirty, onStatus]);

  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 1100px)");
    if (narrow.matches) {
      setLayersOpen(false);
      setInspectorOpen(false);
    }
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const measure = () => {
      const pad = 36;
      const next = Math.min((el.clientWidth - pad) / preset.w, (el.clientHeight - pad) / preset.h);
      if (!Number.isFinite(next)) return;
      setFitScale(Math.max(0.2, Math.min(1, next)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [preset.w, preset.h, layersOpen, inspectorOpen]);

  apiRef.current.save = onSaveDraft;
  apiRef.current.discard = async () => {
    await loadDraft();
  };
  useImperativeHandle(ref, () => ({
    save: () => apiRef.current.save(),
    discard: () => apiRef.current.discard(),
  }), []);

  const tree = useMemo(() => buildHudLayerTree(), []);
  const selected = selectedId ? getHudComponent(selectedId) : null;
  const props = selectedId ? resolvedProps(draft, selectedId, breakpoint) : {};
  const isAbsolute = props.position === "absolute";

  const filteredTree = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tree;
    return tree
      .map((root) => {
        const children = root.children.filter(
          (c) => c.label.toLowerCase().includes(q) || c.id.includes(q),
        );
        const rootMatch = root.label.toLowerCase().includes(q) || root.id.includes(q);
        if (!rootMatch && !children.length) return null;
        return { ...root, children: rootMatch ? root.children : children };
      })
      .filter(Boolean) as Array<HudComponentDef & { children: HudComponentDef[] }>;
  }, [tree, query]);

  function fieldValue(key: keyof HudStyleProps): string {
    const v = props[key];
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "string") return v;
    return (computed?.[key as string] as string) || "";
  }

  function onFieldBlur(key: keyof HudStyleProps, raw: string) {
    const trimmed = raw.trim();
    if (!selectedId) return;
    if (!trimmed) {
      const next = structuredClone(draft);
      const entry = next.components[selectedId] || { base: {} };
      if (breakpoint === "desktop") {
        delete (entry.base as Record<string, unknown>)[key];
      } else {
        entry.overrides = entry.overrides || {};
        const ov = { ...(entry.overrides[breakpoint] || {}) };
        delete (ov as Record<string, unknown>)[key];
        entry.overrides[breakpoint] = ov;
      }
      next.components[selectedId] = entry;
      commitDraft(next, { sync: true });
      return;
    }
    patchSelected({ [key]: trimmed } as HudStyleProps);
  }

  const scale = zoom == null ? fitScale : zoom;

  const phaseLabel = working ? "Salvando" : dirty ? "Não salvo" : "Salvo";

  return (
    <div className={`hud ${layersOpen ? "" : "is-layers-closed"} ${inspectorOpen ? "" : "is-inspector-closed"}`}>
      <header className="hud-top">
        <div>
          <p className="ed-kicker">Interface</p>
          <h2>{draft.name || "HUD"}</h2>
        </div>
        <StudioBadge tone={dirty ? "warn" : "ok"}>{phaseLabel}</StudioBadge>
        <span className="hud-pub">
          {publishedRevision != null ? `Publicado · rev ${publishedRevision}` : "Nada publicado"}
          {dirty ? "" : ` · rascunho ${draft.draftRevision ?? 0}`}
        </span>
        <div className="hud-top__actions">
          <StudioBtn type="button" title={layersOpen ? "Recolher componentes" : "Mostrar componentes"} onClick={() => setLayersOpen((v) => !v)}>
            Componentes
          </StudioBtn>
          <StudioBtn type="button" title={inspectorOpen ? "Recolher inspetor" : "Mostrar inspetor"} onClick={() => setInspectorOpen((v) => !v)}>
            Inspetor
          </StudioBtn>
          <StudioBtn type="button" disabled={working} onClick={() => setAsk({ kind: "restore-default" })}>
            Restaurar padrão
          </StudioBtn>
          <StudioBtn variant={dirty ? "gold" : "default"} type="button" disabled={working || !dirty} onClick={() => void onSaveDraft()}>
            Salvar rascunho
          </StudioBtn>
          <StudioBtn
            variant={!dirty ? "gold" : "default"}
            type="button"
            disabled={working || dirty}
            title={dirty ? "Salve o rascunho antes de publicar" : "Publicar para os jogadores"}
            onClick={requestPublish}
          >
            Publicar
          </StudioBtn>
        </div>
      </header>

      <div className="hud-body">
        <aside className="hud-side">
          {layersOpen ? (
            <>
              <div className="hud-side__head">
                <span>Componentes</span>
                <input className="studio-2-input" placeholder="Buscar" aria-label="Buscar componente" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              {filteredTree.length === 0 ? <StudioEmpty>Nenhum componente com essa busca.</StudioEmpty> : (
                <ul className="hud-tree">
                  {filteredTree.map((root) => {
                    const isCollapsed = collapsed[root.id];
                    return (
                      <li key={root.id}>
                        <button type="button" className={`hud-node ${selectedId === root.id ? "is-selected" : ""}`} onClick={() => selectComponent(root.id)}>
                          <span
                            className={`hud-twisty ${isCollapsed ? "is-collapsed" : ""}`}
                            role="button"
                            aria-label={isCollapsed ? "Expandir" : "Recolher"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCollapsed((c) => ({ ...c, [root.id]: !c[root.id] }));
                            }}
                          >
                            {root.children.length ? <StudioIcon name="chevron" /> : null}
                          </span>
                          {root.label}
                        </button>
                        {!isCollapsed
                          ? root.children.map((child) => (
                              <button
                                key={child.id}
                                type="button"
                                className={`hud-node is-child ${selectedId === child.id ? "is-selected" : ""}`}
                                onClick={() => selectComponent(child.id)}
                              >
                                {child.label}
                              </button>
                            ))
                          : null}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="ed-note">{HUD_COMPONENTS.length} componentes</p>
            </>
          ) : (
            <button type="button" className="hud-rail" onClick={() => setLayersOpen(true)}>Componentes</button>
          )}
        </aside>

        <div className="hud-stage" ref={canvasRef}>
          <div className="hud-frame" style={{ width: preset.w * scale, height: preset.h * scale }}>
            <iframe
              ref={iframeRef}
              title="HUD Builder — pré-visualização"
              src="/jogo-idle/play.html?hudBuilder=1"
              className="hud-iframe"
              style={{ width: preset.w, height: preset.h, transform: `scale(${scale})`, transformOrigin: "top left" }}
            />
          </div>
          <p className="hud-hint">
            {ready ? `${preset.label} · breakpoint ${breakpoint} · zoom ${Math.round(scale * 100)}% · o zoom não grava posição` : "Carregando HUD…"}
          </p>
        </div>

        <aside className="hud-side hud-inspector">
          {inspectorOpen ? (
            <>
          <StudioFormSection title="Revisões" defaultOpen={false}>
            <p className="mb-2 text-[0.65rem] text-[var(--studio-muted)]">
              Publicado: rev {publishedRevision ?? "—"} · Rascunho: {draft.draftRevision ?? 0}
              {dirty ? " · alterações não salvas" : ""}
            </p>
            {historyEntries.length ? (
              <ul className="mb-2 max-h-28 space-y-1 overflow-auto text-[0.7rem]">
                {historyEntries.map((h) => (
                  <li key={h.revision} className="flex items-center justify-between gap-1">
                    <span>
                      rev {h.revision} · {h.name || "HUD"}
                    </span>
                    <StudioBtn
                      type="button"
                      disabled={working}
                      onClick={() => setAsk({ kind: "restore-revision", revision: h.revision })}
                    >
                      Restaurar
                    </StudioBtn>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-2 text-[0.65rem] text-[var(--studio-muted)]">Sem histórico ainda.</p>
            )}
          </StudioFormSection>
          <StudioFormSection title="Tokens visuais" defaultOpen={false}>
            <StudioField label={`Preenchimento raridade (${draft.tokens?.slotRarityFillMix ?? DEFAULT_SLOT_RARITY_FILL_MIX}%)`}>
              <input
                className="studio-2-input"
                type="range"
                min={0}
                max={60}
                step={1}
                value={draft.tokens?.slotRarityFillMix ?? DEFAULT_SLOT_RARITY_FILL_MIX}
                onChange={(e) => {
                  const slotRarityFillMix = Math.max(
                    0,
                    Math.min(60, Number(e.target.value) || 0),
                  );
                  const next = structuredClone(draft);
                  next.tokens = { ...(next.tokens || {}), slotRarityFillMix };
                  commitDraft(next, { sync: true });
                  try {
                    const win = iframeRef.current?.contentWindow as
                      | (Window & { JogoIdleHudLayout?: { setTokens?: (t: object) => void } })
                      | null;
                    win?.JogoIdleHudLayout?.setTokens?.({ slotRarityFillMix });
                  } catch {
                    /* preview offline */
                  }
                }}
              />
            </StudioField>
            <p className="text-[0.62rem] text-[var(--studio-muted)]">
              Intensidade do fundo colorido do slot conforme a raridade (0–60%).
            </p>
          </StudioFormSection>
          <StudioFormSection title="Transições e Animações" defaultOpen={false}>
            {(() => {
              const intro = {
                ...DEFAULT_HUD_INTRO_TOKENS,
                ...(draft.tokens?.intro || {}),
              };
              const patchIntro = (partial: Partial<typeof DEFAULT_HUD_INTRO_TOKENS>) => {
                const next = structuredClone(draft);
                const merged = { ...intro, ...partial };
                next.tokens = { ...(next.tokens || {}), intro: merged };
                commitDraft(next, { sync: true });
                try {
                  const win = iframeRef.current?.contentWindow as
                    | (Window & { JogoIdleHudLayout?: { setTokens?: (t: object) => void } })
                    | null;
                  win?.JogoIdleHudLayout?.setTokens?.({ intro: merged });
                } catch {
                  /* preview offline */
                }
              };
              return (
                <>
                  <StudioField label="Intro ao entrar no jogo">
                    <label className="flex items-center gap-2 text-[0.75rem]">
                      <input
                        type="checkbox"
                        checked={intro.enabled}
                        onChange={(e) => patchIntro({ enabled: e.target.checked })}
                      />
                      Ativar intro cinematográfica
                    </label>
                  </StudioField>
                  <StudioField label={`Fade do cenário (${intro.fadeMs} ms)`}>
                    <input
                      className="studio-2-input"
                      type="range"
                      min={100}
                      max={3000}
                      step={50}
                      value={intro.fadeMs}
                      disabled={!intro.enabled}
                      onChange={(e) => patchIntro({ fadeMs: Number(e.target.value) || 500 })}
                    />
                  </StudioField>
                  <StudioField label={`Cartão de título (${intro.titleMs} ms)`}>
                    <input
                      className="studio-2-input"
                      type="range"
                      min={0}
                      max={5000}
                      step={50}
                      value={intro.titleMs}
                      disabled={!intro.enabled}
                      onChange={(e) => patchIntro({ titleMs: Number(e.target.value) || 0 })}
                    />
                  </StudioField>
                  <StudioField label={`Queda da HUD (${intro.hudMs} ms)`}>
                    <input
                      className="studio-2-input"
                      type="range"
                      min={100}
                      max={3000}
                      step={50}
                      value={intro.hudMs}
                      disabled={!intro.enabled}
                      onChange={(e) => patchIntro({ hudMs: Number(e.target.value) || 700 })}
                    />
                  </StudioField>
                  <StudioField label={`Offset Y da HUD (${intro.offsetY} px)`}>
                    <input
                      className="studio-2-input"
                      type="range"
                      min={-200}
                      max={0}
                      step={5}
                      value={intro.offsetY}
                      disabled={!intro.enabled}
                      onChange={(e) => patchIntro({ offsetY: Number(e.target.value) || -80 })}
                    />
                  </StudioField>
                  <StudioField label="Easing CSS">
                    <input
                      className="studio-2-input"
                      type="text"
                      value={intro.easing}
                      disabled={!intro.enabled}
                      onChange={(e) => patchIntro({ easing: e.target.value })}
                    />
                  </StudioField>
                  <StudioField label="Conteúdo">
                    <label className="mb-1 flex items-center gap-2 text-[0.75rem]">
                      <input
                        type="checkbox"
                        checked={intro.showChapterName}
                        disabled={!intro.enabled}
                        onChange={(e) => patchIntro({ showChapterName: e.target.checked })}
                      />
                      Mostrar nome do capítulo
                    </label>
                    <label className="mb-1 flex items-center gap-2 text-[0.75rem]">
                      <input
                        type="checkbox"
                        checked={intro.showRegionName}
                        disabled={!intro.enabled}
                        onChange={(e) => patchIntro({ showRegionName: e.target.checked })}
                      />
                      Mostrar região
                    </label>
                    <label className="flex items-center gap-2 text-[0.75rem]">
                      <input
                        type="checkbox"
                        checked={intro.allowSkip}
                        disabled={!intro.enabled}
                        onChange={(e) => patchIntro({ allowSkip: e.target.checked })}
                      />
                      Permitir pular
                    </label>
                  </StudioField>
                  <p className="text-[0.62rem] text-[var(--studio-muted)]">
                    A intro roda só em play.html (não no preview do Builder). Fundos vêm do catálogo de capítulos.
                  </p>
                </>
              );
            })()}
          </StudioFormSection>
          {selected ? (
            <>
              <h3 className="studio-2-section-title">{selected.label}</h3>
              <p className="mb-2 text-[0.65rem] text-[var(--studio-muted)]">
                <code>{selected.id}</code> · {breakpoint} · {layoutMode}
                {isAbsolute ? " · absolute" : ""}
              </p>
              {isAbsolute ? (
                <StudioBtn type="button" className="mb-2" onClick={returnToFlow}>
                  Voltar ao fluxo
                </StudioBtn>
              ) : null}
              <StudioFormSection title="Layout">
                {(
                  [
                    ["width", "Largura"],
                    ["height", "Altura"],
                    ["left", "X (left)"],
                    ["top", "Y (top)"],
                    ["order", "Order"],
                    ["zIndex", "Z-Index"],
                    ["minWidth", "Larg. mín."],
                    ["minHeight", "Alt. mín."],
                    ["marginTop", "Margem topo"],
                    ["marginLeft", "Margem esq."],
                    ["paddingTop", "Pad. topo"],
                    ["paddingRight", "Pad. dir."],
                    ["paddingBottom", "Pad. base"],
                    ["paddingLeft", "Pad. esq."],
                    ["gap", "Gap"],
                  ] as const
                )
                  .filter(([key]) => {
                    if (key === "left" || key === "top" || key === "zIndex") {
                      return isAbsolute || layoutMode === "free";
                    }
                    return selected.editableProps.includes(key);
                  })
                  .map(([key, label]) => (
                    <StudioField key={key} label={label}>
                      <input
                        className="studio-2-input"
                        defaultValue={fieldValue(key)}
                        key={`${selectedId}-${breakpoint}-${key}-${fieldValue(key)}`}
                        placeholder={key === "order" ? "0" : "ex.: 320px"}
                        onBlur={(e) => onFieldBlur(key, e.target.value)}
                      />
                    </StudioField>
                  ))}
              </StudioFormSection>
            </>
          ) : (
            <p className="ed-note">Selecione um componente. Arraste para mover e use as alças para redimensionar.</p>
          )}
            </>
          ) : (
            <button type="button" className="hud-rail" onClick={() => setInspectorOpen(true)}>Inspetor</button>
          )}
        </aside>
      </div>

      <footer className="hud-bar">
        <div className="hud-bar__group">
        <label>
          Resolução
          <select className="studio-2-select" value={presetId} aria-label="Resolução do preview" onChange={(e) => setPresetId(e.target.value)}>
            {VIEWPORT_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
        <label>
          Zoom
          <select
            className="studio-2-select"
            aria-label="Zoom da visualização"
            value={zoom == null ? "fit" : String(zoom)}
            onChange={(e) => setZoom(e.target.value === "fit" ? null : Number(e.target.value))}
          >
            <option value="fit">Enquadrar</option>
            <option value="0.5">50%</option>
            <option value="0.75">75%</option>
            <option value="1">100%</option>
          </select>
        </label>
        <StudioBtn type="button" title="A escala só muda a visualização" onClick={() => setZoom(null)}>Enquadrar</StudioBtn>
        </div>
        <div className="hud-bar__group">
        <StudioBtn type="button" className={layoutMode === "organized" ? "is-on" : ""} title="Reordenar no fluxo" onClick={() => setLayoutMode("organized")}>Organizado</StudioBtn>
        <StudioBtn type="button" className={layoutMode === "free" ? "is-on" : ""} title="Posição absoluta" onClick={() => setLayoutMode("free")}>Livre</StudioBtn>
        </div>
        <div className="hud-bar__group">
        <StudioBtn type="button" className={snapEnabled ? "is-on" : ""} title="Snap na grade e nas bordas" onClick={() => setSnapEnabled((v) => !v)}>Snap</StudioBtn>
        <label>
          Grade
          <select className="studio-2-select" aria-label="Tamanho da grade" value={snapGrid} onChange={(e) => setSnapGrid(Number(e.target.value) || 8)}>
            <option value={4}>4px</option>
            <option value={8}>8px</option>
            <option value={16}>16px</option>
          </select>
        </label>
        </div>
        <div className="hud-bar__group">
        <StudioBtn type="button" className={mode === "edit" ? "is-on" : ""} onClick={() => setMode("edit")}>Editar</StudioBtn>
        <StudioBtn type="button" className={mode === "preview" ? "is-on" : ""} onClick={() => setMode("preview")}>Pré-visualizar</StudioBtn>
        </div>
        <div className="hud-bar__group">
        <StudioBtn type="button" disabled={!past.length} title="Desfazer (Ctrl ou Cmd Z)" onClick={undo}>Desfazer</StudioBtn>
        <StudioBtn type="button" disabled={!future.length} title="Refazer (Ctrl ou Cmd Shift Z)" onClick={redo}>Refazer</StudioBtn>
        </div>
      </footer>

      <StudioModal
        open={ask != null}
        title={
          ask?.kind === "publish" ? "Publicar HUD" :
          ask?.kind === "conflict" ? "Conflito de rascunho" :
          ask?.kind === "restore-default" ? "Restaurar layout padrão" :
          "Restaurar revisão"
        }
        description={
          ask?.kind === "publish"
            ? `Os jogadores passam a ver este rascunho. Revisão publicada esperada: ${publishedRevision ?? 0}. Rascunho: ${draft.draftRevision ?? 0}.`
            : ask?.kind === "conflict"
              ? "Outro administrador salvou o rascunho. Recarregar substitui a edição local pela versão do servidor."
              : ask?.kind === "restore-default"
                ? "O rascunho volta ao layout sem overrides. O layout publicado permanece até uma nova publicação."
                : ask?.kind === "restore-revision"
                  ? `A revisão ${ask.revision} entra no rascunho. O layout publicado permanece até você publicar de novo.`
                  : undefined
        }
        busy={working}
        dismissable={!working}
        onClose={() => {
          if (working) return;
          if (ask?.kind === "conflict") settleAsk(false);
          else setAsk(null);
        }}
        footer={
          <>
            <StudioBtn type="button" disabled={working} onClick={() => (ask?.kind === "conflict" ? settleAsk(false) : setAsk(null))}>Cancelar</StudioBtn>
            <StudioBtn
              variant={ask?.kind === "restore-default" || ask?.kind === "restore-revision" ? "danger" : "gold"}
              type="button"
              loading={working}
              onClick={() => {
                if (ask?.kind === "conflict") settleAsk(true);
                else if (ask?.kind === "publish") void doPublish();
                else if (ask?.kind === "restore-default") void doRestoreDefault();
                else if (ask?.kind === "restore-revision") void doRestoreRevision(ask.revision);
              }}
            >
              {ask?.kind === "conflict" ? "Recarregar servidor" : ask?.kind === "publish" ? "Publicar" : "Restaurar"}
            </StudioBtn>
          </>
        }
      />
    </div>
  );
});
