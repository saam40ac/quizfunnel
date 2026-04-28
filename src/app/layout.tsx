import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuizFunnel — Genera lead con quiz intelligenti",
  description:
    "La piattaforma per creare funnel marketing basati su quiz. Pubblica, embeddi, raccogli lead e invia automaticamente a Systeme.io.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="grain">{children}</body>
    </html>
  );
}
