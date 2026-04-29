import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Body = z.object({
  subject: z.string().min(1).max(200),
  preheader: z.string().max(300).optional().nullable(),
  body: z.string().min(1),
  ctaText: z.string().max(80),
  ctaUrl: z.string().max(500).optional().nullable(),
  suggestedDelay: z.string().max(50).optional().nullable(),
  internalLabel: z.string().max(60),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { quizId: string; emailId: string } },
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    const wsId = (session.user as any).workspaceId as string;

    const quiz = await prisma.quiz.findFirst({
      where: { id: params.quizId, workspaceId: wsId },
    });
    if (!quiz) return NextResponse.json({ error: "Quiz non trovato" }, { status: 404 });

    const data = Body.parse(await req.json());

    await prisma.quizEmail.update({
      where: { id: params.emailId },
      data: {
        subject: data.subject,
        preheader: data.preheader ?? null,
        body: data.body,
        ctaText: data.ctaText,
        ctaUrl: data.ctaUrl ?? null,
        suggestedDelay: data.suggestedDelay ?? null,
        internalLabel: data.internalLabel,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[email update]", e);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}
