
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./studio/studio-2.css";

export type AdminNavTab = {
  id: string;
  label: string;
  section?: "manage" | "tools";
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

const TAB_ICONS: Record<string, string> = {
  overview: "◈",
  items: "⚔",
  zones: "▣",
  map: "🗺",
  monsters: "☠",
  loot: "◆",
  economy: "◎",
  season: "◷",
  characters: "♟",
  settings: "⚙",
  simulate: "∑",
  engagement: "⚑",
  backup: "⬡",
  logs: "☰",
  admins: "♛",
};

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
  footerStatus?: ReactNode;
  topActions?: ReactNode;
};

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
  footerStatus,
  topActions,
}: AdminShellProps) {
  const manage = tabs.filter((t) => (t.section || "manage") === "manage");
  const tools = tabs.filter((t) => t.section === "tools");

  return (
    <div className="studio-2" data-studio="2.0">
      <aside className="studio-2__sidebar" aria-label="Admin Studio 2.0">
        <div>
          <p className="studio-2__nav-label">Gerenciamento</p>
          {manage.map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              title={tab.title || tab.label}
              className={cn("studio-2__nav-btn", activeTab === tab.id && "is-active")}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
            >
              <span className="studio-2__nav-ico" aria-hidden>
                {TAB_ICONS[tab.id] || "·"}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
        {tools.length ? (
          <div>
            <p className="studio-2__nav-label">Ferramentas</p>
            {tools.map((tab) => (
              <button
                key={tab.id}
                type="button"
                disabled={tab.disabled}
                title={tab.title || tab.label}
                className={cn("studio-2__nav-btn", activeTab === tab.id && "is-active")}
                onClick={() => !tab.disabled && onTabChange(tab.id)}
              >
                <span className="studio-2__nav-ico" aria-hidden>
                  {TAB_ICONS[tab.id] || "·"}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="studio-2__sidebar-foot">
          {footerStatus || (
            <>
              <span>
                <span className="studio-2__dot" aria-hidden />
                Studio 2.0
              </span>
              <span>Alvo: {target?.name || "—"}</span>
            </>
          )}
        </div>
      </aside>

      <div className="studio-2__main">
        <header className="studio-2__top">
          <div>
            <h1 className="studio-2__title">{title}</h1>
            {subtitle ? <p className="studio-2__subtitle">{subtitle}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="studio-2-label mb-0 text-[0.65rem]" htmlFor="studio-grant-target">
              Alvo ativo
            </label>
            <select
              id="studio-grant-target"
              className="studio-2-select max-w-[220px]"
              value={targetId}
              onChange={(e) => onTargetChange(e.target.value)}
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
            {topActions}
          </div>
        </header>

        {(message || error) && (
          <div className="studio-2__flash space-y-2">
            {message}
            {error}
          </div>
        )}

        <div className="studio-2__workspace">{children}</div>
      </div>
    </div>
  );
}
