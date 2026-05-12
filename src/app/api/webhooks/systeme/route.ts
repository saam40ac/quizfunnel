/**
 * Webhook che riceve eventi da Systeme.io.
 *
 * v4 (auto-signup): quando arriva CONTACT_TAG_ADDED per un piano Pro/Business
 * e l'email NON ha ancora un account su QuizFunnel, creiamo automaticamente
 * workspace + utente + magic link, e scriviamo il magic link nel custom field
 * di Systeme.io così l'email di benvenuto può usare quel link diretto.
 *
 * Endpoint: POST /api/webhooks/systeme?secret=XXX
 * Header che porta l'evento: x-webhook-event (es. CONTACT_TAG_ADDED)
 * Body: { contact: { email }, tag: { name } }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { planFromActiveTag, planFromCancelledTag } from "@/lib/billing-tags";
import { slugify, getBaseUrl } from "@/lib/utils";
import { createMagicLink } from "@/lib/magic-link";
import { setSystemeMagicLinkField } from "@/lib/systeme-platform";
import type { Plan } from "@/lib/plans";

export async function POST(req: NextRequest) {
  // Logging diagnostico
  const allHeaders: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    allHeaders[k] = v;
  });
  const rawBody = await req.text();
  console.log(
    "[webhook v4] === RICHIESTA ===\n" +
      `URL: ${req.url}\nHeaders: ${JSON.stringify(allHeaders).slice(0, 800)}\nBody: ${rawBody.slice(0, 1500)}`,
  );

  // 1. Verifica secret
  const expected = process.env.SYSTEME_WEBHOOK_SECRET;
  if (!expected) {
    console.error("[webhook v4] SYSTEME_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const secretFromUrl = req.nextUrl.searchParams.get("secret");
  const secretFromHeader =
    req.headers.get("x-webhook-secret") ||
    req.headers.get("x-systeme-secret") ||
    req.headers.get("x-signature") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    null;

  let payload: any = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const secretFromBody =
    payload.secret || payload.webhook_secret || payload.signature || null;

  const secretMatch = [secretFromUrl, secretFromHeader, secretFromBody]
    .filter(Boolean)
    .some((s) => s === expected);

  if (!secretMatch) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Estrazione campi (Systeme.io mette l'evento nell'header)
  const eventType =
    req.headers.get("x-webhook-event") ||
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

  // Estrazione opzionale di nome/cognome dal payload contact (per popolarlo se vogliamo)
  const contactFields = payload.contact?.fields || [];
  const firstName =
    contactFields.find((f: any) => f.slug === "first_name")?.value || "";
  const surname =
    contactFields.find((f: any) => f.slug === "surname")?.value || "";
  const fullName = [firstName, surname].filter(Boolean).join(" ").trim() || null;

  console.log(
    `[webhook v4] event=${eventType}, email=${email}, tag=${tagName}, name=${fullName}`,
  );

  if (!email) {
    return await logAndRespond({
      eventType,
      email: "(missing)",
      tagName,
      rawPayload: payload,
      status: "error",
      errorMessage: "Email mancante",
    });
  }
  if (!tagName) {
    return await logAndRespond({
      eventType,
      email,
      tagName: null,
      rawPayload: payload,
      status: "ignored",
      errorMessage: "Tag mancante",
    });
  }

  const eventNormalized = eventType.toLowerCase();
  const isAddEvent =
    /add|added|created|attached|aggiunto|nuovo/i.test(eventNormalized);
  const isRemoveEvent =
    /remov|delet|detach|unset|cancel|rimosso|eliminato|tolto/i.test(
      eventNormalized,
    );

  const planFromAdd = planFromActiveTag(tagName);
  const planFromCancel = planFromCancelledTag(tagName);

  if (!planFromAdd && !planFromCancel) {
    return await logAndRespond({
      eventType,
      email,
      tagName,
      rawPayload: payload,
      status: "ignored",
      errorMessage: `Tag "${tagName}" non riconosciuto come piano`,
    });
  }

  const lowercaseEmail = email.toLowerCase().trim();

  // 3. Cerca o crea workspace
  let ws = await findWorkspaceByEmail(lowercaseEmail);
  let createdNewAccount = false;

  // Se NON esiste workspace AND è un evento di ATTIVAZIONE → AUTO-SIGNUP
  if (!ws && planFromAdd && (isAddEvent || !isRemoveEvent)) {
    try {
      const created = await createWorkspaceAndUser({
        email: lowercaseEmail,
        name: fullName,
        plan: planFromAdd,
      });
      ws = created.workspace;
      createdNewAccount = true;

      // Genera magic link e scrivilo nel custom field Systeme.io
      const baseUrl = getBaseUrl();
      const magicLinkUrl = await createMagicLink(created.user.id, baseUrl);

      console.log(
        `[webhook v4] ✓ Auto-signup creato per ${lowercaseEmail}, magic link: ${magicLinkUrl}`,
      );

      // Aggiorna campo Systeme.io (in modo asincrono, ma aspettiamo per loggare)
      const updateResult = await setSystemeMagicLinkField({
        email: lowercaseEmail,
        magicLinkUrl,
      });
      console.log(
        `[webhook v4] Systeme.io field update: ${updateResult.ok ? "✓" : "✗"} ${updateResult.message}`,
      );

      return await logAndRespond({
        eventType,
        email: lowercaseEmail,
        tagName,
        workspaceId: ws.id,
        rawPayload: payload,
        status: "processed",
        errorMessage: `Auto-signup creato, magic link: ${updateResult.ok ? "inviato" : "ERRORE - " + updateResult.message}`,
      });
    } catch (e: any) {
      console.error("[webhook v4] Auto-signup failed:", e);
      return await logAndRespond({
        eventType,
        email: lowercaseEmail,
        tagName,
        rawPayload: payload,
        status: "error",
        errorMessage: `Auto-signup failed: ${e.message}`,
      });
    }
  }

  // 4. Workspace esiste → applica upgrade o downgrade
  if (!ws) {
    return await logAndRespond({
      eventType,
      email: lowercaseEmail,
      tagName,
      rawPayload: payload,
      status: "ignored",
      errorMessage: "Workspace non trovato e non è evento di attivazione",
    });
  }

  try {
    if (planFromAdd && (isAddEvent || !isRemoveEvent)) {
      await prisma.$transaction([
        prisma.workspace.update({
          where: { id: ws.id },
          data: { plan: planFromAdd as Plan, billingEmail: lowercaseEmail },
        }),
        prisma.subscription.create({
          data: {
            workspaceId: ws.id,
            plan: planFromAdd as Plan,
            billingEmail: lowercaseEmail,
            status: "active",
            systemeTag: tagName,
          },
        }),
      ]);
      console.log(
        `[webhook v4] ✓ Upgraded workspace ${ws.id} to ${planFromAdd}`,
      );

      // Se è un upgrade ad un workspace già esistente, generiamo comunque un nuovo magic link
      // così l'utente può rientrare facilmente (se ha perso la password)
      const owner = await prisma.user.findFirst({
        where: { workspaceId: ws.id, role: "OWNER" },
      });
      if (owner) {
        const baseUrl = getBaseUrl();
        const magicLinkUrl = await createMagicLink(owner.id, baseUrl);
        await setSystemeMagicLinkField({
          email: lowercaseEmail,
          magicLinkUrl,
        });
        console.log(`[webhook v4] Magic link rigenerato per upgrade esistente`);
      }

      return await logAndRespond({
        eventType,
        email: lowercaseEmail,
        tagName,
        workspaceId: ws.id,
        rawPayload: payload,
        status: "processed",
      });
    }

    if ((planFromCancel || planFromAdd) && isRemoveEvent) {
      const cancelledPlan = planFromCancel || planFromAdd;
      await prisma.$transaction([
        prisma.workspace.update({
          where: { id: ws.id },
          data: { plan: "FREE" },
        }),
        prisma.subscription.updateMany({
          where: {
            workspaceId: ws.id,
            plan: cancelledPlan as Plan,
            status: "active",
          },
          data: {
            status: "cancelled",
            cancelledAt: new Date(),
          },
        }),
      ]);
      console.log(`[webhook v4] ✓ Downgraded workspace ${ws.id} to FREE`);
      return await logAndRespond({
        eventType,
        email: lowercaseEmail,
        tagName,
        workspaceId: ws.id,
        rawPayload: payload,
        status: "processed",
      });
    }

    return await logAndRespond({
      eventType,
      email: lowercaseEmail,
      tagName,
      workspaceId: ws.id,
      rawPayload: payload,
      status: "ignored",
      errorMessage: "Combinazione evento/tag non gestita",
    });
  } catch (e: any) {
    return await logAndRespond({
      eventType,
      email: lowercaseEmail,
      tagName,
      workspaceId: ws.id,
      rawPayload: payload,
      status: "error",
      errorMessage: e.message,
    });
  }
}

/**
 * Cerca workspace per billingEmail o per email utente
 */
async function findWorkspaceByEmail(email: string) {
  const byBilling = await prisma.workspace.findFirst({
    where: { billingEmail: email },
  });
  if (byBilling) return byBilling;

  const user = await prisma.user.findFirst({
    where: { email },
    include: { workspace: true },
  });
  return user?.workspace ?? null;
}

/**
 * Crea workspace + utente owner automaticamente.
 * Imposta il piano corretto e crea subscription attiva.
 */
async function createWorkspaceAndUser(opts: {
  email: string;
  name: string | null;
  plan: Plan;
}) {
  // Genera slug univoco basato sull'email
  const baseSlug = slugify(opts.email.split("@")[0]) || "workspace";
  let slug = baseSlug;
  let n = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${n++}`;
  }

  // Nome workspace di default
  const wsName = opts.name || opts.email.split("@")[0] + " Workspace";

  const workspace = await prisma.workspace.create({
    data: {
      name: wsName,
      slug,
      plan: opts.plan,
      billingEmail: opts.email,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: opts.email,
      name: opts.name,
      passwordHash: null, // creato senza password, login solo via magic link inizialmente
      role: "OWNER",
      workspaceId: workspace.id,
    },
  });

  await prisma.subscription.create({
    data: {
      workspaceId: workspace.id,
      plan: opts.plan,
      billingEmail: opts.email,
      status: "active",
    },
  });

  return { workspace, user };
}

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
    console.error("[webhook v4] Failed to log:", e);
  }
  return NextResponse.json({
    ok: true,
    status: opts.status,
    message: opts.errorMessage,
  });
}
