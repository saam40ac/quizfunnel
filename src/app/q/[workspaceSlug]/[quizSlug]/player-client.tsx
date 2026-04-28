"use client";

import { useState, useMemo } from "react";

type Answer = { id: string; text: string; score: number };
type Question = { id: string; text: string; answers: Answer[] };
type ResultMap = { min: number; max: number; label: string; description: string; ctaUrl?: string };

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  ctaText: string;
  ctaUrl: string | null;
  primaryColor: string;
  accentColor: string;
  privacyText: string | null;
  resultMappings: ResultMap[];
  questions: Question[];
};

type Step = "intro" | "questions" | "lead" | "result";

export function QuizPlayer({ quiz }: { quiz: Quiz }) {
  const [step, setStep] = useState<Step>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> answerId
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalScore = useMemo(() => {
    let s = 0;
    for (const q of quiz.questions) {
      const aId = answers[q.id];
      const ans = q.answers.find((a) => a.id === aId);
      if (ans) s += ans.score;
    }
    return s;
  }, [answers, quiz.questions]);

  const result = useMemo(() => {
    return (
      quiz.resultMappings.find((r) => totalScore >= r.min && totalScore <= r.max) ||
      quiz.resultMappings[quiz.resultMappings.length - 1] ||
      null
    );
  }, [totalScore, quiz.resultMappings]);

  function pickAnswer(qId: string, aId: string) {
    setAnswers((prev) => ({ ...prev, [qId]: aId }));
    // auto-avanza dopo breve delay
    setTimeout(() => {
      if (current < quiz.questions.length - 1) {
        setCurrent((c) => c + 1);
      } else {
        setStep("lead");
      }
    }, 250);
  }

  async function submitLead() {
    setError(null);
    if (!consent) return setError("Devi accettare la privacy per continuare.");
    if (!email || !name) return setError("Inserisci nome ed email.");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          answers,
          score: totalScore,
          resultLabel: result?.label,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStep("result");
    } catch (e: any) {
      setError("Errore nell'invio. Riprova fra poco.");
    } finally {
      setSubmitting(false);
    }
  }

  const accent = quiz.accentColor || "#ff5b1f";
  const ink = quiz.primaryColor || "#0b0b0d";

  // -------------- Intro --------------
  if (step === "intro") {
    return (
      <Card>
        <div className="text-xs uppercase tracking-widest" style={{ color: ink + "99" }}>QUIZ</div>
        <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl" style={{ color: ink }}>
          {quiz.title}
        </h1>
        {quiz.description && (
          <p className="mt-4 text-lg" style={{ color: ink + "B3" }}>{quiz.description}</p>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-4 text-sm" style={{ color: ink + "99" }}>
          <span>· {quiz.questions.length} domande</span>
          <span>· ~2 minuti</span>
          <span>· risultato personalizzato</span>
        </div>
        <button
          onClick={() => setStep("questions")}
          className="mt-8 rounded-full px-7 py-4 font-semibold text-white transition active:scale-95"
          style={{ background: accent }}
        >
          Iniziamo →
        </button>
      </Card>
    );
  }

  // -------------- Questions --------------
  if (step === "questions") {
    const q = quiz.questions[current];
    const progress = ((current + 1) / quiz.questions.length) * 100;
    const selected = answers[q.id];
    return (
      <Card>
        <div className="mb-2 flex items-center justify-between text-xs" style={{ color: ink + "99" }}>
          <span>DOMANDA {current + 1} / {quiz.questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full" style={{ background: ink + "1A" }}>
          <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: accent }} />
        </div>
        <h2 key={q.id} className="font-display text-3xl animate-fade-up" style={{ color: ink }}>{q.text}</h2>
        <div className="mt-6 space-y-2">
          {q.answers.map((a) => (
            <button
              key={a.id}
              onClick={() => pickAnswer(q.id, a.id)}
              className="w-full rounded-2xl border px-5 py-4 text-left text-base transition hover:translate-x-1"
              style={{
                borderColor: selected === a.id ? accent : ink + "26",
                background: selected === a.id ? accent + "1A" : "transparent",
                color: ink,
              }}
            >
              {a.text}
            </button>
          ))}
        </div>
        {current > 0 && (
          <button onClick={() => setCurrent((c) => c - 1)} className="mt-6 text-sm" style={{ color: ink + "99" }}>
            ← Indietro
          </button>
        )}
      </Card>
    );
  }

  // -------------- Lead capture --------------
  if (step === "lead") {
    return (
      <Card>
        <div className="text-xs uppercase tracking-widest" style={{ color: ink + "99" }}>ULTIMO PASSO</div>
        <h2 className="mt-2 font-display text-3xl" style={{ color: ink }}>
          Dove ti inviamo il <em className="not-italic" style={{ color: accent }}>tuo risultato</em>?
        </h2>
        <p className="mt-2 text-sm" style={{ color: ink + "99" }}>
          Lo riceverai via email insieme a consigli personalizzati.
        </p>
        <div className="mt-6 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Il tuo nome" className="w-full rounded-2xl border px-4 py-3 outline-none" style={{ borderColor: ink + "26", color: ink }} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="La tua email" className="w-full rounded-2xl border px-4 py-3 outline-none" style={{ borderColor: ink + "26", color: ink }} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefono (opzionale)" className="w-full rounded-2xl border px-4 py-3 outline-none" style={{ borderColor: ink + "26", color: ink }} />
          <label className="flex gap-2 text-xs" style={{ color: ink + "99" }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            <span>{quiz.privacyText || "Acconsento al trattamento dei dati personali."}</span>
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          onClick={submitLead}
          disabled={submitting}
          className="mt-6 w-full rounded-full py-4 font-semibold text-white transition active:scale-95 disabled:opacity-60"
          style={{ background: accent }}
        >
          {submitting ? "Invio…" : "Mostrami il risultato →"}
        </button>
      </Card>
    );
  }

  // -------------- Result --------------
  return (
    <Card>
      <div className="text-xs uppercase tracking-widest" style={{ color: ink + "99" }}>IL TUO RISULTATO</div>
      <h2 className="mt-2 font-display text-4xl md:text-5xl" style={{ color: ink }}>
        {result?.label || "Profilo personalizzato"}
      </h2>
      <p className="mt-4 text-lg" style={{ color: ink + "B3" }}>{result?.description}</p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs" style={{ background: accent + "26", color: ink }}>
        Punteggio: {totalScore}
      </div>
      {quiz.ctaUrl && (
        <a
          href={quiz.ctaUrl}
          target="_blank"
          rel="noopener"
          className="mt-8 inline-block rounded-full px-7 py-4 font-semibold text-white shadow-lg transition active:scale-95"
          style={{ background: accent }}
        >
          {quiz.ctaText} →
        </a>
      )}
      <p className="mt-6 text-xs" style={{ color: ink + "99" }}>
        Controlla la tua casella email per i prossimi passi.
      </p>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-2xl md:p-12 animate-fade-up">
      {children}
    </div>
  );
}
