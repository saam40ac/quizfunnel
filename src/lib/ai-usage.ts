/**
 * Helper per loggare l'uso di Anthropic AI con costo stimato.
 *
 * Prezzi (al netto di sconti volumi) in USD per 1M token:
 *   - claude-sonnet-4-6: input $3.00 / output $15.00
 *
 * Convertiamo USD -> EUR con un cambio fisso conservativo (1 USD ≈ 0.93 EUR).
 * Il valore non è perfettamente preciso ma serve come stima ragionevole.
 */

import { prisma } from "@/lib/prisma";

const USD_PER_EUR = 0.93;

const PRICING: Record<string, { input: number; output: number }> = {
  // Prezzi per 1M token in USD
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-opus-4-7": { input: 15.0, output: 75.0 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0 },
};

export function estimateCostEur(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] || PRICING["claude-sonnet-4-6"];
  const usdCost = (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
  return Math.round(usdCost * USD_PER_EUR * 10000) / 10000; // 4 decimali
}

export async function logAIUsage(opts: {
  workspaceId?: string | null;
  operation: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  errorMessage?: string;
}) {
  try {
    await prisma.aIUsageLog.create({
      data: {
        workspaceId: opts.workspaceId ?? null,
        operation: opts.operation,
        model: opts.model,
        inputTokens: opts.inputTokens,
        outputTokens: opts.outputTokens,
        estimatedCostEur: estimateCostEur(opts.model, opts.inputTokens, opts.outputTokens),
        errorMessage: opts.errorMessage,
      },
    });
  } catch (e) {
    // Non blocchiamo il flusso applicativo se il log fallisce
    console.error("[logAIUsage] Failed to log AI usage:", e);
  }
}
