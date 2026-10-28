/**
 * Cliente HTTP same-origin do Jogo IDLE.
 * O segredo de sessão fica no cookie HttpOnly `jogo_idle_sid`.
 * O token CSRF é somente o cookie legível `jogo_idle_csrf` — nunca o sid, nunca localStorage.
 * Uma mutação é enviada uma vez; 401/403 não disparam outro POST.
 */

const CSRF_COOKIE = "jogo_idle_csrf";
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const LOGIN_FALLBACK = "/jogo-idle/lobby.html";

export class IdleHttpError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "IdleHttpError";
    this.status = status;
    this.code = code || "";
  }
}

/** Lê exclusivamente `jogo_idle_csrf`. Ignora `jogo_idle_sid` mesmo se o valor parecer um token. */
export function csrfTokenFromCookieHeader(cookieHeader) {
  const header = String(cookieHeader || "");
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const name = part.slice(0, i).trim();
    if (name !== CSRF_COOKIE) continue;
    const raw = part.slice(i + 1).trim();
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Mutação same-origin. Recusa `//host`, origens externas e URLs absolutas de outro host.
 * Caminho relativo (`/api/...`) é same-origin.
 */
export function isSameOriginRequestUrl(url, pageOrigin) {
  const raw = String(url || "").trim();
  if (!raw || raw.startsWith("//")) return false;
  if (raw.startsWith("/")) return !raw.startsWith("//");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (!pageOrigin) return false;
  try {
    return parsed.origin === new URL(pageOrigin).origin;
  } catch {
    return false;
  }
}

/** Preserva headers já montados (objeto, tuplas ou Headers) e só então define X-CSRF-Token. */
export function applyCsrfHeaders(url, init, cookieHeader, pageOrigin) {
  const headers = new Headers(init?.headers || undefined);
  const method = String(init?.method || "GET").toUpperCase();
  if (!MUTATING.has(method)) return headers;
  if (!isSameOriginRequestUrl(url, pageOrigin)) return headers;
  const token = csrfTokenFromCookieHeader(cookieHeader);
  if (token) headers.set("X-CSRF-Token", token);
  return headers;
}

/** Destino pós-login: só páginas do jogo. Nunca login, nunca `//`, nunca outro host. */
export function sanitizeLoginNext(raw) {
  if (typeof raw !== "string") return LOGIN_FALLBACK;
  if (!raw.startsWith("/jogo-idle/")) return LOGIN_FALLBACK;
  if (raw.includes("\\") || raw.includes("..") || raw.includes("//")) return LOGIN_FALLBACK;
  const withoutHash = raw.split("#")[0];
  const pathname = withoutHash.split("?")[0];
  if (pathname === "/jogo-idle/login.html") return LOGIN_FALLBACK;
  if (!/^\/jogo-idle\/[A-Za-z0-9._~/-]*$/.test(pathname)) return LOGIN_FALLBACK;
  return withoutHash;
}

/**
 * Uma ida ao login. Na própria página de login devolve null para não redirecionar de novo.
 */
export function loginRedirectFor(pathname, search) {
  const path = String(pathname || "");
  if (path === "/jogo-idle/login.html") return null;
  if (!path.startsWith("/jogo-idle/")) return null;
  const next = sanitizeLoginNext(`${path}${search || ""}`);
  return `/jogo-idle/login.html?next=${encodeURIComponent(next)}`;
}

/** 401 de autenticação vai ao login uma vez. 403 (CSRF, admin, origem) não navega e não repete a mutação. */
export function rejectIfFailed(res, data, loc) {
  if (res.ok) return data;
  const code = data?.code || "";
  if (res.status === 401 && code !== "CSRF_INVALID" && loc && typeof loc.assign === "function") {
    const dest = loginRedirectFor(loc.pathname, loc.search || "");
    if (dest) loc.assign(dest);
  }
  const err = new IdleHttpError(data?.error || `Erro ${res.status}`, res.status, code);
  err.data = data;
  throw err;
}
