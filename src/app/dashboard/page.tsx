import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

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

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink/50">Workspace · {ws?.name}</p>
          <h1 className="mt-1 font-display text-4xl">I tuoi quiz</h1>
        </div>
        <Link href="/dashboard/quizzes/new" className="btn-accent">
          ✨ Nuovo quiz con AI
        </Link>
      </div>

      <div className="mt-8 grid gap-3">
        {quizzes.length === 0 && (
          <div className="card text-center">
            <h2 className="font-display text-2xl">Crea il tuo primo quiz</h2>
            <p className="mt-2 text-ink/60">
              Descrivi il tuo progetto, l'AI scriverà domande e risultati per te.
              <br />
              Poi modifichi tutto come vuoi.
            </p>
            <Link href="/dashboard/quizzes/new" className="btn-accent mt-5 inline-flex">
              ✨ Genera il mio primo quiz →
            </Link>
          </div>
        )}
        {quizzes.map((q) => (
          <Link
            key={q.id}
            href={`/dashboard/quizzes/${q.id}/edit`}
            className="card flex items-center justify-between transition hover:-translate-y-0.5"
          >
            <div>
              <div className="font-display text-xl">{q.title}</div>
              <div className="mt-1 text-xs text-ink/50">
                {q._count.questions} domande · {q._count.leads} lead · /{q.slug}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  q.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-ink/10 text-ink/60"
                }`}
              >
                {q.status === "PUBLISHED" ? "Pubblico" : "Bozza"}
              </span>
              <span className="text-ink/40">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
