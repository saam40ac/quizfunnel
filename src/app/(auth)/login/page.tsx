import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

export default function LoginPage({ searchParams }: { searchParams: { error?: string; callbackUrl?: string } }) {
  async function action(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").toLowerCase();
    const password = String(formData.get("password") || "");
    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/dashboard",
      });
    } catch (e: any) {
      if (e?.message?.includes?.("NEXT_REDIRECT")) throw e;
      redirect(`/login?error=invalid`);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="card w-full max-w-md">
        <Link href="/" className="font-display text-xl">← QuizFunnel</Link>
        <h1 className="mt-4 font-display text-3xl">Accedi</h1>
        {searchParams.error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Credenziali non valide.
          </p>
        )}
        <form action={action} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input name="email" type="email" required className="mt-1 w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3 outline-none focus:border-ink" />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input name="password" type="password" required className="mt-1 w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3 outline-none focus:border-ink" />
          </div>
          <button className="btn-accent w-full">Entra →</button>
        </form>
        <p className="mt-6 text-sm text-ink/60">
          Non hai un account? <Link href="/signup" className="font-medium underline">Registrati</Link>
        </p>
      </div>
    </main>
  );
}
