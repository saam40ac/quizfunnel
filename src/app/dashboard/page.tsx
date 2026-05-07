import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getWorkspaceUsage } from "@/lib/usage";
import { PLANS, formatLimit, isUnlimited } from "@/lib/plans";

export default async function DashboardHome() {
  const session = await auth();
  const workspaceId = (session!.user as any).workspaceId as string | null;
  if (!workspaceId) redirect("/dashboard/settings");

  const quizzes = await prisma.quiz.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { leads: true, questions: true } } },
  });

  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  const usage = await getWorkspaceUsage(workspaceId);
  const plan = PLANS[usage.plan];
  const { getLockedQuizIds } = await import("@/lib/usage");
  const lockedQuizIds = await getLockedQuizIds(workspaceId);

  // Percentuali usate
  const quizPct = isUnlimited(usage.limits.maxQuizzes)
    ? 0
    : Math.min(100, (usage.quizzesActive / usage.limits.maxQuizzes) * 100);
  const leadsPct = isUnlimited(usage.limits.maxLeadsPerMonth)
    ? 0
    : Math.min(100, (usage.leadsThisMonth / usage.limits.maxLeadsPerMonth) * 100);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink/50">
            Workspace · {ws?.name}
            <span className="ml-2 inline-block rounded-full bg-ink/10 px-2 py-0.5 font-mono text-[10px]">
              Piano {plan.name}
            </span>
          </p>
          <h1 className="mt-1 font-display text-4xl">I tuoi quiz</h1>
        </div>

        {/* Pulsante "Nuovo quiz" condizionato dal limite */}
        {usage.isOverQuizLimit ? (
          <Link
            href="/dashboard/billing"
            className="rounded-full border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            title={`Hai raggiunto il limite di ${usage.limits.maxQuizzes} quiz del piano ${usage.plan}`}
          >
            🔒 Limite raggiunto · Fai upgrade
          </Link>
        ) : (
          <Link href="/dashboard/quizzes/new" className="btn-accent">
            ✨ Nuovo quiz con AI
          </Link>
        )}
      </div>

      {/* Banner uso del piano */}
      <UsageBanner
        plan={usage.plan}
        quizzesActive={usage.quizzesActive}
        maxQuizzes={usage.limits.maxQuizzes}
        leadsThisMonth={usage.leadsThisMonth}
        maxLeads={usage.limits.maxLeadsPerMonth}
        quizPct={quizPct}
        leadsPct={leadsPct}
        isOverLeadLimit={usage.isOverLeadLimit}
      />

      <div className="mt-8 grid gap-3">
        {quizzes.length === 0 && (
          <div className="card text-center">
            <h2 className="font-display text-2xl">Crea il tuo primo quiz</h2>
            <p className="mt-2 text-ink/60">
              {usage.limits.canGenerateQuizAI ? (
                <>
                  Descrivi il tuo progetto, l'AI scriverà domande e risultati per te.
                  <br />
                  Poi modifichi tutto come vuoi.
                </>
              ) : (
                <>
                  Crea il tuo primo quiz manualmente. Per la generazione automatica
                  con AI, fai upgrade al piano Pro.
                </>
              )}
            </p>
            <Link href="/dashboard/quizzes/new" className="btn-accent mt-5 inline-flex">
              ✨ Genera il mio primo quiz →
            </Link>
          </div>
        )}
        {quizzes.map((q) => {
          const isLocked = lockedQuizIds.has(q.id);
          return (
            <Link
              key={q.id}
              href={`/dashboard/quizzes/${q.id}/edit`}
              className={`card flex items-center justify-between transition hover:-translate-y-0.5 ${isLocked ? "opacity-60" : ""}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-display text-xl">{q.title}</div>
                  {isLocked && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      🔒 Lettura
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-ink/50">
                  {q._count.questions} domande · {q._count.leads} lead · stato {q.status}
                </div>
              </div>
              <div className="text-xs text-ink/40">→</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function UsageBanner({
  plan,
  quizzesActive,
  maxQuizzes,
  leadsThisMonth,
  maxLeads,
  quizPct,
  leadsPct,
  isOverLeadLimit,
}: {
  plan: string;
  quizzesActive: number;
  maxQuizzes: number;
  leadsThisMonth: number;
  maxLeads: number;
  quizPct: number;
  leadsPct: number;
  isOverLeadLimit: boolean;
}) {
  // Non mostriamo il banner per BUSINESS (tutto illimitato) — è inutile
  if (isUnlimited(maxQuizzes) && isUnlimited(maxLeads)) {
    return null;
  }

  return (
    <div className="card mt-6 grid gap-4 md:grid-cols-2">
      <UsageRow
        label="Quiz attivi"
        used={quizzesActive}
        max={maxQuizzes}
        pct={quizPct}
      />
      <UsageRow
        label="Lead sincronizzati questo mese"
        used={leadsThisMonth}
        max={maxLeads}
        pct={leadsPct}
        warning={isOverLeadLimit}
      />
      {isOverLeadLimit && (
        <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          ⚠️ Hai superato il limite mensile di {formatLimit(maxLeads)} lead.
          I nuovi lead vengono <strong>salvati nel database</strong> ma{" "}
          <strong>non sincronizzati</strong> con Systeme.io fino al prossimo mese o all'upgrade.{" "}
          <Link href="/dashboard/billing" className="underline">
            Vedi i piani
          </Link>
        </div>
      )}
    </div>
  );
}

function UsageRow({
  label,
  used,
  max,
  pct,
  warning,
}: {
  label: string;
  used: number;
  max: number;
  pct: number;
  warning?: boolean;
}) {
  const barColor = warning ? "bg-amber-500" : pct > 80 ? "bg-orange-400" : "bg-accent";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-ink/60">{label}</span>
        <span className="text-xs text-ink/50">
          {used.toLocaleString("it-IT")} / {formatLimit(max)}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/5">
        <div
          className={`h-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
