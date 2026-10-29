import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { AdminActiveCharacter } from "./admin-types";
import { StudioBtn, StudioEmpty, StudioModal } from "./studio/studio-ui";

type AdminCharactersPanelProps = {
  activeCharacters: AdminActiveCharacter[];
  target: AdminActiveCharacter | null;
  working: boolean;
  error: string | null;
  onTargetChange: (id: string) => void;
  onCharacter: (payload: Record<string, unknown>) => Promise<boolean>;
  onDeleteCharacter: (characterId: string) => Promise<boolean>;
};

type Ask =
  | { kind: "gold"; id: string; name: string; gold: number; delta: string }
  | { kind: "level"; id: string; name: string; level: number; ascension: string | null; next: string }
  | { kind: "points"; id: string; name: string; points: string }
  | { kind: "cosmetic"; id: string; name: string; cosmeticId: string }
  | { kind: "clear"; id: string; name: string }
  | { kind: "delete"; id: string; name: string };

const COSMETICS = [
  ["cape_celestial", "Manto Celestial"],
  ["cape_ember", "Manto de Brasas"],
  ["cape_mist", "Véu da Névoa"],
  ["tint_gold", "Brilho Dourado"],
  ["tint_obsidian", "Obsidiana"],
  ["tint_jade", "Jade"],
] as const;

function levelCap(ascension: string | null | undefined) {
  return ascension ? 700 : 500;
}

export function AdminCharactersPanel({
  activeCharacters,
  target,
  working,
  error,
  onTargetChange,
  onCharacter,
  onDeleteCharacter,
}: AdminCharactersPanelProps) {
  const [query, setQuery] = useState("");
  const [gold, setGold] = useState("1000");
  const [level, setLevel] = useState(String(target?.level || 1));
  const [points, setPoints] = useState("10");
  const [cosmeticId, setCosmeticId] = useState<string>(COSMETICS[0][0]);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [tried, setTried] = useState(false);
  const sending = useRef(false);

  useEffect(() => {
    if (target) setLevel(String(target.level));
  }, [target?.id, target?.level]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeCharacters;
    return activeCharacters.filter((row) =>
      `${row.name} ${row.className} ${row.id} ${row.userName || ""}`.toLowerCase().includes(q),
    );
  }, [activeCharacters, query]);

  function select(row: AdminActiveCharacter) {
    onTargetChange(row.id);
    setLevel(String(row.level));
  }

  function open(next: Ask) {
    setTried(false);
    setAsk(next);
  }

  async function confirm() {
    if (!ask || sending.current) return;
    if (ask.kind === "gold" && goldNext == null) return;
    sending.current = true;
    setTried(true);
    try {
      const ok =
        ask.kind === "delete"
          ? await onDeleteCharacter(ask.id)
          : await onCharacter(
              ask.kind === "gold"
                ? { characterId: ask.id, addGold: Number(ask.delta) }
                : ask.kind === "level"
                  ? { characterId: ask.id, setLevel: Number(ask.next) }
                  : ask.kind === "points"
                    ? { characterId: ask.id, grantPoints: Number(ask.points) }
                    : ask.kind === "cosmetic"
                      ? { characterId: ask.id, grantCosmeticId: ask.cosmeticId }
                      : { characterId: ask.id, clearInventory: true },
            );
      if (ok) setAsk(null);
    } finally {
      sending.current = false;
    }
  }

  const goldDelta = Math.floor(Number(ask?.kind === "gold" ? ask.delta : ""));
  const goldNext =
    ask?.kind === "gold" && Number.isFinite(goldDelta) && goldDelta !== 0
      ? Math.max(0, ask.gold + goldDelta)
      : null;
  const cap = levelCap(target?.ascension);

  return (
    <div className="ops ops-players">
      <header className="ops-head">
        <div>
          <p className="ed-kicker">Jogadores</p>
          <h2>Personagens ativos</h2>
        </div>
        <input className="studio-2-input ops-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar nome, classe ou id" />
      </header>
      <p className="ed-note">A lista é a de personagens ativos neste standalone. Não é o cadastro completo de contas.</p>
      <div className="ops-split">
        <aside className="ops-list">
          {rows.length === 0 ? (
            <StudioEmpty>{activeCharacters.length ? "Nenhum personagem com essa busca." : "Nenhum personagem ativo."}</StudioEmpty>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                className={cn("ops-person", target?.id === row.id && "is-selected")}
                onClick={() => select(row)}
              >
                <strong>{row.name}</strong>
                <span>{row.className} · Nv {row.level} · {row.classification || (row.ascension ? "ascendido" : "mortal")}</span>
                <span>{row.gold.toLocaleString("pt-BR")} ouro · {row.id}</span>
              </button>
            ))
          )}
        </aside>
        <section className="ops-sheet">
          {!target ? (
            <StudioEmpty>Selecione um personagem da lista.</StudioEmpty>
          ) : (
            <>
              <h3>{target.name}</h3>
              <p className="ed-note">{target.id} · {target.userEmail || target.userName || "conta local"}{target.lastSeenAt ? ` · visto ${new Date(target.lastSeenAt).toLocaleString("pt-BR")}` : ""}</p>
              <dl className="ops-facts">
                <div><dt>Classe</dt><dd>{target.className}</dd></div>
                <div><dt>Nível</dt><dd>{target.level}</dd></div>
                <div><dt>Classificação</dt><dd>{target.classification || (target.ascension ? String(target.ascension) : "Mortal")}</dd></div>
                <div><dt>Ouro</dt><dd>{target.gold.toLocaleString("pt-BR")}</dd></div>
                <div><dt>Pontos livres</dt><dd>{target.unspentPoints ?? "—"}</dd></div>
              </dl>

              <div className="ops-form">
                <label>
                  Ajuste de ouro (+/−)
                  <input className="studio-2-input" type="number" value={gold} onChange={(e) => setGold(e.target.value)} />
                </label>
                <StudioBtn type="button" disabled={working} onClick={() => open({ kind: "gold", id: target.id, name: target.name, gold: target.gold, delta: gold })}>
                  Revisar ouro
                </StudioBtn>
                <label>
                  Novo nível (1–{cap})
                  <input className="studio-2-input" type="number" min={1} max={cap} value={level} onChange={(e) => setLevel(e.target.value)} />
                </label>
                <StudioBtn type="button" disabled={working} onClick={() => open({ kind: "level", id: target.id, name: target.name, level: target.level, ascension: target.ascension || null, next: level })}>
                  Revisar nível
                </StudioBtn>
                <label>
                  Pontos livres a conceder
                  <input className="studio-2-input" type="number" min={1} value={points} onChange={(e) => setPoints(e.target.value)} />
                </label>
                <StudioBtn type="button" disabled={working} onClick={() => open({ kind: "points", id: target.id, name: target.name, points })}>
                  Revisar pontos
                </StudioBtn>
                <label>
                  Cosmético
                  <select className="studio-2-select" value={cosmeticId} onChange={(e) => setCosmeticId(e.target.value)}>
                    {COSMETICS.map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </label>
                <StudioBtn type="button" disabled={working} onClick={() => open({ kind: "cosmetic", id: target.id, name: target.name, cosmeticId })}>
                  Revisar cosmético
                </StudioBtn>
              </div>
              <div className="ops-form__bar">
                <StudioBtn type="button" disabled={working} onClick={() => open({ kind: "clear", id: target.id, name: target.name })}>Limpar mochila</StudioBtn>
                <StudioBtn variant="danger" type="button" disabled={working} onClick={() => open({ kind: "delete", id: target.id, name: target.name })}>Excluir personagem</StudioBtn>
              </div>
            </>
          )}
        </section>
      </div>

      <StudioModal
        open={ask != null}
        title={
          ask?.kind === "delete" ? "Excluir personagem" :
          ask?.kind === "clear" ? "Limpar mochila" :
          ask?.kind === "gold" ? "Alterar ouro" :
          ask?.kind === "level" ? "Alterar nível" :
          ask?.kind === "points" ? "Conceder pontos" : "Conceder cosmético"
        }
        description={ask ? `${ask.name} · ${ask.id}` : undefined}
        busy={working}
        error={tried ? error : null}
        dismissable={!working}
        onClose={() => !working && setAsk(null)}
        footer={
          <>
            <StudioBtn type="button" disabled={working} onClick={() => setAsk(null)}>Cancelar</StudioBtn>
            <StudioBtn variant={ask?.kind === "delete" || ask?.kind === "clear" ? "danger" : "gold"} type="button" loading={working} disabled={goldNext == null && ask?.kind === "gold"} onClick={() => void confirm()}>
              Confirmar
            </StudioBtn>
          </>
        }
      >
        {ask?.kind === "gold" ? (
          <p>Ouro atual {ask.gold.toLocaleString("pt-BR")}. Ajuste {ask.delta}. {goldNext != null ? `Ouro esperado: ${goldNext.toLocaleString("pt-BR")}.` : "Informe um inteiro diferente de zero."} Nada é gravado antes da confirmação.</p>
        ) : null}
        {ask?.kind === "level" ? (
          <p>Nível atual {ask.level}. Novo nível {ask.next}. O servidor aceita de 1 a {levelCap(ask.ascension)} para esta classificação. Definir nível zera a experiência, devolve os atributos da classe e recalcula os pontos livres.</p>
        ) : null}
        {ask?.kind === "points" ? <p>Serão somados {ask.points} pontos livres ao total atual. O nível não muda.</p> : null}
        {ask?.kind === "cosmetic" ? <p>O cosmético {ask.cosmeticId} será desbloqueado para este personagem.</p> : null}
        {ask?.kind === "clear" ? <p>A mochila e o equipamento de {ask.name} serão esvaziados. O personagem em si permanece.</p> : null}
        {ask?.kind === "delete" ? <p>O personagem {ask.name} será removido. A confirmação usa este id, mesmo que a lista mude depois.</p> : null}
      </StudioModal>
    </div>
  );
}
