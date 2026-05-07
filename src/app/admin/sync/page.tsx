import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SyncClient } from "./sync-client";

export default async function AdminSyncPage() {
  const session = await auth();
  if ((session!.user as any).role !== "SUPER_ADMIN") redirect("/dashboard");

  const apiKeyConfigured = !!process.env.SYSTEME_PLATFORM_API_KEY;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin" className="text-xs text-ink/50">
        ← Admin
      </Link>
      <h1 className="mt-1 font-display text-3xl">🔄 Sync con Systeme.io</h1>
      <p className="mt-1 text-sm text-ink/60">
        Riallinea i piani dei workspace con lo stato dei tag su Systeme.io.
        Utile come rete di sicurezza nel raro caso che un webhook si perda.
      </p>

      {!apiKeyConfigured && (
        <div className="card mt-6 border-amber-200 bg-amber-50">
          <h3 className="font-display text-lg">⚠️ Configurazione mancante</h3>
          <p className="mt-2 text-sm text-amber-900">
            Per usare questa funzione devi impostare la variabile d'ambiente{" "}
            <code className="rounded bg-amber-100 px-1 font-mono text-xs">
              SYSTEME_PLATFORM_API_KEY
            </code>{" "}
            su Vercel.
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-amber-900">
            <li>
              Su Systeme.io vai in <strong>Profile → Public API keys</strong> →{" "}
              crea una API key
            </li>
            <li>
              Su Vercel → Settings → Environment Variables → Add:
              <br />
              Nome: <code>SYSTEME_PLATFORM_API_KEY</code>
              <br />
              Valore: la chiave appena creata
            </li>
            <li>Redeploy del progetto</li>
            <li>Torna qui — vedrai il pulsante per sincronizzare</li>
          </ol>
        </div>
      )}

      {apiKeyConfigured && <SyncClient />}

      <div className="card mt-6 bg-ink/5">
        <h3 className="font-display text-lg">Come funziona</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink/70">
          <li>
            La piattaforma elenca tutti i workspace attualmente PRO o BUSINESS
          </li>
          <li>
            Per ognuno, contatta Systeme.io via API e cerca il contatto con la sua{" "}
            <strong>billing email</strong>
          </li>
          <li>
            Verifica che il contatto abbia il tag attivo corrispondente al piano
            (<code className="font-mono text-xs">quizfunnel-pro-active</code> o{" "}
            <code className="font-mono text-xs">quizfunnel-business-active</code>)
          </li>
          <li>
            Se il tag <strong>manca</strong> → il workspace viene riportato a FREE
            automaticamente
          </li>
          <li>
            Se il tag <strong>è presente</strong> → nessuna modifica
          </li>
        </ol>
        <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-900">
          ⚠️ Questa azione può fare downgrade di più workspace contemporaneamente.
          Esegui solo quando hai motivo di sospettare disallineamenti (es. dopo
          un disservizio Systeme.io o se un cliente segnala "ho cancellato ma
          sono ancora PRO").
        </p>
      </div>
    </div>
  );
}
