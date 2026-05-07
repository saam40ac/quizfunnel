/**
 * Webhook che riceve eventi da Systeme.io (tag_added, tag_removed, ecc.).
 *
 * Endpoint: POST /api/webhooks/systeme?secret=XXX
 *
 * Sicurezza: l'endpoint richiede un secret nell'URL (env var SYSTEME_WEBHOOK_SECRET).
 * Solo Systeme.io conoscerà questo secret. Senza, ritorna 401.
 *
 * Il payload atteso da Systeme.io segue questa struttura:
 *   {
 *     "event": "tag.added" | "tag.removed",
 *     "contact": { "email": "..." },
 *     "tag": { "name": "..." }
 *   }
 *
 * NOTA: il formato esatto può variare su Systeme.io. Il parser è tollerante:
 * estrae email + tag in vari modi possibili.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  planFromActiveTag,
  planFromCancelledTag,
} from "@/lib/billing-tags";

export async function POST(req: NextRequest) {
  // 0. Logging diagnostico massimo: capiamo cosa Systeme.io ci manda davvero
  const allHeaders: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    allHeaders[k] = v;
  });

  const rawBody = await req.text();
  console.log(
    "[webhook v2] === RICHIESTA IN ARRIVO ===\n" +
      `URL: ${req.url}\n` +
      `Headers: ${JSON.stringify(allHeaders)}\n` +
      `Body (primi 2000 char): ${rawBody.slice(0, 2000)}`,
  );

  // 1. Verifica secret in modo tollerante (URL, body, header)
  const expected = process.env.SYSTEME_WEBHOOK_SECRET;
  if (!expected) {
    console.error("[webhook v2] SYSTEME_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const secretFromUrl = req.nextUrl.searchParams.get("secret");
  const secretFromHeader =
    req.headers.get("x-webhook-secret") ||
    req.headers.get("x-systeme-secret") ||
    req.headers.get("x-signature") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    null;

  // Parse body per cercare secret anche lì
  let payload: any;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const secretFromBody =
    payload.secret || payload.webhook_secret || payload.signature || null;

  const candidates = [secretFromUrl, secretFromHeader, secretFromBody].filter(Boolean);
  const secretMatch = candidates.some((s) => s === expected);

  if (!secretMatch) {
    console.warn(
      `[webhook v2] Secret mismatch. URL=${!!secretFromUrl}, header=${!!secretFromHeader}, body=${!!secretFromBody}. ` +
        `Confronta nei log gli headers per capire dove Systeme.io mette il secret.`,
    );
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Estrazione tollerante: Systeme.io può avere vari formati
  const eventType =
    payload.event ||
    payload.event_type ||
    payload.type ||
    "unknown";

  const email =
    payload.contact?.email ||
    payload.email ||
    payload.user?.email ||
    payload.subscriber?.email ||
    null;

  const tagName =
    payload.tag?.name ||
    payload.tag?.tag_name ||
    payload.tagName ||
    payload.tag ||
    payload.name ||
    null;

  console.log(
    `[webhook] Received: event=${eventType}, email=${email}, tag=${tagName}`,
  );

  if (!email) {
    return await logAndRespond({
      eventType,
      email: "(missing)",
      tagName: tagName || null,
      rawPayload: payload,
      status: "error",
      errorMessage: "Email mancante nel payload",
    });
  }

  if (!tagName) {
    return await logAndRespond({
      eventType,
      email,
      tagName: null,
      rawPayload: payload,
      status: "ignored",
      errorMessage: "Tag mancante (probabilmente evento non-tag)",
    });
  }

  // 3. Determina se è un evento "tag_added" (active) o "tag_removed" (cancellazione)
  // Riconoscimento multilingua: inglese + italiano + varianti
  const eventNormalized = eventType.toLowerCase();
  const isAddEvent =
    /add|added|created|attached|aggiunto|aggiunti|nuovo/i.test(eventNormalized);
  const isRemoveEvent =
    /remov|delet|detach|unset|cancel|rimosso|rimossi|eliminato|tolto/i.test(eventNormalized);

  console.log(
    `[webhook v2] Event classification: type="${eventType}", isAdd=${isAddEvent}, isRemove=${isRemoveEvent}`,
  );

  // 4. Cerca workspace per billingEmail o per user email
  const ws = await findWorkspaceByEmail(email);
  if (!ws) {
    return await logAndRespond({
      eventType,
      email,
      tagName,
      rawPayload: payload,
      status: "ignored",
      errorMessage: `Nessun workspace trovato con email ${email}. L'utente deve "reclamare" l'abbonamento.`,
    });
  }

  // 5. Determina piano dal tag
  const planFromAdd = planFromActiveTag(tagName);
  const planFromCancel = planFromCancelledTag(tagName);

  if (!planFromAdd && !planFromCancel) {
    return await logAndRespond({
      eventType,
      email,
      tagName,
      workspaceId: ws.id,
      rawPayload: payload,
      status: "ignored",
      errorMessage: `Tag "${tagName}" non riconosciuto come tag di abbonamento`,
    });
  }

  // 6. Upgrade o downgrade
  try {
    if (planFromAdd && (isAddEvent || !isRemoveEvent)) {
      // ATTIVAZIONE: cambia piano workspace + crea subscription
      await prisma.$transaction([
        prisma.workspace.update({
          where: { id: ws.id },
          data: {
            plan: planFromAdd as any,
            billingEmail: email,
          },
        }),
        prisma.subscription.create({
          data: {
            workspaceId: ws.id,
            plan: planFromAdd as any,
            billingEmail: email,
            status: "active",
            systemeTag: tagName,
          },
        }),
      ]);

      console.log(
        `[webhook] ✓ Upgraded workspace ${ws.id} to ${planFromAdd} (email: ${email})`,
      );

      return await logAndRespond({
        eventType,
        email,
        tagName,
        workspaceId: ws.id,
        rawPayload: payload,
        status: "processed",
      });
    }

    if ((planFromCancel || planFromAdd) && isRemoveEvent) {
      // CANCELLAZIONE: torna a FREE
      const cancelledPlan = planFromCancel || planFromAdd;
      await prisma.$transaction([
        prisma.workspace.update({
          where: { id: ws.id },
          data: { plan: "FREE" },
        }),
        prisma.subscription.updateMany({
          where: {
            workspaceId: ws.id,
            plan: cancelledPlan as any,
            status: "active",
          },
          data: {
            status: "cancelled",
            cancelledAt: new Date(),
          },
        }),
      ]);

      console.log(
        `[webhook] ✓ Downgraded workspace ${ws.id} from ${cancelledPlan} to FREE`,
      );

      return await logAndRespond({
        eventType,
        email,
        tagName,
        workspaceId: ws.id,
        rawPayload: payload,
        status: "processed",
      });
    }

    return await logAndRespond({
      eventType,
      email,
      tagName,
      workspaceId: ws.id,
      rawPayload: payload,
      status: "ignored",
      errorMessage: "Combinazione evento/tag non gestita",
    });
  } catch (e: any) {
    console.error("[webhook] Failed processing:", e);
    return await logAndRespond({
      eventType,
      email,
      tagName,
      workspaceId: ws.id,
      rawPayload: payload,
      status: "error",
      errorMessage: e.message || "Errore interno",
    });
  }
}

/**
 * Cerca workspace per billingEmail (preferito) o per email di un utente del workspace.
 * Restituisce null se non trovato.
 */
async function findWorkspaceByEmail(email: string) {
  const lowercaseEmail = email.toLowerCase().trim();

  // 1. Cerca per billingEmail (impostato dall'utente quando "reclama" l'abbonamento)
  const byBilling = await prisma.workspace.findFirst({
    where: { billingEmail: lowercaseEmail },
  });
  if (byBilling) return byBilling;

  // 2. Cerca per email di un utente del workspace
  const user = await prisma.user.findFirst({
    where: { email: lowercaseEmail },
    include: { workspace: true },
  });
  return user?.workspace ?? null;
}

/**
 * Salva l'evento nel DB e risponde al webhook.
 */
async function logAndRespond(opts: {
  eventType: string;
  email: string;
  tagName: string | null;
  workspaceId?: string;
  rawPayload: any;
  status: "processed" | "ignored" | "error";
  errorMessage?: string;
}) {
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: "systeme",
        eventType: opts.eventType,
        email: opts.email,
        tagName: opts.tagName,
        workspaceId: opts.workspaceId,
        rawPayload: opts.rawPayload,
        status: opts.status,
        errorMessage: opts.errorMessage,
      },
    });
  } catch (e) {
    console.error("[webhook] Failed to log event:", e);
  }

  // Sempre 200 per evitare retry inutili da Systeme.io
  return NextResponse.json({
    ok: true,
    status: opts.status,
    message: opts.errorMessage,
  });
}
