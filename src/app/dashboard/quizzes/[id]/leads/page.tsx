import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function LeadsPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const wsId = (session!.user as any).workspaceId as string;
  const quiz = await prisma.quiz.findFirst({
    where: { id: params.id, workspaceId: wsId },
    include: { leads: { orderBy: { createdAt: "desc" } } },
  });
  if (!quiz) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link href={`/dashboard/quizzes/${quiz.id}/edit`} className="text-xs text-ink/50">← Torna al quiz</Link>
      <h1 className="mt-1 font-display text-3xl">Lead · {quiz.title}</h1>
      <p className="mt-1 text-sm text-ink/60">Tutti i lead generati da questo quiz, in ordine cronologico.</p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-ink/10 bg-white/60">
        <table className="w-full text-sm">
          <thead className="bg-ink/5 text-left text-xs uppercase tracking-wider text-ink/60">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Risultato</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3">Systeme.io</th>
            </tr>
          </thead>
          <tbody>
            {quiz.leads.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink/50">Nessun lead ancora.</td></tr>
            )}
            {quiz.leads.map((l) => (
              <tr key={l.id} className="border-t border-ink/5">
                <td className="px-4 py-3 text-ink/60">{new Date(l.createdAt).toLocaleString("it-IT")}</td>
                <td className="px-4 py-3 font-medium">{l.name}</td>
                <td className="px-4 py-3">{l.email}</td>
                <td className="px-4 py-3">{l.resultLabel || "-"}</td>
                <td className="px-4 py-3 text-right font-mono">{l.score}</td>
                <td className="px-4 py-3">
                  {l.syncedToSysteme ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">✓ Sync</span>
                  ) : (
                    <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs text-ink/50">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
