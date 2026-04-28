import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { getBaseUrl } from "@/lib/utils";
import { QuizEditor } from "./editor-client";

export default async function EditQuizPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const wsId = (session!.user as any).workspaceId as string;

  const quiz = await prisma.quiz.findFirst({
    where: { id: params.id, workspaceId: wsId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { answers: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!quiz) notFound();

  const baseUrl = getBaseUrl();
  const ws = await prisma.workspace.findUnique({ where: { id: wsId } });
  const publicUrl = `${baseUrl}/q/${ws!.slug}/${quiz.slug}`;
  const embedUrl = `${baseUrl}/embed/${quiz.id}`;

  // Server actions
  async function saveQuiz(data: any) {
    "use server";
    const session = await auth();
    const wsId = (session!.user as any).workspaceId as string;

    const quiz = await prisma.quiz.findFirst({ where: { id: params.id, workspaceId: wsId } });
    if (!quiz) throw new Error("Not found");

    await prisma.$transaction(async (tx) => {
      await tx.quiz.update({
        where: { id: quiz.id },
        data: {
          title: data.title,
          description: data.description,
          ctaText: data.ctaText,
          ctaUrl: data.ctaUrl,
          systemeTagName: data.systemeTagName,
          primaryColor: data.primaryColor,
          accentColor: data.accentColor,
          privacyText: data.privacyText,
          resultMappings: data.resultMappings,
        },
      });

      // Replace questions
      await tx.question.deleteMany({ where: { quizId: quiz.id } });

      for (let i = 0; i < (data.questions || []).slice(0, 7).length; i++) {
        const q = data.questions[i];
        await tx.question.create({
          data: {
            quizId: quiz.id,
            order: i,
            text: q.text,
            type: "SINGLE",
            answers: {
              create: (q.answers || []).map((a: any, j: number) => ({
                order: j,
                text: a.text,
                score: Number(a.score) || 0,
              })),
            },
          },
        });
      }
    });

    revalidatePath(`/dashboard/quizzes/${params.id}/edit`);
    return { ok: true };
  }

  async function togglePublish() {
    "use server";
    const session = await auth();
    const wsId = (session!.user as any).workspaceId as string;
    const quiz = await prisma.quiz.findFirst({ where: { id: params.id, workspaceId: wsId } });
    if (!quiz) return;
    await prisma.quiz.update({
      where: { id: quiz.id },
      data: { status: quiz.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" },
    });
    revalidatePath(`/dashboard/quizzes/${params.id}/edit`);
  }

  async function deleteQuiz() {
    "use server";
    const session = await auth();
    const wsId = (session!.user as any).workspaceId as string;
    await prisma.quiz.deleteMany({ where: { id: params.id, workspaceId: wsId } });
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-xs text-ink/50">← Tutti i quiz</Link>
          <h1 className="mt-1 font-display text-3xl">{quiz.title}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/quizzes/${quiz.id}/leads`} className="btn-ghost text-sm">Lead</Link>
          <form action={togglePublish}>
            <button className={quiz.status === "PUBLISHED" ? "btn-ghost text-sm" : "btn-primary text-sm"}>
              {quiz.status === "PUBLISHED" ? "Sospendi" : "Pubblica"}
            </button>
          </form>
        </div>
      </div>

      {quiz.status === "PUBLISHED" && (
        <div className="card mb-6">
          <p className="text-xs uppercase tracking-widest text-ink/50">Condividi</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Link pubblico</label>
              <input readOnly value={publicUrl} className="mt-1 w-full rounded-lg border border-ink/15 bg-white/80 px-3 py-2 font-mono text-xs" />
            </div>
            <div>
              <label className="text-sm font-medium">Embed iframe</label>
              <input
                readOnly
                value={`<iframe src="${embedUrl}" width="100%" height="700" frameborder="0" style="border:0;border-radius:24px;"></iframe>`}
                className="mt-1 w-full rounded-lg border border-ink/15 bg-white/80 px-3 py-2 font-mono text-xs"
              />
            </div>
          </div>
        </div>
      )}

      <QuizEditor
        initial={{
          title: quiz.title,
          description: quiz.description ?? "",
          ctaText: quiz.ctaText,
          ctaUrl: quiz.ctaUrl ?? "",
          systemeTagName: quiz.systemeTagName ?? "",
          primaryColor: quiz.primaryColor,
          accentColor: quiz.accentColor,
          privacyText: quiz.privacyText ?? "Trattiamo i tuoi dati come da Privacy Policy.",
          resultMappings: (quiz.resultMappings as any) ?? [
            { min: 0, max: 5, label: "Sei agli inizi", description: "Hai bisogno di mettere ordine nelle basi." },
            { min: 6, max: 12, label: "Sei in crescita", description: "Stai facendo bene, ottimizziamo insieme." },
            { min: 13, max: 99, label: "Sei avanzato", description: "Ti servono strategie di scaling." },
          ],
          questions: quiz.questions.map((q) => ({
            text: q.text,
            answers: q.answers.map((a) => ({ text: a.text, score: a.score })),
          })),
        }}
        saveAction={saveQuiz}
        deleteAction={deleteQuiz}
      />
    </div>
  );
}
