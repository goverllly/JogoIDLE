
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await idleFetch("/api/sinergia-idle/admin/actions?limit=50");
        if (cancelled) return;
        const list = Array.isArray(data?.actions)
          ? data.actions
          : Array.isArray(data)
            ? data
            : [];
        setRows(list);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar histórico");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idleFetch]);

  return (
    <Card className="border-border/70 bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Histórico de ações admin</CardTitle>
        <CardDescription>Últimas 50 operações registradas no IDLE.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando histórico…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma ação registrada.</p>
        ) : (
          <div className="max-h-[40vh] overflow-auto rounded-lg border border-border/70">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 bg-card text-muted-foreground">
                <tr className="border-b border-border/70">
                  <th className="px-3 py-2 font-medium">Quando</th>
                  <th className="px-3 py-2 font-medium">Admin</th>
                  <th className="px-3 py-2 font-medium">Ação</th>
                  <th className="px-3 py-2 font-medium">Resumo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`${row.at}-${idx}`} className="border-t border-border/50">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {row.at ? new Date(row.at).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">{row.adminEmail || "—"}</td>
                    <td className="px-3 py-2 font-medium">{row.action || "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{row.summary || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
