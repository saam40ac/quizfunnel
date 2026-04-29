import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncLead } from "@/lib/systeme";
import { z } from "zod";

const Body = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  answers: z.record(z.string()),
  score: z.number().int(),
  resultLabel: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: { quizId: string } }) {
  try {
    const json = await req.json();
    const data = Body.parse(json);

    const quiz = await prisma.quiz.findUnique({
      where: { id: params.quizId },
      include: { workspace: true },
    });
    if (!quiz || quiz.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Quiz non disponibile" }, { status: 404 });
    }

    // 1. Salviamo SEMPRE il lead, anche se Systeme.io fallisce
    const lead = await prisma.lead.create({
      data: {
        quizId: quiz.id,
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        score: data.score,
        resultLabel: data.resultLabel ?? null,
        answersJson: data.answers,
      },
    });

    // 2. Sync Systeme.io (se configurato)
    if (quiz.workspace.systemeApiKey) {
      try {
        const tagName = quiz.systemeTagName || `quiz-${quiz.slug}`;

        // Recupera la descrizione dal mapping di risultato corrispondente
        let resultDescription: string | undefined;
        const mappings = (quiz.resultMappings as any[]) || [];
        const matchingMap = mappings.find(
          (m) => data.score >= (m.min ?? 0) && data.score <= (m.max ?? 0),
        );
        if (matchingMap?.description) {
          resultDescription = matchingMap.description;
        }

        // Custom fields da inviare a Systeme.io.
        // Questi slug DEVONO esistere come campi personalizzati su Systeme.io.
        // Vedi DOCUMENTAZIONE: ../../../../../docs/SYSTEME-IO-MAIL.md
        const customFields = {
          quiz_title: quiz.title,
          quiz_result_label: data.resultLabel ?? "",
          quiz_result_desc: resultDescription ?? "",
          quiz_result_score: data.score,
        };

        const contact = await syncLead({
          apiKey: quiz.workspace.systemeApiKey,
          email: data.email,
          name: data.name,
          phone: data.phone,
          tagName,
          customFields,
        });

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            syncedToSysteme: true,
            systemeContactId: contact?.id ? String(contact.id) : null,
          },
        });
      } catch (err) {
        console.error("[Systeme.io sync] Failed:", err);
        // non blocchiamo: il lead è comunque salvato nel DB
      }
    }

    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (e: any) {
    console.error("[Lead submit]", e);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}
