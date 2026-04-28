# ⚡ QUICKSTART (1 pagina)

## In locale (5 minuti)

```bash
# 1. Installa
npm install

# 2. Configura .env
cp .env.example .env

# 3. Apri .env e incolla la DATABASE_URL del tuo DB
#    (Render gratis: https://dashboard.render.com/new/database)

# 4. Genera AUTH_SECRET
openssl rand -base64 32
# (incolla l'output in AUTH_SECRET nel .env)

# 5. Crea le tabelle
npx prisma db push

# 6. Crea il super admin (dalle env SEED_*)
npm run db:seed

# 7. Avvia
npm run dev
```

→ Apri http://localhost:3000

---

## Online (15 minuti)

| # | Step | Link |
|---|------|------|
| 1 | Push del codice su GitHub | https://github.com/new |
| 2 | Crea PostgreSQL gratis | https://dashboard.render.com/new/database |
| 3 | Importa repo su Vercel | https://vercel.com/new |
| 4 | Aggiungi le 6 env variabili (vedi `.env.example`) | Vercel → Settings → Environment Variables |
| 5 | Esegui `prisma db push` + seed dal tuo PC con la DATABASE_URL prod | terminale |
| 6 | Aggiungi dominio | Vercel → Settings → Domains |
| 7 | DNS sul tuo registrar: CNAME → `cname.vercel-dns.com` | pannello del tuo registrar |
| 8 | Genera Public API key | https://systeme.io/dashboard/profile |
| 9 | Incollala in `/dashboard/integrazioni` | la tua app |

✅ Pronto.

---

## URL chiave dell'app

| Cosa | URL |
|------|-----|
| Landing piattaforma | `/` |
| Signup | `/signup` |
| Dashboard | `/dashboard` |
| **Quiz pubblico** | `/q/<workspace>/<quiz>` |
| **Embed iframe** | `/embed/<quizId>` |
| Admin | `/admin` |

---

## Flusso completo lead

```
Quiz pubblico → 7 domande → form (nome+email) → POST /api/quizzes/<id>/leads
                                                          │
                                              ┌───────────┴───────────┐
                                              ↓                       ↓
                                       Salvato nel DB         Sync Systeme.io:
                                                              · createContact
                                                              · applyTag
                                                                   │
                                                                   ↓
                                                          Tue automazioni mail
                                                          partono in autonomo
```

Il **tag** che ogni quiz applica si imposta nell'editor → "Tag su Systeme.io".
Crea poi un'**automazione** su Systeme.io con trigger = "Tag added".

Buon lavoro 🚀
