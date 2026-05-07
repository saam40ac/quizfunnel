import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getWorkspaceDetails } from "@/lib/admin-analytics";
import { PLANS } from "@/lib/plans";

export default async function WorkspaceDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { msg?: string };
}) {
  const session = await auth();
  if ((session!.user as any).role !== "SUPER_ADMIN") redirect("/dashboard");

  const data = await getWorkspaceDetails(params.id);
  if (!data.workspace) notFound();

  async function changePlanAction(formData: FormData) {
    "use server";
    const newPlan = String(formData.get("plan")) as any;
    await prisma.workspace.update({
      where: { id: params.id },
      data: { plan: newPlan },
    });
    revalidatePath(`/admin/workspaces/${params.id}`);
  }

  async function deleteWorkspaceAction() {
    "use server";
    // Cascade delete via Prisma
    await prisma.workspace.delete({ where: { id: params.id } });
    redirect("/admin?msg=Workspace+eliminato");
  }

  const ws = data.workspace;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs text-ink/50">
            ← Tutti i workspace
          </Link>
          <h1 className="mt-1 font-display text-3xl">{ws.name}</h1>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-ink/60">
            <span className="font-mono">{ws.slug}</span>
            <span>·</span>
            <span>
              Piano <strong>{PLANS[ws.plan as any].name}</strong>
            </span>
            <span>·</span>
            <span>Creato il {ws.createdAt.toLocaleDateString("it-IT")}</span>
            {ws.billingEmail && (
              <>
                <span>·</span>
                <span>Billing: {ws.billingEmail}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-right">
          <form action={changePlanAction} className="flex gap-2">
            <select
              name="plan"
              defaultValue={ws.plan}
              className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm"
            >
              <option value="FREE">FREE</option>
              <option value="PRO">PRO</option>
              <option value="BUSINESS">BUSINESS</option>
            </select>
            <button className="btn-primary text-sm">Cambia piano</button>
          </form>
          <form action={deleteWorkspaceAction}>
            <button className="text-xs text-red-600 hover:underline">
              🗑 Elimina workspace
            </button>
          </form>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <Stat label="Quiz creati" value={data.quizzes.length} />
        <Stat label="Lead totali" value={data.leadsTotal} />
        <Stat label="Costi AI" value={`€${data.aiCostTotal.toFixed(4)}`} />
        <Stat label="Utenti" value={data.users.length} />
      </div>

      {/* Utenti */}
      <Section title="Utenti del workspace">
        <table className="w-full text-sm">
          <thead className="bg-ink/5 text-left text-xs uppercase tracking-wider text-ink/60">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Ruolo</th>
              <th className="px-3 py-2">Registrato</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id} className="border-t border-ink/5">
                <td className="px-3 py-2">{u.name || "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{u.email}</td>
                <td className="px-3 py-2 text-xs">{u.role}</td>
                <td className="px-3 py-2 text-xs text-ink/60">
                  {u.createdAt.toLocaleDateString("it-IT")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Quiz */}
      <Section title="Quiz">
        {data.quizzes.length === 0 ? (
          <p className="p-3 text-sm text-ink/50">Nessun quiz ancora.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-left text-xs uppercase tracking-wider text-ink/60">
              <tr>
                <th className="px-3 py-2">Titolo</th>
                <th className="px-3 py-2">Stato</th>
                <th className="px-3 py-2 text-right">Domande</th>
                <th className="px-3 py-2 text-right">Lead</th>
                <th className="px-3 py-2">Aggiornato</th>
              </tr>
            </thead>
            <tbody>
              {data.quizzes.map((q) => (
                <tr key={q.id} className="border-t border-ink/5">
                  <td className="px-3 py-2">{q.title}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        q.status === "PUBLISHED"
                          ? "bg-green-100 text-green-800"
                          : "bg-ink/10 text-ink/60"
                      }`}
                    >
                      {q.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {q._count.questions}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {q._count.leads}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink/60">
                    {q.updatedAt.toLocaleDateString("it-IT")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Subscriptions */}
      <Section title="Storico abbonamenti">
        {data.subscriptions.length === 0 ? (
          <p className="p-3 text-sm text-ink/50">
            Nessun abbonamento (o utente FREE che non ha mai pagato).
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-left text-xs uppercase tracking-wider text-ink/60">
              <tr>
                <th className="px-3 py-2">Piano</th>
                <th className="px-3 py-2">Stato</th>
                <th className="px-3 py-2">Email pagamento</th>
                <th className="px-3 py-2">Inizio</th>
                <th className="px-3 py-2">Cancellato</th>
              </tr>
            </thead>
            <tbody>
              {data.subscriptions.map((s) => (
                <tr key={s.id} className="border-t border-ink/5">
                  <td className="px-3 py-2">{PLANS[s.plan as any].name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        s.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-ink/10 text-ink/60"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{s.billingEmail}</td>
                  <td className="px-3 py-2 text-xs">
                    {s.startedAt.toLocaleDateString("it-IT")}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink/60">
                    {s.cancelledAt
                      ? s.cancelledAt.toLocaleDateString("it-IT")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Webhook events */}
      <Section title="Eventi webhook recenti (ultimi 20)">
        {data.webhookEvents.length === 0 ? (
          <p className="p-3 text-sm text-ink/50">
            Nessun webhook registrato per questo workspace.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-left text-xs uppercase tracking-wider text-ink/60">
              <tr>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Tag</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Stato</th>
                <th className="px-3 py-2">Quando</th>
              </tr>
            </thead>
            <tbody>
              {data.webhookEvents.map((ev) => (
                <tr key={ev.id} className="border-t border-ink/5">
                  <td className="px-3 py-2 font-mono text-[10px]">{ev.eventType}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">
                    {ev.tagName || "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px]">{ev.email}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        ev.status === "processed"
                          ? "bg-green-100 text-green-800"
                          : ev.status === "error"
                            ? "bg-red-100 text-red-800"
                            : "bg-ink/10 text-ink/60"
                      }`}
                      title={ev.errorMessage || undefined}
                    >
                      {ev.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-ink/60">
                    {ev.createdAt.toLocaleString("it-IT")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* AI usage */}
      <Section title={`Storico chiamate AI (ultime ${Math.min(data.aiLogs.length, 100)})`}>
        {data.aiLogs.length === 0 ? (
          <p className="p-3 text-sm text-ink/50">
            Nessuna chiamata AI registrata per questo workspace.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-left text-xs uppercase tracking-wider text-ink/60">
              <tr>
                <th className="px-3 py-2">Operazione</th>
                <th className="px-3 py-2">Modello</th>
                <th className="px-3 py-2 text-right">Tokens IN</th>
                <th className="px-3 py-2 text-right">Tokens OUT</th>
                <th className="px-3 py-2 text-right">Costo</th>
                <th className="px-3 py-2">Quando</th>
              </tr>
            </thead>
            <tbody>
              {data.aiLogs.slice(0, 30).map((log) => (
                <tr key={log.id} className="border-t border-ink/5">
                  <td className="px-3 py-2 font-mono text-[10px]">{log.operation}</td>
                  <td className="px-3 py-2 text-xs">{log.model}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums">
                    {log.inputTokens}
                  </td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums">
                    {log.outputTokens}
                  </td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums">
                    €{log.estimatedCostEur.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink/60">
                    {log.createdAt.toLocaleString("it-IT")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-widest text-ink/50">{label}</div>
      <div className="mt-1 font-display text-3xl">{value}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-lg">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white/60">
        {children}
      </div>
    </section>
  );
}
