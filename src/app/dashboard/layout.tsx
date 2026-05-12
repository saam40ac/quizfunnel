import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  const role = (session.user as any).role as string;
  const wsId = (session.user as any).workspaceId as string | null;
  const ws = wsId ? await prisma.workspace.findUnique({ where: { id: wsId } }) : null;

  const items = [
    { href: "/dashboard", label: "Quiz" },
    { href: "/dashboard/integrations", label: "Integrazioni" },
    { href: "/dashboard/settings", label: "Workspace" },
    { href: "/dashboard/billing", label: "Piani" },
  ];
  if (role === "SUPER_ADMIN") items.push({ href: "/admin", label: "Admin" });

  return (
    <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
      <aside className="border-r border-ink/10 bg-white/40 p-5 backdrop-blur">
        <Link href="/dashboard" className="flex items-center gap-2">
          {ws?.logoUrl ? (
            // Logo personalizzato del workspace (Pro/Business che ha caricato il proprio)
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ws.logoUrl}
              alt={ws.name}
              className="h-10 max-w-[180px] object-contain"
            />
          ) : (
            // Logo QuizFunnel di default (FREE o utenti che non hanno caricato un logo proprio)
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/branding/logo-quizfunnel-full.jpg"
              alt="QuizFunnel"
              className="h-10 max-w-[180px] object-contain"
            />
          )}
        </Link>

        {/* Nome workspace come sottotitolo, sempre visibile per chiarezza */}
        {ws?.name && (
          <p className="mt-2 truncate text-[10px] uppercase tracking-widest text-ink/40">
            {ws.name}
          </p>
        )}
        <nav className="mt-8 space-y-1 text-sm">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="block rounded-lg px-3 py-2 hover:bg-ink/5"
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 md:w-[220px]">
          <div className="rounded-xl border border-ink/10 bg-white/60 p-3 text-xs">
            <div className="font-semibold">{session.user.name || session.user.email}</div>
            <div className="text-ink/50">{session.user.email}</div>
            <form action={logout} className="mt-2">
              <button className="text-xs text-ink/60 underline">Logout</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="p-6 md:p-10">{children}</main>
    </div>
  );
}
