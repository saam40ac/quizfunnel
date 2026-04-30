"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

type VersionItem = {
  id: string;
  versionNumber: number;
  label: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
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
    "Hai una buona base ma ti manca un metodo per essere costante e trasformare le tue storie in vendite.",
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
  versions,
  currentVersionId,
  emails: initialEmails,
}: {
  quizId: string;
  canGenerate: boolean;
  defaultCtaUrl: string;
  versions: VersionItem[];
  currentVersionId: string | null;
  emails: EmailItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [emails, setEmails] = useState<EmailItem[]>(initialEmails);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showVersionsPanel, setShowVersionsPanel] = useState(false);

  const currentVersion = versions.find((v) => v.id === currentVersionId);

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
      window.location.reload();
    } catch (e: any) {
      setError(e.message || "Errore generazione email");
      setGenerating(false);
    }
  }

  function selectVersion(versionId: string) {
    router.push(`/dashboard/quizzes/${quizId}/emails?v=${versionId}`);
    setShowVersionsPanel(false);
  }

  async function activateVersion(versionId: string) {
    if (!confirm("Vuoi rendere questa la versione attiva? Le altre rimangono in archivio.")) return;
    try {
      const res = await fetch(
        `/api/quizzes/${quizId}/emails/versions/${versionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "activate" }),
        },
      );
      if (!res.ok) throw new Error("Errore");
      window.location.reload();
    } catch {
      setError("Errore nell'attivazione");
    }
  }

  async function deleteVersion(versionId: string) {
    if (!confirm("Eliminare definitivamente questa versione? Non si può annullare.")) return;
    try {
      const res = await fetch(
        `/api/quizzes/${quizId}/emails/versions/${versionId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Errore");
      }
      window.location.reload();
    } catch (e: any) {
      setError(e.message || "Errore nell'eliminazione");
    }
  }

  async function updateMeta(versionId: string, label?: string | null, notes?: string | null) {
    try {
      await fetch(`/api/quizzes/${quizId}/emails/versions/${versionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateMeta", label, notes }),
      });
      router.refresh();
    } catch {
      setError("Errore aggiornamento metadata");
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
      {/* Bar versioni + generazione */}
      <div className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg">
                {currentVersion ? `Versione ${currentVersion.versionNumber}` : "Nessuna versione"}
                {currentVersion?.isActive && (
                  <span className="ml-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                    ATTIVA
                  </span>
                )}
              </h3>
              {currentVersion?.label && (
                <span className="text-sm text-ink/60">— {currentVersion.label}</span>
              )}
            </div>
            <p className="mt-1 text-xs text-ink/50">
              {versions.length}/5 versioni in archivio · Sequenza: Risultato → Consapevolezza → Soluzione
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {versions.length > 0 && (
              <button
                onClick={() => setShowVersionsPanel((v) => !v)}
                className="btn-ghost text-sm"
              >
                📚 Versioni ({versions.length})
              </button>
            )}
            <button
              onClick={generateAll}
              disabled={!canGenerate || generating}
              className="btn-accent"
            >
              {generating
                ? "Generazione…"
                : versions.length === 0
                  ? "✨ Genera 3 email con AI"
                  : "✨ Genera nuova versione"}
            </button>
          </div>
        </div>

        {showVersionsPanel && (
          <VersionsPanel
            versions={versions}
            currentVersionId={currentVersionId}
            onSelect={selectVersion}
            onActivate={activateVersion}
            onDelete={deleteVersion}
            onUpdateMeta={updateMeta}
          />
        )}
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
            Sto scrivendo le 3 email per il tuo funnel… 30-40 secondi.
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
          readOnly={!currentVersion?.isActive}
        />
      ))}

      {emails.length > 0 && currentVersion && !currentVersion.isActive && (
        <div className="card border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">
            ⚠️ Stai visualizzando una versione <strong>archiviata</strong> (non
            attiva). Per modificarla, prima rendila attiva dal pannello Versioni.
          </p>
        </div>
      )}

      {emails.length > 0 && (
        <div className="card border-ink/10 bg-ink/5">
          <h3 className="font-display text-lg">Come usarle in Systeme.io</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink/75">
            <li>
              Su Systeme.io vai in <strong>Automations → Rules</strong> e apri la regola "Tag added".
            </li>
            <li>
              Aggiungi 3 azioni "Send email" in sequenza, una per email, con i delay suggeriti.
            </li>
            <li>
              Per ogni mail click "Copia tutto" qui sotto e incolla nei rispettivi campi.
            </li>
            <li>
              Le variabili tra graffe (es. {"{first_name}"}) vengono sostituite automaticamente da Systeme.io.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

function VersionsPanel({
  versions,
  currentVersionId,
  onSelect,
  onActivate,
  onDelete,
  onUpdateMeta,
}: {
  versions: VersionItem[];
  currentVersionId: string | null;
  onSelect: (id: string) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateMeta: (id: string, label?: string | null, notes?: string | null) => void;
}) {
  return (
    <div className="mt-4 rounded-xl border border-ink/10 bg-white/60 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-widest text-ink/50">
        Archivio versioni ({versions.length}/5)
      </h4>
      <p className="mt-1 text-xs text-ink/50">
        Quando crei una nuova versione, la più vecchia non attiva viene eliminata
        automaticamente se sei oltre il limite.
      </p>
      <div className="mt-3 space-y-2">
        {versions.map((v) => (
          <VersionRow
            key={v.id}
            version={v}
            isCurrent={v.id === currentVersionId}
            onSelect={onSelect}
            onActivate={onActivate}
            onDelete={onDelete}
            onUpdateMeta={onUpdateMeta}
          />
        ))}
      </div>
    </div>
  );
}

function VersionRow({
  version: v,
  isCurrent,
  onSelect,
  onActivate,
  onDelete,
  onUpdateMeta,
}: {
  version: VersionItem;
  isCurrent: boolean;
  onSelect: (id: string) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateMeta: (id: string, label?: string | null, notes?: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(v.label ?? "");
  const [notes, setNotes] = useState(v.notes ?? "");

  return (
    <div
      className={`rounded-xl border p-3 transition ${
        isCurrent ? "border-accent bg-accent/5" : "border-ink/10 bg-white/40"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>v{v.versionNumber}</span>
            {v.isActive && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">
                ATTIVA
              </span>
            )}
            {isCurrent && !v.isActive && (
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                In visione
              </span>
            )}
            {v.label && <span className="truncate text-ink/60">— {v.label}</span>}
          </div>
          <div className="mt-0.5 text-[11px] text-ink/40">
            Creata il {new Date(v.createdAt).toLocaleString("it-IT")}
          </div>
          {v.notes && !editing && (
            <div className="mt-1 text-xs italic text-ink/60">📝 {v.notes}</div>
          )}
        </div>
        <div className="flex shrink-0 gap-1 text-xs">
          {!isCurrent && (
            <button
              onClick={() => onSelect(v.id)}
              className="rounded-md px-2 py-1 hover:bg-ink/5"
              title="Visualizza"
            >
              👁
            </button>
          )}
          {!v.isActive && (
            <button
              onClick={() => onActivate(v.id)}
              className="rounded-md px-2 py-1 hover:bg-green-50 hover:text-green-700"
              title="Imposta come attiva"
            >
              ✓
            </button>
          )}
          <button
            onClick={() => setEditing((e) => !e)}
            className="rounded-md px-2 py-1 hover:bg-ink/5"
            title="Modifica etichetta e note"
          >
            ✏️
          </button>
          {!v.isActive && (
            <button
              onClick={() => onDelete(v.id)}
              className="rounded-md px-2 py-1 hover:bg-red-50 hover:text-red-700"
              title="Elimina"
            >
              🗑
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-3 space-y-2 border-t border-ink/10 pt-3">
          <div>
            <label className="text-[10px] text-ink/50">Etichetta</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="es. v2 — empatica"
              className="qf-input text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-ink/50">Note (es. risultati osservati)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="es. v2 ha avuto +12% di click rispetto alla v1"
              className="qf-input text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-ink/60 hover:underline"
            >
              Annulla
            </button>
            <button
              onClick={() => {
                onUpdateMeta(v.id, label, notes);
                setEditing(false);
              }}
              className="rounded-md bg-ink px-3 py-1 text-xs text-cream hover:bg-black"
            >
              Salva
            </button>
          </div>
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
  readOnly,
}: {
  email: EmailItem;
  onChange: (patch: Partial<EmailItem>) => void;
  onSave: () => void;
  isSaving: boolean;
  justSaved: boolean;
  defaultCtaUrl: string;
  readOnly: boolean;
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
      <div className={`-m-6 mb-4 rounded-t-3xl border-b px-6 py-4 ${headerClass}`}>
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
            ? "Variabili sostituite con dati di esempio (Maria, ecc.)"
            : "Modifica il contenuto. Le variabili restano tra graffe."}
        </span>
      </div>

      {showPreview ? (
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
        <div className="space-y-4">
          {readOnly && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Questa è una versione archiviata (sola lettura). Per modificarla, attivala prima dal pannello Versioni.
            </div>
          )}
          <Field label="Oggetto" hint={`${email.subject.length}/70`}>
            <input
              value={email.subject}
              onChange={(e) => onChange({ subject: e.target.value })}
              className="qf-input"
              disabled={readOnly}
            />
          </Field>
          <Field label="Anteprima inbox (preheader)" hint={`${email.preheader.length}/120`}>
            <input
              value={email.preheader}
              onChange={(e) => onChange({ preheader: e.target.value })}
              className="qf-input"
              disabled={readOnly}
            />
          </Field>
          <Field label="Corpo della mail">
            <textarea
              value={email.body}
              onChange={(e) => onChange({ body: e.target.value })}
              rows={12}
              className="qf-input font-mono text-sm"
              disabled={readOnly}
            />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Testo del pulsante CTA">
              <input
                value={email.ctaText}
                onChange={(e) => onChange({ ctaText: e.target.value })}
                className="qf-input"
                disabled={readOnly}
              />
            </Field>
            <Field label="Link del pulsante (URL)">
              <input
                value={email.ctaUrl}
                onChange={(e) => onChange({ ctaUrl: e.target.value })}
                placeholder={defaultCtaUrl || "https://..."}
                className="qf-input font-mono text-xs"
                disabled={readOnly}
              />
            </Field>
          </div>
          <Field label="Delay suggerito in Systeme.io">
            <input
              value={email.suggestedDelay}
              onChange={(e) => onChange({ suggestedDelay: e.target.value })}
              className="qf-input"
              disabled={readOnly}
            />
          </Field>
          {!readOnly && (
            <div className="flex items-center justify-between border-t border-ink/10 pt-4">
              <span className="text-xs text-ink/50">
                {justSaved && <span className="text-green-700">✓ Salvato</span>}
              </span>
              <button onClick={onSave} disabled={isSaving} className="btn-primary text-sm">
                {isSaving ? "Salvataggio…" : "Salva email"}
              </button>
            </div>
          )}
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
        .qf-input:disabled {
          background: rgba(0, 0, 0, 0.03);
          color: rgba(11, 11, 13, 0.5);
          cursor: not-allowed;
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
      <div className="mt-1">{children}</div>
    </div>
  );
}
