/**
 * Helper per gestire i magic link (login senza password).
 *
 * Flusso:
 *  1. Cliente paga su Systeme.io → webhook crea account automaticamente
 *  2. Webhook chiama createMagicLink() per generare token unico
 *  3. Webhook scrive il magic-link URL nel custom field Systeme.io del contatto
 *  4. Cliente apre l'email Systeme.io di benvenuto → click sul magic link
 *  5. Endpoint /login/magic?token=xxx → consumeMagicLink() → fa login + redirect
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/** Genera un token casuale ad alta entropia (43 caratteri) */
function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Crea un magic link per l'utente specificato.
 * Il token resta valido 30 giorni e può essere usato una sola volta.
 *
 * Ritorna l'URL completo pronto da mettere nella mail.
 */
export async function createMagicLink(userId: string, baseUrl: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 giorni

  await prisma.magicLink.create({
    data: { token, userId, expiresAt },
  });

  // Costruisce URL pubblico - assumiamo baseUrl senza slash finale
  const cleanBase = baseUrl.replace(/\/$/, "");
  return `${cleanBase}/login/magic?token=${token}`;
}

/**
 * Valida e consuma un magic link.
 * Restituisce userId se valido, null se scaduto/usato/inesistente.
 *
 * Marca il link come "usato" così non può essere riutilizzato.
 */
export async function consumeMagicLink(token: string): Promise<string | null> {
  if (!token || token.length < 20) return null;

  const link = await prisma.magicLink.findUnique({ where: { token } });
  if (!link) return null;
  if (link.usedAt) return null; // già usato
  if (link.expiresAt < new Date()) return null; // scaduto

  // Marca come usato (single-use per sicurezza)
  await prisma.magicLink.update({
    where: { id: link.id },
    data: { usedAt: new Date() },
  });

  return link.userId;
}

/**
 * Cleanup: rimuove magic link scaduti da più di 7 giorni.
 * Da chiamare periodicamente (cron job o admin button).
 */
export async function cleanupExpiredMagicLinks(): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const res = await prisma.magicLink.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  });
  return res.count;
}
