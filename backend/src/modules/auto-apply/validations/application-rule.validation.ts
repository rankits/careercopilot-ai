import { z } from 'zod';

/**
 * Deliberately does NOT expose `autopilotEnabled` — flipping that on has no
 * safe effect until Wave 6 (AJA-RULE-002) wires real autopilot enforcement
 * end-to-end. Exposing a toggle that does nothing yet would repeat the
 * Wave-1 "Daily Goal" mistake this program started by fixing. The pause
 * switch is still exposed now (`/pause`, `/resume`) since it's a real,
 * always-safe no-op-or-stop control regardless of what wave enforcement
 * lands in.
 */
export const UpsertApplicationRuleSchema = z.object({
  minMatchScore: z.number().min(0).max(1).optional(),
  dailyApplicationLimit: z.number().int().min(1).max(100).optional(),
  weeklyApplicationLimit: z.number().int().min(1).max(500).nullable().optional(),
  blacklistedCompanySlugs: z.array(z.string().trim().min(1).max(160)).max(500).optional(),
  excludedTitleKeywords: z.array(z.string().trim().min(1).max(120)).max(200).optional(),
  excludedSources: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
});

export type UpsertApplicationRuleInput = z.infer<typeof UpsertApplicationRuleSchema>;
