import { StudioEmpty } from "./studio/studio-ui";

export function AdminAdminsPanel({ emails }: { emails: string[] }) {
  return (
    <div className="ops">
      <header className="ops-head">
        <div>
          <p className="ed-kicker">Sistema</p>
          <h2>Administradores</h2>
        </div>
      </header>
      <section className="ops-panel">
        <div className="ops-panel__head">
          <h3>Allowlist</h3>
          <p>Somente leitura. O acesso é a lista do repositório mais JOGO_IDLE_ADMIN_EMAILS. Não há cadastro de administradores nesta interface.</p>
        </div>
        {emails.length === 0 ? <StudioEmpty>Nenhum e-mail na allowlist.</StudioEmpty> : (
          <ul className="ops-activity">
            {emails.map((email) => (
              <li key={email}><strong>{email}</strong><span>admin</span></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
