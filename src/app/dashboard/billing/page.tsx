import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PLANS, type Plan } from "@/lib/plans";
import { BILLING_TAGS } from "@/lib/billing-tags";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const session = await auth();
  const wsId = (session!.user as any).workspaceId as string;
  const ws = await prisma.workspace.findUnique({
    where: { id: wsId },
    include: {
      subscriptions: {
        where: { status: "active" },
        orderBy: { startedAt: "desc" },
      },
    },
  });
  if (!ws) redirect("/dashboard/settings");

  const currentPlan = ws.plan as Plan;
  const activeSub = ws.subscriptions[0];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link href="/dashboard" className="text-xs text-ink/50">
          ← Dashboard
        </Link>
        <h1 className="mt-1 font-display text-3xl">Piani &amp; Abbonamento</h1>
        <p className="mt-1 text-sm text-ink/60">
          Stai usando il piano <strong>{PLANS[currentPlan].name}</strong>.
          {currentPlan !== "BUSINESS" && " Fai upgrade per sbloccare nuove funzionalità."}
        </p>
      </div>

      {/* Stato abbonamento attivo */}
      {activeSub && (
        <div className="card mb-6 border-green-200 bg-green-50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg">Abbonamento attivo</h3>
              <p className="mt-1 text-sm text-green-900">
                Piano <strong>{PLANS[activeSub.plan as Plan].name}</strong> · Email pagamento{" "}
                <strong>{activeSub.billingEmail}</strong>
              </p>
              <p className="mt-1 text-xs text-green-700">
                Attivo dal {activeSub.startedAt.toLocaleDateString("it-IT")}.
                Per modificare o cancellare l'abbonamento, accedi al tuo account Systeme.io.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3 piani */}
      <BillingClient
        currentPlan={currentPlan}
        billingEmail={ws.billingEmail}
        plans={(Object.keys(PLANS) as Plan[]).map((p) => ({
          plan: p,
          info: PLANS[p],
          checkoutUrl: p === "FREE" ? null : BILLING_TAGS[p].checkoutUrl,
        }))}
      />

      {/* FAQ pagamenti */}
      <div className="card mt-8 bg-ink/5">
        <h3 className="font-display text-lg">Come funziona il pagamento</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink/70">
          <li>
            Click su <strong>"Upgrade"</strong> sopra → si apre la pagina di pagamento Systeme.io
          </li>
          <li>Completi il pagamento (carta o PayPal)</li>
          <li>
            Il tuo piano viene attivato automaticamente entro pochi minuti
          </li>
          <li>
            Hai pagato ma il piano non si è attivato? Click qui sotto per collegare la tua email
            di pagamento.
          </li>
        </ol>
        <p className="mt-3 text-xs text-ink/50">
          Hai bisogno di aiuto? Scrivi a{" "}
          <a href="mailto:training@angelopagliara.it" className="underline">
            training@angelopagliara.it
          </a>
        </p>
      </div>
    </div>
  );
}
