import Link from "next/link";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export default function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  async function action(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").toLowerCase().trim();
    const password = String(formData.get("password") || "");
    const name = String(formData.get("name") || "").trim();
    const company = String(formData.get("company") || "").trim() || `${name} Workspace`;

    if (!email || password.length < 8) redirect("/signup?error=invalid");

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) redirect("/signup?error=exists");

    let slug = slugify(company);
    let n = 1;
    while (await prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${slugify(company)}-${n++}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const ws = await prisma.workspace.create({ data: { name: company, slug } });
    await prisma.user.create({
      data: { email, name, passwordHash, role: "OWNER", workspaceId: ws.id },
    });

    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  }

  const errMap: Record<string, string> = {
    invalid: "Compila tutti i campi (password min 8 caratteri).",
    exists: "Esiste già un account con questa email.",
  };

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="card w-full max-w-md">
        <Link href="/" className="font-display text-xl">← QuizFunnel</Link>
        <h1 className="mt-4 font-display text-3xl">Crea il tuo account</h1>
        <p className="mt-1 text-sm text-ink/60">Workspace gratuito, niente carta richiesta.</p>
        {searchParams.error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errMap[searchParams.error] || "Errore"}
          </p>
        )}
        <form action={action} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Nome</label>
            <input name="name" required className="mt-1 w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3" />
          </div>
          <div>
            <label className="text-sm font-medium">Azienda / Brand (per il tuo workspace)</label>
            <input name="company" className="mt-1 w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3" />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input name="email" type="email" required className="mt-1 w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3" />
          </div>
          <div>
            <label className="text-sm font-medium">Password (min 8)</label>
            <input name="password" type="password" required minLength={8} className="mt-1 w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3" />
          </div>
          <button className="btn-accent w-full">Crea account →</button>
        </form>
        <p className="mt-6 text-sm text-ink/60">
          Hai già un account? <Link href="/login" className="font-medium underline">Accedi</Link>
        </p>
      </div>
    </main>
  );
}
