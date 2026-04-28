# 🚀 QuizFunnel

Piattaforma SaaS multi-tenant per **funnel marketing basati su quiz**, con sync automatico dei lead su **Systeme.io**.

> Stack: **Next.js 14** (App Router) + **Prisma** + **PostgreSQL** + **NextAuth v5** + **TailwindCSS**.

---

## 🎯 Cosa fa la piattaforma

- **Quiz builder** (max 7 domande, scoring automatico, fasce di risultato personalizzate)
- **Landing pubblica** per ogni quiz: URL condivisibile + **codice embed iframe**
- **Lead capture** finale (nome + email + telefono) con privacy
- **Sync Systeme.io**: il lead diventa contatto + si applica un tag → si attivano le tue automazioni mail
- **Multi-tenant**: ogni cliente ha il suo workspace, quiz, API key
- **Login a livelli**: `SUPER_ADMIN` (tu) · `OWNER` (cliente che paga) · `MEMBER` (collaboratore)
- **Custom domain** per ogni workspace

---

## 📦 Struttura del progetto

```
quizfunnel/
├─ prisma/
│  ├─ schema.prisma          # Database (Workspace, User, Quiz, Question, Answer, Lead)
│  └─ seed.ts                # Crea il super admin
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                                    # Landing pubblica
│  │  ├─ (auth)/login + signup                       # Auth
│  │  ├─ dashboard/                                  # Area cliente (protetta)
│  │  │  ├─ page.tsx                                 # Lista quiz
│  │  │  ├─ quizzes/[id]/edit/                       # Editor
│  │  │  ├─ quizzes/[id]/leads/                      # Lead generati
│  │  │  ├─ integrations/                            # Connessione Systeme.io
│  │  │  └─ settings/                                # Workspace + custom domain
│  │  ├─ admin/                                      # Super admin (solo SUPER_ADMIN)
│  │  ├─ q/[workspaceSlug]/[quizSlug]/               # 🌐 LANDING PUBBLICA QUIZ
│  │  ├─ embed/[quizId]/                             # 🌐 VERSIONE EMBED IFRAME
│  │  └─ api/quizzes/[quizId]/leads/route.ts         # 📥 API ricezione lead → Systeme.io
│  ├─ lib/
│  │  ├─ auth.ts             # NextAuth v5
│  │  ├─ prisma.ts           # Client Prisma
│  │  ├─ systeme.ts          # 🔌 Client API Systeme.io (createContact + tag)
│  │  └─ utils.ts            # Helpers
│  └─ middleware.ts          # Protezione /dashboard e /admin
└─ ...
```

---

## ⚡ Setup in 6 step

### **STEP 1 — GitHub: pubblica il repo**

1. Crea un nuovo repo su GitHub: <https://github.com/new>
2. Nel terminale, dalla cartella del progetto:

```bash
git init
git add .
git commit -m "Initial commit — QuizFunnel"
git branch -M main
git remote add origin https://github.com/TUO_USER/quizfunnel.git
git push -u origin main
```

### **STEP 2 — Render: crea il database PostgreSQL** (gratis)

1. Vai su <https://dashboard.render.com/new/database>
2. Nome: `quizfunnel-db` · Region: **Frankfurt** (o la più vicina a te) · Plan: **Free**
3. Clicca **Create Database**
4. Quando è pronto, copia l'**External Database URL** (inizia con `postgresql://...`)

### **STEP 3 — Vercel: deploy dell'app**

1. Vai su <https://vercel.com/new>
2. **Import Git Repository** → seleziona `quizfunnel`
3. Framework: Next.js (auto-rilevato)
4. **Environment Variables** (clicca "Add"):

| Nome | Valore |
|---|---|
| `DATABASE_URL` | la stringa copiata da Render |
| `DIRECT_URL` | la stessa stringa |
| `AUTH_SECRET` | genera con `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | `https://il-tuo-progetto.vercel.app` (poi cambialo col tuo dominio) |
| `SEED_ADMIN_EMAIL` | la tua email |
| `SEED_ADMIN_PASSWORD` | una password forte |

5. **Deploy** ✓

### **STEP 4 — Inizializza il database**

Dopo il primo deploy, esegui in locale (o via Vercel CLI):

```bash
# 1. Installa le dipendenze
npm install

# 2. Imposta DATABASE_URL nel tuo .env locale (stessa di Vercel)
cp .env.example .env
# poi modifica .env

# 3. Crea le tabelle
npx prisma db push

# 4. Crea il super admin
npm run db:seed
```

Ora vai su `https://tuo-progetto.vercel.app/login` con le credenziali del seed.

### **STEP 5 — Collega il TUO dominio**

#### A) Sul DNS del tuo provider (es. Aruba, GoDaddy, Cloudflare)
- Aggiungi un record **CNAME**: `quiz` (o `app`) → `cname.vercel-dns.com`
- (oppure record A → `76.76.21.21` per dominio root)

#### B) Su Vercel
1. Vai su **Project Settings → Domains** → <https://vercel.com/dashboard>
2. Aggiungi `quiz.tuodominio.it`
3. Vercel verifica e attiva HTTPS automaticamente

Aggiorna poi `NEXT_PUBLIC_APP_URL` in Vercel con il tuo dominio definitivo.

### **STEP 6 — Configura Systeme.io**

#### A) Genera la API key su Systeme.io
1. <https://systeme.io/dashboard/profile> → scorri fino a **Public API keys**
2. **Create** → copia il token

#### B) Inseriscila in QuizFunnel
1. Login → **Dashboard → Integrazioni**
2. Incolla la chiave → **Salva** → **Testa connessione**

Da questo momento, ogni lead che completa un quiz:
- Viene **creato come contatto** su Systeme.io
- Riceve il **tag** che hai impostato sul quiz (es. `quiz-marketing-2026`)
- Le tue **automazioni mail** su Systeme.io partono in autonomo

> 💡 Crea su Systeme.io una **automazione**: trigger = "Tag aggiunto" → "quiz-XYZ" → invio campagna mail → upsell → checkout → ecc.

---

## 🎨 Come funziona il flusso lead

```
[Sito/Social/Embed]
        ↓
[Landing /q/<workspace>/<quiz>]   ← link pubblico generato dal sistema
        ↓
[7 domande con scoring]
        ↓
[Form lead: nome + email + telefono]
        ↓
[POST /api/quizzes/<id>/leads]
        ├→ Salvataggio nel DB (sempre)
        └→ Systeme.io: createContact + applyTag
                ↓
        [Le tue automazioni Systeme.io partono]
        - Email 1: "Ecco il tuo risultato"
        - Email 2: "Approfondimento"
        - Email 3: "Offerta limitata + checkout Systeme.io"
```

---

## 🔗 URL chiave

| URL | A cosa serve |
|---|---|
| `/` | Landing pubblica della piattaforma (vendita) |
| `/signup` | Registrazione di un nuovo cliente |
| `/dashboard` | Area cliente |
| `/dashboard/quizzes/<id>/edit` | Editor quiz |
| `/q/<workspaceSlug>/<quizSlug>` | **Landing pubblica del quiz** (condividi sui social) |
| `/embed/<quizId>` | **Versione embed** (iframe per sito esterno) |
| `/admin` | Pannello super-admin |

---

## 📤 Codice embed pronto

Quando un quiz è pubblicato, dall'editor copi/incolli un codice tipo:

```html
<iframe
  src="https://quiz.tuodominio.it/embed/abc123"
  width="100%"
  height="700"
  frameborder="0"
  style="border:0;border-radius:24px;"
></iframe>
```

Funziona ovunque: WordPress, Wix, Webflow, Carrd, anche dentro le **pagine Systeme.io** stesse.

---

## 🛡️ Sicurezza

- Password salvate con **bcrypt**
- Sessioni con **JWT firmato** (NextAuth v5)
- API key Systeme.io salvata sul DB (criptala via `encrypt()` se vuoi un livello in più)
- Middleware blocca accessi a `/dashboard` e `/admin`
- Ogni quiz è isolato per `workspaceId` → un utente non può mai vedere i quiz di un altro

---

## 🛠️ Sviluppo locale

```bash
npm install
cp .env.example .env  # poi modifica .env
npx prisma db push
npm run db:seed
npm run dev           # http://localhost:3000
```

---

## 🧠 Estendere la piattaforma

- **Pagamento abbonamenti**: il modo più rapido = crea **3 prodotti su Systeme.io** (Free / Pro / Business) con order form. Chi paga riceve un tag `pro-active` → un piccolo webhook (da Systeme.io a QuizFunnel) aggiorna il piano del workspace.
- **Email personalizzate del risultato**: già gestite dalle automazioni di Systeme.io con il tag.
- **Analytics**: aggiungi <https://plausible.io> o <https://umami.is> con uno script in `layout.tsx`.
- **Webhook custom** per altre piattaforme (Brevo, Mailchimp): basta aggiungere un nuovo file in `src/lib/` simile a `systeme.ts`.

---

## 📝 Licenza & supporto

Codice tuo, riutilizza come vuoi. Per estensioni o domande: parti da questo file, è la mappa.

**Buon lavoro e buoni lead! 🎯**
