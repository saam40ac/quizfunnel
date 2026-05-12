/**
 * Route Handler GET per il login via magic link.
 *
 * URL: /login/magic?token=xxx
 *
 * Questo è un Route Handler (non una Page) perché DEVE poter modificare i cookies
 * della session NextAuth. Le Server Component Pages in Next.js 14 non possono
 * farlo e generano errore "Cookies can only be modified in a Server Action or
 * Route Handler".
 *
 * Flusso:
 *  1. Estrae token dalla query string
 *  2. consumeMagicLink() lo valida e lo marca come usato (single-use)
 *  3. Se valido → fa signIn() server-side col provider "magic" → redirect /dashboard
 *  4. Se invalido → redirect /login/magic/error?reason=...
 */

import { NextRequest, NextResponse } from "next/server";
import { consumeMagicLink } from "@/lib/magic-link";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/login/magic/error?reason=missing", req.url),
    );
  }

  const userId = await consumeMagicLink(token);
  if (!userId) {
    return NextResponse.redirect(
      new URL("/login/magic/error?reason=invalid", req.url),
    );
  }

  // Verifica che l'utente esista ancora
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.redirect(
      new URL("/login/magic/error?reason=invalid", req.url),
    );
  }

  // signIn imposta i cookies di session e fa redirect
  // È legittimo qui perché siamo in un Route Handler
  await signIn("magic", {
    userId: user.id,
    redirectTo: "/dashboard",
  });

  // Questa riga non viene mai raggiunta perché signIn fa redirect
  // ma la teniamo come safety net
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
