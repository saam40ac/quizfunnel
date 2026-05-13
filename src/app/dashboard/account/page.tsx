import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PasswordSection } from "./password-section";

/**
 * Pagina "Il mio account" per l'utente loggato.
 *
 * Permette di:
 *  - Vedere email e workspace di appartenenza
 *  - Impostare/cambiare la password
 *
 * Gli utenti creati via auto-signup arrivano qui senza una password impostata;
 * il riquadro password si adatta mostrando "Imposta password" invece di "Cambia password".
 */
export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id as string;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { workspace: { select: { name: true, plan: true } } },
  });

  if (!user) redirect("/login");

  // Distinguiamo se ha già una password o no
  const hasPassword = !!user.passwordHash;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="text-xs text-ink/50">
        ← Dashboard
      </Link>
      <h1 className="mt-1 font-display text-3xl">Il mio account</h1>
      <p className="mt-1 text-sm text-ink/60">
        Gestisci le informazioni del tuo account e la password.
      </p>

      {/* Info account */}
      <div className="card mt-6">
        <h2 className="font-display text-lg">Informazioni</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-ink/50">Email</dt>
            <dd className="col-span-2 font-mono">{user.email}</dd>
          </div>
          {user.name && (
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-ink/50">Nome</dt>
              <dd className="col-span-2">{user.name}</dd>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-ink/50">Workspace</dt>
            <dd className="col-span-2">
              {user.workspace?.name}{" "}
              <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-[10px]">
                {user.workspace?.plan}
              </span>
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-ink/50">Account creato</dt>
            <dd className="col-span-2 text-ink/70">
              {user.createdAt.toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </div>

      {/* Banner se non ha ancora una password */}
      {!hasPassword && (
        <div className="card mt-6 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔑</span>
            <div>
              <h3 className="font-display text-lg">Imposta la tua password</h3>
              <p className="mt-1 text-sm text-amber-900">
                Il tuo account è stato creato automaticamente dopo il pagamento.
                Per accedere d'ora in poi anche senza usare il link nell'email,
                imposta una password personale qui sotto.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sezione password */}
      <PasswordSection hasPassword={hasPassword} />

      {/* Sezione info su come accedere */}
      <div className="card mt-6 bg-ink/5">
        <h3 className="font-display text-lg">Come accedere a QuizFunnel</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink/70">
          <li>
            <strong>Via email e password</strong>: vai su{" "}
            <Link href="/login" className="font-medium underline">
              /login
            </Link>{" "}
            e inserisci le credenziali.
            {!hasPassword && (
              <span className="ml-1 text-amber-700">
                (Devi prima impostare una password qui sopra.)
              </span>
            )}
          </li>
          <li>
            <strong>Via link automatico</strong>: dopo ogni pagamento o rinnovo,
            ricevi un link di accesso diretto via email. Quel link funziona ogni
            volta che lo riclicchi.
          </li>
        </ul>
      </div>
    </div>
  );
}
