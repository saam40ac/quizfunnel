"use client";

import { useState } from "react";

type SyncResult = {
  workspaceId: string;
  workspaceName: string;
  beforePlan: string;
  afterPlan: string;
  action: "kept" | "downgraded" | "error";
  errorMessage?: string;
};

type SyncResponse = {
  ok: boolean;
  summary: { total: number; kept: number; downgraded: number; errors: number };
  results: SyncResult[];
};

export function SyncClient() {
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSync() {
    if (
      !confirm(
        "Stai per riallineare tutti i workspace PRO/BUSINESS con Systeme.io. " +
          "I workspace senza tag attivo verranno automaticamente riportati a FREE.\n\n" +
          "Continuare?",
      )
    )
      return;

    setRunning(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch("/api/admin/sync-systeme", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore");
      setResponse(data);
    } catch (e: any) {
      setError(e.message || "Errore");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg">Esegui sync</h3>
          <p className="mt-1 text-sm text-ink/60">
            Click sul pulsante per controllare ogni workspace contro Systeme.io.
          </p>
        </div>
        <button
          onClick={runSync}
          disabled={running}
          className="btn-accent"
        >
          {running ? "Sincronizzazione…" : "🔄 Sincronizza ora"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {response && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-ink/5 p-3">
              <div className="font-display text-2xl">{response.summary.total}</div>
              <div className="text-[10px] uppercase tracking-widest text-ink/50">
                Controllati
              </div>
            </div>
            <div className="rounded-xl bg-green-50 p-3">
              <div className="font-display text-2xl text-green-800">
                {response.summary.kept}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-green-700">
                OK / mantenuti
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <div className="font-display text-2xl text-amber-800">
                {response.summary.downgraded}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-amber-700">
                Downgrade
              </div>
            </div>
            <div className="rounded-xl bg-red-50 p-3">
              <div className="font-display text-2xl text-red-800">
                {response.summary.errors}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-red-700">
                Errori
              </div>
            </div>
          </div>

          {response.results.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-ink/10">
              <table className="w-full text-sm">
                <thead className="bg-ink/5 text-left text-xs uppercase tracking-wider text-ink/60">
                  <tr>
                    <th className="px-3 py-2">Workspace</th>
                    <th className="px-3 py-2">Prima</th>
                    <th className="px-3 py-2">Dopo</th>
                    <th className="px-3 py-2">Azione</th>
                    <th className="px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {response.results.map((r) => (
                    <tr key={r.workspaceId} className="border-t border-ink/5">
                      <td className="px-3 py-2">{r.workspaceName}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.beforePlan}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.afterPlan}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ${
                            r.action === "kept"
                              ? "bg-green-100 text-green-800"
                              : r.action === "downgraded"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {r.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-ink/60">
                        {r.errorMessage || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
