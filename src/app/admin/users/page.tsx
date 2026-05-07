import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string };
}) {
  const session = await auth();
  if ((session!.user as any).role !== "SUPER_ADMIN") redirect("/dashboard");

  const where: any = {};
  if (searchParams.role) where.role = searchParams.role;
  if (searchParams.q) {
    where.OR = [
      { email: { contains: searchParams.q, mode: "insensitive" } },
      { name: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      workspace: {
        select: { id: true, name: true, slug: true, plan: true },
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-xs text-ink/50">
            ← Admin
          </Link>
          <h1 className="mt-1 font-display text-3xl">Utenti</h1>
          <p className="mt-1 text-sm text-ink/60">
            {users.length} utenti totali in piattaforma
          </p>
        </div>
      </div>

      <form className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-ink/10 bg-white/40 p-3">
        <input
          type="text"
          name="q"
          placeholder="Cerca per email o nome…"
          defaultValue={searchParams.q || ""}
          className="flex-1 rounded-lg border border-ink/15 bg-white/80 px-3 py-2 text-sm"
        />
        <select
          name="role"
          defaultValue={searchParams.role || ""}
          className="rounded-lg border border-ink/15 bg-white/80 px-3 py-2 text-sm"
        >
          <option value="">Tutti i ruoli</option>
          <option value="OWNER">OWNER</option>
          <option value="MEMBER">MEMBER</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>
        <button type="submit" className="btn-primary text-sm">
          Filtra
        </button>
        {(searchParams.q || searchParams.role) && (
          <Link href="/admin/users" className="btn-ghost text-sm">
            Reset
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-hidden rounded-2xl border border-ink/10 bg-white/60">
        <table className="w-full text-sm">
          <thead className="bg-ink/5 text-left text-xs uppercase tracking-wider text-ink/60">
            <tr>
              <th className="px-4 py-3">Utente</th>
              <th className="px-4 py-3">Workspace</th>
              <th className="px-4 py-3">Piano</th>
              <th className="px-4 py-3">Ruolo</th>
              <th className="px-4 py-3">Registrato</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-ink/5 hover:bg-white/40">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.name || "(senza nome)"}</div>
                  <div className="font-mono text-[10px] text-ink/50">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  {u.workspace ? (
                    <Link
                      href={`/admin/workspaces/${u.workspace.id}`}
                      className="text-xs hover:underline"
                    >
                      {u.workspace.name}
                    </Link>
                  ) : (
                    <span className="text-xs text-ink/40">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.workspace ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        u.workspace.plan === "FREE"
                          ? "bg-ink/10"
                          : u.workspace.plan === "PRO"
                            ? "bg-accent/20 text-accent"
                            : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {u.workspace.plan}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      u.role === "SUPER_ADMIN"
                        ? "bg-red-100 text-red-800"
                        : "bg-ink/10 text-ink/70"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-ink/60">
                  {u.createdAt.toLocaleDateString("it-IT")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
