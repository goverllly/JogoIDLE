"use client";

import { RefObject, useCallback, useEffect, useState } from "react";

export type PreviewItemPayload = {
  visual?: string | null;
  rarity?: string;
  name?: string;
};

export type PreviewMonsterPayload = {
  visualId?: string | null;
  name?: string;
};

export function useAdminPreviewBridge(iframeRef: RefObject<HTMLIFrameElement | null>) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "jogo-idle:admin-preview-ready") {
        setReady(true);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const post = useCallback(
    (mode: "item" | "monster", payload: PreviewItemPayload | PreviewMonsterPayload) => {
      const win = iframeRef.current?.contentWindow;
      if (!win || !ready) return;
      win.postMessage(
        { type: "jogo-idle:admin-preview", mode, payload },
        window.location.origin,
      );
    },
    [iframeRef, ready],
  );

  const showItem = useCallback(
    (payload: PreviewItemPayload) => post("item", payload),
    [post],
  );

  const showMonster = useCallback(
    (payload: PreviewMonsterPayload) => post("monster", payload),
    [post],
  );

  return { ready, showItem, showMonster };
}
