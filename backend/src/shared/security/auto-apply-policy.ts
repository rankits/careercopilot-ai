/**
 * AJA-EXT-002 — hard, non-negotiable constraints for every current and
 * future Auto Apply channel adapter (external-redirect, email, ATS,
 * browser-assisted). These are not enforced by a generic runtime check —
 * there's no reliable way to detect "this code solves a CAPTCHA" from the
 * outside — they're the contract every adapter implementation and its code
 * review must uphold. See docs/auto-apply/wave-1-safety-and-decisions.md
 * for the full rationale.
 */
export const AUTO_APPLY_POLICY = {
  /** No adapter may attempt to solve, bypass, or work around a CAPTCHA,
   * MFA challenge, or anti-bot control on any third-party site. If a
   * channel requires this, that channel is not implementable — full stop,
   * not "implement carefully." */
  neverBypassCaptchaMfaOrAntiBot: true,

  /** No adapter or service may store a user's job-board or ATS username
   * and password. Authorized channels use OAuth (Gmail) or partner API
   * credentials scoped to Career Copilot itself — never the user's own
   * site login. */
  neverStoreJobBoardOrAtsCredentials: true,

  /** `ChannelDetectionService` (and any future channel classifier) must
   * never infer submission authorization from a URL or provider match
   * alone — e.g. detecting "greenhouse.io" in an apply URL does not mean
   * Career Copilot is authorized to submit through Greenhouse's API. Only
   * an explicit, registered `JobApplicationAdapter` for that channel
   * grants submission capability. */
  neverSubmitThroughAnUnauthorizedChannel: true,

  /** Demographic, disability, and veteran-status questions are never
   * auto-answered or auto-submitted, by any channel, under any consent —
   * enforced today at the data layer in
   * `constants/sensitive-question-keys.ts` (`PROHIBITED_QUESTION_KEYS`).
   * Restated here so it stays visible when a new channel is designed, not
   * only where it happens to already be implemented. */
  neverAutoSubmitSensitiveOrDemographicAnswers: true,
} as const;

export type AutoApplyPolicyKey = keyof typeof AUTO_APPLY_POLICY;
