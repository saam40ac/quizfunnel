import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: "SUPER_ADMIN" | "OWNER" | "MEMBER";
      workspaceId?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: "SUPER_ADMIN" | "OWNER" | "MEMBER";
    workspaceId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: string;
    workspaceId?: string | null;
  }
}
