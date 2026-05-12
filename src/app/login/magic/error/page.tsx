import Link from "next/link";

/**
 * Pagina di errore per quando il magic link non funziona.
 *
 * Viene mostrata dopo redirect dal Route Handler /login/magic quando:
 * - Il token è mancante (reason=missing)
 * - Il token è scaduto, già usato, o non esiste (reason=invalid)
 */
export default function MagicLinkErrorPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const reason = searchParams.reason || "invalid";

  const messages: Record<string, string> = {
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
          <p className="mt-2 text-sm text-ink/60">
            {messages[reason] || messages.invalid}
          </p>
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
          💡 Se hai pagato di recente ma non riesci ad accedere, controlla la tua
          email per il link aggiornato, oppure scrivi a{" "}
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
