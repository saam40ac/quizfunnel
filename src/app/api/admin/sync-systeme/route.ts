/**
 * Endpoint admin per riallineare i piani con lo stato dei tag su Systeme.io.
 *
 * Caso d'uso: alcuni webhook si sono persi (rete, manutenzione Systeme.io...).
 * Click sul pulsante "Sincronizza" → controlliamo via API Systeme.io che ogni
 * workspace PRO/BUSINESS abbia ancora il tag attivo. Se manca, downgrade a FREE.
 *
 * NOTA: per fare le query a Systeme.io ci serve l'API key di chi gestisce la
 * piattaforma. La leggiamo dall'env var SYSTEME_PLATFORM_API_KEY (deve essere
 * impostata su Vercel dal Super Admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BILLING_TAGS } from "@/lib/billing-tags";

export const maxDuration = 60;

type SyncResult = {
  workspaceId: string;
  workspaceName: string;
  beforePlan: string;
  afterPlan: string;
  action: "kept" | "downgraded" | "error";
  errorMessage?: string;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const apiKey = process.env.SYSTEME_PLATFORM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "SYSTEME_PLATFORM_API_KEY non configurata. Impostala su Vercel con la chiave API del tuo workspace Systeme.io che vende QuizFunnel.",
      },
      { status: 500 },
    );
  }

  // Trova tutti i workspace con piano a pagamento
  const paidWorkspaces = await prisma.workspace.findMany({
    where: { plan: { in: ["PRO", "BUSINESS"] } },
  });

  const results: SyncResult[] = [];

  for (const ws of paidWorkspaces) {
    const tagConfig = BILLING_TAGS[ws.plan as "PRO" | "BUSINESS"];
    const expectedTag = tagConfig.activeTag;
    const billingEmail = ws.billingEmail || "";

    if (!billingEmail) {
      // Senza email di pagamento non possiamo verificare
      results.push({
        workspaceId: ws.id,
        workspaceName: ws.name,
        beforePlan: ws.plan,
        afterPlan: ws.plan,
        action: "kept",
        errorMessage: "Nessuna billingEmail",
      });
      continue;
    }

    try {
      // Cerca il contatto su Systeme.io per email
      const contactRes = await fetch(
        `https://api.systeme.io/api/contacts?email=${encodeURIComponent(billingEmail)}&limit=10`,
        {
          headers: {
            "X-API-Key": apiKey,
            Accept: "application/json",
          },
        },
      );

      if (!contactRes.ok) {
        results.push({
          workspaceId: ws.id,
          workspaceName: ws.name,
          beforePlan: ws.plan,
          afterPlan: ws.plan,
          action: "error",
          errorMessage: `API error ${contactRes.status}`,
        });
        continue;
      }

      const contactData = await contactRes.json();
      const items = contactData.items || contactData.data || [];
      const contact = items[0];

      if (!contact) {
        // Contatto non esiste → downgrade
        await prisma.workspace.update({
          where: { id: ws.id },
          data: { plan: "FREE" },
        });
        await prisma.subscription.updateMany({
          where: { workspaceId: ws.id, status: "active" },
          data: { status: "expired", cancelledAt: new Date() },
        });
        results.push({
          workspaceId: ws.id,
          workspaceName: ws.name,
          beforePlan: ws.plan,
          afterPlan: "FREE",
          action: "downgraded",
          errorMessage: "Contatto non trovato su Systeme.io",
        });
        continue;
      }

      // Verifica che abbia il tag attivo
      const tags = (contact.tags || []) as any[];
      const tagNames = tags.map((t) => (typeof t === "string" ? t : t.name)).filter(Boolean);
      const hasActiveTag = tagNames.includes(expectedTag);

      if (!hasActiveTag) {
        // Tag mancante → downgrade
        await prisma.workspace.update({
          where: { id: ws.id },
          data: { plan: "FREE" },
        });
        await prisma.subscription.updateMany({
          where: { workspaceId: ws.id, status: "active" },
          data: { status: "expired", cancelledAt: new Date() },
        });
        results.push({
          workspaceId: ws.id,
          workspaceName: ws.name,
          beforePlan: ws.plan,
          afterPlan: "FREE",
          action: "downgraded",
          errorMessage: `Tag ${expectedTag} mancante`,
        });
      } else {
        results.push({
          workspaceId: ws.id,
          workspaceName: ws.name,
          beforePlan: ws.plan,
          afterPlan: ws.plan,
          action: "kept",
        });
      }
    } catch (e: any) {
      results.push({
        workspaceId: ws.id,
        workspaceName: ws.name,
        beforePlan: ws.plan,
        afterPlan: ws.plan,
        action: "error",
        errorMessage: e.message || "Errore sconosciuto",
      });
    }
  }

  const summary = {
    total: results.length,
    kept: results.filter((r) => r.action === "kept").length,
    downgraded: results.filter((r) => r.action === "downgraded").length,
    errors: results.filter((r) => r.action === "error").length,
  };

  return NextResponse.json({ ok: true, summary, results });
}
