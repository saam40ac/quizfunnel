import Link from "next/link";

const FEATURES = [
  {
    n: "01",
    title: "Quiz builder",
    body: "Costruisci quiz fino a 7 domande con scoring automatico. Il sistema mappa il punteggio sul risultato giusto.",
  },
  {
    n: "02",
    title: "Landing pubblica",
    body: "Ogni quiz ha un URL pubblico personalizzabile e un codice embed iframe pronto per il tuo sito.",
  },
  {
    n: "03",
    title: "Sync Systeme.io",
    body: "Lead in entrata = contatto creato + tag applicato. Le tue automazioni mail partono in automatico.",
  },
  {
    n: "04",
    title: "Multi-cliente",
    body: "Vendilo come SaaS: ogni cliente ha il suo workspace, i suoi quiz, la sua API key.",
  },
];

const STEPS = [
  { k: "Crea", v: "Imposta il quiz e le domande focalizzanti" },
  { k: "Pubblica", v: "Link pubblico + embed code istantanei" },
  { k: "Cattura", v: "Lead in fondo al quiz" },
  { k: "Nutri", v: "Campagne automatiche su Systeme.io" },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* HEADER */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-cream font-display text-lg">Q</div>
          <span className="font-display text-xl font-semibold tracking-tight">QuizFunnel</span>
        </div>
        <nav className="hidden gap-8 text-sm md:flex">
          <a href="#come-funziona" className="hover:opacity-60">Come funziona</a>
          <a href="#features" className="hover:opacity-60">Features</a>
          <a href="#prezzi" className="hover:opacity-60">Prezzi</a>
        </nav>
        <div className="flex gap-3">
          <Link href="/login" className="text-sm font-medium hover:opacity-60">Accedi</Link>
          <Link href="/signup" className="btn-primary text-sm">Inizia →</Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-12 md:pt-20">
        <div className="grid gap-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-7">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white/60 px-3 py-1 text-xs uppercase tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Funnel marketing su misura
            </div>
            <h1 className="font-display text-5xl leading-[0.95] tracking-tight md:text-7xl lg:text-[88px]">
              Trasforma <em className="not-italic text-accent">curiosità</em><br />
              in clienti.<br />
              <span className="text-muted">Un quiz alla volta.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink/70">
              Crea quiz brevi e mirati che fanno emergere il bisogno del tuo target,
              raccogli il lead e fai partire le campagne mail automatiche su Systeme.io.
              Pubblicato sul <strong>tuo dominio</strong>, in pochi minuti.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-accent">Crea il tuo primo quiz</Link>
              <Link href="#come-funziona" className="btn-ghost">Come funziona</Link>
            </div>
          </div>

          {/* Mockup quiz */}
          <div className="relative md:col-span-5">
            <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-accent/20 blur-2xl" />
            <div className="card relative animate-fade-up">
              <div className="mb-2 flex items-center justify-between text-xs text-muted">
                <span>DOMANDA 3 / 7</span>
                <span>43%</span>
              </div>
              <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
                <div className="h-full w-[43%] rounded-full bg-accent" />
              </div>
              <h3 className="font-display text-2xl">Qual è oggi il tuo ostacolo principale nel marketing?</h3>
              <div className="mt-5 space-y-2">
                {[
                  "Non so come acquisire contatti qualificati",
                  "Ho lead ma non convertono in clienti",
                  "Non riesco a essere costante",
                  "Mi mancano gli strumenti giusti",
                ].map((t, i) => (
                  <button
                    key={i}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${i === 1 ? "border-accent bg-accent/10" : "border-ink/10 hover:border-ink/30"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COME FUNZIONA */}
      <section id="come-funziona" className="relative z-10 border-y border-ink/10 bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className="mb-3 text-xs uppercase tracking-widest text-cream/50">Il flusso completo</p>
          <h2 className="font-display text-4xl md:text-5xl">Dal click alla vendita, in automatico.</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={i} className="rounded-2xl border border-cream/15 p-6">
                <div className="font-mono text-xs text-cream/40">0{i + 1}</div>
                <div className="mt-4 font-display text-2xl">{s.k}</div>
                <div className="mt-2 text-sm text-cream/70">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <p className="mb-3 text-xs uppercase tracking-widest">Cosa ottieni</p>
        <h2 className="font-display text-4xl md:text-5xl">Tutto quello che serve.<br /><span className="text-muted">Niente di più.</span></h2>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.n} className="card transition hover:-translate-y-1">
              <div className="font-mono text-xs text-accent">{f.n}</div>
              <div className="mt-3 font-display text-2xl">{f.title}</div>
              <p className="mt-2 text-ink/70">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PREZZI */}
      <section id="prezzi" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <h2 className="font-display text-4xl md:text-5xl">Prezzi semplici.</h2>
        <p className="mt-2 text-ink/60">Il checkout reale è gestito da Systeme.io. Qui sotto vedi i piani.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { name: "Free", price: "0€", sub: "/per sempre", lines: ["1 quiz", "100 lead/mese", "Brand QuizFunnel"] },
            { name: "Pro", price: "29€", sub: "/mese", lines: ["10 quiz", "5.000 lead/mese", "No-brand", "Dominio custom"], hot: true },
            { name: "Business", price: "79€", sub: "/mese", lines: ["Quiz illimitati", "Lead illimitati", "Multi-utente", "Priority support"] },
          ].map((p) => (
            <div key={p.name} className={`card ${p.hot ? "ring-2 ring-accent" : ""}`}>
              {p.hot && <div className="mb-3 inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">Più scelto</div>}
              <div className="font-display text-2xl">{p.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-5xl">{p.price}</span>
                <span className="text-muted">{p.sub}</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-ink/70">
                {p.lines.map((l) => <li key={l}>· {l}</li>)}
              </ul>
              <Link href="/signup" className={p.hot ? "btn-accent mt-6 w-full" : "btn-primary mt-6 w-full"}>
                Inizia
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-ink/10 py-10 text-center text-sm text-ink/60">
        © {new Date().getFullYear()} QuizFunnel — Costruito per chi vende online.
      </footer>
    </main>
  );
}
