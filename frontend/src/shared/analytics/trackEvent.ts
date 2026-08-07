/**
 * Phase 1 product analytics (AA-083).
 * Fail-open: never throw into the user journey.
 * Pluggable sink; default is a debug/dev console + in-memory ring buffer.
 */

export type AssistedApplyAnalyticsEvent =
  | 'assisted_apply_cta_clicked'
  | 'assisted_apply_started'
  | 'workspace_step_viewed'
  | 'job_analysis_viewed'
  | 'job_analysis_failed'
  | 'job_analysis_reanalyzed'
  | 'fit_panel_viewed'
  | 'resume_analysis_viewed'
  | 'resume_analysis_degraded'
  | 'handoff_opened'
  | 'handoff_blocked'
  | 'popup_blocked'
  | 'mark_applied'
  | 'mark_applied_failed'
  | 'application_abandoned'
  | 'return_later_clicked'
  | 'broken_link_reported'
  | 'could_not_apply_clicked';

/** Structural identifiers only — never free-text notes, resume, or answer content. */
const FORBIDDEN_PROPERTY_KEYS = new Set([
  'notes',
  'note',
  'appliedNotes',
  'abandonNote',
  'resumeText',
  'resumeContent',
  'coverLetter',
  'answer',
  'answers',
  'message',
  'reasonText',
  'sourceText',
  'phone',
  'address',
  'email',
  'fullName',
  'content',
]);

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export interface TrackedEvent {
  event: AssistedApplyAnalyticsEvent;
  properties: Record<string, string | number | boolean | null>;
  at: string;
}

const DEBUG_BUFFER_MAX = 100;
const debugBuffer: TrackedEvent[] = [];

type AnalyticsSink = (
  event: AssistedApplyAnalyticsEvent,
  properties: Record<string, string | number | boolean | null>,
) => void;

let sink: AnalyticsSink = (event, properties) => {
  if (import.meta.env.DEV || import.meta.env.VITE_ASSISTED_APPLY_ANALYTICS_DEBUG === 'true') {
    console.debug('[assisted-apply:analytics]', event, properties);
  }
};

export function setAnalyticsSink(next: AnalyticsSink | null): void {
  sink =
    next ??
    ((event, properties) => {
      if (import.meta.env.DEV || import.meta.env.VITE_ASSISTED_APPLY_ANALYTICS_DEBUG === 'true') {
        console.debug('[assisted-apply:analytics]', event, properties);
      }
    });
}

export function getAnalyticsDebugBuffer(): readonly TrackedEvent[] {
  return debugBuffer;
}

export function clearAnalyticsDebugBuffer(): void {
  debugBuffer.length = 0;
}

function sanitizeProperties(
  properties: AnalyticsProperties | undefined,
): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  if (!properties) return out;
  for (const [key, value] of Object.entries(properties)) {
    if (FORBIDDEN_PROPERTY_KEYS.has(key)) continue;
    if (value === undefined) continue;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      out[key] = value;
    }
  }
  return out;
}

export function trackEvent(
  event: AssistedApplyAnalyticsEvent,
  properties?: AnalyticsProperties,
): void {
  try {
    const sanitized = sanitizeProperties(properties);
    const entry: TrackedEvent = {
      event,
      properties: sanitized,
      at: new Date().toISOString(),
    };
    debugBuffer.push(entry);
    if (debugBuffer.length > DEBUG_BUFFER_MAX) {
      debugBuffer.shift();
    }
    sink(event, sanitized);
  } catch {
    // Fail open — analytics must never break the journey.
  }
}

/** Exported for unit tests */
export const __analyticsTestUtils = {
  FORBIDDEN_PROPERTY_KEYS,
  sanitizeProperties,
};
