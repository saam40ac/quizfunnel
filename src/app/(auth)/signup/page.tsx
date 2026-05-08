import Link from "next/link";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { planFromActiveTag } from "@/lib/billing-tags";
import type { Plan } from "@/lib/plans";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string; plan?: string; email?: string };
}) {
  // Estrae piano e email pre-compilata dall'URL
  const incomingPlan = (searchParams.plan || "").toUpperCase();
  const isPaidIntent = incomingPlan === "PRO" || incomingPlan === "BUSINESS";
  const prefilledEmail = searchParams.email
    ? decodeURIComponent(searchParams.email).toLowerCase().trim()
    : "";

  async function action(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").toLowerCase().trim();
    const password = String(formData.get("password") || "");
    const name = String(formData.get("name") || "").trim();
    const company = String(formData.get("company") || "").trim() || `${name} Workspace`;

    if (!email || password.length < 8) redirect("/signup?error=invalid");

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) redirect("/signup?error=exists");

    let slug = slugify(company);
    let n = 1;
    while (await prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${slugify(company)}-${n++}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const ws = await prisma.workspace.create({
      data: {
        name: company,
        slug,
        billingEmail: email, // l'email del signup è anche l'email di pagamento
      },
    });
    await prisma.user.create({
      data: { email, name, passwordHash, role: "OWNER", workspaceId: ws.id },
    });

    // Aggancia subscription pendenti per questa email (se ha già pagato su Systeme.io)
    try {
      const recentEvents = await prisma.webhookEvent.findMany({
        where: {
          email,
          status: "ignored", // gli eventi che non sono mai stati associati a un workspace
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      for (const ev of recentEvents) {
        if (!ev.tagName) continue;
        const plan = planFromActiveTag(ev.tagName);
        if (plan && /add|added|created|attached/i.test(ev.eventType)) {
          await prisma.$transaction([
            prisma.workspace.update({
              where: { id: ws.id },
              data: { plan: plan as Plan },
            }),
            prisma.subscription.create({
              data: {
                workspaceId: ws.id,
                plan: plan as Plan,
                billingEmail: email,
                status: "active",
                systemeTag: ev.tagName,
              },
            }),
            prisma.webhookEvent.update({
              where: { id: ev.id },
              data: { status: "processed", workspaceId: ws.id },
            }),
          ]);
          break; // applica solo il primo (più recente)
        }
      }
    } catch (err) {
      console.error("[signup] Failed to attach pending subscription:", err);
      // Non blocchiamo il signup se questo fallisce
    }

    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  }

  const errMap: Record<string, string> = {
    invalid: "Compila tutti i campi (password min 8 caratteri).",
    exists: "Esiste già un account con questa email. Vai al login.",
  };

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="card w-full max-w-md">
        <Link href="/" className="font-display text-xl">
          ← QuizFunnel
        </Link>

        {/* Banner per chi arriva da pagamento */}
        {isPaidIntent && (
          <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-2">
              <span className="text-xl">🎉</span>
              <div>
                <h3 className="font-display text-base text-green-900">
                  Pagamento {incomingPlan} ricevuto!
                </h3>
                <p className="mt-1 text-xs text-green-800">
                  Crea ora il tuo account QuizFunnel usando l'email con cui hai pagato
                  ({prefilledEmail || "controlla la tua casella"}). Il piano{" "}
                  <strong>{incomingPlan}</strong> si attiverà automaticamente.
                </p>
              </div>
            </div>
          </div>
        )}

        <h1 className="mt-4 font-display text-3xl">
          {isPaidIntent ? "Attiva il tuo account" : "Crea il tuo account"}
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          {isPaidIntent
            ? `Compila i campi qui sotto per attivare il piano ${incomingPlan}.`
            : "Workspace gratuito, niente carta richiesta."}
        </p>

        {searchParams.error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errMap[searchParams.error] || "Errore"}
          </p>
        )}

        <form action={action} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Nome</label>
            <input
              name="name"
              required
              className="mt-1 w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3"
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Azienda / Brand (per il tuo workspace)
            </label>
            <input
              name="company"
              className="mt-1 w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3"
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Email{" "}
              {isPaidIntent && (
                <span className="text-xs text-ink/50">
                  (deve coincidere con quella del pagamento)
                </span>
              )}
            </label>
            <input
              name="email"
              type="email"
              required
              defaultValue={prefilledEmail}
              readOnly={isPaidIntent && !!prefilledEmail}
              className={`mt-1 w-full rounded-xl border border-ink/15 px-4 py-3 ${
                isPaidIntent && prefilledEmail
                  ? "bg-ink/5"
                  : "bg-white/80"
              }`}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password (min 8)</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3"
            />
          </div>
          <button className={isPaidIntent ? "btn-accent w-full" : "btn-accent w-full"}>
            {isPaidIntent ? `Attiva il mio account ${incomingPlan} →` : "Crea account →"}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink/60">
          Hai già un account?{" "}
          <Link href="/login" className="font-medium underline">
            Accedi
          </Link>
        </p>

        {/* Solo per FREE: link per chi ha già pagato ma non ha email pre-compilata */}
        {!isPaidIntent && (
          <p className="mt-3 rounded-lg bg-ink/5 px-3 py-2 text-xs text-ink/60">
            💡 Hai già pagato un piano Pro o Business?
            <br />
            Crea l'account qui usando la stessa email del pagamento — il piano si
            attiverà automaticamente.
          </p>
        )}
      </div>
    </main>
  );
}
