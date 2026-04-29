/**
 * Generatore di quiz tramite Anthropic Claude.
 *
 * Riceve un brief (sintesi progetto, target, problema, tono, obiettivo)
 * e ritorna una struttura completa di quiz pronta da salvare nel DB.
 *
 * Modello: claude-sonnet-4-6 (ottimo rapporto costo/qualità per testi italiani persuasivi).
 * Usa structured outputs via tool_use per garantire JSON valido.
 *
 * v2: Per ogni fascia di risultato genera anche:
 *   - summary    -> riepilogo di max 200 caratteri (compatibile Systeme.io)
 *   - ctaPhrase  -> frase invitante che porta alla CTA (max 200 caratteri)
 */

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

export type QuizBrief = {
  title: string;
  summary: string;
  target: string;
  problem: string;
  tone: "professionale" | "amichevole" | "diretto" | "motivazionale";
  goal: string;
  numQuestions?: number;
};

export type GeneratedAnswer = { text: string; score: number };
export type GeneratedQuestion = { text: string; answers: GeneratedAnswer[] };
export type GeneratedResultMap = {
  min: number;
  max: number;
  label: string;
  description: string;   // descrizione lunga (per la pagina del risultato)
  summary: string;       // breve, max 200 char (per Systeme.io / mail)
  ctaPhrase: string;     // frase invito breve, max 200 char (per Systeme.io / mail)
};
export type GeneratedQuiz = {
  description: string;
  questions: GeneratedQuestion[];
  resultMappings: GeneratedResultMap[];
  ctaText: string;
  privacyText: string;
};

const SYSTEM_PROMPT = `Sei un esperto di funnel marketing e copywriting persuasivo, specializzato nella creazione di quiz che convertono i visitatori in lead qualificati.

Quando ti viene fornito un brief di un progetto, generi un quiz in lingua italiana strutturato secondo il metodo "problema → consapevolezza → soluzione":
1. Le prime domande fanno emergere il PROBLEMA del target con domande situazionali
2. Le domande centrali creano CONSAPEVOLEZZA del bisogno (cosa sta lasciando sul tavolo, cosa sta perdendo)
3. Le ultime domande qualificano il lead (livello, urgenza, budget implicito)

Per ogni fascia di risultato produci 3 versioni di testo:
- description: testo completo per la pagina del risultato (200-400 caratteri, può essere ricco)
- summary: versione condensata per email automatiche (MAX 200 caratteri, andante e diretta)
- ctaPhrase: frase di transizione che porta alla CTA (MAX 200 caratteri, persuasiva, finisce naturalmente prima del pulsante)

Regole imprescindibili:
- Esattamente il numero di domande richiesto (max 7)
- 3 o 4 risposte per domanda, mutualmente esclusive, in italiano naturale
- Punteggi crescenti: la risposta che indica un problema più grave/urgenza maggiore = punteggio più alto
- Le fasce di risultato devono essere coerenti col target del cliente, non generiche
- Tono di voce: rispetta scrupolosamente quello richiesto
- NIENTE inglesismi inutili, NIENTE corporate-speak vuoto
- Le domande devono toccare emotivamente il lettore, non interrogarlo come un sondaggio
- Il "ctaText" finale deve essere un invito all'azione concreto e desiderabile
- summary e ctaPhrase DEVONO stare sotto i 200 caratteri (è un vincolo tecnico inviolabile)`;

const TOOL: Anthropic.Tool = {
  name: "create_quiz",
  description: "Crea la struttura di un quiz marketing partendo dal brief fornito.",
  input_schema: {
    type: "object",
    properties: {
      description: {
        type: "string",
        description: "Sottotitolo del quiz (1-2 frasi che invogliano il lettore a iniziare).",
      },
      questions: {
        type: "array",
        minItems: 5,
        maxItems: 7,
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "La domanda, in italiano." },
            answers: {
              type: "array",
              minItems: 3,
              maxItems: 4,
              items: {
                type: "object",
                properties: {
                  text: { type: "string", description: "La risposta." },
                  score: { type: "integer", minimum: 0, maximum: 5, description: "Punteggio 0-5." },
                },
                required: ["text", "score"],
              },
            },
          },
          required: ["text", "answers"],
        },
      },
      resultMappings: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        description: "Esattamente 3 fasce di risultato (basso, medio, alto).",
        items: {
          type: "object",
          properties: {
            min: { type: "integer" },
            max: { type: "integer" },
            label: { type: "string", description: "Etichetta breve del profilo (es. 'Sei agli inizi')." },
            description: {
              type: "string",
              description: "Testo completo per la PAGINA del risultato (200-400 caratteri).",
            },
            summary: {
              type: "string",
              description: "Riepilogo BREVE per email automatiche. MASSIMO 200 caratteri (vincolo tecnico).",
            },
            ctaPhrase: {
              type: "string",
              description: "Frase persuasiva che introduce la CTA. MASSIMO 200 caratteri.",
            },
          },
          required: ["min", "max", "label", "description", "summary", "ctaPhrase"],
        },
      },
      ctaText: {
        type: "string",
        description: "Testo della CTA finale (es. 'Prenota la tua consulenza').",
      },
      privacyText: {
        type: "string",
        description: "Frase privacy breve mostrata prima della raccolta lead.",
      },
    },
    required: ["description", "questions", "resultMappings", "ctaText", "privacyText"],
  },
};

export async function generateQuizFromBrief(brief: QuizBrief): Promise<GeneratedQuiz> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY non configurata");
  }

  const client = new Anthropic({ apiKey });
  const numQuestions = Math.min(brief.numQuestions ?? 7, 7);

  const userMessage = `Genera un quiz di marketing che converta i visitatori in lead qualificati.

# Brief del progetto

**Titolo del quiz**: ${brief.title}

**Sintesi del progetto / servizio offerto**:
${brief.summary}

**Target di riferimento**:
${brief.target}

**Problema principale che il servizio risolve**:
${brief.problem}

**Tono di voce**: ${brief.tone}

**Obiettivo finale del funnel** (a cosa porta la CTA finale):
${brief.goal}

**Numero di domande richiesto**: esattamente ${numQuestions}

# Cosa devi fare

1. Crea ${numQuestions} domande in sequenza problema → consapevolezza → qualificazione
2. Per ogni domanda, 3-4 risposte con punteggi 0-5 (più alto = più urgenza/problema)
3. Calcola il punteggio massimo possibile = ${numQuestions} * 5 = ${numQuestions * 5}
4. Crea ESATTAMENTE 3 fasce di risultato che coprono l'intero range 0-${numQuestions * 5}, divise in:
   - Bassa: ~0 fino a 1/3 del massimo
   - Media: 1/3 + 1 fino a 2/3 del massimo
   - Alta: 2/3 + 1 fino al massimo
5. Per ogni fascia produci OBBLIGATORIAMENTE 3 testi:
   - description: testo lungo per la pagina (200-400 caratteri)
   - summary: versione breve per le mail (MAX 200 caratteri, no eccezioni)
   - ctaPhrase: frase invito per la CTA (MAX 200 caratteri, no eccezioni)
6. Una CTA finale coerente con l'obiettivo dichiarato
7. Frase privacy semplice e GDPR-compliant

Chiama lo strumento create_quiz con la struttura completa.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "create_quiz" },
    messages: [{ role: "user", content: userMessage }],
  });

  const toolUseBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error("L'AI non ha restituito una struttura quiz valida");
  }

  const generated = toolUseBlock.input as GeneratedQuiz;

  // Sanity checks
  if (!Array.isArray(generated.questions) || generated.questions.length === 0) {
    throw new Error("Quiz generato senza domande");
  }
  if (!Array.isArray(generated.resultMappings) || generated.resultMappings.length === 0) {
    throw new Error("Quiz generato senza mappature dei risultati");
  }

  // Tronca i campi a 200 caratteri come safety net (l'AI dovrebbe già rispettare il limite)
  const trim = (s: string | undefined, max: number) => {
    if (!s) return "";
    return s.length > max ? s.slice(0, max - 3) + "..." : s;
  };

  generated.resultMappings = generated.resultMappings.map((r) => ({
    ...r,
    summary: trim(r.summary, 200),
    ctaPhrase: trim(r.ctaPhrase, 200),
  }));

  generated.questions = generated.questions.slice(0, 7);

  return generated;
}
