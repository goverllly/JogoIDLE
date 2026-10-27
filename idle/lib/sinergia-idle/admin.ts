/** Admin do Sinergia IDLE — allowlist explícita por e-mail (server-side). */
/** Standalone local: sempre inclui o usuário local. */
export const SINERGIA_IDLE_ADMIN_EMAILS = [
  "pedro.troglio@totvs.com.br",
  "local@idle.local",
] as const;

function envAdminEmails(): string[] {
  const raw = process.env.SINERGIA_IDLE_ADMIN_EMAILS;
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Lista efetiva: constantes do repo ∪ CSV em `SINERGIA_IDLE_ADMIN_EMAILS`. */
export function listSinergiaIdleAdminEmails(): string[] {
  const set = new Set<string>([
    ...(SINERGIA_IDLE_ADMIN_EMAILS as readonly string[]).map((e) => e.toLowerCase()),
    ...envAdminEmails(),
  ]);
  return [...set];
}

export function isSinergiaIdleAdmin(email: string | null | undefined): boolean {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  return listSinergiaIdleAdminEmails().includes(normalized);
}
