/**
 * Definizione dei limiti per ogni piano.
 *
 * Modifica questo file per cambiare cosa è incluso in FREE/PRO/BUSINESS.
 * Le altre parti dell'app leggono SEMPRE da qui — non hardcodare limiti altrove.
 *
 * `null` o `Infinity` significa "illimitato".
 */

export type Plan = "FREE" | "PRO" | "BUSINESS";

export type PlanLimits = {
  /** Numero massimo di quiz attivi che il workspace può avere */
  maxQuizzes: number;
  /** Lead massimi sincronizzati a Systeme.io ogni mese (oltre questi, salvati ma non sync) */
  maxLeadsPerMonth: number;
  /** Generazione di nuovi quiz tramite AI */
  canGenerateQuizAI: boolean;
  /** Generazione delle 3 email tramite AI */
  canGenerateEmailAI: boolean;
  /** Numero di versioni di sequenze email che si possono conservare */
  maxEmailVersions: number;
  /** Logo personalizzato (workspace + override per quiz) */
  canUploadLogo: boolean;
  /** Dominio personalizzato (es. quiz.tuodominio.it) */
  canUseCustomDomain: boolean;
};

export type PlanInfo = {
  name: string;
  tagline: string;
  priceEurMonth: number | null; // null = "Gratis"
  highlights: string[];
  limits: PlanLimits;
};

export const PLANS: Record<Plan, PlanInfo> = {
  FREE: {
    name: "Free",
    tagline: "Per provare la piattaforma",
    priceEurMonth: null,
    highlights: [
      "1 quiz attivo",
      "Fino a 50 lead/mese sincronizzati con Systeme.io",
      "Editor manuale di domande, risposte e fasce",
      "Pubblicazione su pagina pubblica e embed",
    ],
    limits: {
      maxQuizzes: 1,
      maxLeadsPerMonth: 50,
      canGenerateQuizAI: false,
      canGenerateEmailAI: false,
      maxEmailVersions: 1,
      canUploadLogo: false,
      canUseCustomDomain: false,
    },
  },
  PRO: {
    name: "Pro",
    tagline: "Per professionisti e creator",
    priceEurMonth: 29,
    highlights: [
      "10 quiz attivi",
      "5.000 lead/mese sincronizzati",
      "Generazione AI di quiz e di sequenze email",
      "Logo personalizzato del brand",
      "Fino a 5 versioni di sequenze email per quiz",
    ],
    limits: {
      maxQuizzes: 10,
      maxLeadsPerMonth: 5000,
      canGenerateQuizAI: true,
      canGenerateEmailAI: true,
      maxEmailVersions: 5,
      canUploadLogo: true,
      canUseCustomDomain: false,
    },
  },
  BUSINESS: {
    name: "Business",
    tagline: "Per agenzie e team",
    priceEurMonth: 79,
    highlights: [
      "Quiz illimitati",
      "Lead illimitati",
      "Tutto del piano Pro",
      "Dominio personalizzato (es. quiz.tuobrand.it)",
      "Fino a 10 versioni di sequenze email per quiz",
      "Supporto prioritario",
    ],
    limits: {
      maxQuizzes: Number.POSITIVE_INFINITY,
      maxLeadsPerMonth: Number.POSITIVE_INFINITY,
      canGenerateQuizAI: true,
      canGenerateEmailAI: true,
      maxEmailVersions: 10,
      canUploadLogo: true,
      canUseCustomDomain: true,
    },
  },
};

export function getLimits(plan: Plan): PlanLimits {
  return PLANS[plan]?.limits ?? PLANS.FREE.limits;
}

export function isUnlimited(value: number): boolean {
  return value === Number.POSITIVE_INFINITY;
}

export function formatLimit(value: number): string {
  return isUnlimited(value) ? "∞" : value.toLocaleString("it-IT");
}
