"use client";

import { useState } from "react";
import type { Plan, PlanInfo } from "@/lib/plans";

type PlanRow = {
  plan: Plan;
  info: PlanInfo;
  checkoutUrl: string | null;
};

export function BillingClient({
  currentPlan,
  billingEmail,
  plans,
}: {
  currentPlan: Plan;
  billingEmail: string | null;
  plans: PlanRow[];
}) {
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [emailInput, setEmailInput] = useState(billingEmail || "");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  async function submitClaim() {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/billing/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingEmail: emailInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore");
      setFeedback({ type: "ok", msg: data.message || "Email collegata!" });
      // Refresh per mostrare piano aggiornato se applicato
      if (data.appliedPlan) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e: any) {
      setFeedback({ type: "err", msg: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((row) => (
          <PlanCard
            key={row.plan}
            row={row}
            isCurrent={row.plan === currentPlan}
          />
        ))}
      </div>

      {/* Sezione "Ho già pagato" */}
      <div className="card mt-6">
        <button
          onClick={() => setShowClaimForm((v) => !v)}
          className="w-full text-left text-sm font-medium text-ink/80 hover:text-ink"
        >
          {showClaimForm ? "▼" : "▶"} Hai già pagato ma non vedi il piano attivo?
        </button>
        {showClaimForm && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-ink/60">
              Inserisci l'email che hai usato per il pagamento su Systeme.io.
              Se l'abbonamento esiste, lo collegheremo subito al tuo workspace.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                placeholder="email-pagamento@esempio.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="flex-1 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm"
              />
              <button
                onClick={submitClaim}
                disabled={submitting || !emailInput.includes("@")}
                className="btn-primary text-sm"
              >
                {submitting ? "Verifico…" : "Collega email"}
              </button>
            </div>
            {feedback && (
              <div
                className={`rounded-lg p-2 text-xs ${
                  feedback.type === "ok"
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {feedback.msg}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function PlanCard({ row, isCurrent }: { row: PlanRow; isCurrent: boolean }) {
  const { info, checkoutUrl, plan } = row;
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
          <div className="font-display text-4xl">
            €{info.priceEurMonth}
            <span className="text-base font-normal text-ink/50">/mese</span>
          </div>
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
          >
            Contattaci per il downgrade
          </button>
        ) : (
          <a
            href={checkoutUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-full bg-ink px-5 py-3 text-center text-sm font-semibold text-cream transition hover:bg-black"
          >
            🚀 Upgrade a {info.name} →
          </a>
        )}
      </div>
    </div>
  );
}
