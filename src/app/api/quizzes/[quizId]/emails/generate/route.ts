import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateEmailSequence } from "@/lib/ai-email-generator";

export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: { quizId: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }
    const wsId = (session.user as any).workspaceId as string;

    const quiz = await prisma.quiz.findFirst({
      where: { id: params.quizId, workspaceId: wsId },
    });
    if (!quiz) {
      return NextResponse.json({ error: "Quiz non trovato" }, { status: 404 });
    }

    if (!quiz.briefSummary || !quiz.briefTarget || !quiz.briefProblem || !quiz.briefGoal) {
      return NextResponse.json(
        {
          error:
            "Per generare le email serve un quiz creato col brief AI completo. Rigenera il quiz dal wizard 'Nuovo quiz con AI'.",
        },
        { status: 400 },
      );
    }

    const mappings = (quiz.resultMappings as any[]) || [];
    const resultLabels = mappings.map((m) => m.label).filter(Boolean);

    const generated = await generateEmailSequence({
      quizTitle: quiz.title,
      briefSummary: quiz.briefSummary,
      briefTarget: quiz.briefTarget,
      briefProblem: quiz.briefProblem,
      briefTone: quiz.briefTone || "professionale",
      briefGoal: quiz.briefGoal,
      resultLabels,
      finalCtaText: quiz.ctaText,
      finalCtaUrl: quiz.ctaUrl ?? undefined,
    });

    // Sostituisci tutte le email del quiz (sequenza intera nuova)
    await prisma.$transaction(async (tx) => {
      await tx.quizEmail.deleteMany({ where: { quizId: quiz.id } });
      for (let i = 0; i < generated.emails.length; i++) {
        const e = generated.emails[i];
        await tx.quizEmail.create({
          data: {
            quizId: quiz.id,
            order: i + 1,
            internalLabel: e.internalLabel,
            suggestedDelay: e.suggestedDelay,
            subject: e.subject,
            preheader: e.preheader,
            body: e.body,
            ctaText: e.ctaText,
            ctaUrl: quiz.ctaUrl ?? null,
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[generate emails]", e);
    const msg = e?.message?.includes("ANTHROPIC_API_KEY")
      ? "La piattaforma non ha una chiave AI configurata."
      : "Errore durante la generazione. Riprova fra qualche secondo.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
