
import { FormEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AdminCharactersPanel } from "./admin-characters";
import { AdminEconomyPanel, type MerchantOffersEnabled } from "./admin-economy";
import { AdminSeasonPanel } from "./admin-season";
import { StudioBadge, StudioCard } from "./studio/studio-ui";
import type {
  AdminActiveCharacter,
  AdminCatalogMeta,
  SeasonSummary,
} from "./admin-types";

export type LiveOpsSection = "economy" | "season" | "characters";

type AdminLiveOpsProps = {
  section: LiveOpsSection;
  dropPct: number;
  activeCharacterCount: number;
  currentSeason: SeasonSummary | null;
  // economy
  working: boolean;
  mobHits: string;
  bossHits: string;
  refineDropPct: string;
  bagPrice: string;
  refinerPrice: string;
  attrResetPrice: string;
  petDogPrice: string;
  petCatPrice: string;
  petParrotPrice: string;
  merchantOffersEnabled: MerchantOffersEnabled;
  eventLabel: string;
  eventXp: string;
  eventGold: string;
  eventDrop: string;
  eventEndsAt: string;
  catalogMeta: AdminCatalogMeta | null;
  idleFetch: (path: string, init?: RequestInit) => Promise<any>;
  onMobHitsChange: (v: string) => void;
  onBossHitsChange: (v: string) => void;
  onRefineDropPctChange: (v: string) => void;
  onDropPctChange: (v: number) => void;
  onBagPriceChange: (v: string) => void;
  onRefinerPriceChange: (v: string) => void;
  onAttrResetPriceChange: (v: string) => void;
  onPetDogPriceChange: (v: string) => void;
  onPetCatPriceChange: (v: string) => void;
  onPetParrotPriceChange: (v: string) => void;
  onMerchantOfferEnabledChange: (sku: string, enabled: boolean) => void;
  onEventLabelChange: (v: string) => void;
  onEventXpChange: (v: string) => void;
  onEventGoldChange: (v: string) => void;
  onEventDropChange: (v: string) => void;
  onEventEndsAtChange: (v: string) => void;
  onSaveBalance: (e: FormEvent) => void;
  onSaveDrop: (e: FormEvent) => void;
  onSaveMerchant: (e: FormEvent) => void;
  onSaveEngagementEvent: (e: FormEvent) => void;
  onClearEngagementEvent: () => void;
  // season
  seasonLoading: boolean;
  seasonNotes: string;
  seasonConfirm: string;
  onSeasonNotesChange: (v: string) => void;
  onSeasonConfirmChange: (v: string) => void;
  onEndSeason: (e: FormEvent) => void;
  // characters
  activeCharacters: AdminActiveCharacter[];
  target: AdminActiveCharacter | null;
  addGold: string;
  setLevel: string;
  grantPoints: string;
  onTargetChange: (id: string) => void;
  onAddGoldChange: (v: string) => void;
  onSetLevelChange: (v: string) => void;
  onGrantPointsChange: (v: string) => void;
  onCharacter: (body: Record<string, unknown>) => Promise<void>;
  onDeleteCharacter: () => Promise<void>;
};

function Col({
  focus,
  title,
  children,
}: {
  focus: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("studio-2-liveops__col", focus && "is-focus")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="studio-2-section-title mb-0">{title}</h3>
        {focus ? <StudioBadge tone="ok">ativo</StudioBadge> : null}
      </div>
      {children}
    </div>
  );
}

export function AdminLiveOps({
  section,
  dropPct,
  activeCharacterCount,
  currentSeason,
  ...rest
}: AdminLiveOpsProps) {
  return (
    <div className="space-y-3">
      <div className="studio-2-kpi-grid">
        <StudioCard
          label="Drop global"
          value={`${(Math.round(dropPct * 10) / 10).toFixed(1)}%`}
        />
        <StudioCard
          label="Temporada"
          value={
            currentSeason
              ? `${currentSeason.year}-T${currentSeason.quarter}`
              : "—"
          }
          hint={currentSeason?.status || "Sem OPEN"}
        />
        <StudioCard label="Personagens ativos" value={activeCharacterCount} />
        <StudioCard
          label="Seção"
          value={
            section === "economy"
              ? "Economia"
              : section === "season"
                ? "Temporada"
                : "Personagens"
          }
        />
      </div>

      <div className="studio-2-liveops">
        <Col focus={section === "economy"} title="Economia">
          <AdminEconomyPanel
            working={rest.working}
            mobHits={rest.mobHits}
            bossHits={rest.bossHits}
            refineDropPct={rest.refineDropPct}
            dropPct={dropPct}
            bagPrice={rest.bagPrice}
            refinerPrice={rest.refinerPrice}
            attrResetPrice={rest.attrResetPrice}
            petDogPrice={rest.petDogPrice}
            petCatPrice={rest.petCatPrice}
            petParrotPrice={rest.petParrotPrice}
            merchantOffersEnabled={rest.merchantOffersEnabled}
            eventLabel={rest.eventLabel}
            eventXp={rest.eventXp}
            eventGold={rest.eventGold}
            eventDrop={rest.eventDrop}
            eventEndsAt={rest.eventEndsAt}
            catalogMeta={rest.catalogMeta}
            idleFetch={rest.idleFetch}
            onMobHitsChange={rest.onMobHitsChange}
            onBossHitsChange={rest.onBossHitsChange}
            onRefineDropPctChange={rest.onRefineDropPctChange}
            onDropPctChange={rest.onDropPctChange}
            onBagPriceChange={rest.onBagPriceChange}
            onRefinerPriceChange={rest.onRefinerPriceChange}
            onAttrResetPriceChange={rest.onAttrResetPriceChange}
            onPetDogPriceChange={rest.onPetDogPriceChange}
            onPetCatPriceChange={rest.onPetCatPriceChange}
            onPetParrotPriceChange={rest.onPetParrotPriceChange}
            onMerchantOfferEnabledChange={rest.onMerchantOfferEnabledChange}
            onEventLabelChange={rest.onEventLabelChange}
            onEventXpChange={rest.onEventXpChange}
            onEventGoldChange={rest.onEventGoldChange}
            onEventDropChange={rest.onEventDropChange}
            onEventEndsAtChange={rest.onEventEndsAtChange}
            onSaveBalance={rest.onSaveBalance}
            onSaveDrop={rest.onSaveDrop}
            onSaveMerchant={rest.onSaveMerchant}
            onSaveEngagementEvent={rest.onSaveEngagementEvent}
            onClearEngagementEvent={rest.onClearEngagementEvent}
          />
        </Col>
        <Col focus={section === "season"} title="Temporada">
          <AdminSeasonPanel
            seasonLoading={rest.seasonLoading}
            currentSeason={currentSeason}
            seasonNotes={rest.seasonNotes}
            seasonConfirm={rest.seasonConfirm}
            working={rest.working}
            onSeasonNotesChange={rest.onSeasonNotesChange}
            onSeasonConfirmChange={rest.onSeasonConfirmChange}
            onEndSeason={rest.onEndSeason}
          />
        </Col>
        <Col focus={section === "characters"} title="Personagens">
          <AdminCharactersPanel
            activeCharacters={rest.activeCharacters}
            target={rest.target}
            addGold={rest.addGold}
            setLevel={rest.setLevel}
            grantPoints={rest.grantPoints}
            working={rest.working}
            onTargetChange={rest.onTargetChange}
            onAddGoldChange={rest.onAddGoldChange}
            onSetLevelChange={rest.onSetLevelChange}
            onGrantPointsChange={rest.onGrantPointsChange}
            onCharacter={rest.onCharacter}
            onDeleteCharacter={rest.onDeleteCharacter}
          />
        </Col>
      </div>
    </div>
  );
}
