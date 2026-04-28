import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NewQuizWizard } from "./wizard-client";

export default async function NewQuizPage() {
  const session = await auth();
  const wsId = (session!.user as any).workspaceId as string | null;
  if (!wsId) redirect("/dashboard/settings");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="text-xs text-ink/50">← Tutti i quiz</Link>
      <h1 className="mt-1 font-display text-4xl">Nuovo quiz</h1>
      <p className="mt-2 text-ink/60">
        Descrivi il tuo progetto. L'AI genererà domande, risposte e fasce di risultato in pochi secondi.
        Potrai modificare ogni dettaglio nell'editor.
      </p>
      <div className="mt-8">
        <NewQuizWizard />
      </div>
    </div>
  );
}
