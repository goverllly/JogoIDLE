
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminActiveCharacter } from "./admin-types";

type AdminCharactersPanelProps = {
  activeCharacters: AdminActiveCharacter[];
  target: AdminActiveCharacter | null;
  addGold: string;
  setLevel: string;
  grantPoints: string;
  working: boolean;
  onTargetChange: (id: string) => void;
  onAddGoldChange: (value: string) => void;
  onSetLevelChange: (value: string) => void;
  onGrantPointsChange: (value: string) => void;
  onCharacter: (payload: Record<string, unknown>) => Promise<void>;
  onDeleteCharacter: () => Promise<void>;
};

export function AdminCharactersPanel({
  activeCharacters,
  target,
  addGold,
  setLevel,
  grantPoints,
  working,
  onTargetChange,
  onAddGoldChange,
  onSetLevelChange,
  onGrantPointsChange,
  onCharacter,
  onDeleteCharacter,
}: AdminCharactersPanelProps) {
  const [grantCosmeticId, setGrantCosmeticId] = useState("cape_celestial");
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <Card className="border-border/70 bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Personagens ativos</CardTitle>
        <CardDescription>
          Todos os personagens marcados como ativos no IDLE (qualquer conta). Selecione o alvo das
          ações admin, inclusive exclusão.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="admin-target">Personagem</Label>
          <select
            id="admin-target"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={target?.id || ""}
            onChange={(event) => onTargetChange(event.target.value)}
            disabled={!activeCharacters.length}
          >
            {!activeCharacters.length ? (
              <option value="">Nenhum personagem ativo</option>
            ) : (
              activeCharacters.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {row.className} · Lv.{row.level} ·{" "}
                  {(row.userName || "conta").toString()} · {row.gold.toLocaleString("pt-BR")} gold
                </option>
              ))
            )}
          </select>
        </div>
        {target ? (
          <p className="text-xs text-muted-foreground">
            {target.userEmail || "sem e-mail"}
            {target.lastSeenAt
              ? ` · visto ${new Date(target.lastSeenAt).toLocaleString("pt-BR")}`
              : ""}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="admin-gold">Adicionar ouro (+/−)</Label>
            <Input
              id="admin-gold"
              type="number"
              value={addGold}
              onChange={(event) => onAddGoldChange(event.target.value)}
            />
          </div>
          <Button
            type="button"
            className="self-end"
            disabled={working || !target}
            onClick={() => void onCharacter({ addGold: Number(addGold) })}
          >
            Aplicar ouro
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="admin-level">Definir nível (1–700)</Label>
            <Input
              id="admin-level"
              type="number"
              min={1}
              max={700}
              value={setLevel}
              onChange={(event) => onSetLevelChange(event.target.value)}
            />
          </div>
          <Button
            type="button"
            className="self-end"
            disabled={working || !target}
            onClick={() => void onCharacter({ setLevel: Number(setLevel) })}
          >
            Aplicar nível
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="admin-points">Conceder pontos livres</Label>
            <Input
              id="admin-points"
              type="number"
              min={1}
              value={grantPoints}
              onChange={(event) => onGrantPointsChange(event.target.value)}
            />
          </div>
          <Button
            type="button"
            className="self-end"
            disabled={working || !target}
            onClick={() => void onCharacter({ grantPoints: Number(grantPoints) })}
          >
            Conceder
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="admin-cosmetic">Conceder cosmético</Label>
            <select
              id="admin-cosmetic"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={grantCosmeticId}
              disabled={working || !target}
              onChange={(event) => setGrantCosmeticId(event.target.value)}
            >
              <option value="cape_celestial">Manto Celestial</option>
              <option value="cape_ember">Manto de Brasas</option>
              <option value="cape_mist">Véu da Névoa</option>
              <option value="tint_gold">Brilho Dourado</option>
              <option value="tint_obsidian">Obsidiana</option>
              <option value="tint_jade">Jade</option>
            </select>
          </div>
          <Button
            type="button"
            className="self-end"
            disabled={working || !target}
            onClick={() => void onCharacter({ grantCosmeticId })}
          >
            Conceder cosmético
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={working || !target}
            onClick={() => {
              if (!window.confirm("Limpar mochila e equipamento deste personagem?")) return;
              void onCharacter({ clearInventory: true });
            }}
          >
            Limpar mochila
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={working || !target}
            onClick={() => setConfirmDelete(true)}
          >
            Excluir personagem
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir personagem de outra conta?</AlertDialogTitle>
            <AlertDialogDescription>
              {target
                ? `Isso apaga permanentemente ${target.name} · ${target.className} · Lv.${target.level} da conta ${target.userName || target.userEmail || "desconhecida"} (${target.userEmail || "sem e-mail"}). Ouro, XP, mochila e equipamento serão perdidos. Não pode ser desfeito.`
                : "Selecione um personagem."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={working || !target}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void (async () => {
                  await onDeleteCharacter();
                  setConfirmDelete(false);
                })();
              }}
            >
              {working ? "Excluindo…" : "Excluir permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
