/**
 * Endpoint API per impostare o cambiare la password dell'utente loggato.
 *
 * Casi d'uso:
 *  A. Utente creato via auto-signup (magic link, passwordHash=null) imposta
 *     per la prima volta una password → currentPassword non richiesta
 *  B. Utente con password esistente la cambia → currentPassword richiesta e verificata
 *
 * Endpoint: POST /api/account/password
 * Body: { currentPassword?: string, newPassword: string }
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  const newPassword = String(body.newPassword || "");
  const currentPassword = body.currentPassword
    ? String(body.currentPassword)
    : null;

  // Validazione: password robusta
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "La password deve essere di almeno 8 caratteri" },
      { status: 400 },
    );
  }

  // Carica utente
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  // Caso A: l'utente NON ha ancora una password (auto-signup, primo set)
  // → currentPassword non richiesta
  // Caso B: l'utente HA già una password → currentPassword obbligatoria e verificata
  if (user.passwordHash) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Devi fornire la password attuale per cambiarla" },
        { status: 400 },
      );
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Password attuale errata" },
        { status: 401 },
      );
    }
  }

  // Hash e salva
  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({
    ok: true,
    message: user.passwordHash
      ? "Password aggiornata con successo"
      : "Password impostata. D'ora in poi puoi accedere con email + password.",
    isFirstSet: !user.passwordHash,
  });
}
