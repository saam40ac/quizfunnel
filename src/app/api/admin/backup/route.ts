import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Endpoint di backup: esporta tutto il database in JSON.
 * Solo SUPER_ADMIN può chiamarlo.
 *
 * GET /api/admin/backup
 *  - scarica un file backup-YYYY-MM-DD.json contenente tutti i dati
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  if ((session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  // Esporta tutte le tabelle in parallelo per velocità
  const [
    users,
    workspaces,
    quizzes,
    questions,
    answers,
    leads,
    emailVersions,
    emails,
    aiUsageLogs,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.workspace.findMany(),
    prisma.quiz.findMany(),
    prisma.question.findMany(),
    prisma.answer.findMany(),
    prisma.lead.findMany(),
    prisma.emailSequenceVersion.findMany(),
    prisma.quizEmail.findMany(),
    prisma.aIUsageLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000, // limita per non far scoppiare il file
    }),
  ]);

  const backup = {
    version: 1,
    createdAt: new Date().toISOString(),
    summary: {
      users: users.length,
      workspaces: workspaces.length,
      quizzes: quizzes.length,
      questions: questions.length,
      answers: answers.length,
      leads: leads.length,
      emailVersions: emailVersions.length,
      emails: emails.length,
      aiUsageLogs: aiUsageLogs.length,
    },
    data: {
      users,
      workspaces,
      quizzes,
      questions,
      answers,
      leads,
      emailVersions,
      emails,
      aiUsageLogs,
    },
  };

  const date = new Date().toISOString().slice(0, 10);
  const filename = `quizfunnel-backup-${date}.json`;

  return new NextResponse(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
