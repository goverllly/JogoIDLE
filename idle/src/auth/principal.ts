import type { UserRole } from "./users.ts";
import { LEGACY_LOCAL_USER_ID } from "./users.ts";

export type AuthenticatedPrincipal = {
  userId: number;
  email: string;
  role: UserRole;
  sessionId?: string;
  /** True when injected by local auth mode (no cookie). */
  isLocalDev: boolean;
};

export const LOCAL_DEV_PRINCIPAL: AuthenticatedPrincipal = {
  userId: LEGACY_LOCAL_USER_ID,
  email: "local@idle.local",
  role: "ADMIN",
  isLocalDev: true,
};
