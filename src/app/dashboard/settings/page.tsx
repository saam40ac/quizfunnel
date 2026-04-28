import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getBaseUrl } from "@/lib/utils";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { msg?: string };
}) {
  const session = await auth();
  const wsId = (session!.user as any).workspaceId as string;
  const ws = await prisma.workspace.findUnique({ where: { id: wsId } });

  async function save(formData: FormData) {
    "use server";
    const session = await auth();
    const wsId = (session!.user as any).workspaceId as string;
    const name = String(formData.get("name") || "").trim();
    const customDomain =
      String(formData.get("customDomain") || "").trim().toLowerCase() || null;
    await prisma.workspace.update({
      where: { id: wsId },
      data: { name, customDomain },
    });
    revalidatePath("/dashboard/settings");
  }

  async function updateSlug(formData: FormData) {
    "use server";
    const session = await auth();
    const wsId = (session!.user as any).workspaceId as string;
    const newSlugRaw = String(formData.get("slug") || "").trim();
    if (!newSlugRaw) return;

    const newSlug = newSlugRaw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);

    if (!newSlug) {
      const { redirect } = await import("next/navigation");
      redirect("/dashboard/settings?msg=invalid");
    }

    // Controlla che non sia già usato da un altro workspace
    const existing = await prisma.workspace.findFirst({
      where: { slug: newSlug, NOT: { id: wsId } },
    });
    if (existing) {
      const { redirect } = await import("next/navigation");
      redirect("/dashboard/settings?msg=taken");
    }

    await prisma.workspace.update({
      where: { id: wsId },
      data: { slug: newSlug },
    });

    revalidatePath("/dashboard/settings");
    const { redirect } = await import("next/navigation");
    redirect("/dashboard/settings?msg=ok");
  }

  const baseUrl = getBaseUrl();

  const messages: Record<string, { type: "ok" | "error"; text: string }> = {
    ok: { type: "ok", text: "✓ Slug aggiornato! I tuoi link pubblici ora usano il nuovo slug." },
    taken: { type: "error", text: "Questo slug è già usato da un altro workspace. Provane un altro." },
    invalid: { type: "error", text: "Slug non valido. Usa solo lettere minuscole, numeri e trattini." },
  };
  const msg = searchParams.msg ? messages[searchParams.msg] : null;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl">Workspace</h1>
      <p className="mt-2 text-sm text-ink/60">Identità, slug e dominio del tuo workspace.</p>

      {msg && (
        <div
          className={`mt-4 rounded-2xl border p-4 text-sm ${
            msg.type === "ok"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Slug del workspace - sezione dedicata */}
      <div className="card mt-6">
        <h2 className="font-display text-xl">Slug del workspace</h2>
        <p className="mt-1 text-sm text-ink/60">
          È la parte centrale dei tuoi link pubblici. Più corto è, meglio è.
        </p>

        <form action={updateSlug} className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-1 rounded-lg border border-ink/15 bg-white/80 px-3 py-2 font-mono text-xs">
            <span className="text-ink/40">{baseUrl}/q/</span>
            <input
              name="slug"
              defaultValue={ws?.slug || ""}
              className="flex-1 bg-transparent outline-none"
              placeholder="es. hq, mio-brand, agenzia"
            />
            <span className="text-ink/40">/...</span>
          </div>
          <button className="btn-primary text-sm">Aggiorna slug</button>
        </form>

        <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <strong>Attenzione:</strong> cambiando lo slug, tutti i link pubblici dei tuoi quiz cambieranno.
          Se hai già condiviso link sui social o nelle mail, smetteranno di funzionare.
        </div>
      </div>

      {/* Resto delle impostazioni */}
      <form action={save} className="card mt-6 space-y-5">
        <h2 className="font-display text-xl">Identità e dominio</h2>
        <div>
          <label className="text-sm font-medium">Nome workspace</label>
          <input
            name="name"
            defaultValue={ws?.name}
            className="mt-1 w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Dominio custom (opzionale)</label>
          <input
            name="customDomain"
            defaultValue={ws?.customDomain || ""}
            placeholder="quiz.tuodominio.it"
            className="mt-1 w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3 font-mono text-sm"
          />
          <p className="mt-2 text-xs text-ink/60">
            Configura il dominio su Vercel (Project → Settings → Domains) e aggiungi un record CNAME → cname.vercel-dns.com.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Piano attuale</label>
          <div className="mt-1 inline-block rounded-full bg-ink/5 px-3 py-1 text-sm">{ws?.plan}</div>
        </div>
        <button className="btn-primary">Salva</button>
      </form>
    </div>
  );
}
