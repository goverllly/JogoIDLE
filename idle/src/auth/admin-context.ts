import { AsyncLocalStorage } from "node:async_hooks";
import type { AuthenticatedPrincipal } from "./principal.ts";

export const adminAuthAls = new AsyncLocalStorage<AuthenticatedPrincipal>();

export function runWithPrincipal<T>(principal: AuthenticatedPrincipal, fn: () => T): T {
  return adminAuthAls.run(principal, fn);
}
