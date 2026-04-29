/**
 * Generatore di sequenza email per Systeme.io a partire dal brief del quiz.
 *
 * Genera 3 email con curva emotiva crescente:
 *   1. RISULTATO    (subito) - empatica, riconoscimento
 *   2. CONSAPEVOLEZZA (+1g)  - amplifica il bisogno
 *   3. SOLUZIONE    (+3g)    - presenta l'offerta con urgenza
 *
 * Le email usano variabili Systeme.io tra graffe singole:
 *   {first_name}, {quiz_title}, {quiz_result_label}, {quiz_result_summary},
 *   {quiz_result_cta}, {quiz_score_total}, {quiz_result_desc}
 */

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

export type EmailBrief = {
  // Contesto del quiz
  quizTitle: string;
  briefSummary: string;
  briefTarget: string;
  briefProblem: string;
  briefTone: string;
  briefGoal: string;
  // Profili di risultato per dare colore alle mail
  resultLabels: string[];
  // CTA finale del funnel (dove portiamo il lead)
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

const SYSTEM_PROMPT = `Sei un copywriter italiano esperto in email marketing per funnel quiz-based.
Lavori secondo il metodo "problema → consapevolezza → soluzione" su una sequenza di 3 email progressive.

LA TUA SCRITTURA:
- italiano naturale, mai corporate, mai inglesismi inutili
- frasi corte, ritmo, paragrafi di 2-3 righe massimo
- usi storytelling micro (esempi concreti, mini-casi, immagini mentali)
- crei urgenza emotiva senza essere aggressivo
- ogni email parte con un GANCIO che fa aprire il messaggio
- ogni email ha UNA chiamata all'azione chiara, non più di una

LA SEQUENZA DI 3 EMAIL:

1. EMAIL 1 — IL RISULTATO (Subito dopo il quiz)
   - Tono: caldo, empatico, di riconoscimento
   - Apertura: ringrazia + valida il risultato del quiz ("Ho letto le tue risposte e...")
   - Corpo: riconosce il problema specifico del lead in base al suo {quiz_result_label}
   - CTA: morbida, invita a leggere/guardare qualcosa di valore (NON ancora la vendita)
   - Lunghezza: 100-180 parole

2. EMAIL 2 — LA CONSAPEVOLEZZA (Dopo 1-2 giorni)
   - Tono: che fa riflettere, mostra il costo reale del non-agire
   - Apertura: domanda potente o storia/aneddoto
   - Corpo: amplifica il dolore specifico, mostra cosa succede se NON si agisce
   - CTA: media intensità, invita a "vedere come si esce" / "scoprire la via"
   - Lunghezza: 120-200 parole

3. EMAIL 3 — LA SOLUZIONE (Dopo 3-5 giorni)
   - Tono: deciso, motivante, con urgenza implicita
   - Apertura: dichiarazione forte, "Ti scrivo perché"
   - Corpo: presenta concretamente l'offerta finale (vedi {finalCtaText} nel brief), mostra cosa cambia, elenca 3-4 benefici concreti
   - CTA: forte, diretta, "iscriviti ora", con urgenza
   - Lunghezza: 150-250 parole

VARIABILI DA USARE (con graffe singole, MAI doppie):
- {first_name}              → nome del lead
- {quiz_title}              → titolo del quiz
- {quiz_result_label}       → profilo del lead (es. "Sei in crescita")
- {quiz_result_summary}     → riepilogo breve del profilo
- {quiz_result_cta}         → frase di transizione CTA
- {quiz_score_total}        → "18/35"

Le variabili sostitutive vanno usate SOLO se aggiungono valore — non vanno appiccicate ovunque.
Una mail con 1-3 variabili ben piazzate è meglio di una mail con 8 variabili meccaniche.

ASSOLUTAMENTE VIETATO:
- formule trite tipo "Spero questa mail ti trovi bene"
- saluti vuoti tipo "Spero tu stia bene"
- punti elenco generici senza contenuto
- promesse irrealistiche
- CTA generiche tipo "Clicca qui"`;

const TOOL: Anthropic.Tool = {
  name: "create_email_sequence",
  description: "Crea una sequenza di 3 email per il funnel post-quiz.",
  input_schema: {
    type: "object",
    properties: {
      emails: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            internalLabel: {
              type: "string",
              description: "Etichetta interna: 'Risultato' / 'Consapevolezza' / 'Soluzione'",
            },
            suggestedDelay: {
              type: "string",
              description: "Delay consigliato in Systeme.io (es. 'Subito', '+1 giorno', '+3 giorni')",
            },
            subject: {
              type: "string",
              description: "Oggetto della mail. Massimo 70 caratteri. Può contenere emoji.",
            },
            preheader: {
              type: "string",
              description: "Anteprima visibile in inbox prima dell'apertura. Massimo 120 caratteri.",
            },
            body: {
              type: "string",
              description: "Corpo completo della mail in italiano. Niente saluti banali. Includi UNA call to action chiara verso la fine. Le variabili Systeme.io vanno tra graffe singole.",
            },
            ctaText: {
              type: "string",
              description: "Testo del pulsante CTA (es. 'Scopri il Corso in Podcast')",
            },
          },
          required: ["internalLabel", "suggestedDelay", "subject", "preheader", "body", "ctaText"],
        },
      },
    },
    required: ["emails"],
  },
};

export async function generateEmailSequence(brief: EmailBrief): Promise<GeneratedEmailSequence> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY non configurata");

  const client = new Anthropic({ apiKey });

  const userMessage = `Genera la sequenza di 3 email per il seguente funnel.

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

**Profili dei lead che riceveranno queste mail** (etichette dei risultati):
${brief.resultLabels.map((l) => `- ${l}`).join("\n")}

**CTA finale a cui devono arrivare** (terza mail):
${brief.finalCtaText}${brief.finalCtaUrl ? ` (link: ${brief.finalCtaUrl})` : ""}

# Cosa devi fare

Crea ESATTAMENTE 3 email seguendo lo schema problema → consapevolezza → soluzione descritto nel system prompt.

Le email devono:
- Essere coerenti col tono "${brief.briefTone}"
- Riferirsi al risultato specifico del lead usando {quiz_result_label} e {quiz_result_summary}
- Avere una progressione emotiva crescente (rassicurazione → presa di coscienza → urgenza/azione)
- Terminare con il pulsante CTA (il testo del pulsante è separato dal body)
- Usare il nome del lead in apertura tramite {first_name}

Chiama lo strumento create_email_sequence.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "create_email_sequence" },
    messages: [{ role: "user", content: userMessage }],
  });

  // Logging dettagliato della risposta dell'AI per diagnostica
  console.log(
    `[ai-email-generator] Response stop_reason: ${response.stop_reason}, ` +
      `usage: in=${response.usage?.input_tokens} out=${response.usage?.output_tokens}`,
  );

  const toolUseBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    // Logga anche cosa ha restituito (potrebbe essere solo testo)
    const textBlock = response.content.find((b) => b.type === "text");
    console.error(
      `[ai-email-generator] No tool_use block. stop_reason=${response.stop_reason}. ` +
        `Text content: ${(textBlock as any)?.text?.slice(0, 500) || "(none)"}`,
    );
    throw new Error("L'AI non ha restituito una sequenza email valida (no tool_use block)");
  }

  const rawInput = toolUseBlock.input as any;

  // Logging per capire cosa ci ha mandato (utile in caso di problemi futuri)
  console.log(
    `[ai-email-generator] Tool input keys: ${Object.keys(rawInput || {}).join(", ")}`,
  );

  // Estrazione tollerante: cerchiamo l'array di email in vari posti
  let emails: any[] | null = null;

  if (Array.isArray(rawInput)) {
    emails = rawInput;
  } else if (Array.isArray(rawInput?.emails)) {
    emails = rawInput.emails;
  } else if (Array.isArray(rawInput?.value)) {
    emails = rawInput.value;
  } else if (Array.isArray(rawInput?.result?.emails)) {
    emails = rawInput.result.emails;
  } else if (Array.isArray(rawInput?.sequence)) {
    emails = rawInput.sequence;
  } else if (rawInput && typeof rawInput === "object") {
    // Ultima spiaggia: cerca la prima property che è un array di oggetti
    for (const v of Object.values(rawInput)) {
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object") {
        emails = v as any[];
        break;
      }
    }
  }

  if (!emails) {
    console.error(
      `[ai-email-generator] Cannot find emails array in tool_use input:`,
      JSON.stringify(rawInput).slice(0, 800),
    );
    throw new Error(
      "L'AI ha restituito una struttura inattesa. Il log mostra cosa è arrivato — riprova fra qualche secondo.",
    );
  }

  if (emails.length === 0) {
    throw new Error("L'AI ha restituito 0 email. Riprova.");
  }

  if (emails.length < 3) {
    console.warn(
      `[ai-email-generator] Generate solo ${emails.length}/3 email. ` +
        `Probabile troncamento (stop_reason=${response.stop_reason}). Salvo quelle disponibili.`,
    );
  }

  // Forza al massimo 3 mail e normalizza i nomi dei campi
  const normalized: GeneratedEmail[] = emails.slice(0, 3).map((e: any, i: number) => ({
    internalLabel: String(e.internalLabel || e.label || e.title || `Email ${i + 1}`),
    suggestedDelay: String(
      e.suggestedDelay || e.delay || (i === 0 ? "Subito" : i === 1 ? "+1 giorno" : "+3 giorni"),
    ),
    subject: String(e.subject || e.oggetto || ""),
    preheader: String(e.preheader || e.preview || e.anteprima || ""),
    body: String(e.body || e.corpo || e.content || ""),
    ctaText: String(e.ctaText || e.cta || e.button || "Scopri di più"),
  }));

  return { emails: normalized };
}
