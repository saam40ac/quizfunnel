"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TONES = [
  { v: "professionale", l: "Professionale", d: "Pacato, autorevole, orientato ai risultati" },
  { v: "amichevole", l: "Amichevole", d: "Caldo, vicino, dà del tu" },
  { v: "diretto", l: "Diretto", d: "Senza fronzoli, va al punto" },
  { v: "motivazionale", l: "Motivazionale", d: "Energico, ispirazionale, sprona" },
];

type Step = "brief" | "generating" | "error";

export function NewQuizWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("brief");
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [target, setTarget] = useState("");
  const [problem, setProblem] = useState("");
  const [tone, setTone] = useState("professionale");
  const [goal, setGoal] = useState("");
  const [numQuestions, setNumQuestions] = useState(7);

  async function generate() {
    setError(null);
    if (!title.trim() || !summary.trim() || !target.trim() || !problem.trim() || !goal.trim()) {
      setError("Compila tutti i campi richiesti.");
      return;
    }
    setStep("generating");
    try {
      const res = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          target: target.trim(),
          problem: problem.trim(),
          tone,
          goal: goal.trim(),
          numQuestions,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Errore durante la generazione");
      }
      const data = await res.json();
      router.push(`/dashboard/quizzes/${data.quizId}/edit?generated=1`);
    } catch (e: any) {
      setError(e.message || "Errore sconosciuto");
      setStep("error");
    }
  }

  if (step === "generating") {
    return (
      <div className="card text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-ink/10 border-t-accent" />
        <h2 className="mt-6 font-display text-2xl">Sto pensando al tuo quiz…</h2>
        <p className="mt-2 text-sm text-ink/60">
          L'AI sta scrivendo domande e risultati personalizzati. 5-15 secondi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <Field label="Titolo del quiz *" hint="Quello che vedrà il visitatore in cima alla pagina.">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='Es. "Quanto è pronto il tuo business per scalare?"'
          className="input"
        />
      </Field>

      <Field
        label="Sintesi del progetto / servizio *"
        hint="Cosa vendi e come aiuti i tuoi clienti. 2-4 righe."
      >
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="Es. Aiuto coach e consulenti a costruire funnel automatizzati che generano clienti 24/7 senza dover essere sempre attivi sui social. Vendo un programma di accompagnamento di 3 mesi."
          className="input"
        />
      </Field>

      <Field
        label="Target di riferimento *"
        hint="Chi è il tuo cliente ideale? Età, professione, livello, situazione."
      >
        <textarea
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          rows={2}
          placeholder="Es. Coach, consulenti e formatori italiani tra i 35 e 55 anni che hanno già un'attività ma faticano a generare lead in modo costante."
          className="input"
        />
      </Field>

      <Field
        label="Problema principale che risolvi *"
        hint="Il dolore concreto del cliente nel quotidiano."
      >
        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          rows={2}
          placeholder="Es. Dipendono dal passaparola, non hanno un sistema prevedibile per acquisire clienti, perdono tempo in attività manuali."
          className="input"
        />
      </Field>

      <Field label="Tono di voce *">
        <div className="grid gap-2 md:grid-cols-2">
          {TONES.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setTone(t.v)}
              className={`rounded-xl border p-3 text-left transition ${
                tone === t.v ? "border-accent bg-accent/10" : "border-ink/15 hover:border-ink/30"
              }`}
            >
              <div className="font-semibold">{t.l}</div>
              <div className="text-xs text-ink/60">{t.d}</div>
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="Obiettivo finale *"
        hint="Cosa vuoi che faccia il lead dopo aver completato il quiz?"
      >
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Es. Prenotare una call di consulenza gratuita / Acquistare il programma a 1.997€"
          className="input"
        />
      </Field>

      <Field label="Numero di domande" hint="Da 5 a 7. Consigliato: 7.">
        <div className="flex gap-2">
          {[5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNumQuestions(n)}
              className={`rounded-xl border px-4 py-2 transition ${
                numQuestions === n ? "border-accent bg-accent/10" : "border-ink/15"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Field>

      <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-ink/10 bg-white/90 p-4 shadow-lg backdrop-blur">
        <p className="text-xs text-ink/50">
          Genererò un quiz completo in pochi secondi.
          <br />
          Potrai modificare tutto subito dopo.
        </p>
        <button onClick={generate} className="btn-accent">
          ✨ Genera quiz con AI →
        </button>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(11, 11, 13, 0.15);
          background: rgba(255, 255, 255, 0.85);
          padding: 12px 16px;
          font-size: 15px;
          outline: none;
          transition: border-color 0.15s;
        }
        .input:focus {
          border-color: rgba(11, 11, 13, 0.6);
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
      <label className="text-sm font-semibold">{label}</label>
      {hint && <div className="mt-0.5 text-xs text-ink/55">{hint}</div>}
      <div className="mt-2">{children}</div>
    </div>
  );
}
