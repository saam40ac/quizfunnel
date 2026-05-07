/**
 * Configurazione dei prodotti/tag Systeme.io per il pagamento dei piani.
 *
 * Questi sono i NOMI ESATTI dei tag che dovrai creare su Systeme.io.
 * Ogni tag corrisponde a un piano. Quando l'utente paga su Systeme.io,
 * viene aggiunto il tag → il webhook ci avvisa → noi facciamo upgrade.
 */

import type { Plan } from "./plans";

export type BillingTagConfig = {
  /** Tag da applicare su Systeme.io quando il pagamento è andato a buon fine */
  activeTag: string;
  /** Tag opzionale per cancellazioni esplicite */
  cancelledTag?: string;
  /** URL diretto all'order form/checkout di Systeme.io */
  checkoutUrl: string;
};

/**
 * Mapping piano → tag Systeme.io.
 * IMPORTANTE: questi tag DEVONO esistere identici su Systeme.io.
 *
 * Per personalizzare i checkoutUrl, modifica via env var SYSTEME_CHECKOUT_PRO / BUSINESS
 * oppure cambia direttamente qui (più semplice).
 */
export const BILLING_TAGS: Record<Exclude<Plan, "FREE">, BillingTagConfig> = {
  PRO: {
    activeTag: "quizfunnel-pro-active",
    cancelledTag: "quizfunnel-pro-cancelled",
    checkoutUrl:
      process.env.NEXT_PUBLIC_SYSTEME_CHECKOUT_PRO ||
      "https://checkout.systeme.io/quizfunnel-pro",
  },
  BUSINESS: {
    activeTag: "quizfunnel-business-active",
    cancelledTag: "quizfunnel-business-cancelled",
    checkoutUrl:
      process.env.NEXT_PUBLIC_SYSTEME_CHECKOUT_BUSINESS ||
      "https://checkout.systeme.io/quizfunnel-business",
  },
};

/**
 * Risolve il piano associato a un tag Systeme.io.
 * Ritorna il piano se il tag è di "attivazione", null altrimenti.
 */
export function planFromActiveTag(tagName: string): Plan | null {
  const cleaned = tagName.trim().toLowerCase();
  for (const [plan, cfg] of Object.entries(BILLING_TAGS)) {
    if (cfg.activeTag.toLowerCase() === cleaned) return plan as Plan;
  }
  return null;
}

/**
 * Verifica se un tag è di "cancellazione".
 * Ritorna il piano cancellato, null se non è un tag di cancellazione.
 */
export function planFromCancelledTag(tagName: string): Plan | null {
  const cleaned = tagName.trim().toLowerCase();
  for (const [plan, cfg] of Object.entries(BILLING_TAGS)) {
    if (cfg.cancelledTag?.toLowerCase() === cleaned) return plan as Plan;
  }
  return null;
}
