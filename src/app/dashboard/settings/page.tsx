import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getBaseUrl } from "@/lib/utils";

export default async function SettingsPage() {
  const session = await auth();
  const wsId = (session!.user as any).workspaceId as string;
  const ws = await prisma.workspace.findUnique({ where: { id: wsId } });

  async function save(formData: FormData) {
    "use server";
    const session = await auth();
    const wsId = (session!.user as any).workspaceId as string;
    const name = String(formData.get("name") || "").trim();
    const customDomain = String(formData.get("customDomain") || "").trim().toLowerCase() || null;
    await prisma.workspace.update({
      where: { id: wsId },
      data: { name, customDomain },
    });
    revalidatePath("/dashboard/settings");
  }

  const baseUrl = getBaseUrl();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl">Workspace</h1>
      <p className="mt-2 text-sm text-ink/60">Identità e dominio del tuo workspace.</p>

      <form action={save} className="card mt-6 space-y-5">
        <div>
          <label className="text-sm font-medium">Nome workspace</label>
          <input name="name" defaultValue={ws?.name} className="mt-1 w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3" />
        </div>
        <div>
          <label className="text-sm font-medium">Slug (URL pubblico)</label>
          <div className="mt-1 flex items-center gap-2 text-sm text-ink/70">
            <code className="rounded-lg bg-ink/5 px-2 py-1 font-mono">{baseUrl}/q/{ws?.slug}/...</code>
          </div>
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
