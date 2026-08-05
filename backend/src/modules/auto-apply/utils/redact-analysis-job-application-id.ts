import type { ApplicationPageAnalysisDto } from '@/modules/auto-apply/types/application-page-analysis.types.js';

/**
 * AA-012: shared job-page analysis may be cached across users, but
 * `jobApplicationId` is private to the user who triggered that run.
 * Null it out unless it matches the viewer's own application for this job.
 */
export function redactAnalysisJobApplicationId(
  analysis: ApplicationPageAnalysisDto,
  viewerJobApplicationId: string | null,
): ApplicationPageAnalysisDto {
  if (
    analysis.jobApplicationId &&
    viewerJobApplicationId &&
    analysis.jobApplicationId === viewerJobApplicationId
  ) {
    return analysis;
  }

  if (analysis.jobApplicationId == null) {
    return analysis;
  }

  return { ...analysis, jobApplicationId: null };
}
