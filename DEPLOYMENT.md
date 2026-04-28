# 🚦 DEPLOYMENT GUIDE — Da zero a online in 30 minuti

Segui questi step nell'ordine. **Ogni link è cliccabile**.

---

## ⏱ 1) GitHub (3 minuti)

1. Crea repo nuovo: 👉 **<https://github.com/new>**
2. Nome: `quizfunnel` · Privato o pubblico, come preferisci
3. **NON** inizializzare con README/license (li abbiamo già)
4. Apri terminale nella cartella del progetto:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TUO_USER/quizfunnel.git
git push -u origin main
```

---

## ⏱ 2) Database PostgreSQL su Render (5 minuti)

1. Vai su 👉 **<https://dashboard.render.com/new/database>**
2. Compila:
   - **Name**: `quizfunnel-db`
   - **Database**: `quizfunnel`
   - **User**: lascia il default
   - **Region**: **Frankfurt (EU Central)**
   - **Plan**: **Free**
3. Click **Create Database**
4. Aspetta ~1 minuto. Dopo:
   - Sezione **Connections** → copia "**External Database URL**" (quella esterna, NON l'internal)
   - **Salvala da parte** → la userai sia su Vercel sia in locale

---

## ⏱ 3) Deploy su Vercel (5 minuti)

1. Vai su 👉 **<https://vercel.com/new>**
2. **Import** il repo `quizfunnel` da GitHub
3. Framework Preset: **Next.js** (auto-rilevato)
4. **Environment Variables** — clicca "Add" per ognuna:

| Nome | Valore |
|------|--------|
| `DATABASE_URL` | URL Render |
| `DIRECT_URL` | URL Render (lo stesso) |
| `AUTH_SECRET` | esegui `openssl rand -base64 32` e incolla |
| `NEXT_PUBLIC_APP_URL` | per ora lascia `https://quizfunnel.vercel.app` (cambierai) |
| `SEED_ADMIN_EMAIL` | la tua email |
| `SEED_ADMIN_PASSWORD` | password forte |

5. Click **Deploy**
6. Attendi ~2 minuti. Vercel ti darà un URL temporaneo (`https://quizfunnel-xxxx.vercel.app`)

---

## ⏱ 4) Inizializza il database (3 minuti)

Apri terminale nella tua cartella locale:

```bash
# 1. Installa
npm install

# 2. Crea .env locale
cp .env.example .env

# 3. Apri .env e incolla la stessa DATABASE_URL di Render
# (anche AUTH_SECRET, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD)

# 4. Crea le tabelle sul DB
npx prisma db push

# 5. Crea l'utente super-admin
npm run db:seed
```

✅ Vai su `https://quizfunnel-xxxx.vercel.app/login` con le credenziali del seed.

---

## ⏱ 5) Collega il TUO dominio (8 minuti)

### A) Sul tuo registrar (Aruba, GoDaddy, Cloudflare, Register…)

Aggiungi un record DNS:

**Per un sottodominio** (consigliato — es. `quiz.tuodominio.it`):
```
Tipo:   CNAME
Nome:   quiz
Valore: cname.vercel-dns.com
TTL:    Auto
```

**Per il dominio root** (es. `tuodominio.it`):
```
Tipo:   A
Nome:   @
Valore: 76.76.21.21
```

### B) Su Vercel

1. 👉 **<https://vercel.com/dashboard>** → clicca il progetto
2. **Settings → Domains**
3. Inserisci `quiz.tuodominio.it` → **Add**
4. Vercel verifica il DNS (1-30 min) e attiva HTTPS in automatico

### C) Aggiorna le env

In **Vercel → Settings → Environment Variables**:
- Modifica `NEXT_PUBLIC_APP_URL` → `https://quiz.tuodominio.it`
- Click **Save**
- Vai su **Deployments → ... → Redeploy**

---

## ⏱ 6) Connetti Systeme.io (4 minuti)

### A) Genera la API key

1. Vai su 👉 **<https://systeme.io/dashboard/profile>**
2. Scorri fino a **Public API keys**
3. Click **Create**
4. Nome: `QuizFunnel` · Expiration: lascia vuoto (illimitata)
5. Click **Save** → **copia subito il token** (non sarà più visibile)

### B) Inserisci la chiave

1. Login su `https://quiz.tuodominio.it/login`
2. **Dashboard → Integrazioni**
3. Incolla la chiave → **Salva**
4. Click **Testa connessione** → deve apparire ✓ verde

### C) Crea automazioni Systeme.io

1. Su Systeme.io → **Automations → Create rule**
2. **Trigger**: "Tag added to contact" → tag che hai messo nel quiz (es. `quiz-marketing-2026`)
3. **Action 1**: Send email → "Ecco il tuo risultato del quiz"
4. **Action 2**: Wait 1 day → Send email → "Approfondimento"
5. **Action 3**: Wait 2 days → Send email con link al **checkout Systeme.io** del tuo prodotto

🎉 **Da ora ogni lead che completa il quiz parte in automatico nelle tue email!**

---

## ✅ Checklist finale

- [ ] Repo su GitHub ✓
- [ ] Database Render attivo ✓
- [ ] App online su Vercel ✓
- [ ] Tabelle DB create (`prisma db push`) ✓
- [ ] Super admin seedato ✓
- [ ] Dominio custom collegato + HTTPS attivo ✓
- [ ] API key Systeme.io connessa e testata ✓
- [ ] Almeno una **automazione** attiva su Systeme.io ✓
- [ ] Primo quiz creato, pubblicato e testato ✓

---

## 🆘 Troubleshooting

**Build fallisce su Vercel con "Prisma Client not generated"**
→ Già gestito: lo script `build` esegue `prisma generate` prima di `next build`.

**Connessione DB fallita in produzione**
→ Render Free chiude le connessioni dopo 90gg di inattività. Sul piano free fai login periodicamente o passa al piano da $7/mese.

**Cookie auth non funzionanti**
→ Controlla che `AUTH_SECRET` sia uguale tra Vercel e tutti gli ambienti.

**Lead non arriva su Systeme.io ma è nel DB**
→ Vai su Dashboard → Integrazioni → "Testa connessione". Se fallisce, rigenera la API key.

**Embed non si vede su un sito esterno**
→ Verifica che il quiz sia in stato **Pubblicato**, non Bozza.

---

## 📞 Comandi utili

```bash
# Vedere il database in browser
npx prisma studio

# Reset totale del DB (ATTENZIONE: cancella tutto)
npx prisma db push --force-reset && npm run db:seed

# Push di una modifica
git add . && git commit -m "msg" && git push
# (Vercel deploya automaticamente al push)
```

Buon lancio! 🚀
