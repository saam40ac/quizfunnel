import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { getGlobalAnalytics } from "@/lib/admin-analytics";
import { PLANS } from "@/lib/plans";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { plan?: string; q?: string; sort?: string };
}) {
  const session = await auth();
  if ((session!.user as any).role !== "SUPER_ADMIN") redirect("/dashboard");

  const planFilter = searchParams.plan;
  const searchQuery = searchParams.q;
  const sortBy = searchParams.sort || "recent";

  // Costruisci filtri Prisma
  const where: any = {};
  if (planFilter && ["FREE", "PRO", "BUSINESS"].includes(planFilter)) {
    where.plan = planFilter;
  }
  if (searchQuery) {
    where.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { slug: { contains: searchQuery, mode: "insensitive" } },
      { billingEmail: { contains: searchQuery, mode: "insensitive" } },
      { users: { some: { email: { contains: searchQuery, mode: "insensitive" } } } },
    ];
  }

  let orderBy: any = { createdAt: "desc" };
  if (sortBy === "name") orderBy = { name: "asc" };
  if (sortBy === "plan") orderBy = { plan: "asc" };

  const workspaces = await prisma.workspace.findMany({
    where,
    orderBy,
    include: {
      _count: { select: { quizzes: true, users: true } },
      users: { take: 1, orderBy: { createdAt: "asc" } },
    },
  });

  const analytics = await getGlobalAnalytics();

  async function changePlan(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const plan = String(formData.get("plan")) as any;
    await prisma.workspace.update({ where: { id }, data: { plan } });
    revalidatePath("/admin");
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Admin</h1>
        <div className="flex gap-2">
          <Link href="/admin/users" className="btn-ghost text-sm">
            👥 Utenti
          </Link>
          <Link href="/admin/sync" className="btn-ghost text-sm">
            🔄 Sync Systeme.io
          </Link>
          <Link href="/admin/backup" className="btn-ghost text-sm">
            💾 Backup &amp; Costi
          </Link>
        </div>
      </div>

      {/* Analytics globali */}
      <section className="mt-6">
        <h2 className="mb-3 font-display text-xl">Panoramica</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <Stat
            label="MRR"
            value={`€${analytics.mrr.toFixed(0)}`}
            sub={`${analytics.activeSubscriptions} abbonamenti attivi`}
            highlight
          />
          <Stat
            label="Workspace totali"
            value={analytics.totalWorkspaces}
            sub={`+${analytics.newUsersLast30d} negli ultimi 30 giorni`}
          />
          <Stat
            label="Conversion FREE→Paid"
            value={`${(analytics.conversionRate * 100).toFixed(1)}%`}
            sub={`${analytics.usersByPlan.PRO + analytics.usersByPlan.BUSINESS} clienti paganti`}
          />
          <Stat
            label="Costi AI questo mese"
            value={`€${analytics.aiCostThisMonth.toFixed(2)}`}
            sub={`MRR netto: €${(analytics.mrr - analytics.aiCostThisMonth).toFixed(0)}`}
          />
        </div>

        {/* Distribuzione piani */}
        <div className="card mt-3">
          <h3 className="text-xs font-medium uppercase tracking-widest text-ink/50">
            Distribuzione per piano
          </h3>
          <div className="mt-3 space-y-2">
            {(["FREE", "PRO", "BUSINESS"] as const).map((plan) => {
              const count = analytics.usersByPlan[plan];
              const pct =
                analytics.totalWorkspaces > 0
                  ? (count / analytics.totalWorkspaces) * 100
                  : 0;
              return (
                <div key={plan} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-medium">{PLANS[plan].name}</span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-ink/5">
                      <div
                        className={`h-full transition-all ${
                          plan === "FREE"
                            ? "bg-ink/30"
                            : plan === "PRO"
                              ? "bg-accent"
                              : "bg-purple-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-32 text-right text-xs">
                    {count} workspace ({pct.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Stat label="Quiz totali" value={analytics.totalQuizzes} sub={`+${analytics.newQuizzesLast30d} negli ultimi 30g`} compact />
          <Stat label="Lead totali" value={analytics.totalLeads} sub={`+${analytics.newLeadsLast30d} negli ultimi 30g`} compact />
          <Stat label="Utenti totali" value={analytics.totalUsers} compact />
        </div>
      </section>

      {/* Lista workspace con filtri */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Workspace</h2>
          <span className="text-xs text-ink/50">{workspaces.length} risultati</span>
        </div>

        {/* Filtri */}
        <form className="mt-3 flex flex-wrap gap-2 rounded-2xl border border-ink/10 bg-white/40 p-3">
          <input
            type="text"
            name="q"
            placeholder="Cerca per nome, slug, email…"
            defaultValue={searchQuery || ""}
            className="flex-1 rounded-lg border border-ink/15 bg-white/80 px-3 py-2 text-sm"
          />
          <select
            name="plan"
            defaultValue={planFilter || ""}
            className="rounded-lg border border-ink/15 bg-white/80 px-3 py-2 text-sm"
          >
            <option value="">Tutti i piani</option>
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="BUSINESS">BUSINESS</option>
          </select>
          <select
            name="sort"
            defaultValue={sortBy}
            className="rounded-lg border border-ink/15 bg-white/80 px-3 py-2 text-sm"
          >
            <option value="recent">Più recenti prima</option>
            <option value="name">Per nome</option>
            <option value="plan">Per piano</option>
          </select>
          <button type="submit" className="btn-primary text-sm">
            Filtra
          </button>
          {(searchQuery || planFilter) && (
            <Link href="/admin" className="btn-ghost text-sm">
              Reset
            </Link>
          )}
        </form>

        <div className="mt-4 overflow-hidden rounded-2xl border border-ink/10 bg-white/60">
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-left text-xs uppercase tracking-wider text-ink/60">
              <tr>
                <th className="px-4 py-3">Workspace</th>
                <th className="px-4 py-3">Email principale</th>
                <th className="px-4 py-3">Piano</th>
                <th className="px-4 py-3 text-right">Quiz</th>
                <th className="px-4 py-3 text-right">Utenti</th>
                <th className="px-4 py-3">Creato</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map((w) => (
                <tr key={w.id} className="border-t border-ink/5 hover:bg-white/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/workspaces/${w.id}`}
                      className="font-medium hover:underline"
                    >
                      {w.name}
                    </Link>
                    <div className="font-mono text-[10px] text-ink/40">{w.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {w.users[0]?.email || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <form action={changePlan} className="inline-flex items-center gap-2">
                      <input type="hidden" name="id" value={w.id} />
                      <select
                        name="plan"
                        defaultValue={w.plan}
                        className="rounded-md border border-ink/15 bg-white px-2 py-1 text-xs"
                      >
                        <option value="FREE">FREE</option>
                        <option value="PRO">PRO</option>
                        <option value="BUSINESS">BUSINESS</option>
                      </select>
                      <button className="text-[10px] text-accent hover:underline">
                        OK
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {w._count.quizzes}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {w._count.users}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/60">
                    {w.createdAt.toLocaleDateString("it-IT")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/workspaces/${w.id}`}
                      className="text-xs text-accent hover:underline"
                    >
                      Apri →
                    </Link>
                  </td>
                </tr>
              ))}
              {workspaces.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink/50">
                    Nessun workspace trovato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
  compact,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-${compact ? 4 : 5} ${
        highlight
          ? "border-accent bg-accent/5"
          : "border-ink/10 bg-white/60"
      }`}
    >
      <div className="text-xs uppercase tracking-widest text-ink/50">{label}</div>
      <div className={`mt-1 font-display ${compact ? "text-2xl" : "text-3xl"}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[10px] text-ink/50">{sub}</div>}
    </div>
  );
}
