
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export { StudioModal } from "./studio-modal";

export function StudioCard({
  label,
  value,
  hint,
  className,
  children,
}: {
  label?: string;
  value?: ReactNode;
  hint?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("studio-2-card", className)}>
      {label ? <div className="studio-2-card__label">{label}</div> : null}
      {value != null ? <div className="studio-2-card__value">{value}</div> : null}
      {hint ? <div className="studio-2-card__hint">{hint}</div> : null}
      {children}
    </div>
  );
}

export function StudioTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="studio-2-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className={cn("studio-2-tab", active === t.id && "is-active")}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function StudioEmpty({ children }: { children: ReactNode }) {
  return <div className="studio-2-empty">{children}</div>;
}

export function StudioBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "ok" | "warn";
}) {
  return (
    <span
      className={cn(
        "studio-2-badge",
        tone === "ok" && "studio-2-badge--ok",
        tone === "warn" && "studio-2-badge--warn",
      )}
    >
      {children}
    </span>
  );
}

export function StudioBtn({
  children,
  variant = "default",
  className,
  loading = false,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "gold" | "danger";
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "studio-2-btn",
        variant === "gold" && "studio-2-btn--gold",
        variant === "danger" && "studio-2-btn--danger",
        loading && "is-loading",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="studio-3-spinner" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function StudioField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("studio-2-field", className)}>
      <label className="studio-2-label">{label}</label>
      {children}
    </div>
  );
}

export function StudioFormSection({
  title,
  children,
  className,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cn("studio-2-form-section", className, open ? "is-open" : "is-closed")}>
      <button type="button" className="studio-2-form-section__title" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {title}
      </button>
      {open ? <div className="studio-2-form-section__body">{children}</div> : null}
    </section>
  );
}

export function StudioToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("studio-2-toolbar", className)}>{children}</div>;
}

export function StudioCatalog({
  head,
  children,
  className,
}: {
  head?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("studio-2-catalog", className)}>
      {head ? <div className="studio-2-catalog__head">{head}</div> : null}
      <div className="studio-2-catalog__list">{children}</div>
    </div>
  );
}

export function StudioInspector({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside className={cn("studio-2-inspector", className)}>
      {title ? <h3 className="studio-2-section-title">{title}</h3> : null}
      {children}
    </aside>
  );
}

export function StudioToolBtn({
  active,
  disabled,
  title,
  children,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={cn("studio-2-tool", active && "is-active")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
