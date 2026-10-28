export class IdleHttpError extends Error {
  status: number;
  code: string;
  data?: unknown;
}

export function csrfTokenFromCookieHeader(cookieHeader: string | null | undefined): string | null;

export function isSameOriginRequestUrl(url: string, pageOrigin?: string | null): boolean;

export function applyCsrfHeaders(
  url: string,
  init: { method?: string; headers?: HeadersInit } | undefined,
  cookieHeader: string | null | undefined,
  pageOrigin?: string | null,
): Headers;

export function sanitizeLoginNext(raw: string | null | undefined): string;

export function loginRedirectFor(pathname: string, search?: string): string | null;

export function rejectIfFailed(
  res: { ok: boolean; status: number },
  data: { error?: string; code?: string } | null | undefined,
  loc?: { pathname?: string; search?: string; assign?: (url: string) => void } | null,
): unknown;
