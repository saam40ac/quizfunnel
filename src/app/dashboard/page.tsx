import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/utils";
import { revalidatePath } from "next/cache";

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

  async function createQuiz(formData: FormData) {
    "use server";
    const title = String(formData.get("title") || "").trim();
    if (!title) return;
    const session = await auth();
    const wsId = (session!.user as any).workspaceId as string;
    let slug = slugify(title);
    let n = 1;
    while (await prisma.quiz.findUnique({ where: { workspaceId_slug: { workspaceId: wsId, slug } } })) {
      slug = `${slugify(title)}-${n++}`;
    }
    const quiz = await prisma.quiz.create({
      data: {
        workspaceId: wsId,
        title,
        slug,
        questions: {
          create: [{
            order: 0,
            text: "Qual è la tua sfida principale oggi?",
            answers: { create: [
              { order: 0, text: "Acquisire nuovi clienti", score: 1 },
              { order: 1, text: "Aumentare il fatturato", score: 2 },
              { order: 2, text: "Liberare tempo", score: 3 },
            ]},
          }],
        },
      },
    });
    revalidatePath("/dashboard");
    redirect(`/dashboard/quizzes/${quiz.id}/edit`);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink/50">Workspace · {ws?.name}</p>
          <h1 className="mt-1 font-display text-4xl">I tuoi quiz</h1>
        </div>
        <form action={createQuiz} className="flex gap-2">
          <input
            name="title"
            placeholder="Titolo del nuovo quiz"
            className="rounded-xl border border-ink/15 bg-white/80 px-4 py-2.5 text-sm"
          />
          <button className="btn-accent">+ Nuovo quiz</button>
        </form>
      </div>

      <div className="mt-8 grid gap-3">
        {quizzes.length === 0 && (
          <div className="card text-center">
            <p className="text-ink/60">Nessun quiz ancora. Creane uno qui sopra ↑</p>
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
