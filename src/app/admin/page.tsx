import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export default async function AdminPage() {
  const session = await auth();
  if ((session!.user as any).role !== "SUPER_ADMIN") redirect("/dashboard");

  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { quizzes: true, users: true } } },
  });

  const stats = {
    workspaces: workspaces.length,
    totalQuizzes: await prisma.quiz.count(),
    totalLeads: await prisma.lead.count(),
  };

  async function changePlan(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const plan = String(formData.get("plan")) as any;
    await prisma.workspace.update({ where: { id }, data: { plan } });
    revalidatePath("/admin");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl">Admin · Tutti i workspace</h1>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="card"><div className="text-xs uppercase tracking-widest text-ink/50">Workspace</div><div className="mt-1 font-display text-4xl">{stats.workspaces}</div></div>
        <div className="card"><div className="text-xs uppercase tracking-widest text-ink/50">Quiz totali</div><div className="mt-1 font-display text-4xl">{stats.totalQuizzes}</div></div>
        <div className="card"><div className="text-xs uppercase tracking-widest text-ink/50">Lead totali</div><div className="mt-1 font-display text-4xl">{stats.totalLeads}</div></div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-ink/10 bg-white/60">
        <table className="w-full text-sm">
          <thead className="bg-ink/5 text-left text-xs uppercase tracking-wider text-ink/60">
            <tr>
              <th className="px-4 py-3">Workspace</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Piano</th>
              <th className="px-4 py-3 text-right">Quiz</th>
              <th className="px-4 py-3 text-right">Utenti</th>
              <th className="px-4 py-3">Creato</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((w) => (
              <tr key={w.id} className="border-t border-ink/5">
                <td className="px-4 py-3 font-medium">{w.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{w.slug}</td>
                <td className="px-4 py-3">{w.plan}</td>
                <td className="px-4 py-3 text-right">{w._count.quizzes}</td>
                <td className="px-4 py-3 text-right">{w._count.users}</td>
                <td className="px-4 py-3 text-ink/60">{new Date(w.createdAt).toLocaleDateString("it-IT")}</td>
                <td className="px-4 py-3">
                  <form action={changePlan} className="flex gap-1">
                    <input type="hidden" name="id" value={w.id} />
                    <select name="plan" defaultValue={w.plan} className="rounded-lg border border-ink/15 bg-white px-2 py-1 text-xs">
                      <option value="FREE">FREE</option>
                      <option value="PRO">PRO</option>
                      <option value="BUSINESS">BUSINESS</option>
                    </select>
                    <button className="text-xs underline">Salva</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
