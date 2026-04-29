/**
 * Client per la Public API di Systeme.io
 * Docs: https://developer.systeme.io/reference/api
 *
 * Operazioni supportate:
 *  - getContactByEmail(email)
 *  - createContact(email, fields, customFields)
 *  - updateContactFields(contactId, customFields)
 *  - ensureTag(name) -> id
 *  - assignTagToContact(contactId, tagId)
 *  - syncLead({...}) — funzione di alto livello
 */

const BASE = "https://api.systeme.io/api";

type SystemeContact = { id: string | number; email: string; [k: string]: any };
type SystemeTag = { id: string | number; name: string };

async function call<T>(apiKey: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Log dettagliato visibile su Vercel Logs
    console.error(
      `[Systeme.io API ERROR] ${init.method || "GET"} ${path} -> ${res.status}`,
      `\n  Body sent: ${init.body || "(none)"}`,
      `\n  Response: ${text || res.statusText}`,
    );
    throw new Error(`Systeme.io ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
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
 * Crea un nuovo contatto.
 * - I campi standard (first_name, surname, phone_number) sono già supportati nativamente da Systeme.io.
 * - I customFields sono campi personalizzati che TU hai creato manualmente su Systeme.io
 *   (CRM > Contacts > seleziona un contatto > "Add new custom field").
 *   Ogni campo ha uno "slug" che usiamo qui come chiave.
 */
export async function createContact(
  apiKey: string,
  payload: {
    email: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    customFields?: Record<string, string | number | undefined | null>;
  },
) {
  const stdFields = [
    ...(payload.firstName ? [{ slug: "first_name", value: payload.firstName }] : []),
    ...(payload.lastName ? [{ slug: "surname", value: payload.lastName }] : []),
    ...(payload.phoneNumber ? [{ slug: "phone_number", value: payload.phoneNumber }] : []),
  ];

  const customFieldEntries = Object.entries(payload.customFields || {})
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .map(([slug, value]) => ({ slug, value: String(value) }));

  return call<SystemeContact>(apiKey, "/contacts", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      fields: [...stdFields, ...customFieldEntries],
    }),
  });
}

/**
 * Aggiorna i campi di un contatto esistente.
 * Usa PATCH /contacts/{id}.
 */
export async function updateContactFields(
  apiKey: string,
  contactId: string | number,
  customFields: Record<string, string | number | undefined | null>,
) {
  const fields = Object.entries(customFields)
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .map(([slug, value]) => ({ slug, value: String(value) }));

  if (fields.length === 0) return;

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
 * Sync di alto livello: crea/aggiorna contatto, popola i custom fields del quiz, applica tag.
 *
 * I customFields previsti per il quiz sono (slug → significato):
 *   - quiz_title          → titolo del quiz fatto
 *   - quiz_result_label   → etichetta del profilo (es. "Sei in crescita")
 *   - quiz_result_desc    → descrizione del profilo
 *   - quiz_result_score   → punteggio numerico
 *
 * Questi slug DEVONO esistere come campi personalizzati su Systeme.io
 * (CRM > Contacts > apri un contatto > Add new custom field).
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

  // 1. Verifica se il contatto esiste
  let contact = await getContactByEmail(apiKey, email);

  const [firstName, ...rest] = (name || "").split(" ");

  if (!contact) {
    // Crea da zero con tutti i campi (standard + custom)
    contact = await createContact(apiKey, {
      email,
      firstName: firstName || undefined,
      lastName: rest.join(" ") || undefined,
      phoneNumber: phone,
      customFields,
    });
  } else if (customFields && Object.keys(customFields).length > 0) {
    // Esiste già: aggiorna solo i custom fields del quiz (così l'ultimo
    // risultato sostituisce il precedente se rifa il quiz)
    try {
      await updateContactFields(apiKey, contact.id, customFields);
    } catch (e) {
      // Se l'update fallisce non blocchiamo il flusso
      console.error("[Systeme.io] updateContactFields failed:", e);
    }
  }

  // 2. Tag
  if (tagName && contact?.id) {
    const tag = await ensureTag(apiKey, tagName);
    await assignTag(apiKey, contact.id, tag.id);
  }

  return contact;
}
