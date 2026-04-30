import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PatchBody = z.object({
  action: z.enum(["activate", "updateMeta"]).optional(),
  label: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { quizId: string; versionId: string } },
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    const wsId = (session.user as any).workspaceId as string;

    // Verifica autorizzazione
    const quiz = await prisma.quiz.findFirst({
      where: { id: params.quizId, workspaceId: wsId },
    });
    if (!quiz) return NextResponse.json({ error: "Quiz non trovato" }, { status: 404 });

    const version = await prisma.emailSequenceVersion.findFirst({
      where: { id: params.versionId, quizId: quiz.id },
    });
    if (!version) return NextResponse.json({ error: "Versione non trovata" }, { status: 404 });

    const body = PatchBody.parse(await req.json());

    if (body.action === "activate") {
      // Disattiva tutte le altre + attiva questa
      await prisma.$transaction([
        prisma.emailSequenceVersion.updateMany({
          where: { quizId: quiz.id, isActive: true },
          data: { isActive: false },
        }),
        prisma.emailSequenceVersion.update({
          where: { id: params.versionId },
          data: { isActive: true },
        }),
      ]);
    } else {
      // Aggiorna solo metadata
      await prisma.emailSequenceVersion.update({
        where: { id: params.versionId },
        data: {
          label: body.label === undefined ? undefined : body.label,
          notes: body.notes === undefined ? undefined : body.notes,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[version patch]", e);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { quizId: string; versionId: string } },
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    const wsId = (session.user as any).workspaceId as string;

    const quiz = await prisma.quiz.findFirst({
      where: { id: params.quizId, workspaceId: wsId },
    });
    if (!quiz) return NextResponse.json({ error: "Quiz non trovato" }, { status: 404 });

    const version = await prisma.emailSequenceVersion.findFirst({
      where: { id: params.versionId, quizId: quiz.id },
    });
    if (!version) return NextResponse.json({ error: "Versione non trovata" }, { status: 404 });

    if (version.isActive) {
      return NextResponse.json(
        { error: "Non puoi eliminare la versione attiva. Attiva prima un'altra versione." },
        { status: 400 },
      );
    }

    await prisma.emailSequenceVersion.delete({ where: { id: params.versionId } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[version delete]", e);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}
