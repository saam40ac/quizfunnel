# 🤖 Generazione Quiz con AI

La piattaforma genera automaticamente quiz partendo da un breve brief.

## Cosa cambia per l'utente

**Prima**: cliccavi "Nuovo quiz" → editor vuoto → dovevi scrivere ogni domanda da zero.

**Adesso**: clicchi "✨ Nuovo quiz con AI" → riempi 5 campi del brief → in 10 secondi hai un quiz completo che puoi modificare a piacimento.

## Il brief richiesto (5 campi)

| Campo | Cosa scrivere |
|---|---|
| **Titolo del quiz** | Quello che vede il visitatore in cima alla pagina |
| **Sintesi del progetto** | Cosa vendi e come aiuti i tuoi clienti |
| **Target di riferimento** | Chi è il cliente ideale (età, professione, situazione) |
| **Problema principale** | Il dolore concreto del cliente nel quotidiano |
| **Tono di voce** | Professionale / Amichevole / Diretto / Motivazionale |
| **Obiettivo finale** | Cosa vuoi che faccia il lead dopo il quiz |

## Cosa genera l'AI

- **Sottotitolo del quiz** (1-2 frasi che invogliano a iniziare)
- **5-7 domande** strutturate secondo il metodo problema → consapevolezza → qualificazione
- **3-4 risposte per domanda** con punteggi 0-5 (più alto = più urgenza/problema)
- **3 fasce di risultato** che coprono tutto il range di punteggi
- **Testo CTA finale** coerente con l'obiettivo
- **Frase privacy** GDPR-compliant

## Setup tecnico (lo fai una volta sola)

### 1. Genera la API key Anthropic

1. Vai su https://console.anthropic.com/settings/keys
2. Login (registrati se non hai un account — 5$ di credito gratis)
3. **Create Key** → dai un nome (es. "QuizFunnel") → copia la stringa che inizia con `sk-ant-...`

### 2. Inseriscila su Vercel

1. https://vercel.com/dashboard → tuo progetto → **Settings → Environment Variables**
2. Aggiungi:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: la chiave copiata
   - **Environments**: Production + Preview + Development (lascia tutti spuntati)
3. **Save**
4. **Deployments → ⋯ → Redeploy** dell'ultimo deploy per applicare la variabile

### 3. Aggiorna il database

I nuovi campi (`briefSummary`, `briefTarget`, ecc.) vanno applicati al DB esistente. Da terminale locale:

```bash
npx prisma db push
```

(non serve il `seed` se l'hai già fatto prima)

## Costi

Modello usato: `claude-sonnet-4-6`.

- **~0,01-0,03 € per quiz generato**
- Con i 5$ di credito gratis iniziali → ~200-400 quiz
- Pay-as-you-go: paghi solo quello che usi

Per controllare i costi puoi impostare un budget mensile in https://console.anthropic.com/settings/limits

## Strategia di monetizzazione

Stai usando la TUA chiave per tutti gli utenti SaaS, quindi:

- **Piano Free**: nessuna generazione AI (solo creazione manuale)
- **Piano Pro**: 10 generazioni/mese
- **Piano Business**: generazioni illimitate

(per ora il limite non è enforced nel codice — quando hai i primi clienti paganti aggiungiamo il counter mensile per workspace)

## Dove vedere i log

Se l'AI fallisce (chiave invalida, rate limit, errore di rete):

- L'utente vede un messaggio rosso nel wizard
- Su Vercel → tuo progetto → **Logs** vedi lo stack trace completo prefissato `[generate quiz]`

## Come riprendere il brief

Il brief inserito viene salvato sul quiz (`briefSummary`, `briefTarget`, ecc.). In futuro possiamo aggiungere un pulsante "Rigenera con AI" nell'editor che parte dal brief già esistente.
