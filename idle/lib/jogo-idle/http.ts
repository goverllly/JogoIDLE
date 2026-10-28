import { NextResponse } from "next/server";

export function idleJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/** Resposta de erro do IDLE. Propaga `error.code` (ex.: MAINTENANCE) para o cliente. */
export function idleFail(error: unknown, message: string) {
  const rec = error as { status?: number; code?: string };
  const status = typeof rec?.status === "number" ? rec.status : 400;
  const code = typeof rec?.code === "string" && rec.code ? rec.code : undefined;
  return idleJson({ success: false, error: message, ...(code ? { code } : {}) }, status);
}
