"use client";

import { useState } from "react";

export function ApiKeyInput({ defaultValue }: { defaultValue: string }) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <input
        name="apiKey"
        defaultValue={defaultValue}
        type={shown ? "text" : "password"}
        placeholder="incolla qui la chiave"
        className="w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3 pr-12 font-mono text-xs"
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink/60 transition hover:bg-ink/5 hover:text-ink"
        aria-label={shown ? "Nascondi chiave" : "Mostra chiave"}
        title={shown ? "Nascondi chiave" : "Mostra chiave"}
      >
        {shown ? (
          // Eye-off icon
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        ) : (
          // Eye icon
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
