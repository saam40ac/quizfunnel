import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { generateQuizFromBrief } from "@/lib/ai-quiz-generator";

// Lasciamo timeout generoso (Anthropic può impiegare 10-15 secondi)
export const maxDuration = 60;

const Body = z.object({
  title: z.string().min(2).max(120),
  summary: z.string().min(10).max(2000),
  target: z.string().min(5).max(1000),
  problem: z.string().min(5).max(1000),
  tone: z.enum(["professionale", "amichevole", "diretto", "motivazionale"]),
  goal: z.string().min(5).max(500),
  numQuestions: z.number().int().min(5).max(7).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }
    const wsId = (session.user as any).workspaceId as string | null;
    if (!wsId) {
      return NextResponse.json({ error: "Workspace mancante" }, { status: 400 });
    }

    const json = await req.json();
    const data = Body.parse(json);

    // Genera il contenuto col modello
    const generated = await generateQuizFromBrief({
      title: data.title,
      summary: data.summary,
      target: data.target,
      problem: data.problem,
      tone: data.tone,
      goal: data.goal,
      numQuestions: data.numQuestions ?? 7,
    });

    // Crea slug univoco
    let slug = slugify(data.title);
    let n = 1;
    while (
      await prisma.quiz.findUnique({
        where: { workspaceId_slug: { workspaceId: wsId, slug } },
      })
    ) {
      slug = `${slugify(data.title)}-${n++}`;
    }

    // Persisti il quiz con tutto il contenuto generato
    const quiz = await prisma.quiz.create({
      data: {
        workspaceId: wsId,
        title: data.title,
        slug,
        description: generated.description,
        ctaText: generated.ctaText,
        privacyText: generated.privacyText,
        briefSummary: data.summary,
        briefTarget: data.target,
        briefProblem: data.problem,
        briefTone: data.tone,
        briefGoal: data.goal,
        resultMappings: generated.resultMappings as any,
        questions: {
          create: generated.questions.map((q, i) => ({
            order: i,
            text: q.text,
            answers: {
              create: q.answers.map((a, j) => ({
                order: j,
                text: a.text,
                score: a.score,
              })),
            },
          })),
        },
      },
    });

    return NextResponse.json({ quizId: quiz.id });
  } catch (e: any) {
    console.error("[generate quiz]", e);
    const msg =
      e?.message?.includes?.("ANTHROPIC_API_KEY")
        ? "La piattaforma non ha una chiave AI configurata. Contatta l'amministratore."
        : e?.message?.includes?.("authentication") || e?.status === 401
          ? "Chiave AI non valida"
          : "Errore durante la generazione. Riprova fra qualche secondo.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
