import { redirect } from "next/navigation";
import Link from "next/link";
import { consumeMagicLink } from "@/lib/magic-link";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Login via magic link.
 * URL: /login/magic?token=xxx
 *
 * Flusso:
 *  1. Estrae token dalla query string
 *  2. consumeMagicLink() lo valida e lo marca come usato
 *  3. Se valido → fa signIn server-side → redirect /dashboard
 *  4. Se invalido → mostra pagina di errore con link al login normale
 */
export default async function MagicLinkPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  if (!token) {
    return <ErrorView reason="missing" />;
  }

  const userId = await consumeMagicLink(token);
  if (!userId) {
    return <ErrorView reason="invalid" />;
  }

  // Carica l'utente per fare signIn
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return <ErrorView reason="invalid" />;
  }

  // Usa il provider "magic" credentials (lo configuriamo per accettare userId senza password)
  // Nota: chiamando signIn con redirect, dopo questo punto la funzione fa redirect automatico
  await signIn("magic", {
    userId: user.id,
    redirectTo: "/dashboard",
  });

  // Questa parte non viene mai raggiunta perché signIn fa redirect
  redirect("/dashboard");
}

function ErrorView({ reason }: { reason: "missing" | "invalid" }) {
  const messages = {
    missing: "Link non valido. Manca il token di accesso.",
    invalid:
      "Questo link è scaduto o è già stato usato. Fai login normalmente o richiedi un nuovo link.",
  };

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="card w-full max-w-md">
        <Link href="/" className="inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/branding/logo-quizfunnel-full.jpg"
            alt="QuizFunnel"
            className="h-10 w-auto"
          />
        </Link>

        <div className="mt-6">
          <div className="text-3xl">⚠️</div>
          <h1 className="mt-2 font-display text-2xl">Link non valido</h1>
          <p className="mt-2 text-sm text-ink/60">{messages[reason]}</p>
        </div>

        <div className="mt-6 space-y-3">
          <Link href="/login" className="btn-primary block w-full text-center">
            Vai al login
          </Link>
          <Link
            href="/dashboard/billing"
            className="block w-full text-center text-sm text-ink/60 hover:underline"
          >
            Hai problemi? Vai alla pagina abbonamento per recuperare l'accesso
          </Link>
        </div>

        <p className="mt-6 rounded-lg bg-ink/5 p-3 text-xs text-ink/60">
          💡 Se hai pagato di recente ma non hai ancora un account, controlla
          la tua email per il link di attivazione, oppure scrivi a{" "}
          <a
            href="mailto:training@angelopagliara.it"
            className="font-semibold underline"
          >
            training@angelopagliara.it
          </a>
        </p>
      </div>
    </main>
  );
}
