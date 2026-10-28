import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveBootConfig, bootBanner, BootConfigError } from "./auth/mode.ts";
import {
  attachBootConfig,
  attachPrincipal,
  localHostGuard,
  requireAdmin,
  requireAdminPage,
  requireAuth,
  requireCsrf,
  securityHeaders,
} from "./auth/middleware.ts";
import { registerAuthRoutes } from "./auth/routes.ts";
import { adminAuthAls } from "./auth/admin-context.ts";
import { configureSessions } from "./auth/sessions.ts";
import type { BootConfig } from "./auth/mode.ts";
import {
  activateActiveSkill,
  allocateActiveAttributes,
  applyItemOp,
  ascendActiveCharacter,
  buyMerchantOffering,
  castCombatSkill,
  compareFameCharacters,
  createCharacterForUser,
  deleteCharacter,
  enterActiveChapter,
  errorMessage,
  getActiveChapters,
  getActiveJourney,
  getActiveState,
  getAnnouncements,
  getFameOverview,
  getFameRankings,
  getMeta,
  httpStatus,
  listCharacters,
  patchJourneyPrivacy,
  reconcileFameStore,
  resetActiveHuntPerf,
  selectCharacter,
  setAutoHpPotion,
  setAutoRestartFarm,
  setCombatAutoCast,
  startActiveFarm,
  stopActiveFarm,
  unlockActiveSkill,
  updateActivePet,
  updateAppearance,
  updateInventoryAutomationPrefs,
} from "./local-service";
import {
  LOCAL_USER_EMAIL,
  adminDeleteCatalogItem,
  adminDeleteCharacter,
  adminEndSeason,
  adminGetHudLayout,
  adminGrantItem,
  adminPublishHudLayout,
  adminResetCatalogItem,
  adminRestoreHudLayout,
  adminSaveHudDraft,
  adminSimulate,
  adminUpdateActiveCharacter,
  adminUpdateConfig,
  adminUpsertCatalogItem,
  adminWorldSnapshot,
  getAdminEngagementMetrics,
  getPublishedHudLayout,
  listAdminActions,
} from "./admin-service";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");

function ok(res: express.Response, body: unknown, status = 200) {
  res.status(status).set("Cache-Control", "no-store").json(body);
}

function fail(res: express.Response, error: unknown) {
  const status = httpStatus(error);
  const code = typeof (error as { code?: string })?.code === "string" ? (error as { code: string }).code : undefined;
  ok(res, { success: false, error: errorMessage(error), ...(code ? { code } : {}) }, status);
}

function uid(req: express.Request): number {
  if (!req.principal) {
    const err = new Error("Authentication required");
    (err as { status?: number }).status = 401;
    throw err;
  }
  return req.principal.userId;
}

function isPublicApi(req: express.Request): boolean {
  const u = (req.originalUrl || req.url || "").split("?")[0] || "";
  if (u === "/api/jogo-idle/meta") return true;
  if (u === "/api/jogo-idle/announcements") return true;
  if (u === "/api/jogo-idle/ranking") return true;
  if (u === "/api/jogo-idle/seasons") return true;
  if (u === "/api/jogo-idle/hud-layout") return true;
  if (u === "/api/jogo-idle/auth/login") return true;
  if (u === "/api/jogo-idle/auth/me") return true;
  if (u === "/api/jogo-idle/engagement/claim") return true;
  if (u.startsWith("/api/jogo-idle/arena/")) return true;
  return false;
}

function isAdminApi(req: express.Request): boolean {
  const u = (req.originalUrl || req.url || "").split("?")[0] || "";
  return u.startsWith("/api/jogo-idle/admin/");
}

export function createApp(bootConfig: BootConfig) {
  // TTL only — paths may already be pointed at test fixtures via configure* helpers.
  configureSessions({ ttlSec: bootConfig.sessionTtlSec });

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));
  app.use(securityHeaders);
  app.use(attachBootConfig(bootConfig));
  app.use(localHostGuard(bootConfig));
  // Never honor client-supplied forwarding headers unless boot listed trusted proxies.
  // (We do not enable express "trust proxy"; remoteAddress stays the TCP peer.)
  app.use((req, _res, next) => {
    if (bootConfig.trustedProxies.length === 0) {
      delete req.headers["x-forwarded-for"];
      delete req.headers["x-forwarded-proto"];
      delete req.headers["x-forwarded-host"];
    }
    next();
  });
  app.use(attachPrincipal(bootConfig));

  app.use("/api/jogo-idle", (req, res, next) => {
    if (isPublicApi(req)) return next();
    if (isAdminApi(req)) return requireAdmin(req, res, next);
    return requireAuth(req, res, next);
  });

  const csrfGuard = requireCsrf(bootConfig);
  app.use("/api/jogo-idle", (req, res, next) => {
    if (isPublicApi(req)) return next();
    return csrfGuard(req, res, next);
  });

  // Propagate principal into admin-service assertIdleAdmin via ALS (async-safe for handlers started in this turn).
  app.use("/api/jogo-idle/admin", (req, res, next) => {
    if (!req.principal) return next();
    adminAuthAls.run(req.principal, () => next());
  });

  registerAuthRoutes(app, bootConfig);

  registerGameRoutes(app, bootConfig);
  return app;
}

function registerGameRoutes(app: express.Express, bootConfig: BootConfig) {

app.get("/api/jogo-idle/meta", async (req, res) => {
  try {
    ok(res, { success: true, ...(await getMeta()) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/jogo-idle/characters", async (req, res) => {
  try {
    ok(res, { success: true, characters: await listCharacters(uid(req)) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/characters", async (req, res) => {
  try {
    const character = await createCharacterForUser(
      uid(req),
      String(req.body?.name || ""),
      String(req.body?.classId || ""),
      req.body?.appearance,
    );
    ok(res, { success: true, character }, 201);
  } catch (error) {
    fail(res, error);
  }
});

/** Bloqueio explícito: aparência só na criação. */
app.post("/api/jogo-idle/me/appearance", async (req, res) => {
  try {
    await updateAppearance(uid(req), req.body);
    ok(res, { success: true });
  } catch (error) {
    fail(res, error);
  }
});

app.patch("/api/jogo-idle/me/appearance", async (req, res) => {
  try {
    await updateAppearance(uid(req), req.body);
    ok(res, { success: true });
  } catch (error) {
    fail(res, error);
  }
});

app.put("/api/jogo-idle/characters/:id/appearance", async (req, res) => {
  try {
    await updateAppearance(uid(req), req.body);
    ok(res, { success: true });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/characters/:id/select", async (req, res) => {
  try {
    const character = await selectCharacter(uid(req), String(req.params.id));
    ok(res, { success: true, character });
  } catch (error) {
    fail(res, error);
  }
});

app.delete("/api/jogo-idle/characters/:id", async (req, res) => {
  try {
    await deleteCharacter(uid(req), String(req.params.id));
    ok(res, { success: true });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/jogo-idle/me", async (req, res) => {
  try {
    ok(res, { success: true, ...(await getActiveState(uid(req))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/farm/start", async (req, res) => {
  try {
    ok(res, { success: true, ...(await startActiveFarm(uid(req), String(req.body?.zoneId || ""))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/farm/stop", async (req, res) => {
  try {
    ok(res, { success: true, ...(await stopActiveFarm(uid(req))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/farm/auto-restart", async (req, res) => {
  try {
    ok(res, { success: true, ...(await setAutoRestartFarm(uid(req), Boolean(req.body?.enabled))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/items/:op", async (req, res) => {
  try {
    ok(res, { success: true, ok: true, ...(await applyItemOp(uid(req), String(req.params.op), req.body || {})) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/merchant/buy", async (req, res) => {
  try {
    ok(res, { success: true, ...(await buyMerchantOffering(uid(req), String(req.body?.sku || ""))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/me/attributes", async (req, res) => {
  try {
    ok(res, { success: true, ...(await allocateActiveAttributes(uid(req), req.body?.allocations || req.body || {})) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/me/skills/unlock", async (req, res) => {
  try {
    ok(res, { success: true, ...(await unlockActiveSkill(uid(req), String(req.body?.skillId || ""))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/me/skills/activate", async (req, res) => {
  try {
    ok(res, { success: true, ...(await activateActiveSkill(uid(req), String(req.body?.skillId || ""))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/me/combat-skills/cast", async (req, res) => {
  try {
    ok(res, { success: true, ...(await castCombatSkill(uid(req), String(req.body?.skillId || ""))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/me/combat-skills/auto-cast", async (req, res) => {
  try {
    ok(res, { success: true, ...(await setCombatAutoCast(uid(req), Boolean(req.body?.enabled))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/me/auto-hp-potion", async (req, res) => {
  try {
    ok(
      res,
      {
        success: true,
        ...(await setAutoHpPotion(uid(req), Boolean(req.body?.enabled), req.body?.thresholdPct)),
      },
    );
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/me/pets", async (req, res) => {
  try {
    ok(res, { success: true, ...(await updateActivePet(uid(req), req.body?.petId ?? null)) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/me/inventory-automation", async (req, res) => {
  try {
    ok(res, { success: true, ...(await updateInventoryAutomationPrefs(uid(req), req.body || {})) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/me/hunt-perf/reset", async (req, res) => {
  try {
    ok(res, { success: true, ...(await resetActiveHuntPerf(uid(req))) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/jogo-idle/announcements", async (req, res) => {
  try {
    ok(res, { success: true, ...(await getAnnouncements()) });
  } catch (error) {
    fail(res, error);
  }
});

/** Missões de engajamento desligadas no standalone. */
app.post("/api/jogo-idle/engagement/claim", (req, res) => {
  ok(res, { success: false, error: "Missões de engajamento não estão disponíveis neste jogo standalone." }, 410);
});

function adminEmail(req: express.Request): string {
  return req.principal?.email || LOCAL_USER_EMAIL;
}

app.post("/api/jogo-idle/admin/config", async (req, res) => {
  try {
    const body = req.body || {};
    ok(
      res,
      {
        success: true,
        ...(await adminUpdateConfig(adminEmail(req), {
          dropChance: body.dropChance != null ? Number(body.dropChance) : undefined,
          bagUpgradePrice: body.bagUpgradePrice != null ? body.bagUpgradePrice : undefined,
          refinerPrice: body.refinerPrice != null ? body.refinerPrice : undefined,
          petDogPrice: body.petDogPrice != null ? body.petDogPrice : undefined,
          petCatPrice: body.petCatPrice != null ? body.petCatPrice : undefined,
          petParrotPrice: body.petParrotPrice != null ? body.petParrotPrice : undefined,
          merchantOffersEnabled:
            body.merchantOffersEnabled != null &&
            typeof body.merchantOffersEnabled === "object" &&
            !Array.isArray(body.merchantOffersEnabled)
              ? body.merchantOffersEnabled
              : undefined,
          engagementEvent:
            body.engagementEvent === null || body.engagementEvent === false
              ? { clear: true }
              : body.engagementEvent != null
                ? {
                    label: body.engagementEvent.label != null ? String(body.engagementEvent.label) : undefined,
                    xpMult:
                      body.engagementEvent.xpMult != null
                        ? Number(body.engagementEvent.xpMult)
                        : undefined,
                    goldMult:
                      body.engagementEvent.goldMult != null
                        ? Number(body.engagementEvent.goldMult)
                        : undefined,
                    dropMult:
                      body.engagementEvent.dropMult != null
                        ? Number(body.engagementEvent.dropMult)
                        : undefined,
                    endsAt:
                      body.engagementEvent.endsAt != null
                        ? String(body.engagementEvent.endsAt)
                        : undefined,
                    clear: Boolean(body.engagementEvent.clear),
                  }
                : undefined,
          balance: body.balance !== undefined ? body.balance : undefined,
          maintenance:
            body.maintenance === true || body.maintenance === false
              ? Boolean(body.maintenance)
              : body.maintenance != null &&
                  typeof body.maintenance === "object" &&
                  !Array.isArray(body.maintenance)
                ? {
                    enabled: Boolean(body.maintenance.enabled),
                    message:
                      body.maintenance.message != null
                        ? String(body.maintenance.message)
                        : undefined,
                  }
                : undefined,
          zone: body.zone != null
            ? {
                id: String(body.zone.id || ""),
                minLevel: body.zone.minLevel != null ? Number(body.zone.minLevel) : undefined,
                tier: body.zone.tier != null ? Number(body.zone.tier) : undefined,
                dropChance: body.zone.dropChance !== undefined ? body.zone.dropChance : undefined,
                requiresAscension:
                  body.zone.requiresAscension !== undefined ? body.zone.requiresAscension : undefined,
                bossHpMult: body.zone.bossHpMult !== undefined ? body.zone.bossHpMult : undefined,
                bossAtkMult: body.zone.bossAtkMult !== undefined ? body.zone.bossAtkMult : undefined,
                bossDropMult:
                  body.zone.bossDropMult !== undefined ? body.zone.bossDropMult : undefined,
                refineDropChance:
                  body.zone.refineDropChance !== undefined ? body.zone.refineDropChance : undefined,
                monsters: Array.isArray(body.zone.monsters) ? body.zone.monsters : undefined,
                boss: body.zone.boss !== undefined ? body.zone.boss : undefined,
                bossWaveSize:
                  body.zone.bossWaveSize !== undefined ? body.zone.bossWaveSize : undefined,
                scene: body.zone.scene !== undefined ? body.zone.scene : undefined,
                clear: Boolean(body.zone.clear),
              }
            : undefined,
        })),
      },
    );
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/admin/grant", async (req, res) => {
  try {
    ok(res, { success: true, ...(await adminGrantItem(uid(req), adminEmail(req), req.body || {})) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/admin/catalog", async (req, res) => {
  try {
    const body = req.body || {};
    const creating = body.creating != null ? Boolean(body.creating) : !body.id;
    ok(
      res,
      { success: true, ...(await adminUpsertCatalogItem(uid(req), adminEmail(req), { ...body, creating })) },
      creating ? 201 : 200,
    );
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/admin/catalog/delete", async (req, res) => {
  try {
    ok(
      res,
      {
        success: true,
        ...(await adminDeleteCatalogItem(adminEmail(req), String(req.body?.templateId || req.body?.id || ""))),
      },
    );
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/admin/catalog/reset", async (req, res) => {
  try {
    ok(
      res,
      {
        success: true,
        ...(await adminResetCatalogItem(adminEmail(req), String(req.body?.templateId || req.body?.id || ""))),
      },
    );
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/admin/character", async (req, res) => {
  try {
    const body = req.body || {};
    ok(
      res,
      {
        success: true,
        ...(await adminUpdateActiveCharacter(uid(req), adminEmail(req), {
          characterId: body.characterId ? String(body.characterId) : undefined,
          addGold: body.addGold != null ? Number(body.addGold) : undefined,
          setLevel: body.setLevel != null ? Number(body.setLevel) : undefined,
          grantPoints: body.grantPoints != null ? Number(body.grantPoints) : undefined,
          clearInventory: Boolean(body.clearInventory),
          grantCosmeticId: body.grantCosmeticId ? String(body.grantCosmeticId) : undefined,
        })),
      },
    );
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/admin/character/delete", async (req, res) => {
  try {
    ok(
      res,
      {
        success: true,
        ...(await adminDeleteCharacter(adminEmail(req), String(req.body?.characterId || ""))),
      },
    );
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/admin/season/end", async (req, res) => {
  try {
    ok(res, { success: true, ...(await adminEndSeason(adminEmail(req), req.body || {})) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/jogo-idle/admin/actions", async (req, res) => {
  try {
    const limit = req.query.limit != null ? Number(req.query.limit) : 50;
    ok(res, { success: true, ...(await listAdminActions(adminEmail(req), limit)) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/jogo-idle/admin/engagement-metrics", async (req, res) => {
  try {
    ok(res, { success: true, ...(await getAdminEngagementMetrics(adminEmail(req))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/admin/simulate", async (req, res) => {
  try {
    ok(res, { success: true, ...(await adminSimulate(adminEmail(req), req.body || {})) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/jogo-idle/admin/world-snapshot", async (req, res) => {
  try {
    ok(res, { success: true, ...(await adminWorldSnapshot(adminEmail(req))) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/jogo-idle/hud-layout", async (req, res) => {
  try {
    ok(res, { success: true, ...(await getPublishedHudLayout()) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/jogo-idle/admin/hud-layout", async (req, res) => {
  try {
    ok(res, { success: true, ...(await adminGetHudLayout(adminEmail(req))) });
  } catch (error) {
    fail(res, error);
  }
});

app.put("/api/jogo-idle/admin/hud-layout/draft", async (req, res) => {
  try {
    ok(res, { success: true, ...(await adminSaveHudDraft(adminEmail(req), req.body || {})) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/admin/hud-layout/publish", async (req, res) => {
  try {
    ok(res, { success: true, ...(await adminPublishHudLayout(adminEmail(req))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/admin/hud-layout/restore", async (req, res) => {
  try {
    ok(res, { success: true, ...(await adminRestoreHudLayout(adminEmail(req), req.body || {})) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/jogo-idle/admin/hud-layout/history", async (req, res) => {
  try {
    const data = await adminGetHudLayout(adminEmail(req));
    ok(res, { success: true, history: data.history, publishedRevision: data.publishedRevision });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/jogo-idle/ranking", (req, res) => {
  ok(res, { success: true, ranking: [], season: null });
});

app.get("/api/jogo-idle/seasons", (req, res) => {
  ok(res, { success: true, seasons: [] });
});

app.post("/api/jogo-idle/me/ascend", async (req, res) => {
  try {
    ok(res, { success: true, ...(await ascendActiveCharacter(uid(req))) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/jogo-idle/chapters", async (req, res) => {
  try {
    ok(res, { success: true, ...(await getActiveChapters(uid(req))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/chapters/enter", async (req, res) => {
  try {
    ok(res, {
      success: true,
      ...(await enterActiveChapter(uid(req), String(req.body?.chapterId || req.body?.id || ""))),
    });
  } catch (error) {
    const missing = (error as { missingRequirements?: string[] })?.missingRequirements;
    const status = httpStatus(error);
    const code =
      typeof (error as { code?: string })?.code === "string" ? (error as { code: string }).code : undefined;
    ok(
      res,
      {
        success: false,
        error: errorMessage(error),
        ...(code ? { code } : {}),
        ...(missing ? { missingRequirements: missing } : {}),
      },
      status,
    );
  }
});

app.get("/api/jogo-idle/journey", async (req, res) => {
  try {
    ok(res, {
      success: true,
      ...(await getActiveJourney(uid(req), String(req.query.period || "all"))),
    });
  } catch (error) {
    fail(res, error);
  }
});

app.patch("/api/jogo-idle/journey/privacy", async (req, res) => {
  try {
    ok(res, {
      success: true,
      ...(await patchJourneyPrivacy(uid(req), Boolean(req.body?.hideFromPublicRankings))),
    });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/jogo-idle/fame/overview", async (req, res) => {
  try {
    ok(res, { success: true, ...(await getFameOverview(uid(req))) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/jogo-idle/fame/rankings", async (req, res) => {
  try {
    ok(res, {
      success: true,
      ...(await getFameRankings(uid(req), {
        category: String(req.query.category || ""),
        period: String(req.query.period || "lifetime"),
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      })),
    });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/jogo-idle/fame/compare", async (req, res) => {
  try {
    ok(res, {
      success: true,
      ...(await compareFameCharacters(uid(req), req.query.a, req.query.b)),
    });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/jogo-idle/fame/reconcile", async (req, res) => {
  try {
    ok(res, { success: true, ...(await reconcileFameStore()) });
  } catch (error) {
    fail(res, error);
  }
});

for (const path of [
  "/api/jogo-idle/arena/enter",
  "/api/jogo-idle/arena/leave",
  "/api/jogo-idle/arena/players",
  "/api/jogo-idle/arena/challenge",
  "/api/jogo-idle/arena/respond",
  "/api/jogo-idle/arena/forfeit",
]) {
  app.all(path, (req, res) => {
    ok(res, { success: false, error: "Arena PvP desligada neste standalone." }, 501);
  });
}

const ADMIN_DIST = join(PUBLIC, "jogo-idle", "admin");

/** Admin Studio gate MUST run before any static that can serve /jogo-idle/admin*. */
app.use(requireAdminPage(bootConfig));

/** Link legado do lobby apontava para admin.html (404); Studio vive em /admin/. */
app.get("/jogo-idle/admin.html", (_req, res) => {
  res.redirect(302, "/jogo-idle/admin/");
});

app.use(
  "/jogo-idle/admin",
  express.static(ADMIN_DIST, { index: "index.html", fallthrough: true }),
);
app.use("/jogo-idle/admin", (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  res.sendFile(join(ADMIN_DIST, "index.html"), (err) => {
    if (err) {
      res
        .status(503)
        .type("text")
        .send("Admin Studio ainda não foi buildado. Rode: npm run admin:build");
    }
  });
});

/** Game public assets AFTER admin gate (so /admin is not leaked by parent static). */
app.use("/jogo-idle", express.static(join(PUBLIC, "jogo-idle")));

app.get("/", (_req, res) => {
  res.redirect(302, "/jogo-idle/lobby.html");
});

app.get("/jogo-idle", (_req, res) => {
  res.redirect(302, "/jogo-idle/lobby.html");
});
} // end registerGameRoutes

if (process.env.IDLE_SKIP_LISTEN !== "1") {
  let bootConfig: BootConfig;
  try {
    bootConfig = resolveBootConfig(process.env);
  } catch (err) {
    if (err instanceof BootConfigError) {
      console.error(`[boot] ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
  const app = createApp(bootConfig);
  app.listen(bootConfig.port, bootConfig.bindHost, () => {
    for (const line of bootBanner(bootConfig)) console.log(line);
    console.log(`Lobby: http://${bootConfig.bindHost}:${bootConfig.port}/jogo-idle/lobby.html`);
    console.log(`Jogo:  http://${bootConfig.bindHost}:${bootConfig.port}/jogo-idle/play.html`);
    console.log(`Admin: http://${bootConfig.bindHost}:${bootConfig.port}/jogo-idle/admin/`);
  });
}