
import { FormEvent, useMemo, useState } from "react";
import { StudioBtn, StudioCard, StudioEmpty } from "./studio/studio-ui";
import type { AdminZone } from "./admin-types";

type SimulateResult = {
  zoneName: string;
  monsterName: string;
  isBoss: boolean;
  avgTtkMs: number;
  avgHitsToKill: number;
  avgDamageTaken: number;
  xpPerHour: number;
  goldPerHour: number;
  estimatedDropChance: number;
  notes: string[];
  monster: { hp: number; attack: number; defense: number; xp: number; gold: number };
};

type AdminSimulatePanelProps = {
  zones: AdminZone[];
  working: boolean;
  idleFetch: (path: string, init?: RequestInit) => Promise<any>;
  onMessage: (msg: string | null) => void;
};

export function AdminSimulatePanel({
  zones,
  working,
  idleFetch,
  onMessage,
}: AdminSimulatePanelProps) {
  const [zoneId, setZoneId] = useState(zones[0]?.id || "");
  const zone = useMemo(() => zones.find((z) => z.id === zoneId) || zones[0], [zones, zoneId]);
  const [monsterKey, setMonsterKey] = useState<string>("0");
  const [level, setLevel] = useState(String(zone?.minLevel || 1));
  const [attack, setAttack] = useState("40");
  const [defense, setDefense] = useState("10");
  const [maxHp, setMaxHp] = useState("400");
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [busy, setBusy] = useState(false);

  const monsterOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    (zone?.monsters || []).forEach((m, i) => {
      opts.push({ value: String(i), label: `${m.name} (Lv ${m.level})` });
    });
    if (zone?.boss) {
      opts.push({ value: "boss", label: `BOSS · ${zone.boss.name}` });
    }
    return opts;
  }, [zone]);

  async function onRun(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    onMessage(null);
    try {
      const data = await idleFetch("/api/sinergia-idle/admin/simulate", {
        method: "POST",
        body: JSON.stringify({
          zoneId: zone?.id || zoneId,
          monsterKey: monsterKey === "boss" ? "boss" : Number(monsterKey),
          hero: {
            level: Number(level),
            attack: Number(attack),
            defense: Number(defense),
            maxHp: Number(maxHp),
          },
          iterations: 50,
        }),
      });
      if (!data?.success) throw new Error(data?.error || "Falha na simulação");
      setResult(data.simulation);
      onMessage("Simulação concluída (nada foi gravado).");
    } catch (err) {
      setResult(null);
      onMessage(err instanceof Error ? err.message : "Erro na simulação");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
      <StudioCard>
        <h3 className="studio-2-section-title">Perfil × monstro</h3>
        <form onSubmit={onRun} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="studio-2-label">Zona</label>
            <select
              className="studio-2-select"
              value={zone?.id || zoneId}
              onChange={(e) => {
                setZoneId(e.target.value);
                setMonsterKey("0");
              }}
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="studio-2-label">Alvo</label>
            <select
              className="studio-2-select"
              value={monsterKey}
              onChange={(e) => setMonsterKey(e.target.value)}
            >
              {monsterOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="studio-2-label">Nível herói</label>
            <input className="studio-2-input" value={level} onChange={(e) => setLevel(e.target.value)} />
          </div>
          <div>
            <label className="studio-2-label">Ataque</label>
            <input className="studio-2-input" value={attack} onChange={(e) => setAttack(e.target.value)} />
          </div>
          <div>
            <label className="studio-2-label">Defesa</label>
            <input className="studio-2-input" value={defense} onChange={(e) => setDefense(e.target.value)} />
          </div>
          <div>
            <label className="studio-2-label">HP máx.</label>
            <input className="studio-2-input" value={maxHp} onChange={(e) => setMaxHp(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <StudioBtn variant="gold" disabled={busy || working} type="submit">
              {busy ? "Simulando…" : "Rodar simulação"}
            </StudioBtn>
          </div>
        </form>
      </StudioCard>

      <StudioCard>
        <h3 className="studio-2-section-title">Resultado</h3>
        {!result ? (
          <StudioEmpty>Execute uma simulação para ver TTK e ritmo de farm.</StudioEmpty>
        ) : (
          <dl className="space-y-2 text-[0.8rem]">
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--studio-muted)]">Alvo</dt>
              <dd>
                {result.monsterName}
                {result.isBoss ? " (boss)" : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--studio-muted)]">TTK médio</dt>
              <dd className="tabular-nums">{(result.avgTtkMs / 1000).toFixed(1)}s</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--studio-muted)]">Hits</dt>
              <dd className="tabular-nums">{result.avgHitsToKill}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--studio-muted)]">Dano recebido</dt>
              <dd className="tabular-nums">{result.avgDamageTaken}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--studio-muted)]">XP / h</dt>
              <dd className="tabular-nums">{result.xpPerHour.toLocaleString("pt-BR")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--studio-muted)]">Ouro / h</dt>
              <dd className="tabular-nums">{result.goldPerHour.toLocaleString("pt-BR")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--studio-muted)]">Drop est.</dt>
              <dd className="tabular-nums">
                {(Math.round(result.estimatedDropChance * 1000) / 10).toFixed(1)}%
              </dd>
            </div>
            <ul className="mt-2 space-y-1 text-[0.68rem] text-[var(--studio-muted)]">
              {result.notes.map((n) => (
                <li key={n}>· {n}</li>
              ))}
            </ul>
          </dl>
        )}
      </StudioCard>
    </div>
  );
}
