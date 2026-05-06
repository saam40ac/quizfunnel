"use client";

import { useState, useRef } from "react";

export function BackupClient() {
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function downloadBackup() {
    // Apertura semplice di un link che scarica il file
    window.location.href = "/api/admin/backup";
  }

  async function handleRestore(file: File) {
    setError(null);
    setSuccess(null);

    // Doppia conferma
    const confirm1 = confirm(
      `⚠️ ATTENZIONE: stai per RIPRISTINARE un backup.\n\n` +
        `Questo cancellerà TUTTI i dati attuali (utenti, quiz, lead, email) ` +
        `e li sostituirà con quelli del file selezionato.\n\n` +
        `L'operazione NON è reversibile.\n\n` +
        `Vuoi continuare?`,
    );
    if (!confirm1) return;

    const confirm2 = prompt(
      `Per confermare definitivamente, digita la parola: RESTORE`,
    );
    if (confirm2 !== "RESTORE") {
      setError("Conferma non valida. Restore annullato.");
      return;
    }

    setRestoring(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup, confirm: "RESTORE" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore restore");

      setSuccess(
        `Restore completato! ${data.restored?.users ?? 0} utenti, ${data.restored?.quizzes ?? 0} quiz, ` +
          `${data.restored?.leads ?? 0} lead ripristinati. Ricarica la pagina.`,
      );
    } catch (e: any) {
      setError(`Errore: ${e.message}`);
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <section className="card">
      <h2 className="font-display text-xl">Backup &amp; Restore</h2>
      <p className="mt-1 text-sm text-ink/60">
        Esporta o ripristina tutti i dati della piattaforma in formato JSON.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          ✓ {success}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* BACKUP */}
        <div className="rounded-2xl border border-ink/10 bg-white/60 p-5">
          <div className="text-2xl">💾</div>
          <h3 className="mt-2 font-display text-lg">Esporta backup</h3>
          <p className="mt-1 text-sm text-ink/60">
            Scarica un file JSON con tutti i dati: utenti, workspace, quiz, lead, email, log AI.
          </p>
          <p className="mt-2 text-xs text-ink/50">
            Salvalo in un posto sicuro (Drive, Dropbox). Consigliato: 1 volta a settimana.
          </p>
          <button
            onClick={downloadBackup}
            className="btn-primary mt-4 text-sm"
          >
            ⬇ Scarica backup ora
          </button>
        </div>

        {/* RESTORE */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
          <div className="text-2xl">⚠️</div>
          <h3 className="mt-2 font-display text-lg">Ripristina backup</h3>
          <p className="mt-1 text-sm text-ink/70">
            Carica un file JSON di backup. <strong>Sovrascrive tutti i dati attuali.</strong>
          </p>
          <p className="mt-2 text-xs text-amber-900">
            Operazione irreversibile. Richiede doppia conferma.
          </p>
          <div className="mt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleRestore(file);
              }}
              disabled={restoring}
              className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:text-amber-900 hover:file:bg-amber-200 disabled:opacity-50"
            />
            {restoring && (
              <p className="mt-2 text-xs text-amber-900">⏳ Ripristino in corso…</p>
            )}
          </div>
        </div>
      </div>

      {/* Best practices */}
      <div className="mt-6 rounded-xl bg-ink/5 p-4 text-sm text-ink/70">
        <p className="font-medium">💡 Best practices</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>Scarica un backup PRIMA di ogni modifica strutturale (es. <code>prisma db push</code>)</li>
          <li>Conserva almeno gli ultimi 4 backup settimanali</li>
          <li>I file di backup possono essere grandi (1-10 MB) — usa cloud storage</li>
          <li>Il restore <strong>cancella tutto e poi importa</strong>: niente merge automatico</li>
          <li>Per migrazioni complesse o restore parziali, contattami prima</li>
        </ul>
      </div>
    </section>
  );
}
