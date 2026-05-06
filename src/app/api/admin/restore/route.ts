import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Endpoint di RESTORE: ripristina un backup JSON.
 * Solo SUPER_ADMIN può chiamarlo.
 *
 * ⚠️ ATTENZIONE: cancella TUTTI i dati esistenti prima di importare.
 * Va chiamato con conferma esplicita lato client.
 *
 * POST /api/admin/restore
 *  body: { backup: <oggetto JSON del backup>, confirm: "RESTORE" }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  if ((session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const json = await req.json();
  const { backup, confirm } = json;

  if (confirm !== "RESTORE") {
    return NextResponse.json(
      { error: 'Per confermare il restore, invia il campo "confirm": "RESTORE"' },
      { status: 400 },
    );
  }

  if (!backup?.data) {
    return NextResponse.json({ error: "Formato backup non valido" }, { status: 400 });
  }

  const d = backup.data;

  try {
    // Cancella e ripopola tutto in una transazione (per integrità)
    // Ordine di cancellazione: dal più dipendente al meno dipendente
    await prisma.$transaction(
      async (tx) => {
        // Wipe (foreign keys gestite da Prisma con onDelete: Cascade)
        await tx.aIUsageLog.deleteMany();
        await tx.lead.deleteMany();
        await tx.quizEmail.deleteMany();
        await tx.emailSequenceVersion.deleteMany();
        await tx.answer.deleteMany();
        await tx.question.deleteMany();
        await tx.quiz.deleteMany();
        await tx.user.deleteMany();
        await tx.workspace.deleteMany();

        // Restore (ordine inverso: dal meno dipendente al più dipendente)
        if (Array.isArray(d.workspaces)) {
          for (const w of d.workspaces) await tx.workspace.create({ data: w });
        }
        if (Array.isArray(d.users)) {
          for (const u of d.users) await tx.user.create({ data: u });
        }
        if (Array.isArray(d.quizzes)) {
          for (const q of d.quizzes) await tx.quiz.create({ data: q });
        }
        if (Array.isArray(d.questions)) {
          for (const q of d.questions) await tx.question.create({ data: q });
        }
        if (Array.isArray(d.answers)) {
          for (const a of d.answers) await tx.answer.create({ data: a });
        }
        if (Array.isArray(d.emailVersions)) {
          for (const v of d.emailVersions) await tx.emailSequenceVersion.create({ data: v });
        }
        if (Array.isArray(d.emails)) {
          for (const e of d.emails) await tx.quizEmail.create({ data: e });
        }
        if (Array.isArray(d.leads)) {
          for (const l of d.leads) await tx.lead.create({ data: l });
        }
        if (Array.isArray(d.aiUsageLogs)) {
          for (const log of d.aiUsageLogs) await tx.aIUsageLog.create({ data: log });
        }
      },
      { timeout: 60000 }, // 60 secondi
    );

    return NextResponse.json({
      ok: true,
      restored: backup.summary || {},
    });
  } catch (e: any) {
    console.error("[restore] Failed:", e);
    return NextResponse.json(
      { error: `Restore fallito: ${e.message}` },
      { status: 500 },
    );
  }
}
