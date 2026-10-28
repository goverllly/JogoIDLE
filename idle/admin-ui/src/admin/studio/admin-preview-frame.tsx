
import { RefObject } from "react";
import { cn } from "@/lib/utils";

type AdminPreviewFrameProps = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  title?: string;
  className?: string;
  ready?: boolean;
};

export function AdminPreviewFrame({
  iframeRef,
  title = "Preview 3D",
  className,
  ready,
}: AdminPreviewFrameProps) {
  return (
    <div
      className={cn(
        "idle-admin-preview relative min-h-[240px] overflow-hidden rounded-xl shadow-inner",
        "aspect-square sm:min-h-[280px] lg:min-h-0 lg:aspect-auto lg:h-full",
        className,
      )}
    >
      <iframe
        ref={iframeRef}
        title={title}
        src="/jogo-idle/admin-studio/preview.html"
        className="absolute inset-0 h-full w-full border-0"
      />
      {!ready ? (
        <div className="idle-admin-preview__empty pointer-events-none absolute inset-0 grid place-items-center text-xs">
          Carregando preview…
        </div>
      ) : null}
      <div className="idle-admin-preview__badge pointer-events-none absolute left-2 top-2 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
        3D
      </div>
    </div>
  );
}
