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

    // 1. Salviamo SEMPRE il lead nel DB, anche se Systeme.io fallisce
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

        // Recupera il mapping di risultato corrispondente al punteggio
        const mappings = (quiz.resultMappings as any[]) || [];
        const matchingMap = mappings.find(
          (m) => data.score >= (m.min ?? 0) && data.score <= (m.max ?? 0),
        );

        // Calcola il punteggio massimo possibile sommando per ogni domanda
        // il punteggio della risposta più alta. Lo facciamo in DB.
        const questions = await prisma.question.findMany({
          where: { quizId: quiz.id },
          include: { answers: true },
        });
        let scoreMax = 0;
        for (const q of questions) {
          const top = q.answers.reduce((acc, a) => Math.max(acc, a.score), 0);
          scoreMax += top;
        }

        // Helper per troncare a 240 caratteri (margine sicuro sui 255 di Systeme.io)
        const trim = (s: string | undefined | null, max = 240) => {
          if (!s) return "";
          return s.length > max ? s.slice(0, max - 3) + "..." : s;
        };

        // Custom fields da inviare a Systeme.io.
        // Devono esistere come campi personalizzati su Systeme.io con queste chiavi uniche:
        //   - quiz_title
        //   - quiz_result_label
        //   - quiz_result_desc       (descrizione TRONCATA, fallback per chi non aggiorna)
        //   - quiz_result_summary    (NUOVO - riepilogo breve generato dall'AI)
        //   - quiz_result_cta        (NUOVO - frase persuasiva per la CTA)
        //   - quiz_score_total       (NUOVO - "18/35")
        //   - quiz_result_score      (numero singolo, retro-compatibile)
        const customFields = {
          quiz_title: trim(quiz.title),
          quiz_result_label: trim(data.resultLabel),
          quiz_result_desc: trim(matchingMap?.description),
          quiz_result_summary: trim(matchingMap?.summary || matchingMap?.description),
          quiz_result_cta: trim(matchingMap?.ctaPhrase),
          quiz_score_total: scoreMax > 0 ? `${data.score}/${scoreMax}` : `${data.score}`,
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
