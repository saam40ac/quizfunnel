import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export default async function IntegrationsPage({ searchParams }: { searchParams: { saved?: string; tested?: string } }) {
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
    return { ok: true };
  }

  async function test() {
    "use server";
    const session = await auth();
    const wsId = (session!.user as any).workspaceId as string;
    const ws = await prisma.workspace.findUnique({ where: { id: wsId } });
    if (!ws?.systemeApiKey) return;
    const res = await fetch("https://api.systeme.io/api/contacts?limit=1", {
      headers: { "X-API-Key": ws.systemeApiKey },
      cache: "no-store",
    });
    const ok = res.ok;
    revalidatePath("/dashboard/integrations");
    // Reusa querystring per messaggio
    const { redirect } = await import("next/navigation");
    redirect(`/dashboard/integrations?tested=${ok ? "ok" : "ko"}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl">Integrazioni</h1>
      <p className="mt-2 text-sm text-ink/60">Collega le tue automazioni esterne. La chiave API è salvata cifrata.</p>

      <section className="card mt-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#FFB100] text-white font-bold">S</div>
          <div>
            <h2 className="font-display text-xl">Systeme.io</h2>
            <p className="text-sm text-ink/60">Sync automatico dei lead come contatti + applicazione tag.</p>
          </div>
        </div>

        <form action={save} className="mt-5 space-y-3">
          <label className="text-sm font-medium">Public API key</label>
          <input
            name="apiKey"
            defaultValue={ws?.systemeApiKey || ""}
            type="password"
            placeholder="incolla qui la chiave"
            className="w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3 font-mono text-sm"
          />
          <div className="flex gap-2">
            <button className="btn-primary text-sm">Salva</button>
          </div>
        </form>

        {ws?.systemeApiKey && (
          <form action={test} className="mt-3">
            <button className="btn-ghost text-sm">Testa connessione</button>
          </form>
        )}

        {searchParams.tested === "ok" && (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">✓ Connessione OK!</p>
        )}
        {searchParams.tested === "ko" && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">✗ La chiave non funziona. Controllala su Systeme.io.</p>
        )}

        <div className="mt-6 rounded-xl bg-ink/5 p-4 text-sm text-ink/70">
          <p className="font-medium">Come ottenere la chiave?</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Vai su <a className="underline" href="https://systeme.io/dashboard/profile" target="_blank">systeme.io → Profilo</a></li>
            <li>Sezione <strong>Public API keys</strong> → <strong>Create</strong></li>
            <li>Copia il token e incollalo qui sopra</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
