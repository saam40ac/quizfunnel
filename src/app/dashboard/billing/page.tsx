import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PLANS, type Plan } from "@/lib/plans";
import { getWorkspaceUsage } from "@/lib/usage";

export default async function BillingPage() {
  const session = await auth();
  const wsId = (session!.user as any).workspaceId as string;
  const ws = await prisma.workspace.findUnique({ where: { id: wsId } });
  if (!ws) redirect("/dashboard/settings");

  const usage = await getWorkspaceUsage(wsId);
  const currentPlan = ws.plan as Plan;

  const order: Plan[] = ["FREE", "PRO", "BUSINESS"];

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

      <div className="grid gap-4 md:grid-cols-3">
        {order.map((p) => (
          <PlanCard
            key={p}
            plan={p}
            isCurrent={p === currentPlan}
          />
        ))}
      </div>

      <div className="card mt-8 bg-ink/5">
        <h3 className="font-display text-lg">Come funziona l'upgrade</h3>
        <p className="mt-2 text-sm text-ink/70">
          I pagamenti sono gestiti tramite Systeme.io. Quando completi l'acquisto,
          il tuo piano viene aggiornato automaticamente entro pochi minuti.
        </p>
        <p className="mt-2 text-xs text-ink/50">
          Hai bisogno di aiuto? Scrivi a{" "}
          <a href="mailto:training@angelopagliara.it" className="underline">
            training@angelopagliara.it
          </a>
        </p>
      </div>
    </div>
  );
}

function PlanCard({ plan, isCurrent }: { plan: Plan; isCurrent: boolean }) {
  const info = PLANS[plan];
  const isFree = plan === "FREE";

  return (
    <div
      className={`flex h-full flex-col rounded-3xl border-2 p-6 ${
        isCurrent
          ? "border-accent bg-accent/5"
          : plan === "PRO"
            ? "border-ink/15 shadow-lg"
            : "border-ink/10"
      }`}
    >
      {isCurrent && (
        <span className="mb-3 inline-block rounded-full bg-accent px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
          Piano corrente
        </span>
      )}
      {plan === "PRO" && !isCurrent && (
        <span className="mb-3 inline-block rounded-full bg-ink px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-cream">
          Più popolare
        </span>
      )}

      <h3 className="font-display text-2xl">{info.name}</h3>
      <p className="mt-1 text-sm text-ink/60">{info.tagline}</p>

      <div className="mt-4">
        {info.priceEurMonth === null ? (
          <div className="font-display text-4xl">Gratis</div>
        ) : (
          <>
            <div className="font-display text-4xl">
              €{info.priceEurMonth}
              <span className="text-base font-normal text-ink/50">/mese</span>
            </div>
          </>
        )}
      </div>

      <ul className="mt-5 flex-1 space-y-2 text-sm">
        {info.highlights.map((h, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span>{h}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {isCurrent ? (
          <button
            disabled
            className="w-full rounded-full border border-ink/20 px-5 py-3 text-sm text-ink/40"
          >
            Piano attivo
          </button>
        ) : isFree ? (
          <button
            disabled
            className="w-full rounded-full border border-ink/20 px-5 py-3 text-sm text-ink/40"
            title="Per tornare al Free contatta il supporto"
          >
            Contattaci per il downgrade
          </button>
        ) : (
          <a
            href="#"
            className="block w-full rounded-full bg-ink px-5 py-3 text-center text-sm font-semibold text-cream transition hover:bg-black"
            title="Pagamenti in arrivo"
          >
            🚀 Upgrade a {info.name}
          </a>
        )}
      </div>

      {/* TEMPORANEO: in attesa di Step 2 pagamenti */}
      {!isCurrent && !isFree && (
        <p className="mt-2 text-center text-[10px] text-ink/40">
          Pagamenti via Systeme.io disponibili a breve.
          <br />
          Per ora contatta il supporto per upgradare.
        </p>
      )}
    </div>
  );
}
