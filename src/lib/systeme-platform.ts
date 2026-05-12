/**
 * Aggiorna il custom field "quizfunnel_magic_link" del contatto Systeme.io.
 *
 * v3: accetta il contactId direttamente (estratto dal payload del webhook).
 * Questo evita la search via /contacts?email=... che ritornava 422 Unprocessable
 * Entity (le API Systeme.io recenti non accettano "email" come query param nella
 * lista contatti). Se contactId non è disponibile, fa il fallback alla search
 * fetchando una pagina di contatti e filtrandoli lato server (più lento ma robusto).
 *
 * Quando il webhook crea un account automaticamente, vogliamo che l'email di
 * benvenuto Systeme.io abbia un pulsante con il link diretto alla piattaforma.
 *
 * NOTA: ci serve la PLATFORM API key di Systeme.io (env SYSTEME_PLATFORM_API_KEY)
 * perché chi paga è il CLIENTE finale, non il workspace del cliente.
 */

const SYSTEME_API_BASE = "https://api.systeme.io/api";

/**
 * Aggiorna il custom field "quizfunnel_magic_link" di un contatto Systeme.io.
 *
 * Preferibilmente passa contactId (lo trovi nel payload del webhook in
 * payload.contact.id). In quel caso saltiamo la search e andiamo direttamente
 * alla PATCH.
 *
 * Se contactId non è disponibile, facciamo una search più tollerante.
 */
export async function setSystemeMagicLinkField(opts: {
  email: string;
  magicLinkUrl: string;
  contactId?: number | string;
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
    // 1. Risolvi il contactId
    let contactId: string | number | null = opts.contactId ?? null;

    if (!contactId) {
      // Fallback: cerca via API. Le API recenti vogliono "fields[email]" non "email"
      // (o un'altra sintassi). Proviamo varianti, e se tutte falliscono facciamo
      // un best-effort prendendo i contatti più recenti e filtrandoli per email.
      contactId = await findContactIdByEmail(apiKey, email);

      if (!contactId) {
        return {
          ok: false,
          message: `Contact ID non trovato per email ${email}`,
        };
      }
    }

    // 2. Prepara il valore: togliamo "https://" perché il link builder di
    // Systeme.io accoda la variabile a un prefisso fisso (https://, mailto:, tel:).
    // Salvando senza prefisso, il pulsante "https://" + [quizfunnel_magic_link]
    // genera l'URL completo corretto.
    const valueForSysteme = opts.magicLinkUrl.replace(/^https?:\/\//i, "");

    // 3. PATCH al contatto con merge-patch+json
    const updateRes = await fetch(`${SYSTEME_API_BASE}/contacts/${contactId}`, {
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
            value: valueForSysteme,
          },
        ],
      }),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return {
        ok: false,
        message: `Update failed ${updateRes.status}: ${errText.slice(0, 300)}`,
      };
    }

    return {
      ok: true,
      message: `Magic link aggiornato per contactId=${contactId}`,
    };
  } catch (e: any) {
    return { ok: false, message: e.message || "Errore sconosciuto" };
  }
}

/**
 * Cerca contactId per email provando varie sintassi delle API Systeme.io.
 * Ritorna null se non trovato.
 */
async function findContactIdByEmail(
  apiKey: string,
  email: string,
): Promise<string | number | null> {
  // Variante 1: query parameter "email" (sintassi vecchia, ora 422 sulle API nuove)
  const url1 = `${SYSTEME_API_BASE}/contacts?email=${encodeURIComponent(email)}&limit=5`;

  // Variante 2: parametro fields[email] (sintassi spec-compliant moderna)
  const url2 = `${SYSTEME_API_BASE}/contacts?fields%5Bemail%5D=${encodeURIComponent(email)}&limit=5`;

  // Variante 3: fetch contatti recenti e filter lato client (fallback robusto)
  const url3 = `${SYSTEME_API_BASE}/contacts?limit=100`;

  for (const url of [url2, url1, url3]) {
    try {
      const res = await fetch(url, {
        headers: { "X-API-Key": apiKey, Accept: "application/json" },
      });
      if (!res.ok) {
        console.warn(`[systeme-platform] Search ${url} returned ${res.status}`);
        continue;
      }
      const data = await res.json();
      const items = data.items || data.data || [];
      const found = items.find(
        (c: any) =>
          (c.email || "").toLowerCase().trim() === email.toLowerCase().trim(),
      );
      if (found?.id) return found.id;
    } catch (e) {
      console.warn(`[systeme-platform] Fetch error on ${url}:`, e);
    }
  }
  return null;
}
