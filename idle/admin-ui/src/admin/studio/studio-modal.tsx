import { ReactNode, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

type StudioModalProps = {
  open: boolean;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  dismissable?: boolean;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  footer?: ReactNode;
  children?: ReactNode;
};

export function StudioModal({
  open,
  title,
  description,
  size = "sm",
  dismissable = true,
  busy = false,
  error,
  onClose,
  footer,
  children,
}: StudioModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previously = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    (focusable?.[0] || panel)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissable && !busy) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !focusable?.length) return;
      const list = [...focusable];
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previously?.focus?.();
    };
  }, [open, dismissable, busy, onClose]);

  if (!open) return null;

  return (
    <div className="studio-3-modal" role="presentation">
      <button
        type="button"
        className="studio-3-modal__backdrop"
        aria-label="Fechar"
        disabled={!dismissable || busy}
        onClick={() => dismissable && !busy && onClose()}
      />
      <div
        ref={panelRef}
        className={cn("studio-3-modal__panel", `studio-3-modal__panel--${size}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
      >
        <header className="studio-3-modal__head">
          <h2 id={titleId} className="studio-3-modal__title">
            {title}
          </h2>
          {description ? (
            <p id={descId} className="studio-3-modal__desc">
              {description}
            </p>
          ) : null}
        </header>
        {children ? <div className="studio-3-modal__body">{children}</div> : null}
        {error ? <p className="studio-3-modal__error">{error}</p> : null}
        {footer ? <footer className="studio-3-modal__foot">{footer}</footer> : null}
      </div>
    </div>
  );
}
