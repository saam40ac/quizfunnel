"use client";

import { useState, useTransition } from "react";

type Answer = { text: string; score: number };
type Question = { text: string; answers: Answer[] };
type ResultMap = {
  min: number;
  max: number;
  label: string;
  description: string;
  ctaUrl?: string;
  summary?: string;
  ctaPhrase?: string;
};

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
      questions: [
        ...d.questions,
        {
          text: "Nuova domanda?",
          answers: [
            { text: "Risposta A", score: 1 },
            { text: "Risposta B", score: 2 },
          ],
        },
      ],
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
      qs[qIdx] = {
        ...qs[qIdx],
        answers: qs[qIdx].answers.filter((_, i) => i !== aIdx),
      };
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
            <input
              value={data.title}
              onChange={(e) => update("title", e.target.value)}
              className="qf-input"
            />
          </Field>
          <Field label="Tag su Systeme.io (es. quiz-marketing-2026)">
            <input
              value={data.systemeTagName}
              onChange={(e) => update("systemeTagName", e.target.value)}
              className="qf-input"
              placeholder="lead-quiz-XYZ"
            />
          </Field>
          <Field label="Descrizione (sotto il titolo)" full>
            <textarea
              value={data.description}
              onChange={(e) => update("description", e.target.value)}
              className="qf-input min-h-[80px]"
            />
          </Field>
          <Field label="Colore principale">
            <input
              type="color"
              value={data.primaryColor}
              onChange={(e) => update("primaryColor", e.target.value)}
              className="h-11 w-full rounded-xl border border-ink/15 bg-white"
            />
          </Field>
          <Field label="Colore accento (CTA)">
            <input
              type="color"
              value={data.accentColor}
              onChange={(e) => update("accentColor", e.target.value)}
              className="h-11 w-full rounded-xl border border-ink/15 bg-white"
            />
          </Field>
          <Field label="Testo CTA finale">
            <input
              value={data.ctaText}
              onChange={(e) => update("ctaText", e.target.value)}
              className="qf-input"
            />
          </Field>
          <Field label="URL CTA finale (Systeme.io o landing)">
            <input
              value={data.ctaUrl}
              onChange={(e) => update("ctaUrl", e.target.value)}
              className="qf-input"
              placeholder="https://..."
            />
          </Field>
          <Field label="Testo privacy" full>
            <input
              value={data.privacyText}
              onChange={(e) => update("privacyText", e.target.value)}
              className="qf-input"
            />
          </Field>
        </div>
      </section>

      {/* Domande */}
      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Domande ({data.questions.length}/7)</h2>
          <button
            onClick={addQuestion}
            disabled={data.questions.length >= 7}
            className="btn-ghost text-sm disabled:opacity-50"
          >
            + Aggiungi domanda
          </button>
        </div>

        <div className="mt-4 space-y-6">
          {data.questions.map((q, qi) => (
            <div
              key={qi}
              className="rounded-2xl border border-ink/10 bg-white/70 p-5"
            >
              {/* Header domanda */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-ink/40">
                  Domanda {qi + 1}
                </span>
                <button
                  onClick={() => removeQuestion(qi)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Rimuovi domanda
                </button>
              </div>

              {/* Testo domanda */}
              <label className="mt-3 block text-xs font-medium text-ink/60">
                Testo della domanda
              </label>
              <textarea
                value={q.text}
                onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                rows={2}
                className="qf-input mt-1 font-display text-lg"
              />

              {/* Risposte */}
              <label className="mt-5 block text-xs font-medium text-ink/60">
                Risposte ({q.answers.length})
              </label>
              <div className="mt-2 space-y-2">
                {q.answers.map((a, ai) => (
                  <div
                    key={ai}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-xl border border-ink/10 bg-white/50 p-2"
                  >
                    <input
                      value={a.text}
                      onChange={(e) =>
                        updateAnswer(qi, ai, { text: e.target.value })
                      }
                      placeholder="Testo della risposta"
                      className="qf-input border-transparent bg-transparent"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-ink/50">Punti</span>
                      <input
                        type="number"
                        value={a.score}
                        onChange={(e) =>
                          updateAnswer(qi, ai, {
                            score: Number(e.target.value),
                          })
                        }
                        className="qf-input w-16 text-center"
                        title="Punteggio assegnato a questa risposta"
                      />
                    </div>
                    <button
                      onClick={() => removeAnswer(qi, ai)}
                      className="rounded-lg px-2 py-1 text-ink/40 transition hover:bg-red-50 hover:text-red-600"
                      title="Rimuovi risposta"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addAnswer(qi)}
                  className="mt-2 text-xs text-accent hover:underline"
                >
                  + Aggiungi risposta
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Risultati */}
      <section className="card">
        <h2 className="font-display text-xl">Risultati per fascia di punteggio</h2>
        <p className="mt-1 text-sm text-ink/60">
          Il sistema somma i punteggi delle risposte e mostra il risultato in base
          alla fascia. La <strong>descrizione</strong> appare nella pagina del
          quiz, mentre <strong>summary</strong> e <strong>frase CTA</strong>{" "}
          vengono inviate a Systeme.io per le mail (max 200 caratteri).
        </p>
        <div className="mt-4 space-y-4">
          {data.resultMappings.map((r, i) => (
            <div
              key={i}
              className="rounded-2xl border border-ink/10 bg-white/60 p-4"
            >
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-2 md:col-span-1">
                  <label className="text-xs text-ink/50">Da</label>
                  <input
                    type="number"
                    value={r.min}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      update(
                        "resultMappings",
                        data.resultMappings.map((x, k) =>
                          k === i ? { ...x, min: v } : x,
                        ),
                      );
                    }}
                    className="qf-input mt-1"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-xs text-ink/50">A</label>
                  <input
                    type="number"
                    value={r.max}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      update(
                        "resultMappings",
                        data.resultMappings.map((x, k) =>
                          k === i ? { ...x, max: v } : x,
                        ),
                      );
                    }}
                    className="qf-input mt-1"
                  />
                </div>
                <div className="col-span-7 md:col-span-9">
                  <label className="text-xs text-ink/50">Etichetta</label>
                  <input
                    value={r.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      update(
                        "resultMappings",
                        data.resultMappings.map((x, k) =>
                          k === i ? { ...x, label: v } : x,
                        ),
                      );
                    }}
                    placeholder="Es. Sei in crescita"
                    className="qf-input mt-1"
                  />
                </div>
                <div className="col-span-1 flex items-end justify-end">
                  <button
                    onClick={() =>
                      update(
                        "resultMappings",
                        data.resultMappings.filter((_, k) => k !== i),
                      )
                    }
                    className="rounded-lg px-2 py-2 text-ink/40 hover:bg-red-50 hover:text-red-600"
                    title="Rimuovi fascia"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-xs text-ink/50">
                  Descrizione lunga (mostrata sulla pagina del quiz)
                </label>
                <textarea
                  value={r.description}
                  onChange={(e) => {
                    const v = e.target.value;
                    update(
                      "resultMappings",
                      data.resultMappings.map((x, k) =>
                        k === i ? { ...x, description: v } : x,
                      ),
                    );
                  }}
                  rows={3}
                  className="qf-input mt-1"
                  placeholder="Descrizione mostrata al lead nella pagina del risultato"
                />
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs text-ink/50">
                    Riepilogo per email (max 200 char)
                  </label>
                  <textarea
                    value={r.summary || ""}
                    onChange={(e) => {
                      const v = e.target.value.slice(0, 240);
                      update(
                        "resultMappings",
                        data.resultMappings.map((x, k) =>
                          k === i ? { ...x, summary: v } : x,
                        ),
                      );
                    }}
                    rows={2}
                    className="qf-input mt-1 text-sm"
                    placeholder="Versione condensata per la mail di Systeme.io"
                  />
                  <span className="text-[10px] text-ink/40">
                    {(r.summary || "").length}/200
                  </span>
                </div>
                <div>
                  <label className="text-xs text-ink/50">
                    Frase invito CTA (max 200 char)
                  </label>
                  <textarea
                    value={r.ctaPhrase || ""}
                    onChange={(e) => {
                      const v = e.target.value.slice(0, 240);
                      update(
                        "resultMappings",
                        data.resultMappings.map((x, k) =>
                          k === i ? { ...x, ctaPhrase: v } : x,
                        ),
                      );
                    }}
                    rows={2}
                    className="qf-input mt-1 text-sm"
                    placeholder="Frase persuasiva che porta alla CTA"
                  />
                  <span className="text-[10px] text-ink/40">
                    {(r.ctaPhrase || "").length}/200
                  </span>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={() =>
              update("resultMappings", [
                ...data.resultMappings,
                {
                  min: 0,
                  max: 0,
                  label: "Nuovo profilo",
                  description: "",
                  summary: "",
                  ctaPhrase: "",
                },
              ])
            }
            className="text-xs text-accent hover:underline"
          >
            + Aggiungi fascia
          </button>
        </div>
      </section>

      {/* Save bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl border border-ink/10 bg-white/90 p-4 shadow-lg backdrop-blur">
        <div className="text-sm">
          {saved && (
            <span className="text-green-700">✓ Salvato alle {saved}</span>
          )}
        </div>
        <div className="flex gap-2">
          <form action={deleteAction}>
            <button className="text-sm text-red-600 hover:underline">
              Elimina quiz
            </button>
          </form>
          <button
            onClick={save}
            disabled={isPending}
            className="btn-accent"
          >
            {isPending ? "Salvataggio…" : "Salva modifiche"}
          </button>
        </div>
      </div>

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
          color: inherit;
          outline: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .qf-input:focus {
          border-color: rgba(11, 11, 13, 0.6);
          background: white;
        }
        .qf-input::placeholder {
          color: rgba(11, 11, 13, 0.35);
        }
        textarea.qf-input {
          resize: vertical;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
