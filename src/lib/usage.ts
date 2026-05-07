/**
 * Helper per calcolare l'utilizzo corrente di un workspace
 * (numero quiz, lead questo mese, ecc.) e per applicare i limiti.
 */

import { prisma } from "@/lib/prisma";
import { getLimits, type Plan, type PlanLimits } from "@/lib/plans";

export type WorkspaceUsage = {
  workspaceId: string;
  plan: Plan;
  limits: PlanLimits;
  // Stati attuali
  quizzesActive: number;
  leadsThisMonth: number;
  // Convenienze
  quizzesRemaining: number; // Infinity se illimitato
  leadsRemaining: number;
  isOverQuizLimit: boolean;
  isOverLeadLimit: boolean;
};

export async function getWorkspaceUsage(workspaceId: string): Promise<WorkspaceUsage> {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) throw new Error("Workspace non trovato");

  const plan = ws.plan as Plan;
  const limits = getLimits(plan);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [quizzesActive, leadsThisMonth] = await Promise.all([
    prisma.quiz.count({ where: { workspaceId } }),
    prisma.lead.count({
      where: {
        quiz: { workspaceId },
        syncedToSysteme: true,
        createdAt: { gte: startOfMonth },
      },
    }),
  ]);

  return {
    workspaceId,
    plan,
    limits,
    quizzesActive,
    leadsThisMonth,
    quizzesRemaining: Math.max(limits.maxQuizzes - quizzesActive, 0),
    leadsRemaining: Math.max(limits.maxLeadsPerMonth - leadsThisMonth, 0),
    isOverQuizLimit: quizzesActive >= limits.maxQuizzes,
    isOverLeadLimit: leadsThisMonth >= limits.maxLeadsPerMonth,
  };
}

/**
 * Errore esplicito se un'azione viola i limiti del piano.
 * Usalo nelle API endpoint per bloccare l'azione lato server.
 */
export class PlanLimitError extends Error {
  status = 402; // Payment Required
  code: string;
  upgradeTo: Plan;

  constructor(code: string, message: string, upgradeTo: Plan = "PRO") {
    super(message);
    this.code = code;
    this.upgradeTo = upgradeTo;
  }
}

/**
 * Restituisce gli ID dei quiz "extra" che sono in modalità lettura (soft-locked)
 * perché il piano corrente non li copre tutti.
 *
 * Ordinamento: i più recenti restano sbloccati, i più vecchi vengono bloccati.
 * Esempio: PRO (10 quiz) → FREE (1 quiz). Se ci sono 5 quiz, 1 resta attivo
 * (il più recente per data di aggiornamento) e 4 vengono bloccati.
 */
export async function getLockedQuizIds(workspaceId: string): Promise<Set<string>> {
  const usage = await getWorkspaceUsage(workspaceId);
  if (!usage.isOverQuizLimit) return new Set();

  const quizzes = await prisma.quiz.findMany({
    where: { workspaceId },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });

  // I primi N (entro il limite) sono attivi, gli altri sono bloccati
  const allowed = quizzes.slice(0, usage.limits.maxQuizzes).map((q) => q.id);
  const allowedSet = new Set(allowed);
  return new Set(quizzes.filter((q) => !allowedSet.has(q.id)).map((q) => q.id));
}

/**
 * Verifica se uno specifico quiz è in lettura per via di un soft-downgrade.
 */
export async function isQuizLocked(workspaceId: string, quizId: string): Promise<boolean> {
  const locked = await getLockedQuizIds(workspaceId);
  return locked.has(quizId);
}

export type LimitAction =
  | "create_quiz"
  | "generate_quiz_ai"
  | "generate_email_ai"
  | "upload_logo"
  | "set_custom_domain";

/**
 * Verifica se un'azione è permessa dal piano del workspace.
 * Lancia PlanLimitError se non lo è.
 */
export async function enforceLimit(workspaceId: string, action: LimitAction): Promise<void> {
  const usage = await getWorkspaceUsage(workspaceId);
  const { limits } = usage;

  switch (action) {
    case "create_quiz":
      if (usage.isOverQuizLimit) {
        throw new PlanLimitError(
          "MAX_QUIZZES",
          `Hai raggiunto il limite di ${limits.maxQuizzes} quiz del piano ${usage.plan}. Fai upgrade per crearne di più.`,
          usage.plan === "FREE" ? "PRO" : "BUSINESS",
        );
      }
      break;

    case "generate_quiz_ai":
      if (!limits.canGenerateQuizAI) {
        throw new PlanLimitError(
          "AI_QUIZ_LOCKED",
          `La generazione AI dei quiz è inclusa nei piani Pro e Business. Fai upgrade per sbloccarla.`,
          "PRO",
        );
      }
      break;

    case "generate_email_ai":
      if (!limits.canGenerateEmailAI) {
        throw new PlanLimitError(
          "AI_EMAIL_LOCKED",
          `La generazione AI delle email è inclusa nei piani Pro e Business.`,
          "PRO",
        );
      }
      break;

    case "upload_logo":
      if (!limits.canUploadLogo) {
        throw new PlanLimitError(
          "LOGO_LOCKED",
          `Il logo personalizzato è incluso nei piani Pro e Business.`,
          "PRO",
        );
      }
      break;

    case "set_custom_domain":
      if (!limits.canUseCustomDomain) {
        throw new PlanLimitError(
          "DOMAIN_LOCKED",
          `Il dominio personalizzato è incluso nel piano Business.`,
          "BUSINESS",
        );
      }
      break;
  }
}
