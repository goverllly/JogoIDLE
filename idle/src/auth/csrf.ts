import type { Request } from "express";

/**
 * Synchronizer Token: CSRF token stored on session record; client sends header X-CSRF-Token.
 * Also require matching Origin (when present) against Host.
 */

function hostMatches(candidateHost: string, requestHostHeader: string): boolean {
  const hostname = requestHostHeader.split(":")[0]?.toLowerCase() || "";
  return candidateHost.toLowerCase() === hostname;
}

/**
 * Cross-origin guard for mutating / login requests.
 * - Mismatched Origin → deny
 * - Missing Origin: allow non-browser clients (curl/tests); if Referer present it must match Host
 * - Cross-site attackers always send Origin/Referer pointing at their site → deny
 */
export function originAllowed(req: Request, allowHttpLocal: boolean): boolean {
  const host = req.get("host") || "";
  const origin = req.get("origin");
  if (origin) {
    try {
      const u = new URL(origin);
      if (!hostMatches(u.hostname, host)) return false;
      if (u.protocol === "https:") return true;
      if (u.protocol === "http:" && allowHttpLocal && hostMatches(u.hostname, host)) {
        const hn = u.hostname.toLowerCase();
        return hn === "localhost" || hn === "127.0.0.1" || hn === "::1";
      }
      return false;
    } catch {
      return false;
    }
  }
  const referer = req.get("referer");
  if (referer) {
    try {
      const u = new URL(referer);
      if (!hostMatches(u.hostname, host)) return false;
      if (u.protocol === "https:") return true;
      if (u.protocol === "http:" && allowHttpLocal) {
        const hn = u.hostname.toLowerCase();
        return hn === "localhost" || hn === "127.0.0.1" || hn === "::1";
      }
      return false;
    } catch {
      return false;
    }
  }
  // No Origin/Referer: treat as non-browser client (CLI). Browser CSRF always includes one of them.
  return true;
}

export function csrfHeaderMatches(req: Request, expected: string | undefined): boolean {
  if (!expected) return false;
  const got = String(req.get("x-csrf-token") || "");
  if (!got || got.length !== expected.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
