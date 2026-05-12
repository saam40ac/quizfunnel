import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    // ============================================================
    // Provider classico: email + password
    // ============================================================
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: String(creds.email).toLowerCase() },
        });
        // Importante: utenti creati via auto-signup possono avere passwordHash=null
        // e devono entrare solo via magic link. Qui rifiutiamo il login.
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(String(creds.password), user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          workspaceId: user.workspaceId ?? undefined,
        } as any;
      },
    }),

    // ============================================================
    // Provider magic link: login senza password.
    // Accetta solo userId. Il token è stato già validato server-side
    // dalla pagina /login/magic/page.tsx prima di chiamare signIn.
    // ============================================================
    Credentials({
      id: "magic",
      name: "magic",
      credentials: {
        userId: { label: "User ID", type: "text" },
      },
      async authorize(creds) {
        const userId = String(creds?.userId || "");
        if (!userId) return null;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          workspaceId: user.workspaceId ?? undefined,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.workspaceId = (user as any).workspaceId;
        token.uid = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = token.uid;
      (session.user as any).role = token.role;
      (session.user as any).workspaceId = token.workspaceId;
      return session;
    },
  },
});
