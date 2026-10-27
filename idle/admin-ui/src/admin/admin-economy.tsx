
import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminActionsHistory } from "./admin-actions-history";
import type { AdminCatalogMeta } from "./admin-types";

export type MerchantOffersEnabled = {
  bag_upgrade: boolean;
  refiner: boolean;
  attr_reset: boolean;
  pet_dog: boolean;
  pet_cat: boolean;
  pet_parrot: boolean;
};

type AdminEconomyPanelProps = {
  working: boolean;
  mobHits: string;
  bossHits: string;
  refineDropPct: string;
  dropPct: number;
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
  onMobHitsChange: (value: string) => void;
  onBossHitsChange: (value: string) => void;
  onRefineDropPctChange: (value: string) => void;
  onDropPctChange: (value: number) => void;
  onBagPriceChange: (value: string) => void;
  onRefinerPriceChange: (value: string) => void;
  onAttrResetPriceChange: (value: string) => void;
  onPetDogPriceChange: (value: string) => void;
  onPetCatPriceChange: (value: string) => void;
  onPetParrotPriceChange: (value: string) => void;
  onMerchantOfferEnabledChange: (sku: keyof MerchantOffersEnabled, enabled: boolean) => void;
  onEventLabelChange: (value: string) => void;
  onEventXpChange: (value: string) => void;
  onEventGoldChange: (value: string) => void;
  onEventDropChange: (value: string) => void;
  onEventEndsAtChange: (value: string) => void;
  onSaveBalance: (event: FormEvent) => void;
  onSaveDrop: (event: FormEvent) => void;
  onSaveMerchant: (event: FormEvent) => void;
  onSaveEngagementEvent: (event: FormEvent) => void;
  onClearEngagementEvent: () => void;
};

export function AdminEconomyPanel({
  working,
  mobHits,
  bossHits,
  refineDropPct,
  dropPct,
  bagPrice,
  refinerPrice,
  attrResetPrice,
  petDogPrice,
  petCatPrice,
  petParrotPrice,
  merchantOffersEnabled,
  eventLabel,
  eventXp,
  eventGold,
  eventDrop,
  eventEndsAt,
  catalogMeta,
  idleFetch,
  onMobHitsChange,
  onBossHitsChange,
  onRefineDropPctChange,
  onDropPctChange,
  onBagPriceChange,
  onRefinerPriceChange,
  onAttrResetPriceChange,
  onPetDogPriceChange,
  onPetCatPriceChange,
  onPetParrotPriceChange,
  onMerchantOfferEnabledChange,
  onEventLabelChange,
  onEventXpChange,
  onEventGoldChange,
  onEventDropChange,
  onEventEndsAtChange,
  onSaveBalance,
  onSaveDrop,
  onSaveMerchant,
  onSaveEngagementEvent,
  onClearEngagementEvent,
}: AdminEconomyPanelProps) {
  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">TTK / Refinador</CardTitle>
          <CardDescription>
            Hits para matar mob/boss e chance de Refinador no chefe da macro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSaveBalance} className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Hits mob</Label>
              <Input type="number" min={3} value={mobHits} onChange={(e) => onMobHitsChange(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hits boss</Label>
              <Input type="number" min={8} value={bossHits} onChange={(e) => onBossHitsChange(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Refinador %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={refineDropPct}
                onChange={(e) => onRefineDropPctChange(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={working} className="w-full">
                Salvar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mundo</CardTitle>
          <CardDescription>Chance de drop em farm (0–100%). Persistido no banco.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSaveDrop} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="admin-drop">Drop {dropPct}%</Label>
              <input
                id="admin-drop"
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={dropPct}
                onChange={(event) => onDropPctChange(Number(event.target.value))}
                className="w-full"
              />
            </div>
            <Button type="submit" disabled={working}>
              Salvar drop
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mercador</CardTitle>
          <CardDescription>
            Preços e disponibilidade da loja: mochila, Refinador, Reset de Pontos e pets.
            Inteiro ≥ 0 (aceita 20.000.000); sem teto artificial. Desmarque “À venda” para
            ocultar a oferta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSaveMerchant} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    id: "admin-bag-price",
                    label: "Expansão de mochila (gold)",
                    value: bagPrice,
                    onChange: onBagPriceChange,
                    sku: "bag_upgrade" as const,
                    wide: false,
                  },
                  {
                    id: "admin-refiner-price",
                    label: "Refinador (gold)",
                    value: refinerPrice,
                    onChange: onRefinerPriceChange,
                    sku: "refiner" as const,
                    wide: false,
                  },
                  {
                    id: "admin-attr-reset-price",
                    label: "Reset de Pontos (gold)",
                    value: attrResetPrice,
                    onChange: onAttrResetPriceChange,
                    sku: "attr_reset" as const,
                    wide: false,
                  },
                  {
                    id: "admin-pet-dog-price",
                    label: "Cachorro (gold)",
                    value: petDogPrice,
                    onChange: onPetDogPriceChange,
                    sku: "pet_dog" as const,
                    wide: false,
                  },
                  {
                    id: "admin-pet-cat-price",
                    label: "Gato (gold)",
                    value: petCatPrice,
                    onChange: onPetCatPriceChange,
                    sku: "pet_cat" as const,
                    wide: false,
                  },
                  {
                    id: "admin-pet-parrot-price",
                    label: "Papagaio (gold)",
                    value: petParrotPrice,
                    onChange: onPetParrotPriceChange,
                    sku: "pet_parrot" as const,
                    wide: true,
                  },
                ] as const
              ).map((row) => (
                <div
                  key={row.id}
                  className={row.wide ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor={row.id}>{row.label}</Label>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={merchantOffersEnabled[row.sku]}
                        onChange={(event) =>
                          onMerchantOfferEnabledChange(row.sku, event.target.checked)
                        }
                      />
                      À venda
                    </label>
                  </div>
                  <Input
                    id={row.id}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="ex.: 20000000 ou 20.000.000"
                    value={row.value}
                    onChange={(event) => row.onChange(event.target.value)}
                  />
                </div>
              ))}
            </div>
            <Button type="submit" disabled={working}>
              Salvar mercador
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Evento de engajamento</CardTitle>
          <CardDescription>
            Multiplica XP/ouro/drop do farm até a data (ex.: semana especial). Não é métrica de
            desempenho — só participação no IDLE.
            {catalogMeta?.engagementEvent
              ? ` Ativo: ${catalogMeta.engagementEvent.label} até ${new Date(catalogMeta.engagementEvent.endsAt).toLocaleString("pt-BR")}.`
              : " Nenhum evento ativo."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSaveEngagementEvent} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="admin-event-label">Rótulo</Label>
              <Input
                id="admin-event-label"
                value={eventLabel}
                onChange={(event) => onEventLabelChange(event.target.value)}
                placeholder="Semana de plantão"
                maxLength={80}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="admin-event-xp">XP ×</Label>
                <Input
                  id="admin-event-xp"
                  type="number"
                  min={1}
                  max={3}
                  step={0.05}
                  value={eventXp}
                  onChange={(event) => onEventXpChange(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-event-gold">Ouro ×</Label>
                <Input
                  id="admin-event-gold"
                  type="number"
                  min={1}
                  max={3}
                  step={0.05}
                  value={eventGold}
                  onChange={(event) => onEventGoldChange(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-event-drop">Drop ×</Label>
                <Input
                  id="admin-event-drop"
                  type="number"
                  min={1}
                  max={3}
                  step={0.05}
                  value={eventDrop}
                  onChange={(event) => onEventDropChange(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-event-ends">Termina em</Label>
              <Input
                id="admin-event-ends"
                type="datetime-local"
                value={eventEndsAt}
                onChange={(event) => onEventEndsAtChange(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={working || !eventLabel.trim()}>
                Ativar evento
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={working || !catalogMeta?.engagementEvent}
                onClick={() => void onClearEngagementEvent()}
              >
                Encerrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AdminActionsHistory idleFetch={idleFetch} />
    </div>
  );
}
