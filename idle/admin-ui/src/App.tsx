import { useCallback, useEffect, useState } from "react";
import {
  SinergiaIdleAdmin,
  type AdminActiveCharacter,
  type AdminCatalogItem,
  type AdminCatalogMeta,
  type AdminZone,
} from "./SinergiaIdleAdmin";
import { Alert, AlertDescription } from "@/components/ui/alert";

async function idleFetch(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<AdminCatalogItem[]>([]);
  const [catalogMeta, setCatalogMeta] = useState<AdminCatalogMeta | null>(null);
  const [activeCharacters, setActiveCharacters] = useState<AdminActiveCharacter[]>([]);
  const [zones, setZones] = useState<AdminZone[]>([]);
  const [balance, setBalance] = useState<Record<string, number> | null>(null);
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [maintenance, setMaintenance] = useState({
    enabled: false,
    message: "",
    since: null as string | null,
  });

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const meta = await idleFetch("/api/sinergia-idle/meta");
      setCatalog(meta.adminCatalog || []);
      setCatalogMeta(meta.adminCatalogMeta || null);
      setActiveCharacters(meta.adminActiveCharacters || []);
      setZones(meta.zones || []);
      setBalance(meta.adminBalance || meta.balance || null);
      setAdminEmails(meta.adminEmails || []);
      setMaintenance(
        meta.maintenance || { enabled: false, message: "", since: null },
      );
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar meta");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error && !ready) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>
            {error}
            <div className="mt-3">
              <button className="underline" type="button" onClick={() => void refresh()}>
                Tentar de novo
              </button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!ready) {
    return <div className="p-8 text-muted-foreground">Carregando Admin Studio…</div>;
  }

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60 bg-card/40">
        <div>
          <div className="text-sm text-muted-foreground">Sinergia IDLE · standalone</div>
          <h1 className="text-lg font-semibold tracking-wide text-primary">Admin Studio</h1>
        </div>
        <a className="text-sm text-muted-foreground hover:text-foreground" href="/sinergia-idle/lobby.html">
          ← Lobby
        </a>
      </div>
      <SinergiaIdleAdmin
        catalog={catalog}
        catalogMeta={catalogMeta}
        activeCharacters={activeCharacters}
        zones={zones}
        balance={balance}
        adminEmails={adminEmails}
        busy={busy}
        message={message}
        onMessage={setMessage}
        onCatalogChange={(next, meta) => {
          setCatalog(next);
          if (meta !== undefined) setCatalogMeta(meta);
        }}
        onZonesChange={setZones}
        onBalanceChange={setBalance}
        onRefresh={refresh}
        idleFetch={idleFetch}
        maintenance={maintenance}
        onMaintenanceChange={setMaintenance}
      />
    </div>
  );
}
