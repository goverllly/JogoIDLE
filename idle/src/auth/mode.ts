/**
 * Auth execution modes and fail-closed boot rules.
 * Never grant admin privileges from NODE_ENV alone.
 */

export type AuthMode = "local" | "protected";

export type BootConfig = {
  mode: AuthMode;
  port: number;
  bindHost: string;
  sessionSecret: string | null;
  sessionTtlSec: number;
  cookieSecure: boolean;
  allowHttpLocal: boolean;
  trustedProxies: string[];
  /** True when bind is loopback only. */
  isLoopbackBind: boolean;
  /**
   * Client perf probe may activate only when this is true.
   * Requires IDLE_AUTH_MODE=local AND IDLE_PERF_DIAGNOSTICS=1.
   * Never enabled in protected (localStorage/query alone are insufficient).
   */
  perfDiagnostics: boolean;
};

export class BootConfigError extends Error {
  readonly code = "BOOT_CONFIG_INVALID";
  constructor(message: string) {
    super(message);
    this.name = "BootConfigError";
  }
}

function parseMode(raw: string | undefined): AuthMode {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  if (v === "local" || v === "protected") return v;
  if (!v) {
    // Default for bare `tsx src/server.ts` without script: refuse ambiguous boot.
    throw new BootConfigError(
      "IDLE_AUTH_MODE must be set to 'local' or 'protected' (npm run dev sets local).",
    );
  }
  throw new BootConfigError(`Invalid IDLE_AUTH_MODE='${raw}'. Use local|protected.`);
}

function isLoopbackHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  return h === "127.0.0.1" || h === "::1" || h === "localhost";
}

/**
 * Resolve and validate boot configuration. Throws BootConfigError on insecure setups.
 */
export function resolveBootConfig(env: NodeJS.ProcessEnv = process.env): BootConfig {
  const mode = parseMode(env.IDLE_AUTH_MODE);
  const port = Number(env.PORT || 8787);
  if (!Number.isFinite(port) || port <= 0) {
    throw new BootConfigError("Invalid PORT");
  }

  let bindHost = String(env.IDLE_BIND || "127.0.0.1").trim() || "127.0.0.1";
  const allowNonLoopback = env.IDLE_ALLOW_NON_LOOPBACK === "1";
  const loopback = isLoopbackHost(bindHost);

  if (mode === "local") {
    if (!loopback && !allowNonLoopback) {
      throw new BootConfigError(
        "local mode requires IDLE_BIND=127.0.0.1 (or ::1). Refusing non-loopback bind.",
      );
    }
    if (!loopback && allowNonLoopback) {
      // Emergency only — still warn via caller logs.
      bindHost = bindHost;
    }
  }

  const sessionSecret = env.IDLE_SESSION_SECRET ? String(env.IDLE_SESSION_SECRET) : null;
  const sessionTtlSec = Number(env.IDLE_SESSION_TTL_SEC || 7 * 24 * 3600);
  const allowHttpLocal = env.IDLE_ALLOW_HTTP_LOCAL === "1";
  const cookieSecureEnv = env.IDLE_COOKIE_SECURE;
  let cookieSecure = cookieSecureEnv === "1" || cookieSecureEnv === "true";

  const trustedProxies = String(env.IDLE_TRUSTED_PROXIES || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const trustProxyFlag = env.IDLE_TRUST_PROXY === "1";

  if (mode === "protected") {
    if (!sessionSecret || sessionSecret.length < 32) {
      throw new BootConfigError(
        "protected mode requires IDLE_SESSION_SECRET with at least 32 characters.",
      );
    }
    if (!loopback) {
      // Public / non-loopback bind: require Secure cookies and explicit proxy trust config.
      if (!cookieSecure) {
        throw new BootConfigError(
          "Non-loopback bind in protected mode requires IDLE_COOKIE_SECURE=1 (HTTPS at the edge).",
        );
      }
      if (trustProxyFlag && trustedProxies.length === 0) {
        throw new BootConfigError(
          "IDLE_TRUST_PROXY=1 requires IDLE_TRUSTED_PROXIES (never trust all proxies).",
        );
      }
      if (!trustProxyFlag && env.IDLE_ASSUME_DIRECT_TLS !== "1") {
        throw new BootConfigError(
          "Non-loopback protected bind requires IDLE_TRUST_PROXY=1 with IDLE_TRUSTED_PROXIES, or IDLE_ASSUME_DIRECT_TLS=1 for direct TLS.",
        );
      }
    } else {
      // Loopback protected: allow HTTP only with explicit flag.
      if (!cookieSecure && !allowHttpLocal) {
        throw new BootConfigError(
          "protected on loopback without Secure cookies requires IDLE_ALLOW_HTTP_LOCAL=1 (dev/test only).",
        );
      }
      if (!cookieSecure && allowHttpLocal) {
        cookieSecure = false;
      }
    }
  }

  if (mode === "local") {
    // Local never needs session secret for fixed identity.
    cookieSecure = false;
  }

  // Diagnostics are opt-in and local-only — never trust client flags or bind host alone.
  const perfDiagnostics = mode === "local" && env.IDLE_PERF_DIAGNOSTICS === "1";

  return {
    mode,
    port,
    bindHost,
    sessionSecret: mode === "protected" ? sessionSecret : sessionSecret,
    sessionTtlSec: Number.isFinite(sessionTtlSec) && sessionTtlSec > 60 ? sessionTtlSec : 7 * 24 * 3600,
    cookieSecure,
    allowHttpLocal,
    trustedProxies: trustProxyFlag ? trustedProxies : [],
    isLoopbackBind: loopback,
    perfDiagnostics,
  };
}

export function bootBanner(cfg: BootConfig): string[] {
  const lines = [
    `AUTH MODE=${cfg.mode}` +
      (cfg.mode === "local" ? " (dev identity ON — loopback only)" : " (real sessions required)"),
    `Bind http://${cfg.bindHost}:${cfg.port}`,
  ];
  if (cfg.perfDiagnostics) lines.push("PERF DIAGNOSTICS=on (client probe may activate)");
  if (cfg.mode === "protected") {
    lines.push(`Cookie Secure=${cfg.cookieSecure} allowHttpLocal=${cfg.allowHttpLocal}`);
    if (cfg.trustedProxies.length) lines.push(`Trusted proxies: ${cfg.trustedProxies.join(", ")}`);
  }
  return lines;
}
