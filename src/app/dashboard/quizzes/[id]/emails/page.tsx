import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EmailsEditor } from "./emails-client";

export default async function QuizEmailsPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const wsId = (session!.user as any).workspaceId as string;

  const quiz = await prisma.quiz.findFirst({
    where: { id: params.id, workspaceId: wsId },
    include: {
      emails: { orderBy: { order: "asc" } },
    },
  });
  if (!quiz) notFound();

  const hasBrief = !!(
    quiz.briefSummary &&
    quiz.briefTarget &&
    quiz.briefProblem &&
    quiz.briefGoal
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-xs text-ink/50">
            ← Tutti i quiz
          </Link>
          <h1 className="mt-1 font-display text-3xl">Email del quiz</h1>
          <p className="mt-1 text-sm text-ink/60">
            <strong>{quiz.title}</strong> — Sequenza di 3 email da incollare in
            Systeme.io.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/quizzes/${quiz.id}/edit`} className="btn-ghost text-sm">
            ← Quiz
          </Link>
          <Link href={`/dashboard/quizzes/${quiz.id}/leads`} className="btn-ghost text-sm">
            Lead
          </Link>
        </div>
      </div>

      {!hasBrief && (
        <div className="card mt-6 border-amber-200 bg-amber-50">
          <h3 className="font-display text-lg">Brief mancante</h3>
          <p className="mt-1 text-sm text-amber-900">
            Questo quiz non ha un brief AI completo. Per generare le email
            automaticamente, ti consiglio di creare un nuovo quiz dal wizard
            "Nuovo quiz con AI", che chiede target, problema, tono e obiettivo.
            <br />
            <br />
            Puoi comunque scrivere le 3 email a mano qui sotto.
          </p>
        </div>
      )}

      <EmailsEditor
        quizId={quiz.id}
        canGenerate={hasBrief}
        defaultCtaUrl={quiz.ctaUrl ?? ""}
        emails={quiz.emails.map((e) => ({
          id: e.id,
          order: e.order,
          internalLabel: e.internalLabel,
          suggestedDelay: e.suggestedDelay ?? "",
          subject: e.subject,
          preheader: e.preheader ?? "",
          body: e.body,
          ctaText: e.ctaText,
          ctaUrl: e.ctaUrl ?? "",
        }))}
      />
    </div>
  );
}
