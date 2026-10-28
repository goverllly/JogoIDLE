import type { IncomingMessage, ServerResponse } from "node:http";
import type { BootConfig } from "./mode.ts";

export const SID_COOKIE = "jogo_idle_sid";
export const CSRF_COOKIE = "jogo_idle_csrf";

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function cookieAttrs(cfg: BootConfig, httpOnly: boolean, maxAgeSec: number): string {
  const parts = [`Path=/`, `SameSite=Lax`, `Max-Age=${Math.max(0, Math.floor(maxAgeSec))}`];
  if (httpOnly) parts.push("HttpOnly");
  if (cfg.cookieSecure) parts.push("Secure");
  return parts.join("; ");
}

export function setSessionCookies(
  res: ServerResponse,
  cfg: BootConfig,
  opts: { rawToken: string; csrfToken: string; maxAgeSec: number },
) {
  const sid = `${SID_COOKIE}=${encodeURIComponent(opts.rawToken)}; ${cookieAttrs(cfg, true, opts.maxAgeSec)}`;
  const csrf = `${CSRF_COOKIE}=${encodeURIComponent(opts.csrfToken)}; ${cookieAttrs(cfg, false, opts.maxAgeSec)}`;
  const prev = res.getHeader("Set-Cookie");
  const list = Array.isArray(prev) ? prev.map(String) : prev ? [String(prev)] : [];
  list.push(sid, csrf);
  res.setHeader("Set-Cookie", list);
}

export function clearSessionCookies(res: ServerResponse, cfg: BootConfig) {
  const clear = (name: string, httpOnly: boolean) =>
    `${name}=; Path=/; SameSite=Lax; Max-Age=0${httpOnly ? "; HttpOnly" : ""}${cfg.cookieSecure ? "; Secure" : ""}`;
  const prev = res.getHeader("Set-Cookie");
  const list = Array.isArray(prev) ? prev.map(String) : prev ? [String(prev)] : [];
  list.push(clear(SID_COOKIE, true), clear(CSRF_COOKIE, false));
  res.setHeader("Set-Cookie", list);
}

export function readSid(req: IncomingMessage): string | undefined {
  return parseCookies(req.headers.cookie)[SID_COOKIE];
}
