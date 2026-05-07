/**
 * Helper per calcolare analytics globali della piattaforma.
 * Usato nella dashboard Super Admin.
 */

import { prisma } from "@/lib/prisma";
import { PLANS, type Plan } from "@/lib/plans";

export type GlobalAnalytics = {
  // Conteggi totali
  totalUsers: number;
  totalWorkspaces: number;
  totalQuizzes: number;
  totalLeads: number;
  // Distribuzione utenti per piano
  usersByPlan: Record<Plan, number>;
  // MRR (Monthly Recurring Revenue) in euro
  mrr: number;
  // Active subscriptions
  activeSubscriptions: number;
  // Crescita ultimi 30 giorni
  newUsersLast30d: number;
  newQuizzesLast30d: number;
  newLeadsLast30d: number;
  // Activity
  activeUsersLast7d: number;  // Login negli ultimi 7 giorni (se tracciato)
  // Conversion rate FREE -> paid
  conversionRate: number; // 0-1
  // Costi AI nel mese corrente
  aiCostThisMonth: number;
};

export async function getGlobalAnalytics(): Promise<GlobalAnalytics> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    workspaces,
    totalQuizzes,
    totalLeads,
    activeSubscriptions,
    newUsersLast30d,
    newQuizzesLast30d,
    newLeadsLast30d,
    aiLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.workspace.findMany({ select: { plan: true } }),
    prisma.quiz.count(),
    prisma.lead.count(),
    prisma.subscription.findMany({
      where: { status: "active" },
      select: { plan: true },
    }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.quiz.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.lead.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.aIUsageLog.findMany({
      where: { createdAt: { gte: startOfMonth } },
      select: { estimatedCostEur: true },
    }),
  ]);

  // Distribuzione per piano
  const usersByPlan: Record<Plan, number> = {
    FREE: 0,
    PRO: 0,
    BUSINESS: 0,
  };
  for (const ws of workspaces) {
    usersByPlan[ws.plan as Plan] = (usersByPlan[ws.plan as Plan] || 0) + 1;
  }

  // MRR: somma prezzi delle subscription attive
  let mrr = 0;
  for (const sub of activeSubscriptions) {
    const price = PLANS[sub.plan as Plan]?.priceEurMonth || 0;
    mrr += price;
  }

  // Conversion rate: paid / total
  const paidCount = (usersByPlan.PRO || 0) + (usersByPlan.BUSINESS || 0);
  const conversionRate = workspaces.length > 0 ? paidCount / workspaces.length : 0;

  // AI cost mese corrente
  const aiCostThisMonth = aiLogs.reduce((sum, l) => sum + l.estimatedCostEur, 0);

  return {
    totalUsers,
    totalWorkspaces: workspaces.length,
    totalQuizzes,
    totalLeads,
    usersByPlan,
    mrr,
    activeSubscriptions: activeSubscriptions.length,
    newUsersLast30d,
    newQuizzesLast30d,
    newLeadsLast30d,
    activeUsersLast7d: 0, // Da implementare se tracciamo login
    conversionRate,
    aiCostThisMonth,
  };
}

/**
 * Statistiche su un singolo workspace per la vista dettaglio.
 */
export async function getWorkspaceDetails(workspaceId: string) {
  const [
    workspace,
    users,
    quizzes,
    leadsTotal,
    subscriptions,
    webhookEvents,
    aiLogs,
  ] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId } }),
    prisma.user.findMany({ where: { workspaceId } }),
    prisma.quiz.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { leads: true, questions: true } } },
    }),
    prisma.lead.count({ where: { quiz: { workspaceId } } }),
    prisma.subscription.findMany({
      where: { workspaceId },
      orderBy: { startedAt: "desc" },
    }),
    prisma.webhookEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.aIUsageLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const aiCostTotal = aiLogs.reduce((sum, l) => sum + l.estimatedCostEur, 0);

  return {
    workspace,
    users,
    quizzes,
    leadsTotal,
    subscriptions,
    webhookEvents,
    aiLogs,
    aiCostTotal,
  };
}
