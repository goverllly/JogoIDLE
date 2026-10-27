import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LOCAL_USER_ID,
  activateActiveSkill,
  allocateActiveAttributes,
  applyItemOp,
  ascendActiveCharacter,
  buyMerchantOffering,
  castCombatSkill,
  compareFameCharacters,
  createCharacterForUser,
  deleteCharacter,
  errorMessage,
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
const PORT = Number(process.env.PORT || 8787);

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

function ok(res: express.Response, body: unknown, status = 200) {
  res.status(status).set("Cache-Control", "no-store").json(body);
}

function fail(res: express.Response, error: unknown) {
  const status = httpStatus(error);
  const code = typeof (error as { code?: string })?.code === "string" ? (error as { code: string }).code : undefined;
  ok(res, { success: false, error: errorMessage(error), ...(code ? { code } : {}) }, status);
}

const uid = () => LOCAL_USER_ID;

app.get("/api/sinergia-idle/meta", async (_req, res) => {
  try {
    ok(res, { success: true, ...(await getMeta()) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/sinergia-idle/characters", async (_req, res) => {
  try {
    ok(res, { success: true, characters: await listCharacters(uid()) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/characters", async (req, res) => {
  try {
    const character = await createCharacterForUser(
      uid(),
      String(req.body?.name || ""),
      String(req.body?.classId || ""),
      req.body?.appearance,
    );
    ok(res, { success: true, character }, 201);
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/characters/:id/select", async (req, res) => {
  try {
    const character = await selectCharacter(uid(), String(req.params.id));
    ok(res, { success: true, character });
  } catch (error) {
    fail(res, error);
  }
});

app.delete("/api/sinergia-idle/characters/:id", async (req, res) => {
  try {
    await deleteCharacter(uid(), String(req.params.id));
    ok(res, { success: true });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/sinergia-idle/me", async (_req, res) => {
  try {
    ok(res, { success: true, ...(await getActiveState(uid())) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/farm/start", async (req, res) => {
  try {
    ok(res, { success: true, ...(await startActiveFarm(uid(), String(req.body?.zoneId || ""))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/farm/stop", async (_req, res) => {
  try {
    ok(res, { success: true, ...(await stopActiveFarm(uid())) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/farm/auto-restart", async (req, res) => {
  try {
    ok(res, { success: true, ...(await setAutoRestartFarm(uid(), Boolean(req.body?.enabled))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/items/:op", async (req, res) => {
  try {
    ok(res, { success: true, ok: true, ...(await applyItemOp(uid(), String(req.params.op), req.body || {})) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/merchant/buy", async (req, res) => {
  try {
    ok(res, { success: true, ...(await buyMerchantOffering(uid(), String(req.body?.sku || ""))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/me/attributes", async (req, res) => {
  try {
    ok(res, { success: true, ...(await allocateActiveAttributes(uid(), req.body?.allocations || req.body || {})) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/me/skills/unlock", async (req, res) => {
  try {
    ok(res, { success: true, ...(await unlockActiveSkill(uid(), String(req.body?.skillId || ""))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/me/skills/activate", async (req, res) => {
  try {
    ok(res, { success: true, ...(await activateActiveSkill(uid(), String(req.body?.skillId || ""))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/me/combat-skills/cast", async (req, res) => {
  try {
    ok(res, { success: true, ...(await castCombatSkill(uid(), String(req.body?.skillId || ""))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/me/combat-skills/auto-cast", async (req, res) => {
  try {
    ok(res, { success: true, ...(await setCombatAutoCast(uid(), Boolean(req.body?.enabled))) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/me/auto-hp-potion", async (req, res) => {
  try {
    ok(
      res,
      {
        success: true,
        ...(await setAutoHpPotion(uid(), Boolean(req.body?.enabled), req.body?.thresholdPct)),
      },
    );
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/me/pets", async (req, res) => {
  try {
    ok(res, { success: true, ...(await updateActivePet(uid(), req.body?.petId ?? null)) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/me/inventory-automation", async (req, res) => {
  try {
    ok(res, { success: true, ...(await updateInventoryAutomationPrefs(uid(), req.body || {})) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/me/hunt-perf/reset", async (_req, res) => {
  try {
    ok(res, { success: true, ...(await resetActiveHuntPerf(uid())) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/sinergia-idle/announcements", async (_req, res) => {
  try {
    ok(res, { success: true, ...(await getAnnouncements()) });
  } catch (error) {
    fail(res, error);
  }
});

/** Missões SinergIA desligadas no standalone. */
app.post("/api/sinergia-idle/engagement/claim", (_req, res) => {
  ok(res, { success: false, error: "Missões SinergIA não estão disponíveis neste jogo standalone." }, 410);
});

const adminEmail = () => LOCAL_USER_EMAIL;

app.post("/api/sinergia-idle/admin/config", async (req, res) => {
  try {
    const body = req.body || {};
    ok(
      res,
      {
        success: true,
        ...(await adminUpdateConfig(adminEmail(), {
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

app.post("/api/sinergia-idle/admin/grant", async (req, res) => {
  try {
    ok(res, { success: true, ...(await adminGrantItem(uid(), adminEmail(), req.body || {})) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/admin/catalog", async (req, res) => {
  try {
    const body = req.body || {};
    const creating = body.creating != null ? Boolean(body.creating) : !body.id;
    ok(
      res,
      { success: true, ...(await adminUpsertCatalogItem(uid(), adminEmail(), { ...body, creating })) },
      creating ? 201 : 200,
    );
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/admin/catalog/delete", async (req, res) => {
  try {
    ok(
      res,
      {
        success: true,
        ...(await adminDeleteCatalogItem(adminEmail(), String(req.body?.templateId || req.body?.id || ""))),
      },
    );
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/admin/catalog/reset", async (req, res) => {
  try {
    ok(
      res,
      {
        success: true,
        ...(await adminResetCatalogItem(adminEmail(), String(req.body?.templateId || req.body?.id || ""))),
      },
    );
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/admin/character", async (req, res) => {
  try {
    const body = req.body || {};
    ok(
      res,
      {
        success: true,
        ...(await adminUpdateActiveCharacter(uid(), adminEmail(), {
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

app.post("/api/sinergia-idle/admin/character/delete", async (req, res) => {
  try {
    ok(
      res,
      {
        success: true,
        ...(await adminDeleteCharacter(adminEmail(), String(req.body?.characterId || ""))),
      },
    );
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/admin/season/end", async (req, res) => {
  try {
    ok(res, { success: true, ...(await adminEndSeason(adminEmail(), req.body || {})) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/sinergia-idle/admin/actions", async (req, res) => {
  try {
    const limit = req.query.limit != null ? Number(req.query.limit) : 50;
    ok(res, { success: true, ...(await listAdminActions(adminEmail(), limit)) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/sinergia-idle/admin/engagement-metrics", async (_req, res) => {
  try {
    ok(res, { success: true, ...(await getAdminEngagementMetrics(adminEmail())) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/admin/simulate", async (req, res) => {
  try {
    ok(res, { success: true, ...(await adminSimulate(adminEmail(), req.body || {})) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/sinergia-idle/admin/world-snapshot", async (_req, res) => {
  try {
    ok(res, { success: true, ...(await adminWorldSnapshot(adminEmail())) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/sinergia-idle/hud-layout", async (_req, res) => {
  try {
    ok(res, { success: true, ...(await getPublishedHudLayout()) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/sinergia-idle/admin/hud-layout", async (_req, res) => {
  try {
    ok(res, { success: true, ...(await adminGetHudLayout(adminEmail())) });
  } catch (error) {
    fail(res, error);
  }
});

app.put("/api/sinergia-idle/admin/hud-layout/draft", async (req, res) => {
  try {
    ok(res, { success: true, ...(await adminSaveHudDraft(adminEmail(), req.body || {})) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/admin/hud-layout/publish", async (_req, res) => {
  try {
    ok(res, { success: true, ...(await adminPublishHudLayout(adminEmail())) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/admin/hud-layout/restore", async (req, res) => {
  try {
    ok(res, { success: true, ...(await adminRestoreHudLayout(adminEmail(), req.body || {})) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/sinergia-idle/admin/hud-layout/history", async (_req, res) => {
  try {
    const data = await adminGetHudLayout(adminEmail());
    ok(res, { success: true, history: data.history, publishedRevision: data.publishedRevision });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/sinergia-idle/ranking", (_req, res) => {
  ok(res, { success: true, ranking: [], season: null });
});

app.get("/api/sinergia-idle/seasons", (_req, res) => {
  ok(res, { success: true, seasons: [] });
});

app.post("/api/sinergia-idle/me/ascend", async (_req, res) => {
  try {
    ok(res, { success: true, ...(await ascendActiveCharacter(uid())) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/sinergia-idle/journey", async (req, res) => {
  try {
    ok(res, {
      success: true,
      ...(await getActiveJourney(uid(), String(req.query.period || "all"))),
    });
  } catch (error) {
    fail(res, error);
  }
});

app.patch("/api/sinergia-idle/journey/privacy", async (req, res) => {
  try {
    ok(res, {
      success: true,
      ...(await patchJourneyPrivacy(uid(), Boolean(req.body?.hideFromPublicRankings))),
    });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/sinergia-idle/fame/overview", async (_req, res) => {
  try {
    ok(res, { success: true, ...(await getFameOverview(uid())) });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/sinergia-idle/fame/rankings", async (req, res) => {
  try {
    ok(res, {
      success: true,
      ...(await getFameRankings(uid(), {
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

app.get("/api/sinergia-idle/fame/compare", async (req, res) => {
  try {
    ok(res, {
      success: true,
      ...(await compareFameCharacters(uid(), req.query.a, req.query.b)),
    });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sinergia-idle/fame/reconcile", async (_req, res) => {
  try {
    ok(res, { success: true, ...(await reconcileFameStore()) });
  } catch (error) {
    fail(res, error);
  }
});

for (const path of [
  "/api/sinergia-idle/arena/enter",
  "/api/sinergia-idle/arena/leave",
  "/api/sinergia-idle/arena/players",
  "/api/sinergia-idle/arena/challenge",
  "/api/sinergia-idle/arena/respond",
  "/api/sinergia-idle/arena/forfeit",
]) {
  app.all(path, (_req, res) => {
    ok(res, { success: false, error: "Arena PvP desligada neste standalone." }, 501);
  });
}

app.use("/sinergia-idle", express.static(join(PUBLIC, "sinergia-idle")));

const ADMIN_DIST = join(PUBLIC, "sinergia-idle", "admin");
app.use(
  "/sinergia-idle/admin",
  express.static(ADMIN_DIST, { index: "index.html", fallthrough: true }),
);
app.use("/sinergia-idle/admin", (req, res, next) => {
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

app.get("/", (_req, res) => {
  res.redirect(302, "/sinergia-idle/lobby.html");
});

app.get("/sinergia-idle", (_req, res) => {
  res.redirect(302, "/sinergia-idle/lobby.html");
});

app.listen(PORT, () => {
  console.log(`Sinergia IDLE standalone em http://localhost:${PORT}`);
  console.log(`Lobby: http://localhost:${PORT}/sinergia-idle/lobby.html`);
  console.log(`Jogo:  http://localhost:${PORT}/sinergia-idle/play.html`);
  console.log(`Admin: http://localhost:${PORT}/sinergia-idle/admin/`);
});
