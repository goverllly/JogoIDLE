
import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SeasonSummary } from "./admin-types";

type AdminSeasonPanelProps = {
  seasonLoading: boolean;
  currentSeason: SeasonSummary | null;
  seasonNotes: string;
  seasonConfirm: string;
  working: boolean;
  onSeasonNotesChange: (value: string) => void;
  onSeasonConfirmChange: (value: string) => void;
  onEndSeason: (event: FormEvent) => void;
};

export function AdminSeasonPanel({
  seasonLoading,
  currentSeason,
  seasonNotes,
  seasonConfirm,
  working,
  onSeasonNotesChange,
  onSeasonConfirmChange,
  onEndSeason,
}: AdminSeasonPanelProps) {
  return (
    <Card className="border-border/70 bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Temporada</CardTitle>
        <CardDescription>
          4 temporadas por ano (T1–T4). Encerrar grava o ranking histórico e faz soft-reset de
          todos os personagens (preserva nome, classe e aparência).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {seasonLoading ? (
          <p className="text-sm text-muted-foreground">Carregando temporada…</p>
        ) : currentSeason ? (
          <>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Slug · </span>
                <span className="font-medium text-foreground">{currentSeason.slug}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Status · </span>
                <span className="font-medium text-foreground">{currentSeason.status}</span>
              </p>
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Label · </span>
                <span className="font-medium text-foreground">{currentSeason.label}</span>
              </p>
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Aberta em {new Date(currentSeason.openedAt).toLocaleString("pt-BR")}
              </p>
            </div>
            <form className="space-y-3" onSubmit={(event) => void onEndSeason(event)}>
              <div className="space-y-1.5">
                <Label htmlFor="season-notes">Notas / changelog (opcional)</Label>
                <Textarea
                  id="season-notes"
                  value={seasonNotes}
                  onChange={(event) => onSeasonNotesChange(event.target.value)}
                  rows={3}
                  placeholder="O que mudou nesta temporada…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="season-confirm">
                  Confirmação — digite <span className="font-mono">{currentSeason.slug}</span> ou
                  &quot;resetar progresso de todos&quot;
                </Label>
                <Input
                  id="season-confirm"
                  value={seasonConfirm}
                  onChange={(event) => onSeasonConfirmChange(event.target.value)}
                  autoComplete="off"
                  placeholder={currentSeason.slug}
                />
              </div>
              <Button type="submit" variant="destructive" disabled={working || !seasonConfirm.trim()}>
                Encerrar temporada e resetar progresso
              </Button>
            </form>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma temporada aberta encontrada.</p>
        )}
      </CardContent>
    </Card>
  );
}
