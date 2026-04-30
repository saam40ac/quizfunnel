import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateEmailSequence } from "@/lib/ai-email-generator";

export const maxDuration = 60;

const MAX_VERSIONS = 5;

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

    // Trova il prossimo numero di versione
    const lastVersion = await prisma.emailSequenceVersion.findFirst({
      where: { quizId: quiz.id },
      orderBy: { versionNumber: "desc" },
    });
    const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    // Crea la nuova versione + email + disattiva le altre versioni in una transazione
    const newVersion = await prisma.$transaction(async (tx) => {
      // Disattiva tutte le versioni precedenti
      await tx.emailSequenceVersion.updateMany({
        where: { quizId: quiz.id, isActive: true },
        data: { isActive: false },
      });

      // Crea la nuova versione (attiva)
      const v = await tx.emailSequenceVersion.create({
        data: {
          quizId: quiz.id,
          versionNumber: nextVersionNumber,
          isActive: true,
          label: `v${nextVersionNumber} — ${new Date().toLocaleDateString("it-IT")}`,
        },
      });

      // Crea le email collegate alla versione
      for (let i = 0; i < generated.emails.length; i++) {
        const e = generated.emails[i];
        await tx.quizEmail.create({
          data: {
            versionId: v.id,
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

      return v;
    });

    // Pulizia: se siamo oltre MAX_VERSIONS, elimina le più vecchie (NON l'attiva)
    const allVersions = await prisma.emailSequenceVersion.findMany({
      where: { quizId: quiz.id },
      orderBy: { createdAt: "desc" },
    });
    if (allVersions.length > MAX_VERSIONS) {
      const toDelete = allVersions.slice(MAX_VERSIONS).filter((v) => !v.isActive);
      if (toDelete.length > 0) {
        await prisma.emailSequenceVersion.deleteMany({
          where: { id: { in: toDelete.map((v) => v.id) } },
        });
      }
    }

    return NextResponse.json({ ok: true, versionId: newVersion.id });
  } catch (e: any) {
    console.error("[generate emails]", e);
    const msg = e?.message?.includes("ANTHROPIC_API_KEY")
      ? "La piattaforma non ha una chiave AI configurata."
      : "Errore durante la generazione. Riprova fra qualche secondo.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
