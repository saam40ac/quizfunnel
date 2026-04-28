"use client";

import { useState, useTransition } from "react";

type Answer = { text: string; score: number };
type Question = { text: string; answers: Answer[] };
type ResultMap = { min: number; max: number; label: string; description: string; ctaUrl?: string };

type Initial = {
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  systemeTagName: string;
  primaryColor: string;
  accentColor: string;
  privacyText: string;
  resultMappings: ResultMap[];
  questions: Question[];
};

export function QuizEditor({
  initial,
  saveAction,
  deleteAction,
}: {
  initial: Initial;
  saveAction: (data: Initial) => Promise<any>;
  deleteAction: () => Promise<any>;
}) {
  const [data, setData] = useState<Initial>(initial);
  const [isPending, start] = useTransition();
  const [saved, setSaved] = useState<string | null>(null);

  function update<K extends keyof Initial>(k: K, v: Initial[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  function updateQuestion(idx: number, patch: Partial<Question>) {
    setData((d) => {
      const qs = [...d.questions];
      qs[idx] = { ...qs[idx], ...patch };
      return { ...d, questions: qs };
    });
  }

  function updateAnswer(qIdx: number, aIdx: number, patch: Partial<Answer>) {
    setData((d) => {
      const qs = [...d.questions];
      const ans = [...qs[qIdx].answers];
      ans[aIdx] = { ...ans[aIdx], ...patch };
      qs[qIdx] = { ...qs[qIdx], answers: ans };
      return { ...d, questions: qs };
    });
  }

  function addQuestion() {
    if (data.questions.length >= 7) return;
    setData((d) => ({
      ...d,
      questions: [...d.questions, { text: "Nuova domanda?", answers: [
        { text: "Risposta A", score: 1 },
        { text: "Risposta B", score: 2 },
      ]}],
    }));
  }

  function removeQuestion(idx: number) {
    setData((d) => ({ ...d, questions: d.questions.filter((_, i) => i !== idx) }));
  }

  function addAnswer(qIdx: number) {
    setData((d) => {
      const qs = [...d.questions];
      qs[qIdx] = {
        ...qs[qIdx],
        answers: [...qs[qIdx].answers, { text: "Nuova risposta", score: 1 }],
      };
      return { ...d, questions: qs };
    });
  }

  function removeAnswer(qIdx: number, aIdx: number) {
    setData((d) => {
      const qs = [...d.questions];
      qs[qIdx] = { ...qs[qIdx], answers: qs[qIdx].answers.filter((_, i) => i !== aIdx) };
      return { ...d, questions: qs };
    });
  }

  function save() {
    start(async () => {
      await saveAction(data);
      setSaved(new Date().toLocaleTimeString());
    });
  }

  return (
    <div className="space-y-6">
      {/* Generale */}
      <section className="card">
        <h2 className="font-display text-xl">Informazioni generali</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Titolo">
            <input value={data.title} onChange={(e) => update("title", e.target.value)} className="input" />
          </Field>
          <Field label="Tag su Systeme.io (es. quiz-marketing-2026)">
            <input value={data.systemeTagName} onChange={(e) => update("systemeTagName", e.target.value)} className="input" placeholder="lead-quiz-XYZ" />
          </Field>
          <Field label="Descrizione (sotto il titolo)" full>
            <textarea value={data.description} onChange={(e) => update("description", e.target.value)} className="input min-h-[80px]" />
          </Field>
          <Field label="Colore principale">
            <input type="color" value={data.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="h-11 w-full rounded-xl border border-ink/15 bg-white" />
          </Field>
          <Field label="Colore accento (CTA)">
            <input type="color" value={data.accentColor} onChange={(e) => update("accentColor", e.target.value)} className="h-11 w-full rounded-xl border border-ink/15 bg-white" />
          </Field>
          <Field label="Testo CTA finale">
            <input value={data.ctaText} onChange={(e) => update("ctaText", e.target.value)} className="input" />
          </Field>
          <Field label="URL CTA finale (Systeme.io o landing)">
            <input value={data.ctaUrl} onChange={(e) => update("ctaUrl", e.target.value)} className="input" placeholder="https://..." />
          </Field>
          <Field label="Testo privacy" full>
            <input value={data.privacyText} onChange={(e) => update("privacyText", e.target.value)} className="input" />
          </Field>
        </div>
      </section>

      {/* Domande */}
      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Domande ({data.questions.length}/7)</h2>
          <button onClick={addQuestion} disabled={data.questions.length >= 7} className="btn-ghost text-sm disabled:opacity-50">
            + Aggiungi domanda
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {data.questions.map((q, qi) => (
            <div key={qi} className="rounded-2xl border border-ink/10 bg-white/60 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-ink/40">DOMANDA {qi + 1}</span>
                <button onClick={() => removeQuestion(qi)} className="text-xs text-red-600 hover:underline">Rimuovi</button>
              </div>
              <input
                value={q.text}
                onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                className="mt-2 w-full bg-transparent font-display text-xl outline-none"
              />
              <div className="mt-3 space-y-2">
                {q.answers.map((a, ai) => (
                  <div key={ai} className="flex items-center gap-2">
                    <input
                      value={a.text}
                      onChange={(e) => updateAnswer(qi, ai, { text: e.target.value })}
                      className="input flex-1"
                    />
                    <input
                      type="number"
                      value={a.score}
                      onChange={(e) => updateAnswer(qi, ai, { score: Number(e.target.value) })}
                      className="input w-20"
                      title="Punteggio"
                    />
                    <button onClick={() => removeAnswer(qi, ai)} className="text-xs text-ink/40 hover:text-red-600">✕</button>
                  </div>
                ))}
                <button onClick={() => addAnswer(qi)} className="text-xs text-ink/60 hover:underline">+ Aggiungi risposta</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Risultati */}
      <section className="card">
        <h2 className="font-display text-xl">Risultati per fascia di punteggio</h2>
        <p className="mt-1 text-sm text-ink/60">
          Il sistema somma i punteggi delle risposte e mostra il risultato in base alla fascia.
        </p>
        <div className="mt-4 space-y-3">
          {data.resultMappings.map((r, i) => (
            <div key={i} className="grid grid-cols-12 items-center gap-2 rounded-xl border border-ink/10 bg-white/60 p-3">
              <input type="number" value={r.min} onChange={(e) => {
                const v = Number(e.target.value); update("resultMappings", data.resultMappings.map((x, k) => k === i ? { ...x, min: v } : x));
              }} className="input col-span-1" />
              <span className="col-span-1 text-center text-ink/40">→</span>
              <input type="number" value={r.max} onChange={(e) => {
                const v = Number(e.target.value); update("resultMappings", data.resultMappings.map((x, k) => k === i ? { ...x, max: v } : x));
              }} className="input col-span-1" />
              <input value={r.label} onChange={(e) => {
                const v = e.target.value; update("resultMappings", data.resultMappings.map((x, k) => k === i ? { ...x, label: v } : x));
              }} className="input col-span-3" placeholder="Etichetta" />
              <input value={r.description} onChange={(e) => {
                const v = e.target.value; update("resultMappings", data.resultMappings.map((x, k) => k === i ? { ...x, description: v } : x));
              }} className="input col-span-5" placeholder="Descrizione mostrata al lead" />
              <button
                onClick={() => update("resultMappings", data.resultMappings.filter((_, k) => k !== i))}
                className="col-span-1 text-ink/40 hover:text-red-600"
              >✕</button>
            </div>
          ))}
          <button
            onClick={() => update("resultMappings", [...data.resultMappings, { min: 0, max: 0, label: "Nuovo profilo", description: "" }])}
            className="text-xs text-ink/60 hover:underline"
          >
            + Aggiungi fascia
          </button>
        </div>
      </section>

      {/* Save bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl border border-ink/10 bg-white/90 p-4 shadow-lg backdrop-blur">
        <div className="text-sm">
          {saved && <span className="text-green-700">✓ Salvato alle {saved}</span>}
        </div>
        <div className="flex gap-2">
          <form action={deleteAction}><button className="text-sm text-red-600 hover:underline">Elimina quiz</button></form>
          <button onClick={save} disabled={isPending} className="btn-accent">
            {isPending ? "Salvataggio…" : "Salva modifiche"}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(11,11,13,0.15);
          background: rgba(255,255,255,0.8);
          padding: 10px 14px;
          font-size: 14px;
          outline: none;
        }
        .input:focus { border-color: rgba(11,11,13,0.6); }
      `}</style>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
