/**
 * Generatore email v5 — UNA MAIL ALLA VOLTA.
 *
 * Strategia: invece di chiedere all'AI di restituire 3 email in un array (che
 * causa problemi di JSON malformato per via di virgolette annidate nei body),
 * facciamo 3 chiamate separate. Ogni chiamata ritorna UNA email con struttura
 * semplice e piatta. Garantito.
 *
 * Trade-off:
 *  - Costo: ~3x rispetto alla v4 (~0,06€ vs 0,02€)
 *  - Tempo: ~30s vs ~15s
 *  + Affidabilità: ~100%
 */

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

export type EmailBrief = {
  quizTitle: string;
  briefSummary: string;
  briefTarget: string;
  briefProblem: string;
  briefTone: string;
  briefGoal: string;
  resultLabels: string[];
  finalCtaText: string;
  finalCtaUrl?: string;
};

export type GeneratedEmail = {
  internalLabel: string;
  suggestedDelay: string;
  subject: string;
  preheader: string;
  body: string;
  ctaText: string;
};

export type GeneratedEmailSequence = {
  emails: GeneratedEmail[];
};

type Step = {
  internalLabel: string;
  suggestedDelay: string;
  description: string;
  toneGuidance: string;
  lengthRange: string;
};

const STEPS: Step[] = [
  {
    internalLabel: "Risultato",
    suggestedDelay: "Subito",
    description:
      "EMAIL 1 — IL RISULTATO. Subito dopo il completamento del quiz. " +
      "Tono: caldo, empatico, di riconoscimento del problema. " +
      "Apertura: ringrazia + valida il risultato del quiz ('Ho letto le tue risposte e...'). " +
      "Corpo: riconosce il problema specifico in base al {quiz_result_label}. " +
      "CTA: morbida, invita a leggere/guardare qualcosa di valore (NON ancora la vendita).",
    toneGuidance: "Caldo e accogliente. Niente pressione di vendita.",
    lengthRange: "100-180 parole",
  },
  {
    internalLabel: "Consapevolezza",
    suggestedDelay: "+1 giorno",
    description:
      "EMAIL 2 — LA CONSAPEVOLEZZA. Dopo 1-2 giorni. " +
      "Tono: che fa riflettere, mostra il costo reale del non-agire. " +
      "Apertura: domanda potente o storia/aneddoto. " +
      "Corpo: amplifica il dolore specifico, mostra cosa succede se NON si agisce. " +
      "CTA: media intensità, invita a 'vedere come si esce' / 'scoprire la via'.",
    toneGuidance: "Riflessivo, leggermente provocatorio ma costruttivo.",
    lengthRange: "120-200 parole",
  },
  {
    internalLabel: "Soluzione",
    suggestedDelay: "+3 giorni",
    description:
      "EMAIL 3 — LA SOLUZIONE. Dopo 3-5 giorni. " +
      "Tono: deciso, motivante, con urgenza implicita. " +
      "Apertura: dichiarazione forte, 'Ti scrivo perché'. " +
      "Corpo: presenta concretamente l'offerta finale, mostra cosa cambia, elenca 3-4 benefici concreti. " +
      "CTA: forte, diretta, 'iscriviti ora', con urgenza.",
    toneGuidance: "Deciso, energico, con call-to-action forte.",
    lengthRange: "150-250 parole",
  },
];

const SYSTEM_PROMPT_BASE = `Sei un copywriter italiano esperto in email marketing per funnel quiz-based.

LA TUA SCRITTURA:
- italiano naturale, mai corporate, mai inglesismi inutili
- frasi corte, ritmo, paragrafi di 2-3 righe massimo
- usi storytelling micro (esempi concreti, mini-casi, immagini mentali)
- crei urgenza emotiva senza essere aggressivo
- ogni email parte con un GANCIO che fa aprire il messaggio
- ogni email ha UNA chiamata all'azione chiara, non più di una

VARIABILI DA USARE (con graffe singole, MAI doppie):
- {first_name}              → nome del lead
- {quiz_title}              → titolo del quiz
- {quiz_result_label}       → profilo del lead
- {quiz_result_summary}     → riepilogo breve del profilo
- {quiz_result_cta}         → frase di transizione CTA
- {quiz_score_total}        → "18/35"

REGOLE IMPORTANTI:
- Le variabili sostitutive vanno usate SOLO se aggiungono valore
- 1-3 variabili ben piazzate sono meglio di 8 meccaniche
- Quando citi il titolo del quiz, NON usare virgolette intorno a {quiz_title}, perché poi crea problemi di formato. Scrivi semplicemente: hai completato il quiz {quiz_title}.

ASSOLUTAMENTE VIETATO:
- formule trite tipo "Spero questa mail ti trovi bene"
- saluti vuoti
- punti elenco generici senza contenuto
- promesse irrealistiche
- CTA generiche tipo "Clicca qui"
- virgolette doppie attorno alle variabili (es. "{quiz_title}") perché creano JSON malformato`;

const SINGLE_EMAIL_TOOL: Anthropic.Tool = {
  name: "create_single_email",
  description: "Crea UNA singola email del funnel.",
  input_schema: {
    type: "object",
    properties: {
      subject: {
        type: "string",
        description: "Oggetto della mail. Massimo 70 caratteri. Può contenere emoji.",
      },
      preheader: {
        type: "string",
        description: "Anteprima visibile in inbox. Massimo 120 caratteri.",
      },
      body: {
        type: "string",
        description:
          "Corpo completo della mail in italiano. NON inserire le virgolette intorno alle variabili come {quiz_title}. Niente saluti banali. Includi UNA call to action chiara verso la fine.",
      },
      ctaText: {
        type: "string",
        description: "Testo del pulsante CTA (es. 'Scopri il Corso in Podcast')",
      },
    },
    required: ["subject", "preheader", "body", "ctaText"],
  },
};

async function generateOneEmail(
  client: Anthropic,
  brief: EmailBrief,
  step: Step,
): Promise<GeneratedEmail> {
  const userMessage = `Crea UNA singola email per il seguente funnel.

# Contesto del quiz e dell'offerta finale

**Titolo del quiz**: ${brief.quizTitle}

**Sintesi del progetto / servizio**:
${brief.briefSummary}

**Target di riferimento**:
${brief.briefTarget}

**Problema risolto**:
${brief.briefProblem}

**Tono di voce richiesto**: ${brief.briefTone}

**Obiettivo finale del funnel**:
${brief.briefGoal}

**Profili dei lead** (etichette dei risultati):
${brief.resultLabels.map((l) => `- ${l}`).join("\n")}

**CTA finale**:
${brief.finalCtaText}${brief.finalCtaUrl ? ` (link: ${brief.finalCtaUrl})` : ""}

# QUESTA È L'EMAIL ${step.internalLabel}

${step.description}

**Linee guida tono**: ${step.toneGuidance}
**Lunghezza target**: ${step.lengthRange}

Chiama lo strumento create_single_email con oggetto, preheader, body, ctaText.

RICORDA: NON usare virgolette doppie attorno alle variabili come {quiz_title}.
Scrivi: il quiz {quiz_title}
NON: il quiz "{quiz_title}"`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT_BASE,
    tools: [SINGLE_EMAIL_TOOL],
    tool_choice: { type: "tool", name: "create_single_email" },
    messages: [{ role: "user", content: userMessage }],
  });

  console.log(
    `[ai-email v5] Step ${step.internalLabel}: stop_reason=${response.stop_reason}, ` +
      `out_tokens=${response.usage?.output_tokens}`,
  );

  const toolUseBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error(
      `L'AI non ha generato l'email "${step.internalLabel}" (no tool_use)`,
    );
  }

  const input = toolUseBlock.input as any;

  return {
    internalLabel: step.internalLabel,
    suggestedDelay: step.suggestedDelay,
    subject: String(input.subject || ""),
    preheader: String(input.preheader || ""),
    body: String(input.body || ""),
    ctaText: String(input.ctaText || "Scopri di più"),
  };
}

export async function generateEmailSequence(
  brief: EmailBrief,
): Promise<GeneratedEmailSequence> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY non configurata");

  const client = new Anthropic({ apiKey });

  console.log(
    `[ai-email v5] Generating 3 emails sequentially for "${brief.quizTitle}"…`,
  );

  // 3 chiamate sequenziali (potremmo parallelizzare ma sequenziali è più sicuro
  // per i rate limit dell'API Anthropic e per non sforare il timeout di Vercel)
  const emails: GeneratedEmail[] = [];
  for (const step of STEPS) {
    try {
      const e = await generateOneEmail(client, brief, step);
      emails.push(e);
    } catch (err) {
      console.error(`[ai-email v5] Email "${step.internalLabel}" failed:`, err);
      // Continua con le altre, non blocchiamo tutto
    }
  }

  if (emails.length === 0) {
    throw new Error("Nessuna email generata. Riprova.");
  }

  console.log(`[ai-email v5] ✓ Generated ${emails.length}/3 emails`);

  return { emails };
}
