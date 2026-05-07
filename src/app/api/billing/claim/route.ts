/**
 * API per "reclamare" un abbonamento.
 *
 * L'utente che ha pagato su Systeme.io con un'email diversa da quella di login
 * può collegare la sua billing email al workspace.
 *
 * Quando lo fa, controlliamo se ci sono già subscription attive per quell'email
 * e in caso applichiamo immediatamente il piano (così non deve aspettare un nuovo webhook).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Body = z.object({
  billingEmail: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    const wsId = (session.user as any).workspaceId as string;

    const data = Body.parse(await req.json());
    const billingEmail = data.billingEmail.toLowerCase().trim();

    // Verifica che l'email non sia già usata da un ALTRO workspace
    const existing = await prisma.workspace.findFirst({
      where: {
        billingEmail,
        NOT: { id: wsId },
      },
    });
    if (existing) {
      return NextResponse.json(
        {
          error:
            "Questa email è già associata ad un altro workspace. Se è un errore, contatta il supporto.",
        },
        { status: 409 },
      );
    }

    // Aggiorna workspace
    await prisma.workspace.update({
      where: { id: wsId },
      data: { billingEmail },
    });

    // Cerca eventi webhook recenti per questa email per recuperare la subscription
    const recentEvents = await prisma.webhookEvent.findMany({
      where: {
        email: billingEmail,
        status: "ignored", // ignorati perché non c'era ancora un workspace con questa email
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // ultimi 30 giorni
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Se troviamo un evento di "tag attivato" recente, applichiamo subito il piano
    const { planFromActiveTag } = await import("@/lib/billing-tags");
    let appliedPlan: string | null = null;

    for (const ev of recentEvents) {
      if (!ev.tagName) continue;
      const plan = planFromActiveTag(ev.tagName);
      if (plan && /add|added|created|attached/i.test(ev.eventType)) {
        await prisma.$transaction([
          prisma.workspace.update({
            where: { id: wsId },
            data: { plan: plan as any },
          }),
          prisma.subscription.create({
            data: {
              workspaceId: wsId,
              plan: plan as any,
              billingEmail,
              status: "active",
              systemeTag: ev.tagName,
            },
          }),
          prisma.webhookEvent.update({
            where: { id: ev.id },
            data: { status: "processed", workspaceId: wsId },
          }),
        ]);
        appliedPlan = plan;
        break;
      }
    }

    return NextResponse.json({
      ok: true,
      billingEmail,
      appliedPlan,
      message: appliedPlan
        ? `Email collegata. Piano ${appliedPlan} attivato!`
        : "Email collegata. Quando completerai il pagamento su Systeme.io, il piano si attiverà automaticamente.",
    });
  } catch (e: any) {
    console.error("[claim subscription]", e);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}
