"use client";

import { useState, useRef } from "react";

const MAX_SIZE_KB = 200;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];

type Props = {
  /** Valore corrente: data URL base64 o null */
  value: string | null;
  /** Chiamata quando l'utente carica un nuovo logo (data URL base64) */
  onChange: (dataUrl: string | null) => void;
  /** Etichetta del bottone (es. "Carica logo workspace") */
  label?: string;
  /** Sfondo dell'anteprima (per testare logo su sfondo chiaro/scuro) */
  previewBg?: "light" | "dark";
};

export function LogoUploader({ value, onChange, label = "Carica logo", previewBg = "light" }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);

    // Validazione tipo
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Formato non supportato. Usa PNG, JPG, SVG o WebP.");
      return;
    }

    // Validazione dimensione
    const sizeKb = file.size / 1024;
    if (sizeKb > MAX_SIZE_KB) {
      setError(`File troppo grande (${sizeKb.toFixed(0)} KB). Massimo ${MAX_SIZE_KB} KB.`);
      return;
    }

    // Converti in data URL base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onChange(dataUrl);
    };
    reader.onerror = () => setError("Errore lettura file. Riprova.");
    reader.readAsDataURL(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function clearLogo() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const previewClasses =
    previewBg === "dark"
      ? "bg-ink text-cream"
      : "bg-white text-ink border border-ink/10";

  return (
    <div className="space-y-3">
      {value ? (
        // ===== ANTEPRIMA =====
        <div className="flex items-center gap-4">
          <div
            className={`flex h-24 min-w-[140px] items-center justify-center rounded-2xl px-4 ${previewClasses}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Logo"
              className="max-h-16 max-w-full object-contain"
            />
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn-ghost text-sm"
            >
              Sostituisci
            </button>
            <button
              type="button"
              onClick={clearLogo}
              className="text-xs text-red-600 hover:underline"
            >
              Rimuovi logo
            </button>
          </div>
        </div>
      ) : (
        // ===== UPLOAD AREA =====
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition ${
            isDragging
              ? "border-accent bg-accent/5"
              : "border-ink/20 hover:border-ink/40"
          }`}
        >
          <div className="text-2xl">📁</div>
          <div className="mt-1 text-sm font-medium">{label}</div>
          <div className="text-xs text-ink/50">Trascina qui o clicca per selezionare</div>
          <div className="mt-1 text-[10px] text-ink/40">
            PNG, JPG, SVG, WebP · max {MAX_SIZE_KB} KB
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={onInputChange}
        className="hidden"
      />

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}
    </div>
  );
}
