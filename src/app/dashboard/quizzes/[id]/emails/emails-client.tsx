"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type EmailItem = {
  id: string;
  order: number;
  internalLabel: string;
  suggestedDelay: string;
  subject: string;
  preheader: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
};

const EXAMPLE_PREVIEW: Record<string, string> = {
  "{first_name}": "Maria",
  "{quiz_title}": "Storytelling",
  "{quiz_result_label}": "Sei in crescita",
  "{quiz_result_summary}":
    "Hai una buona base ma ti manca un metodo per essere costante e trasformare le tue storie in vendite.",
  "{quiz_result_cta}":
    "Se vuoi imparare il sistema completo, ti aspetto nella prossima diretta gratuita.",
  "{quiz_result_desc}":
    "Hai una buona base ma ti manca un metodo per essere costante e trasformare le tue storie in vendite. Le tue storie funzionano, ma potrebbero diventare devastanti.",
  "{quiz_score_total}": "18/35",
  "{email}": "maria.rossi@gmail.com",
};

function applyPreview(text: string): string {
  let out = text;
  for (const [tag, value] of Object.entries(EXAMPLE_PREVIEW)) {
    out = out.split(tag).join(value);
  }
  return out;
}

export function EmailsEditor({
  quizId,
  canGenerate,
  defaultCtaUrl,
  emails: initialEmails,
}: {
  quizId: string;
  canGenerate: boolean;
  defaultCtaUrl: string;
  emails: EmailItem[];
}) {
  const router = useRouter();
  const [emails, setEmails] = useState<EmailItem[]>(initialEmails);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function generateAll() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/emails/generate`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Errore generazione");
      }
      // Hard reload per essere sicuri che i Server Components rifaccino la query al DB
      // e mostrino le email appena generate. router.refresh() non sempre basta.
      window.location.reload();
    } catch (e: any) {
      setError(e.message || "Errore generazione email");
    } finally {
      setGenerating(false);
    }
  }

  function updateEmail(id: string, patch: Partial<EmailItem>) {
    setEmails((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  async function saveEmail(email: EmailItem) {
    setSavingId(email.id);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/emails/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: email.subject,
          preheader: email.preheader,
          body: email.body,
          ctaText: email.ctaText,
          ctaUrl: email.ctaUrl,
          suggestedDelay: email.suggestedDelay,
          internalLabel: email.internalLabel,
        }),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      setSavedId(email.id);
      setTimeout(() => setSavedId(null), 2500);
    } catch (e: any) {
      setError(e.message || "Errore");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Bar generazione */}
      <div className="card flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-lg">
            Sequenza email — {emails.length}/3
          </h3>
          <p className="mt-1 text-sm text-ink/60">
            Tre email progressive: <strong>Risultato → Consapevolezza → Soluzione</strong>.
            Generale dall'AI, modifica a piacere, poi copia/incolla in Systeme.io.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={generateAll}
            disabled={!canGenerate || generating}
            className="btn-accent"
            title={
              !canGenerate
                ? "Serve un quiz creato col brief AI"
                : emails.length === 3
                  ? "Sostituirà le email esistenti"
                  : "Genera la sequenza"
            }
          >
            {generating
              ? "Generazione…"
              : emails.length === 3
                ? "🔄 Rigenera con AI"
                : "✨ Genera 3 email con AI"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {emails.length === 0 && !generating && (
        <div className="card text-center">
          <p className="text-ink/60">
            Nessuna email ancora. Click "✨ Genera 3 email con AI" per partire.
          </p>
        </div>
      )}

      {generating && emails.length === 0 && (
        <div className="card text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-ink/10 border-t-accent" />
          <p className="mt-4 text-sm text-ink/60">
            Sto scrivendo le 3 email per il tuo funnel… 10-15 secondi.
          </p>
        </div>
      )}

      {emails.map((email) => (
        <EmailCard
          key={email.id}
          email={email}
          onChange={(patch) => updateEmail(email.id, patch)}
          onSave={() => saveEmail(email)}
          isSaving={savingId === email.id}
          justSaved={savedId === email.id}
          defaultCtaUrl={defaultCtaUrl}
        />
      ))}

      {/* Guida */}
      {emails.length > 0 && (
        <div className="card border-ink/10 bg-ink/5">
          <h3 className="font-display text-lg">Come usarle in Systeme.io</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink/75">
            <li>
              Su Systeme.io vai in <strong>Automations → Rules</strong> e apri
              la regola "Tag added → ${"<tag del tuo quiz>"}".
            </li>
            <li>
              Aggiungi 3 azioni "Send email" in sequenza, una per email, con i
              delay suggeriti (Subito / +1 giorno / +3 giorni).
            </li>
            <li>
              Per ogni mail, click "Copia tutto" qui sotto e incolla nei rispettivi
              campi su Systeme.io (oggetto, anteprima, corpo, pulsante).
            </li>
            <li>
              Le variabili tra graffe (es. {"{first_name}"}) vengono sostituite
              automaticamente da Systeme.io con i dati del contatto.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

function EmailCard({
  email,
  onChange,
  onSave,
  isSaving,
  justSaved,
  defaultCtaUrl,
}: {
  email: EmailItem;
  onChange: (patch: Partial<EmailItem>) => void;
  onSave: () => void;
  isSaving: boolean;
  justSaved: boolean;
  defaultCtaUrl: string;
}) {
  const [showPreview, setShowPreview] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  function copyAll() {
    const ctaUrl = email.ctaUrl || defaultCtaUrl;
    const fullText = `Oggetto: ${email.subject}

Anteprima inbox: ${email.preheader}

${email.body}

[Pulsante: ${email.ctaText}]
${ctaUrl ? `Link: ${ctaUrl}` : ""}
`;
    copy(fullText, "all");
  }

  const colorMap: Record<string, string> = {
    "1": "bg-blue-50 border-blue-200 text-blue-900",
    "2": "bg-purple-50 border-purple-200 text-purple-900",
    "3": "bg-orange-50 border-orange-200 text-orange-900",
  };
  const headerClass =
    colorMap[String(email.order)] || "bg-ink/5 border-ink/10 text-ink";

  return (
    <div className="card">
      {/* Header card */}
      <div
        className={`-m-6 mb-4 rounded-t-3xl border-b px-6 py-4 ${headerClass}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest opacity-70">
              EMAIL {email.order}
            </span>
            <h3 className="mt-1 font-display text-xl">{email.internalLabel}</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs">⏱ {email.suggestedDelay}</span>
            <button
              onClick={copyAll}
              className="rounded-lg bg-white/80 px-3 py-1.5 text-xs font-semibold transition hover:bg-white"
            >
              {copied === "all" ? "✓ Copiato!" : "📋 Copia tutto"}
            </button>
          </div>
        </div>
      </div>

      {/* Toggle preview */}
      <div className="mb-4 flex items-center gap-4">
        <div className="inline-flex rounded-lg border border-ink/10 bg-white/60 p-1">
          <button
            onClick={() => setShowPreview(true)}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${showPreview ? "bg-ink text-cream" : "text-ink/60"}`}
          >
            Anteprima
          </button>
          <button
            onClick={() => setShowPreview(false)}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${!showPreview ? "bg-ink text-cream" : "text-ink/60"}`}
          >
            Modifica
          </button>
        </div>
        <span className="text-xs text-ink/40">
          {showPreview
            ? "Le variabili sono sostituite con dati di esempio (Maria, ecc.)"
            : "Modifica il contenuto. Le variabili restano tra graffe."}
        </span>
      </div>

      {showPreview ? (
        // ===== ANTEPRIMA =====
        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium text-ink/50">OGGETTO</div>
            <div className="mt-1 rounded-xl bg-white/70 p-3 font-display text-lg">
              {applyPreview(email.subject)}
            </div>
          </div>

          {email.preheader && (
            <div>
              <div className="text-xs font-medium text-ink/50">ANTEPRIMA INBOX</div>
              <div className="mt-1 rounded-xl bg-white/50 p-3 text-sm italic text-ink/70">
                {applyPreview(email.preheader)}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-medium text-ink/50">CORPO</div>
            <div className="mt-1 whitespace-pre-wrap rounded-xl bg-white/70 p-4 text-sm leading-relaxed">
              {applyPreview(email.body)}
            </div>
          </div>

          <div className="rounded-xl bg-white/50 p-3">
            <div className="text-xs font-medium text-ink/50">CTA</div>
            <div className="mt-2 inline-block rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white">
              {applyPreview(email.ctaText)} →
            </div>
            {email.ctaUrl && (
              <div className="mt-2 break-all font-mono text-[10px] text-ink/40">
                {email.ctaUrl}
              </div>
            )}
          </div>
        </div>
      ) : (
        // ===== MODIFICA =====
        <div className="space-y-4">
          <Field label="Oggetto" hint={`${email.subject.length}/70`}>
            <input
              value={email.subject}
              onChange={(e) => onChange({ subject: e.target.value })}
              className="qf-input"
            />
            <CopyBtn text={email.subject} label="subject" copied={copied} setCopied={setCopied} />
          </Field>

          <Field label="Anteprima inbox (preheader)" hint={`${email.preheader.length}/120`}>
            <input
              value={email.preheader}
              onChange={(e) => onChange({ preheader: e.target.value })}
              className="qf-input"
            />
            <CopyBtn text={email.preheader} label="preheader" copied={copied} setCopied={setCopied} />
          </Field>

          <Field label="Corpo della mail">
            <textarea
              value={email.body}
              onChange={(e) => onChange({ body: e.target.value })}
              rows={12}
              className="qf-input font-mono text-sm"
            />
            <CopyBtn text={email.body} label="body" copied={copied} setCopied={setCopied} />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Testo del pulsante CTA">
              <input
                value={email.ctaText}
                onChange={(e) => onChange({ ctaText: e.target.value })}
                className="qf-input"
              />
            </Field>
            <Field label="Link del pulsante (URL Systeme.io o landing)">
              <input
                value={email.ctaUrl}
                onChange={(e) => onChange({ ctaUrl: e.target.value })}
                placeholder={defaultCtaUrl || "https://..."}
                className="qf-input font-mono text-xs"
              />
            </Field>
          </div>

          <Field label="Delay suggerito in Systeme.io">
            <input
              value={email.suggestedDelay}
              onChange={(e) => onChange({ suggestedDelay: e.target.value })}
              className="qf-input"
              placeholder="Es. Subito, +1 giorno, +3 giorni"
            />
          </Field>

          <div className="flex items-center justify-between border-t border-ink/10 pt-4">
            <span className="text-xs text-ink/50">
              {justSaved && <span className="text-green-700">✓ Salvato</span>}
            </span>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="btn-primary text-sm"
            >
              {isSaving ? "Salvataggio…" : "Salva email"}
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .qf-input {
          display: block;
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(11, 11, 13, 0.15);
          background: rgba(255, 255, 255, 0.85);
          padding: 10px 14px;
          font-size: 14px;
          font-family: inherit;
          outline: none;
        }
        .qf-input:focus {
          border-color: rgba(11, 11, 13, 0.6);
          background: white;
        }
        textarea.qf-input {
          resize: vertical;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-ink/60">{label}</label>
        {hint && <span className="text-[10px] text-ink/40">{hint}</span>}
      </div>
      <div className="relative mt-1">{children}</div>
    </div>
  );
}

function CopyBtn({
  text,
  label,
  copied,
  setCopied,
}: {
  text: string;
  label: string;
  copied: string | null;
  setCopied: (v: string | null) => void;
}) {
  function doCopy() {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }
  return (
    <button
      type="button"
      onClick={doCopy}
      className="absolute right-2 top-2 rounded-md bg-white/80 px-2 py-0.5 text-[10px] hover:bg-white"
    >
      {copied === label ? "✓" : "📋"}
    </button>
  );
}
