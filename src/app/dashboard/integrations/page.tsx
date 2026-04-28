import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: { tested?: string; status?: string; detail?: string };
}) {
  const session = await auth();
  const wsId = (session!.user as any).workspaceId as string;
  const ws = await prisma.workspace.findUnique({ where: { id: wsId } });

  async function save(formData: FormData) {
    "use server";
    const session = await auth();
    const wsId = (session!.user as any).workspaceId as string;
    const apiKey = String(formData.get("apiKey") || "").trim();
    await prisma.workspace.update({
      where: { id: wsId },
      data: { systemeApiKey: apiKey || null },
    });
    revalidatePath("/dashboard/integrations");
  }

  async function test() {
    "use server";
    const session = await auth();
    const wsId = (session!.user as any).workspaceId as string;
    const ws = await prisma.workspace.findUnique({ where: { id: wsId } });
    if (!ws?.systemeApiKey) {
      redirect("/dashboard/integrations?tested=ko&status=nokey");
    }

    let status = 0;
    let bodyPreview = "";
    try {
      const res = await fetch("https://api.systeme.io/api/contacts?limit=1", {
        headers: { "X-API-Key": ws.systemeApiKey },
        cache: "no-store",
      });
      status = res.status;
      const text = await res.text();
      bodyPreview = text.slice(0, 200); // Solo primi 200 caratteri
      if (res.ok) {
        redirect("/dashboard/integrations?tested=ok");
      }
    } catch (e: any) {
      bodyPreview = e?.message || "Errore di rete";
    }

    revalidatePath("/dashboard/integrations");
    redirect(
      `/dashboard/integrations?tested=ko&status=${status}&detail=${encodeURIComponent(
        bodyPreview,
      )}`,
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl">Integrazioni</h1>
      <p className="mt-2 text-sm text-ink/60">
        Collega le tue automazioni esterne. La chiave API viene salvata sul database.
      </p>

      <section className="card mt-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#FFB100] text-white font-bold">
            S
          </div>
          <div>
            <h2 className="font-display text-xl">Systeme.io</h2>
            <p className="text-sm text-ink/60">
              Sync automatico dei lead come contatti + applicazione tag.
            </p>
          </div>
        </div>

        <form action={save} className="mt-5 space-y-3">
          <label className="text-sm font-medium">Public API key</label>
          <input
            name="apiKey"
            defaultValue={ws?.systemeApiKey || ""}
            type="text"
            placeholder="incolla qui la chiave"
            className="w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3 font-mono text-xs"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-ink/50">
            La chiave Systeme.io è una stringa lunga (50+ caratteri). Lasciamo il campo in chiaro
            per aiutarti a verificare che sia stata copiata bene.
          </p>
          <div className="flex gap-2">
            <button className="btn-primary text-sm">Salva</button>
          </div>
        </form>

        {ws?.systemeApiKey && (
          <form action={test} className="mt-3">
            <button className="btn-ghost text-sm">🔍 Testa connessione</button>
          </form>
        )}

        {searchParams.tested === "ok" && (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
            ✓ Connessione OK! La piattaforma comunica correttamente con Systeme.io.
          </p>
        )}

        {searchParams.tested === "ko" && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            <p className="font-semibold">✗ La chiave non funziona</p>
            {searchParams.status && (
              <p className="mt-1">
                <strong>Codice HTTP:</strong> {searchParams.status}
              </p>
            )}
            {searchParams.detail && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs underline">
                  Mostra risposta dettagliata di Systeme.io
                </summary>
                <pre className="mt-2 overflow-x-auto rounded bg-red-100 p-2 text-[10px]">
                  {decodeURIComponent(searchParams.detail)}
                </pre>
              </details>
            )}
            <p className="mt-2 text-xs">{getReadableHelp(searchParams.status)}</p>
          </div>
        )}

        <div className="mt-6 rounded-xl bg-ink/5 p-4 text-sm text-ink/70">
          <p className="font-medium">Come ottenere la chiave?</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              Vai su{" "}
              <a
                className="underline"
                href="https://systeme.io/dashboard/profile"
                target="_blank"
                rel="noopener"
              >
                systeme.io → Profilo
              </a>
            </li>
            <li>
              Sezione <strong>Public API keys</strong> → <strong>Create</strong>
            </li>
            <li>
              <strong>IMPORTANTE</strong>: copia il token mostrato <em>subito dopo</em> averlo
              creato. Dopo averla salvata vedrai solo asterischi.
            </li>
            <li>Incollalo qui sopra e clicca Salva → Testa connessione</li>
          </ol>
          <p className="mt-3 text-xs">
            <strong>Requisito:</strong> le API key richiedono un piano Systeme.io a pagamento (Startup o superiore). Sul piano Free le API non sono attive.
          </p>
        </div>
      </section>
    </div>
  );
}

function getReadableHelp(status?: string): string {
  if (!status) return "";
  const code = parseInt(status, 10);
  if (code === 401)
    return "Errore di autenticazione: la chiave non è valida o è stata revocata. Generane una nuova.";
  if (code === 403)
    return "Accesso negato: probabilmente il tuo piano Systeme.io non include le API. Serve almeno il piano Startup.";
  if (code === 404)
    return "Endpoint non trovato. Verifica che l'API di Systeme.io non sia in manutenzione.";
  if (code === 429) return "Troppe richieste. Aspetta qualche minuto e riprova.";
  if (code >= 500) return "Errore lato Systeme.io. Riprova fra qualche minuto.";
  if (code === 0) return "Errore di rete. La piattaforma non riesce a contattare Systeme.io.";
  return `Errore inatteso (HTTP ${code}). Controlla i dettagli sopra.`;
}
