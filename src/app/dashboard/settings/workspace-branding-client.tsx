"use client";

import { useState, useTransition } from "react";
import { LogoUploader } from "@/components/logo-uploader";

export function WorkspaceBrandingClient({
  initialLogoUrl,
  initialLogoUrlDark,
  saveAction,
}: {
  initialLogoUrl: string | null;
  initialLogoUrlDark: string | null;
  saveAction: (data: { logoUrl: string | null; logoUrlDark: string | null }) => Promise<any>;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [logoUrlDark, setLogoUrlDark] = useState<string | null>(initialLogoUrlDark);
  const [showDarkVersion, setShowDarkVersion] = useState(!!initialLogoUrlDark);
  const [isPending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function save() {
    start(async () => {
      await saveAction({ logoUrl, logoUrlDark: showDarkVersion ? logoUrlDark : null });
      setSavedAt(new Date().toLocaleTimeString());
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg">Logo principale</h3>
        <p className="mt-1 text-sm text-ink/60">
          Apparirà nella tua dashboard e su tutti i tuoi quiz pubblici.
        </p>
        <div className="mt-4">
          <LogoUploader
            value={logoUrl}
            onChange={setLogoUrl}
            label="Carica il tuo logo"
            previewBg="light"
          />
        </div>
      </div>

      <div className="border-t border-ink/10 pt-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showDarkVersion}
            onChange={(e) => setShowDarkVersion(e.target.checked)}
            className="h-4 w-4"
          />
          <span>
            Aggiungi versione per <strong>sfondi scuri</strong>
          </span>
        </label>
        <p className="mt-1 text-xs text-ink/50">
          Utile se il tuo logo principale ha colori scuri e crei quiz con sfondo scuro.
        </p>

        {showDarkVersion && (
          <div className="mt-4">
            <LogoUploader
              value={logoUrlDark}
              onChange={setLogoUrlDark}
              label="Logo per sfondi scuri"
              previewBg="dark"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-ink/10 pt-4">
        <span className="text-xs text-ink/50">
          {savedAt && <span className="text-green-700">✓ Salvato alle {savedAt}</span>}
        </span>
        <button onClick={save} disabled={isPending} className="btn-primary text-sm">
          {isPending ? "Salvataggio…" : "Salva branding"}
        </button>
      </div>
    </div>
  );
}
