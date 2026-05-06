import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BackupClient } from "./backup-client";

export default async function AdminBackupPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "SUPER_ADMIN") redirect("/dashboard");

  // Statistiche costi AI
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [logsThisMonth, allLogs, lastBackup] = await Promise.all([
    prisma.aIUsageLog.findMany({
      where: { createdAt: { gte: startOfMonth } },
      orderBy: { createdAt: "desc" },
    }),
    // Per ottenere la spesa per workspace negli ultimi 30 giorni
    prisma.aIUsageLog.findMany({
      where: {
        createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.aIUsageLog.findFirst({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalCostMonth = logsThisMonth.reduce((sum, l) => sum + l.estimatedCostEur, 0);
  const totalTokensInMonth = logsThisMonth.reduce(
    (sum, l) => sum + l.inputTokens + l.outputTokens,
    0,
  );
  const callsMonth = logsThisMonth.length;

  // Distribuzione per workspace
  const workspaces = await prisma.workspace.findMany();
  const wsMap = new Map(workspaces.map((w) => [w.id, w.name]));

  const costByWorkspace = new Map<string, { name: string; cost: number; calls: number }>();
  for (const log of allLogs) {
    if (!log.workspaceId) continue;
    const key = log.workspaceId;
    const existing = costByWorkspace.get(key) ?? {
      name: wsMap.get(key) || "(Workspace eliminato)",
      cost: 0,
      calls: 0,
    };
    existing.cost += log.estimatedCostEur;
    existing.calls += 1;
    costByWorkspace.set(key, existing);
  }

  const workspacesSorted = Array.from(costByWorkspace.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.cost - a.cost);

  // Distribuzione per operazione
  const costByOperation = new Map<string, number>();
  for (const log of logsThisMonth) {
    costByOperation.set(log.operation, (costByOperation.get(log.operation) ?? 0) + log.estimatedCostEur);
  }
  const operations = Array.from(costByOperation.entries())
    .map(([op, cost]) => ({ op, cost }))
    .sort((a, b) => b.cost - a.cost);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-xs text-ink/50">
            ← Admin
          </Link>
          <h1 className="mt-1 font-display text-3xl">Backup &amp; Costi</h1>
          <p className="mt-1 text-sm text-ink/60">
            Monitora i costi AI e proteggi i dati con backup periodici.
          </p>
        </div>
      </div>

      {/* Costi AI */}
      <section className="mb-8">
        <h2 className="font-display text-xl">Costi AI — mese corrente</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="card">
            <div className="text-xs uppercase tracking-widest text-ink/50">Costo stimato</div>
            <div className="mt-1 font-display text-4xl">
              €{totalCostMonth.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-ink/50">
              dal {startOfMonth.toLocaleDateString("it-IT")}
            </div>
          </div>
          <div className="card">
            <div className="text-xs uppercase tracking-widest text-ink/50">Token totali</div>
            <div className="mt-1 font-display text-4xl">
              {totalTokensInMonth.toLocaleString("it-IT")}
            </div>
            <div className="mt-1 text-xs text-ink/50">input + output</div>
          </div>
          <div className="card">
            <div className="text-xs uppercase tracking-widest text-ink/50">Chiamate AI</div>
            <div className="mt-1 font-display text-4xl">{callsMonth}</div>
            <div className="mt-1 text-xs text-ink/50">questo mese</div>
          </div>
        </div>

        {/* Per operazione */}
        {operations.length > 0 && (
          <div className="card mt-4">
            <h3 className="font-display text-lg">Per tipo di operazione</h3>
            <div className="mt-3 space-y-2">
              {operations.map((o) => (
                <div
                  key={o.op}
                  className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs">{o.op}</span>
                  <span className="font-semibold">€{o.cost.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per workspace */}
        {workspacesSorted.length > 0 && (
          <div className="card mt-4">
            <h3 className="font-display text-lg">Per workspace (ultimi 30 giorni)</h3>
            <table className="mt-3 w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-ink/50">
                <tr>
                  <th className="px-3 py-2 text-left">Workspace</th>
                  <th className="px-3 py-2 text-right">Chiamate</th>
                  <th className="px-3 py-2 text-right">Costo</th>
                </tr>
              </thead>
              <tbody>
                {workspacesSorted.slice(0, 20).map((w) => (
                  <tr key={w.id} className="border-t border-ink/5">
                    <td className="px-3 py-2 font-medium">{w.name}</td>
                    <td className="px-3 py-2 text-right">{w.calls}</td>
                    <td className="px-3 py-2 text-right">€{w.cost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {operations.length === 0 && (
          <p className="card mt-4 text-center text-sm text-ink/50">
            Nessuna chiamata AI registrata questo mese. Crea o rigenera un quiz/email per iniziare a vedere i costi.
          </p>
        )}
      </section>

      {/* Backup */}
      <BackupClient />
    </div>
  );
}
