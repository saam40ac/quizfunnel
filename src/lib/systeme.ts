/**
 * Client minimale per la Public API di Systeme.io
 * Docs: https://developer.systeme.io/reference/api
 *
 * Operazioni supportate:
 *  - createOrUpdateContact(email, fields)
 *  - getContactByEmail(email)
 *  - ensureTag(name) -> id
 *  - assignTagToContact(contactId, tagId)
 *
 * Ogni workspace usa la propria API key (X-API-Key).
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
    throw new Error(`Systeme.io ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}

export async function getContactByEmail(apiKey: string, email: string) {
  // L'endpoint contacts supporta filtro via querystring `email`
  const data = await call<{ items?: SystemeContact[] }>(
    apiKey,
    `/contacts?email=${encodeURIComponent(email)}`,
  );
  const items = data?.items ?? [];
  return items[0] ?? null;
}

export async function createContact(
  apiKey: string,
  payload: { email: string; firstName?: string; lastName?: string; phoneNumber?: string; fields?: Record<string, any> },
) {
  return call<SystemeContact>(apiKey, "/contacts", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      fields: [
        ...(payload.firstName
          ? [{ slug: "first_name", value: payload.firstName }]
          : []),
        ...(payload.lastName ? [{ slug: "surname", value: payload.lastName }] : []),
        ...(payload.phoneNumber ? [{ slug: "phone_number", value: payload.phoneNumber }] : []),
      ],
    }),
  });
}

export async function ensureTag(apiKey: string, name: string): Promise<SystemeTag> {
  const list = await call<{ items?: SystemeTag[] }>(apiKey, `/tags?name=${encodeURIComponent(name)}`);
  const found = list.items?.find((t) => t.name.toLowerCase() === name.toLowerCase());
  if (found) return found;
  return call<SystemeTag>(apiKey, "/tags", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function assignTag(apiKey: string, contactId: string | number, tagId: string | number) {
  return call(apiKey, `/contacts/${contactId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tagId }),
  });
}

/**
 * Funzione di alto livello: crea/aggiorna contatto e applica tag.
 * Da chiamare al completamento del quiz.
 */
export async function syncLead(opts: {
  apiKey: string;
  email: string;
  name?: string;
  phone?: string;
  tagName?: string;
}) {
  const { apiKey, email, name, phone, tagName } = opts;

  // 1. Verifica se il contatto esiste
  let contact = await getContactByEmail(apiKey, email);

  if (!contact) {
    const [firstName, ...rest] = (name || "").split(" ");
    contact = await createContact(apiKey, {
      email,
      firstName: firstName || undefined,
      lastName: rest.join(" ") || undefined,
      phoneNumber: phone,
    });
  }

  // 2. Tag (se richiesto)
  if (tagName && contact?.id) {
    const tag = await ensureTag(apiKey, tagName);
    await assignTag(apiKey, contact.id, tag.id);
  }

  return contact;
}
