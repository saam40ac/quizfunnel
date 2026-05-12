/**
 * Aggiorna il custom field "quizfunnel_magic_link" del contatto Systeme.io.
 *
 * Quando il webhook crea un account automaticamente, vogliamo che l'email di
 * benvenuto Systeme.io abbia un pulsante con il link diretto alla piattaforma.
 *
 * Approccio:
 * 1. Sistemeio invia il webhook tag_added a noi
 * 2. Noi creiamo account + magic link
 * 3. Chiamiamo questa funzione per scrivere il magic link nel campo custom
 *    "quizfunnel_magic_link" del contatto su Systeme.io
 * 4. L'automation Systeme.io (che parte un attimo dopo, con un piccolo delay
 *    di 1-2 minuti) invia l'email di benvenuto con un pulsante CTA il cui URL
 *    è la variabile [quizfunnel_magic_link]
 *
 * NOTA: ci serve la PLATFORM API key di Systeme.io (env SYSTEME_PLATFORM_API_KEY)
 * perché chi paga è il CLIENTE finale, non il workspace del cliente.
 */

import { prisma } from "@/lib/prisma";

const SYSTEME_API_BASE = "https://api.systeme.io/api";

/**
 * Trova il contatto Systeme.io per email e aggiorna il suo custom field
 * "quizfunnel_magic_link" con l'URL del magic link.
 *
 * Ritorna true se aggiornato, false se non trovato/errore.
 */
export async function setSystemeMagicLinkField(opts: {
  email: string;
  magicLinkUrl: string;
}): Promise<{ ok: boolean; message: string }> {
  const apiKey = process.env.SYSTEME_PLATFORM_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      message:
        "SYSTEME_PLATFORM_API_KEY non configurata. Imposta env var su Vercel.",
    };
  }

  const email = opts.email.toLowerCase().trim();

  try {
    // 1. Cerca il contatto per email
    const searchRes = await fetch(
      `${SYSTEME_API_BASE}/contacts?email=${encodeURIComponent(email)}&limit=5`,
      {
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
        },
      },
    );

    if (!searchRes.ok) {
      return { ok: false, message: `Search failed ${searchRes.status}` };
    }

    const searchData = await searchRes.json();
    const items = searchData.items || searchData.data || [];
    const contact = items[0];
    if (!contact?.id) {
      return { ok: false, message: `Contatto non trovato per ${email}` };
    }

    // 2. Aggiorna il custom field via merge-patch
    // Systeme.io richiede: PATCH /contacts/{id} con Content-Type merge-patch+json
    // Il body usa "fields" come array di {slug, value}
    const updateRes = await fetch(`${SYSTEME_API_BASE}/contacts/${contact.id}`, {
      method: "PATCH",
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
        "Content-Type": "application/merge-patch+json",
      },
      body: JSON.stringify({
        fields: [
          {
            slug: "quizfunnel_magic_link",
            value: opts.magicLinkUrl,
          },
        ],
      }),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return {
        ok: false,
        message: `Update failed ${updateRes.status}: ${errText.slice(0, 200)}`,
      };
    }

    return { ok: true, message: "Magic link aggiornato su Systeme.io" };
  } catch (e: any) {
    return { ok: false, message: e.message || "Errore sconosciuto" };
  }
}
