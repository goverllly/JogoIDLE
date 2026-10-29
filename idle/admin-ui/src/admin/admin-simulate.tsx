
import { FormEvent, useMemo, useState } from "react";
import { StudioBtn, StudioEmpty } from "./studio/studio-ui";
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
  dropPct: number;
  mobHits: string;
  bossHits: string;
  refineDropPct: string;
  idleFetch: (path: string, init?: RequestInit) => Promise<any>;
  onMessage: (msg: string | null) => void;
  onOpenLiveOps: () => void;
};

export function AdminSimulatePanel({
  zones,
  working,
  dropPct,
  mobHits,
  bossHits,
  refineDropPct,
  idleFetch,
  onMessage,
  onOpenLiveOps,
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
      const data = await idleFetch("/api/jogo-idle/admin/simulate", {
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
    <div className="ops">
      <header className="ops-head">
        <div>
          <p className="ed-kicker">Laboratório</p>
          <h2>Simulador</h2>
        </div>
      </header>
      <p className="ed-note">
        Referência atual: drop {dropPct.toFixed(1)}%, mob {mobHits} golpes, boss {bossHits} golpes, refinador {refineDropPct}%.{" "}
        <button type="button" className="ops-inline" onClick={onOpenLiveOps}>Editar em Live Ops</button>
      </p>
      <div className="ops-two">
      <section className="ops-panel">
        <div className="ops-panel__head"><h3>Configuração</h3><p>A simulação não grava personagem nem mundo.</p></div>
        <form onSubmit={onRun} className="ops-form">
          <label>
            Zona
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
          </label>
          <label>
            Monstro
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
          </label>
          <label>
            Nível
            <input className="studio-2-input" value={level} onChange={(e) => setLevel(e.target.value)} />
          </label>
          <label>
            ATK
            <input className="studio-2-input" value={attack} onChange={(e) => setAttack(e.target.value)} />
          </label>
          <label>
            DEF
            <input className="studio-2-input" value={defense} onChange={(e) => setDefense(e.target.value)} />
          </label>
          <label>
            HP
            <input className="studio-2-input" value={maxHp} onChange={(e) => setMaxHp(e.target.value)} />
          </label>
          <div className="ops-form__bar ops-span-2">
            <span>50 iterações no motor atual.</span>
            <StudioBtn variant="gold" loading={busy} disabled={working} type="submit">Simular</StudioBtn>
          </div>
        </form>
      </section>

      <section className="ops-panel">
        <div className="ops-panel__head"><h3>Resultados</h3></div>
        {!result ? (
          <StudioEmpty>Execute uma simulação para ver TTK e ritmo de farm.</StudioEmpty>
        ) : (
          <>
          <dl className="ops-facts">
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
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--studio-muted)]">Monstro</dt>
              <dd className="tabular-nums">HP {result.monster?.hp ?? "—"} · ATK {result.monster?.attack ?? "—"} · DEF {result.monster?.defense ?? "—"}</dd>
            </div>
            </dl>
            <ul className="ed-note">
              {(result.notes || []).map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </>
        )}
      </section>
      </div>
    </div>
  );
}
