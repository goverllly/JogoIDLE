import { useEffect, useMemo, useState } from "react";
import { StudioEmpty } from "./studio/studio-ui";

type AdminActionRow = {
  at: string;
  adminEmail: string;
  action: string;
  summary: string;
};

type AdminActionsHistoryProps = {
  idleFetch: (path: string, init?: RequestInit) => Promise<any>;
};

export function AdminActionsHistory({ idleFetch }: AdminActionsHistoryProps) {
  const [rows, setRows] = useState<AdminActionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await idleFetch("/api/jogo-idle/admin/actions?limit=50");
        if (cancelled) return;
        const list = Array.isArray(data?.actions) ? data.actions : Array.isArray(data) ? data : [];
        setRows(list);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Falha ao carregar histórico");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idleFetch]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => `${row.action} ${row.summary} ${row.adminEmail}`.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="ops">
      <header className="ops-head">
        <div>
          <p className="ed-kicker">Sistema</p>
          <h2>Logs</h2>
        </div>
        <input className="studio-2-input ops-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar ação, alvo ou responsável" />
      </header>
      <p className="ed-note">Últimas 50 ações. O histórico não é editável. O filtro usa só ação, resumo e e-mail.</p>
      {loading ? <StudioEmpty>Carregando histórico…</StudioEmpty> : null}
      {error ? <p className="ed-note">{error}</p> : null}
      {!loading && !error && visible.length === 0 ? <StudioEmpty>Nenhuma ação registrada.</StudioEmpty> : null}
      {visible.length > 0 ? (
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Responsável</th>
                <th>Ação</th>
                <th>Resumo</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row, idx) => (
                <tr key={`${row.at}-${idx}`}>
                  <td>{row.at ? new Date(row.at).toLocaleString("pt-BR") : "—"}</td>
                  <td>{row.adminEmail || "—"}</td>
                  <td>{row.action || "—"}</td>
                  <td>{row.summary || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
