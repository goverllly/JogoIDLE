import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_GROUPS, type AdminNavGroupId } from "./admin-types";
import { StudioIcon } from "./studio/studio-icons";
import "./studio/studio-3.css";

export type AdminNavTab = {
  id: string;
  label: string;
  section?: "manage" | "tools";
  group?: AdminNavGroupId;
  disabled?: boolean;
  title?: string;
};

type GrantTarget = {
  id: string;
  name: string;
  className: string;
  level: number;
  gold: number;
  userName?: string;
  userEmail?: string | null;
  lastSeenAt?: string | null;
};

type SaveState = "dirty" | "saving" | "error" | null;

type AdminShellProps = {
  tabs: readonly AdminNavTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  title: string;
  subtitle?: string;
  target: GrantTarget | null;
  targetId: string;
  activeCharacters: GrantTarget[];
  onTargetChange: (id: string) => void;
  children: ReactNode;
  message?: ReactNode;
  error?: ReactNode;
  onDismissMessage?: () => void;
  onDismissError?: () => void;
  adminLabel?: string;
  maintenanceEnabled?: boolean;
  saveState?: SaveState;
  onOpenMaintenance?: () => void;
  onLobbyClick?: () => void;
};

const COMPACT_KEY = "jogo-idle-admin-sidebar-compact";

export function AdminShell({
  tabs,
  activeTab,
  onTabChange,
  title,
  subtitle,
  target,
  targetId,
  activeCharacters,
  onTargetChange,
  children,
  message,
  error,
  onDismissMessage,
  onDismissError,
  adminLabel,
  maintenanceEnabled,
  saveState,
  onOpenMaintenance,
  onLobbyClick,
}: AdminShellProps) {
  const active = tabs.find((tab) => tab.id === activeTab);
  const activeGroup = ADMIN_NAV_GROUPS.find((group) => group.id === active?.group);
  const [compact, setCompact] = useState(() => {
    try {
      return localStorage.getItem(COMPACT_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [navOpen, setNavOpen] = useState(false);
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  const dismissMessageRef = useRef(onDismissMessage);
  dismissMessageRef.current = onDismissMessage;

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => dismissMessageRef.current?.(), 4200);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    try {
      localStorage.setItem(COMPACT_KEY, compact ? "1" : "0");
    } catch {
      /* preferência local indisponível */
    }
  }, [compact]);

  useEffect(() => {
    setNavOpen(false);
  }, [activeTab]);

  const selectTab = (id: string, disabled?: boolean) => {
    if (disabled) return;
    onTabChange(id);
  };

  return (
    <div
      className={cn("studio-3", compact && "is-compact", navOpen && "is-nav-open")}
      data-studio="3.0"
    >
      <button
        type="button"
        className="studio-3-backdrop"
        aria-label="Fechar navegação"
        onClick={() => setNavOpen(false)}
      />
      <aside className="studio-3__sidebar" aria-label="Admin Studio">
        <div className="studio-3__brand">
          <span className="studio-3__mark">JI</span>
          <div className="studio-3__brand-copy">
            <p className="studio-3__brand-kicker">Jogo IDLE</p>
            <p className="studio-3__brand-name">Admin Studio</p>
          </div>
        </div>
        <nav className="studio-3__nav">
          {ADMIN_NAV_GROUPS.map((group) => {
            const items = tabs.filter((tab) => (tab.group || "sistema") === group.id);
            if (!items.length) return null;
            const collapsed = closed[group.id] && active?.group !== group.id;
            return (
              <div key={group.id} className={cn("studio-3__group", collapsed && "is-collapsed")}>
                <button
                  type="button"
                  className="studio-3__group-label"
                  aria-expanded={!collapsed}
                  onClick={() => setClosed((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                >
                  {group.label}
                  <StudioIcon name="chevron" className="studio-3__chevron" />
                </button>
                <div className="studio-3__group-items">
                  {items.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      disabled={tab.disabled}
                      title={tab.title || tab.label}
                      className={cn("studio-3__nav-btn", activeTab === tab.id && "is-active")}
                      onClick={() => selectTab(tab.id, tab.disabled)}
                    >
                      <StudioIcon name={tab.id} />
                      <span className="studio-3__nav-text">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="studio-3__side-foot">
          <span>{compact ? "3.0" : "Studio 3.0"}</span>
          <button
            type="button"
            className="studio-3__icon-btn"
            title={compact ? "Expandir menu" : "Recolher menu"}
            aria-label={compact ? "Expandir menu" : "Recolher menu"}
            onClick={() => setCompact((value) => !value)}
          >
            <StudioIcon name="collapse" />
          </button>
        </div>
      </aside>

      <div className="studio-3__body">
        <header className="studio-3__header">
          <div className="studio-3__crumb">
            <p className="studio-3__crumb-kicker">
              {activeGroup?.label || "Admin Studio"}
              {saveState === "dirty" ? " · alterações locais" : ""}
              {saveState === "saving" ? " · salvando" : ""}
              {saveState === "error" ? " · erro ao salvar" : ""}
            </p>
            <h1 className="studio-3__crumb-title">{title}</h1>
          </div>
          <div className="studio-3__header-actions">
            {saveState === "saving" ? (
              <span className="studio-3__status studio-3__status--saving">
                <span className="studio-3-spinner" aria-hidden />
                Salvando
              </span>
            ) : null}
            {saveState === "error" ? (
              <span className="studio-3__status studio-3__status--error">Erro ao salvar</span>
            ) : null}
            {saveState === "dirty" ? (
              <span className="studio-3__status studio-3__status--dirty">Não salvo</span>
            ) : null}
            {maintenanceEnabled ? (
              <button
                type="button"
                className="studio-3__status studio-3__status--alert"
                onClick={onOpenMaintenance}
              >
                Em manutenção
              </button>
            ) : null}
            <div className="studio-3__target">
              <label htmlFor="studio-grant-target">Alvo</label>
              <select
                id="studio-grant-target"
                className="studio-2-select"
                title={target ? `${target.name} · ${target.className}` : "Nenhum personagem"}
                value={targetId}
                onChange={(event) => onTargetChange(event.target.value)}
              >
                {activeCharacters.length === 0 ? (
                  <option value="">Nenhum personagem</option>
                ) : null}
                {activeCharacters.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} · {row.className} · Lv {row.level}
                  </option>
                ))}
              </select>
            </div>
            {adminLabel ? <span className="studio-3__admin">{adminLabel}</span> : null}
            <a
              className="studio-3__lobby"
              href="/jogo-idle/lobby.html"
              onClick={(event) => {
                if (!onLobbyClick) return;
                event.preventDefault();
                onLobbyClick();
              }}
            >
              Lobby
            </a>
            <button
              type="button"
              className="studio-3__icon-btn studio-3__menu"
              aria-label="Abrir navegação"
              onClick={() => setNavOpen(true)}
            >
              <StudioIcon name="menu" />
            </button>
          </div>
        </header>
        {subtitle ? <p className="studio-3__subtitle">{subtitle}</p> : null}
        <div className="studio-3__workspace">{children}</div>
      </div>

      {(message || error) ? (
        <div className="studio-3-toast-stack" role="status">
          {message ? (
            <div className="studio-3-toast">
              <div className="studio-3-toast__body">{message}</div>
              {onDismissMessage ? (
                <button type="button" className="studio-3-toast__close" aria-label="Fechar aviso" onClick={onDismissMessage}>×</button>
              ) : null}
            </div>
          ) : null}
          {error ? (
            <div className="studio-3-toast studio-3-toast--error">
              <div className="studio-3-toast__body">{error}</div>
              {onDismissError ? (
                <button type="button" className="studio-3-toast__close" aria-label="Fechar erro" onClick={onDismissError}>×</button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
