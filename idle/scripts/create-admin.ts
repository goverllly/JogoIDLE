/**
 * Bootstrap ADMIN account for protected mode.
 * Usage:
 *   IDLE_ADMIN_EMAIL=a@b.com IDLE_ADMIN_PASSWORD='...' npm run auth:create-admin
 * Never logs the password.
 */
import { createUser, LEGACY_LOCAL_USER_ID } from "../src/auth/users.ts";

const email = process.env.IDLE_ADMIN_EMAIL;
const password = process.env.IDLE_ADMIN_PASSWORD;

if (!email || !password) {
  console.error("Set IDLE_ADMIN_EMAIL and IDLE_ADMIN_PASSWORD (min 10 chars).");
  process.exit(1);
}

const user = await createUser({
  email,
  password,
  role: "ADMIN",
  avoidUserIds: [LEGACY_LOCAL_USER_ID],
});

console.log(`Admin created userId=${user.userId} email=${user.email} (not 1 — reserved for legacy local)`);
