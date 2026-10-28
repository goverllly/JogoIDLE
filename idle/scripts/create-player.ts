/**
 * Create a PLAYER account for isolation tests / protected mode.
 * Usage:
 *   IDLE_PLAYER_EMAIL=p@b.com IDLE_PLAYER_PASSWORD='...' npm run auth:create-player
 */
import { createUser, LEGACY_LOCAL_USER_ID } from "../src/auth/users.ts";

const email = process.env.IDLE_PLAYER_EMAIL;
const password = process.env.IDLE_PLAYER_PASSWORD;

if (!email || !password) {
  console.error("Set IDLE_PLAYER_EMAIL and IDLE_PLAYER_PASSWORD (min 10 chars).");
  process.exit(1);
}

const user = await createUser({
  email,
  password,
  role: "PLAYER",
  avoidUserIds: [LEGACY_LOCAL_USER_ID],
});

console.log(`Player created userId=${user.userId} email=${user.email}`);
