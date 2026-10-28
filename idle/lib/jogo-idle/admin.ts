/** Admin do Jogo IDLE — allowlist explícita por e-mail (server-side). */
/** Standalone local: sempre inclui o usuário local. */
export const JOGO_IDLE_ADMIN_EMAILS = [
  "pedro.troglio@totvs.com.br",
  "local@idle.local",
] as const;

function envAdminEmails(): string[] {
  const raw = process.env.JOGO_IDLE_ADMIN_EMAILS;
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Lista efetiva: constantes do repo ∪ CSV em `JOGO_IDLE_ADMIN_EMAILS`. */
export function listJogoIdleAdminEmails(): string[] {
  const set = new Set<string>([
    ...(JOGO_IDLE_ADMIN_EMAILS as readonly string[]).map((e) => e.toLowerCase()),
    ...envAdminEmails(),
  ]);
  return [...set];
}

export function isJogoIdleAdmin(email: string | null | undefined): boolean {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  return listJogoIdleAdminEmails().includes(normalized);
}
