/**
 * Catch-all per i link tracker Systeme.io.
 *
 * Quando Systeme.io invia un'email e il tracking link è attivo (non disattivabile
 * sui piani base), tutti i link nel corpo email vengono riscritti come:
 *   https://www.quizfunnel.it/tr/2/<MAILING_ID>/<EMAIL_ID>/<MESSAGE_ID>/<CONTACT_ID><HASH>
 *
 * Esempio reale:
 *   /tr/2/17550066/13624709074/43375750/4220014248b9898c3cec7111742bb8ec3d716299a
 *                                       ^^^^^^^^^
 *                                    contact ID (9 cifre) + hash
 *
 * Senza questo handler, Next.js ritorna 404 perché /tr/* non esiste come route.
 *
 * Strategia:
 *  1. Estrae il contact ID dall'ultima parte dell'URL (le cifre iniziali)
 *  2. Su Systeme.io chiediamo il contatto via API per ottenere email + custom fields
 *  3. Trovo l'utente con quell'email su QuizFunnel
 *  4. Genero un NUOVO magic link al volo (single-use)
 *  5. Redirect → /login/magic?token=xxx → entra in dashboard
 *
 * Vantaggi: l'utente non vede mai il link tracker nudo, viene rediretto in
 * trasparenza alla dashboard senza errori 404.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createMagicLink } from "@/lib/magic-link";
import { getBaseUrl } from "@/lib/utils";

const SYSTEME_API_BASE = "https://api.systeme.io/api";

export default async function TrackingRedirect({
  params,
}: {
  params: { slug: string[] };
}) {
  const slugs = params.slug || [];

  // Sui link tracker Systeme.io, l'ultimo segmento ha questa struttura:
  //   <CONTACT_ID><MD5_HASH>
  // Dove l'hash MD5 è ESATTAMENTE 32 caratteri esadecimali (a-f, 0-9).
  // Esempio: "4220014248b9898c3cec7111742bb8ec3d716299a"
  //           ^^^^^^^^^                                  ← contact ID
  //                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   ← hash MD5
  //
  // Il bug della v1 era: regex /^\d+/ rubava la prima cifra dell'hash quando
  // l'hash iniziava con una cifra (es. "8b9..." → cattura "...48" invece di
  // fermarsi a "...4"). Soluzione: separare gli ultimi 32 char come hash.
  let contactId: string | null = null;

  if (lastSegment.length > 32) {
    // Hash MD5 standard = 32 caratteri esadecimali
    const candidate = lastSegment.slice(0, lastSegment.length - 32);
    // Il candidato dev'essere fatto solo di cifre
    if (/^\d+$/.test(candidate)) {
      contactId = candidate;
    }
  }

  // Fallback: se il formato non matcha, prova SHA1 (40 char)
  if (!contactId && lastSegment.length > 40) {
    const candidate = lastSegment.slice(0, lastSegment.length - 40);
    if (/^\d+$/.test(candidate)) {
      contactId = candidate;
    }
  }

  // Fallback 2: prendi tutte le cifre iniziali (vecchio comportamento, può rubare cifre dall'hash)
  if (!contactId) {
    const m = lastSegment.match(/^(\d{6,})/);
    contactId = m ? m[1] : null;
  }

  console.log(
    `[tr] Tracking link ricevuto: slugs=${JSON.stringify(slugs)}, estratto contactId=${contactId}`,
  );

  if (!contactId) {
    // Non riconosciamo il formato → ErrorView (sotto)
    return <ErrorView reason="invalid_tracking" />;
  }

  // Risolvi email del contatto via API Systeme.io
  const email = await fetchContactEmail(contactId);
  if (!email) {
    console.warn(`[tr] Email non trovata per contactId=${contactId}`);
    return <ErrorView reason="contact_not_found" />;
  }

  console.log(`[tr] Email risolta: ${email}`);

  // Trova utente QuizFunnel con questa email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.warn(`[tr] Utente QuizFunnel non trovato per ${email}`);
    return <ErrorView reason="user_not_found" />;
  }

  // Genera nuovo magic link single-use e redirect
  const magicLinkUrl = await createMagicLink(user.id, getBaseUrl());
  console.log(`[tr] Magic link generato, redirect a: ${magicLinkUrl}`);

  // Server-side redirect (HTTP 307)
  redirect(magicLinkUrl);
}

/**
 * Recupera l'email di un contatto Systeme.io tramite contact ID.
 * Usa la PLATFORM API key (env SYSTEME_PLATFORM_API_KEY).
 */
async function fetchContactEmail(contactId: string): Promise<string | null> {
  const apiKey = process.env.SYSTEME_PLATFORM_API_KEY;
  if (!apiKey) {
    console.error("[tr] SYSTEME_PLATFORM_API_KEY non configurata");
    return null;
  }

  try {
    const res = await fetch(`${SYSTEME_API_BASE}/contacts/${contactId}`, {
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
      // Non cacheamo per essere sicuri di leggere il valore fresco
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[tr] Systeme.io API ritorna ${res.status} per contactId=${contactId}`);
      return null;
    }

    const data = await res.json();
    const email = (data.email || "").toLowerCase().trim();
    return email || null;
  } catch (e: any) {
    console.error("[tr] Errore fetch contatto:", e);
    return null;
  }
}

// =============================================================================
// Vista di errore (per casi limite)
// =============================================================================

function ErrorView({
  reason,
}: {
  reason: "invalid_tracking" | "contact_not_found" | "user_not_found";
}) {
  const messages: Record<string, string> = {
    invalid_tracking:
      "Link di tracciamento non riconosciuto. Probabilmente è scaduto o corrotto.",
    contact_not_found:
      "Non riesco a trovare il tuo contatto nel sistema. Probabilmente il link è scaduto.",
    user_not_found:
      "Hai cliccato un link valido ma non risulta un account collegato a quella email. Forse l'account è stato eliminato.",
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
            href="/"
            className="block w-full text-center text-sm text-ink/60 hover:underline"
          >
            Torna alla home
          </Link>
        </div>

        <p className="mt-6 rounded-lg bg-ink/5 p-3 text-xs text-ink/60">
          💡 Hai problemi? Scrivi a{" "}
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
