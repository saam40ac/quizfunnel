"use client";

import { useState } from "react";

/**
 * Sezione interattiva per impostare/cambiare la password.
 *
 * Si adatta automaticamente al caso:
 *  - hasPassword=false → "Imposta password" (no campo password attuale)
 *  - hasPassword=true → "Cambia password" (richiede password attuale)
 */
export function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<
    { type: "ok" | "err"; msg: string } | null
  >(null);
  // Stato locale per riflettere il cambio post-submit (così l'UI passa da "imposta" a "cambia")
  const [localHasPassword, setLocalHasPassword] = useState(hasPassword);

  async function submit(formData: FormData) {
    setSubmitting(true);
    setFeedback(null);

    const newPassword = String(formData.get("newPassword") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    const currentPassword = formData.get("currentPassword")
      ? String(formData.get("currentPassword"))
      : null;

    if (newPassword.length < 8) {
      setFeedback({
        type: "err",
        msg: "La password deve essere di almeno 8 caratteri",
      });
      setSubmitting(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({
        type: "err",
        msg: "Le due password non coincidono",
      });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword,
          currentPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore");

      setFeedback({ type: "ok", msg: data.message });
      // Aggiorna stato locale così il form si trasforma in "cambia password"
      if (data.isFirstSet) {
        setLocalHasPassword(true);
      }
      // Pulisce form
      const form = document.getElementById(
        "password-form",
      ) as HTMLFormElement | null;
      form?.reset();
    } catch (e: any) {
      setFeedback({ type: "err", msg: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card mt-6">
      <h2 className="font-display text-lg">
        {localHasPassword ? "Cambia password" : "Imposta password"}
      </h2>

      <form
        id="password-form"
        action={submit}
        className="mt-4 space-y-4 max-w-md"
      >
        {localHasPassword && (
          <div>
            <label className="text-sm font-medium">Password attuale</label>
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3 text-sm"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium">
            {localHasPassword ? "Nuova password" : "Password"}
          </label>
          <input
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3 text-sm"
          />
          <p className="mt-1 text-xs text-ink/50">Minimo 8 caratteri</p>
        </div>

        <div>
          <label className="text-sm font-medium">Conferma password</label>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3 text-sm"
          />
        </div>

        {feedback && (
          <div
            className={`rounded-lg p-3 text-sm ${
              feedback.type === "ok"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {feedback.msg}
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting
            ? "Salvataggio…"
            : localHasPassword
              ? "Cambia password"
              : "Imposta password"}
        </button>
      </form>
    </div>
  );
}
