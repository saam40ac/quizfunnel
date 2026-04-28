import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@quizfunnel.app";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe!2026";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`Admin già presente: ${adminEmail}`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const workspace = await prisma.workspace.create({
    data: {
      name: "QuizFunnel HQ",
      slug: "hq",
      plan: "BUSINESS",
    },
  });

  await prisma.user.create({
    data: {
      email: adminEmail,
      name: "Super Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      workspaceId: workspace.id,
    },
  });

  console.log(`✅ Super admin creato: ${adminEmail} / ${adminPassword}`);
  console.log(`   Cambia la password dopo il primo accesso.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
