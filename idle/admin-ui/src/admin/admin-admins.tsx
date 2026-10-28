
import { StudioBadge, StudioCard } from "./studio/studio-ui";

type AdminAdminsPanelProps = {
  emails: string[];
};

export function AdminAdminsPanel({ emails }: AdminAdminsPanelProps) {
  return (
    <StudioCard>
      <h3 className="studio-2-section-title">Allowlist administrativa</h3>
      <p className="mb-3 text-[0.78rem] text-[var(--studio-muted)]">
        Acesso ao Studio e às rotas <code>/api/jogo-idle/admin/*</code> é validado no
        servidor via e-mail. Inclui a lista do repositório e o CSV da env{" "}
        <code>JOGO_IDLE_ADMIN_EMAILS</code>. CRUD de admins pela UI: fora do escopo da
        Fase 1.
      </p>
      <ul className="space-y-2">
        {emails.map((email) => (
          <li key={email} className="flex items-center gap-2 text-sm">
            <StudioBadge tone="ok">admin</StudioBadge>
            <span>{email}</span>
          </li>
        ))}
      </ul>
    </StudioCard>
  );
}
