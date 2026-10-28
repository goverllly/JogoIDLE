import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  StudioField,
  StudioFormSection,
  StudioToolbar,
  StudioToolBtn,
} from "./studio/studio-ui";

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
  run: (action: () => Promise<void>) => Promise<void>;
};

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

export function AdminHudBuilder({ working, idleFetch, onMessage, run }: AdminHudBuilderProps) {
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
      if (!trusted.ok) {
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
      } else {
        data = trusted.data;
        if (trusted.seq > 0) lastBridgeSeqRef.current = trusted.seq;
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
    await run(async () => {
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
          const reload = window.confirm(
            "Conflito de rascunho (outro admin salvou). Recarregar a versão do servidor? (Cancelar mantém sua edição local suja.)",
          );
          if (reload) await loadDraft();
          throw err;
        }
        throw err;
      }
    });
  }

  async function onPublish() {
    if (dirty) {
      onMessage("Salve o rascunho antes de publicar.");
      return;
    }
    if (
      !window.confirm(
        `Publicar a HUD atual para todos os jogadores?\nRevisão publicada esperada: ${publishedRevision ?? 0}\nRascunho: ${draft.draftRevision ?? 0}`,
      )
    ) {
      return;
    }
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

  async function onRestoreDefault() {
    if (!window.confirm("Restaurar o rascunho ao layout padrão (sem overrides)? O publicado não muda."))
      return;
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

  async function onRestoreRevision(revision: number) {
    if (
      !window.confirm(
        `Restaurar a rev ${revision} no rascunho? O layout publicado permanece até você publicar de novo.`,
      )
    ) {
      return;
    }
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

  const scale = Math.min(1, 1100 / preset.w);

  return (
    <div className="studio-2-hud">
      <StudioToolbar>
        <strong className="text-sm text-[var(--studio-ink)]">{draft.name}</strong>
        <StudioBadge tone={dirty ? "warn" : "ok"}>
          {dirty ? "Não salvo" : draft.status === "draft" ? "Rascunho" : draft.status}
        </StudioBadge>
        {publishedRevision != null ? (
          <span className="text-[0.65rem] text-[var(--studio-muted)]">
            Publicado rev {publishedRevision}
          </span>
        ) : (
          <span className="text-[0.65rem] text-[var(--studio-muted)]">Nada publicado</span>
        )}
        <div className="mx-1 h-5 w-px bg-[var(--studio-line)]" aria-hidden />
        <select
          className="studio-2-select max-w-[140px]"
          value={presetId}
          onChange={(e) => setPresetId(e.target.value)}
          aria-label="Resolução"
        >
          {VIEWPORT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <StudioToolBtn
          active={layoutMode === "organized"}
          onClick={() => setLayoutMode("organized")}
          title="Layout inteligente — reordenar no fluxo"
        >
          Organizado
        </StudioToolBtn>
        <StudioToolBtn
          active={layoutMode === "free"}
          onClick={() => setLayoutMode("free")}
          title="Posicionamento absoluto livre"
        >
          Livre
        </StudioToolBtn>
        <StudioToolBtn
          active={snapEnabled}
          onClick={() => setSnapEnabled((v) => !v)}
          title="Snap na grade e bordas"
        >
          Snap
        </StudioToolBtn>
        <select
          className="studio-2-select max-w-[72px]"
          value={snapGrid}
          onChange={(e) => setSnapGrid(Number(e.target.value) || 8)}
          aria-label="Grade"
          title="Tamanho da grade"
        >
          <option value={4}>4px</option>
          <option value={8}>8px</option>
          <option value={16}>16px</option>
        </select>
        <StudioToolBtn active={mode === "edit"} onClick={() => setMode("edit")} title="Editar">
          Editar
        </StudioToolBtn>
        <StudioToolBtn
          active={mode === "preview"}
          onClick={() => setMode("preview")}
          title="Pré-visualizar"
        >
          Pré-visualizar
        </StudioToolBtn>
        <StudioToolBtn disabled={!past.length} onClick={undo} title="Desfazer (⌘Z)">
          Desfazer
        </StudioToolBtn>
        <StudioToolBtn disabled={!future.length} onClick={redo} title="Refazer (⌘⇧Z)">
          Refazer
        </StudioToolBtn>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <StudioBtn type="button" disabled={working} onClick={() => void onRestoreDefault()}>
            Restaurar
          </StudioBtn>
          <StudioBtn
            variant="gold"
            type="button"
            disabled={working || !dirty}
            onClick={() => void onSaveDraft()}
          >
            Salvar Rascunho
          </StudioBtn>
          <StudioBtn
            type="button"
            disabled={working || dirty}
            title={dirty ? "Salve o rascunho antes de publicar" : "Publicar para jogadores"}
            onClick={() => void onPublish()}
          >
            Publicar
          </StudioBtn>
        </div>
      </StudioToolbar>

      <div className="studio-2-hud__body">
        <aside className="studio-2-hud__layers">
          <div className="studio-2-hud__layers-head">
            <span className="studio-2-label">Componentes</span>
            <input
              className="studio-2-input"
              placeholder="Buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul className="studio-2-hud__tree">
            {filteredTree.map((root) => {
              const isCollapsed = collapsed[root.id];
              return (
                <li key={root.id}>
                  <button
                    type="button"
                    className={`studio-2-hud__node ${selectedId === root.id ? "is-selected" : ""}`}
                    onClick={() => selectComponent(root.id)}
                  >
                    <span
                      className="studio-2-hud__twisty"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCollapsed((c) => ({ ...c, [root.id]: !c[root.id] }));
                      }}
                    >
                      {root.children.length ? (isCollapsed ? "▸" : "▾") : "·"}
                    </span>
                    {root.label}
                  </button>
                  {!isCollapsed
                    ? root.children.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          className={`studio-2-hud__node studio-2-hud__node--child ${
                            selectedId === child.id ? "is-selected" : ""
                          }`}
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
          <p className="mt-2 text-[0.62rem] text-[var(--studio-muted)]">
            {HUD_COMPONENTS.length} componentes · Fase 2
          </p>
        </aside>

        <div className="studio-2-hud__canvas">
          <div
            className="studio-2-hud__frame"
            style={{
              width: preset.w * scale,
              height: preset.h * scale,
            }}
          >
            <iframe
              ref={iframeRef}
              title="HUD Builder — pré-visualização"
              src={`/jogo-idle/play.html?hudBuilder=1`}
              className="studio-2-hud__iframe"
              style={{
                width: preset.w,
                height: preset.h,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            />
          </div>
          {!ready ? (
            <p className="studio-2-hud__loading">Carregando HUD…</p>
          ) : (
            <p className="studio-2-hud__hint">
              Arraste painéis · 8 alças de resize · ESC cancela · Snap {snapEnabled ? "on" : "off"} ·
              Escala {Math.round(scale * 100)}%
            </p>
          )}
        </div>

        <aside className="studio-2-hud__inspector">
          <StudioFormSection title="Revisões">
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
                      onClick={() => void onRestoreRevision(h.revision)}
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
          <StudioFormSection title="Tokens visuais">
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
          <StudioFormSection title="Transições e Animações">
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
            <p className="text-[0.75rem] text-[var(--studio-muted)]">
              Selecione um componente. Arraste para mover; use as alças para redimensionar.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
