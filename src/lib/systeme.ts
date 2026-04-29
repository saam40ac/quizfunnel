/**
 * Client per la Public API di Systeme.io — v3
 *
 * STRATEGIA:
 * 1. Crea il contatto con SOLO i campi standard (email, nome, cognome, telefono)
 * 2. Aggiorna i custom fields in una chiamata separata (PATCH)
 * 3. Applica il tag
 *
 * Questo approccio è più robusto perché alcune versioni dell'API accettano
 * i custom fields solo in update, non in create.
 *
 * Tutti i valori sono inviati come STRINGA (anche i numeri) per massima
 * compatibilità con i campi "Text", "Number" e "Long text".
 */

const BASE = "https://api.systeme.io/api";

type SystemeContact = { id: string | number; email: string; [k: string]: any };
type SystemeTag = { id: string | number; name: string };

async function call<T>(apiKey: string, path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method || "GET";

  // Systeme.io richiede Content-Type "application/merge-patch+json" per le PATCH (RFC 7396)
  // mentre POST/GET vogliono "application/json".
  const contentType =
    method === "PATCH" ? "application/merge-patch+json" : "application/json";

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": contentType,
      "X-API-Key": apiKey,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");

  // Log SEMPRE ogni chiamata per diagnostica completa
  if (!res.ok) {
    console.error(
      `[Systeme.io ❌] ${method} ${path} -> ${res.status}\n` +
      `  Body sent: ${init.body || "(none)"}\n` +
      `  Response: ${text || res.statusText}`,
    );
    throw new Error(`Systeme.io ${res.status}: ${text || res.statusText}`);
  } else {
    console.log(
      `[Systeme.io ✓] ${method} ${path} -> ${res.status}` +
        (text ? `\n  Response (first 300 chars): ${text.slice(0, 300)}` : ""),
    );
  }

  if (res.status === 204 || !text) return null as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null as T;
  }
}

export async function getContactByEmail(apiKey: string, email: string) {
  const data = await call<{ items?: SystemeContact[] }>(
    apiKey,
    `/contacts?email=${encodeURIComponent(email)}`,
  );
  const items = data?.items ?? [];
  return items[0] ?? null;
}

/**
 * Crea un contatto con SOLO i campi standard.
 * Custom fields vengono aggiunti in un secondo momento via updateContactFields.
 */
export async function createContact(
  apiKey: string,
  payload: { email: string; firstName?: string; lastName?: string; phoneNumber?: string },
) {
  const fields = [
    ...(payload.firstName ? [{ slug: "first_name", value: String(payload.firstName) }] : []),
    ...(payload.lastName ? [{ slug: "surname", value: String(payload.lastName) }] : []),
    ...(payload.phoneNumber ? [{ slug: "phone_number", value: String(payload.phoneNumber) }] : []),
  ];

  return call<SystemeContact>(apiKey, "/contacts", {
    method: "POST",
    body: JSON.stringify({ email: payload.email, fields }),
  });
}

/**
 * Aggiorna i campi (custom o standard) di un contatto esistente.
 * Tutti i valori vengono inviati come stringa per massima compatibilità.
 */
export async function updateContactFields(
  apiKey: string,
  contactId: string | number,
  fieldsMap: Record<string, string | number | undefined | null>,
) {
  const fields = Object.entries(fieldsMap)
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .map(([slug, value]) => ({ slug, value: String(value) }));

  if (fields.length === 0) {
    console.log("[Systeme.io] updateContactFields skipped (no fields)");
    return;
  }

  return call(apiKey, `/contacts/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
}

export async function ensureTag(apiKey: string, name: string): Promise<SystemeTag> {
  const list = await call<{ items?: SystemeTag[] }>(
    apiKey,
    `/tags?name=${encodeURIComponent(name)}`,
  );
  const found = list.items?.find((t) => t.name.toLowerCase() === name.toLowerCase());
  if (found) return found;
  return call<SystemeTag>(apiKey, "/tags", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function assignTag(
  apiKey: string,
  contactId: string | number,
  tagId: string | number,
) {
  return call(apiKey, `/contacts/${contactId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tagId }),
  });
}

/**
 * SYNC LEAD — funzione di alto livello chiamata al completamento di un quiz.
 *
 * Flusso:
 *   1. Cerca il contatto per email
 *   2. Se non esiste: crealo (solo campi standard)
 *   3. Aggiorna i custom fields del quiz (separatamente via PATCH)
 *   4. Applica il tag
 *
 * Custom fields del quiz (slug → contenuto):
 *   - quiz_title
 *   - quiz_result_label
 *   - quiz_result_desc
 *   - quiz_result_score (passato come stringa)
 */
export async function syncLead(opts: {
  apiKey: string;
  email: string;
  name?: string;
  phone?: string;
  tagName?: string;
  customFields?: Record<string, string | number | undefined | null>;
}) {
  const { apiKey, email, name, phone, tagName, customFields } = opts;

  const [firstName, ...rest] = (name || "").split(" ");
  const lastName = rest.join(" ");

  // 1. Trova o crea il contatto
  let contact = await getContactByEmail(apiKey, email);

  if (!contact) {
    console.log(`[Systeme.io] Contact ${email} non trovato, lo creo`);
    contact = await createContact(apiKey, {
      email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      phoneNumber: phone,
    });
  } else {
    console.log(`[Systeme.io] Contact ${email} trovato (id: ${contact.id})`);
  }

  if (!contact?.id) {
    throw new Error("Systeme.io: contatto non creato (id mancante)");
  }

  // 2. Aggiorna i custom fields (sempre, anche per contatti esistenti)
  if (customFields && Object.keys(customFields).length > 0) {
    try {
      await updateContactFields(apiKey, contact.id, customFields);
      console.log(`[Systeme.io] Custom fields aggiornati per contact ${contact.id}`);
    } catch (e: any) {
      // Non blocchiamo il flusso: il tag deve essere applicato comunque
      console.error(
        `[Systeme.io] updateContactFields fallito per ${email} (id: ${contact.id}):`,
        e?.message || e,
      );
    }
  }

  // 3. Applica il tag
  if (tagName) {
    try {
      const tag = await ensureTag(apiKey, tagName);
      await assignTag(apiKey, contact.id, tag.id);
      console.log(`[Systeme.io] Tag "${tagName}" applicato a contact ${contact.id}`);
    } catch (e: any) {
      console.error(
        `[Systeme.io] assignTag fallito per ${email} (id: ${contact.id}):`,
        e?.message || e,
      );
    }
  }

  return contact;
}
