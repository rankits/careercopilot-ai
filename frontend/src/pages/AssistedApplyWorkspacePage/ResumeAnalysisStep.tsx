import { useEffect, useMemo } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';

import { useConsents } from '@/features/auto-apply/hooks/useConsents';
import { useLatestJobAnalysis } from '@/features/auto-apply/hooks/useJobPageAnalysis';
import { useResumeAnalysis } from '@/features/auto-apply/hooks/useResumeHandoff';
import { useResumeVersions } from '@/features/auto-apply/hooks/useResumeVersions';

import { ROUTES } from '@/constants/routes';
import { buildImproveResumeHref } from '@/features/auto-apply/utils/returnToNavigation';
import { Alert, Box, Chip, CircularProgress, MuiButton, Stack, Typography } from '@/lib/material';
import { trackEvent } from '@/shared/analytics/trackEvent';

import { assistedApplyWorkspaceSx } from './styles';
import { assistedApplyTouchTargetSx, WorkspaceStickyActions } from './WorkspaceStickyActions';

function CategoryCard({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, minWidth: 0, p: 1.5 }}>
      <Typography fontWeight={600} sx={{ mb: 0.75 }} variant="subtitle2">
        {title}
      </Typography>
      {items.length === 0 ? (
        <Typography
          color="text.secondary"
          sx={assistedApplyWorkspaceSx.overflowWrap}
          variant="body2"
        >
          {emptyLabel}
        </Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          {items.map((item) => (
            <Typography
              component="li"
              key={item}
              sx={assistedApplyWorkspaceSx.overflowWrap}
              variant="body2"
            >
              {item}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}

export interface ResumeAnalysisStepProps {
  jobId: string;
  jobApplicationId: string;
  selectedResumeVersionId: string | null;
  onSelectAnother: () => void;
  onContinue: () => void;
  continuePending?: boolean;
  continueError?: string | null;
}

export function ResumeAnalysisStep({
  jobId,
  jobApplicationId,
  selectedResumeVersionId,
  onSelectAnother,
  onContinue,
  continuePending,
  continueError,
}: ResumeAnalysisStepProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const consentsQuery = useConsents();
  const versionsQuery = useResumeVersions();
  const returnedSaved = searchParams.get('resumeReturned') === 'saved';

  const forceRefresh = returnedSaved;
  const analysisQuery = useResumeAnalysis(jobApplicationId, {
    enabled: Boolean(selectedResumeVersionId),
    forceRefresh,
  });

  const jobAnalysisQuery = useLatestJobAnalysis(jobId);
  const analysisLimited = jobAnalysisQuery.data?.status === 'LIMITED';
  const analysisFailed = jobAnalysisQuery.data?.status === 'FAILED';

  useEffect(() => {
    if (!returnedSaved) return;
    const next = new URLSearchParams(searchParams);
    next.delete('resumeReturned');
    setSearchParams(next, { replace: true });
  }, [returnedSaved, searchParams, setSearchParams]);

  useEffect(() => {
    const analysis = analysisQuery.data;
    if (!analysis) return;
    const degraded = analysis.confidence === 'LOW' || analysis.status === 'LIMITED';
    trackEvent(degraded ? 'resume_analysis_degraded' : 'resume_analysis_viewed', {
      job_application_id: jobApplicationId,
      confidence: analysis.confidence,
      cached: Boolean(analysis.cached),
      schema_version: analysis.schemaVersion ?? null,
    });
  }, [analysisQuery.data, jobApplicationId]);

  const hasResumeConsent =
    consentsQuery.data?.some((c) => c.consentType === 'RESUME_USAGE' && !c.revokedAt) ?? false;

  const selectedVersion = useMemo(
    () => versionsQuery.data?.find((v) => v.id === selectedResumeVersionId) ?? null,
    [versionsQuery.data, selectedResumeVersionId],
  );

  if (!hasResumeConsent) {
    return (
      <Alert
        action={
          <MuiButton
            component={RouterLink}
            fullWidth
            size="small"
            sx={assistedApplyWorkspaceSx.fullWidthMobileButton}
            to={`${ROUTES.AUTO_APPLY}?section=consents`}
            variant="outlined"
          >
            Grant in Setup
          </MuiButton>
        }
        severity="warning"
        sx={assistedApplyWorkspaceSx.alertWithAction}
      >
        Grant resume usage to select a resume for this application.
      </Alert>
    );
  }

  if (!selectedResumeVersionId) {
    return (
      <Typography color="text.secondary" variant="body2">
        Select a resume above to see fit suggestions.
      </Typography>
    );
  }

  if (analysisQuery.isLoading) {
    return (
      <Stack
        alignItems={{ sm: 'center' }}
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ py: 2, ...assistedApplyWorkspaceSx.stepRoot }}
      >
        <CircularProgress aria-label="Comparing resume" size={20} />
        <Typography sx={assistedApplyWorkspaceSx.overflowWrap}>
          Comparing your resume to this job…
        </Typography>
      </Stack>
    );
  }

  const analysis = analysisQuery.data;
  const degraded = analysis?.degraded || analysisQuery.isError;
  const limited = analysis?.status === 'LIMITED' || analysis?.confidence === 'LOW';
  const noRelevant =
    analysis?.warnings?.some((w) => w.code === 'NO_RESUME_RELEVANT_REQUIREMENTS') ||
    (analysis?.summary?.criteriaAnalyzed === 0 && !degraded);

  return (
    <Stack spacing={2} sx={assistedApplyWorkspaceSx.stepRoot}>
      {analysisLimited || analysisFailed ? (
        <Alert severity="warning">
          <strong>Resume selected based on general role alignment.</strong> Because the job posting
          analysis was {analysisLimited ? 'limited' : 'unsuccessful'}, no job-specific tailoring or
          detailed fit suggestions could be performed.
        </Alert>
      ) : (
        <>
          <Alert severity="info">
            Suggestions only — review carefully. Work authorization, location, and sponsorship are
            evaluated in Fit &amp; Eligibility, not in Resume Match.
          </Alert>

          {degraded ? (
            <Alert severity="warning">
              We couldn&apos;t generate detailed suggestions this time. You can still continue with
              this resume.
            </Alert>
          ) : null}

          {analysis && !degraded ? (
            <>
              <Stack alignItems="center" direction="row" flexWrap="wrap" spacing={1}>
                <Typography color="text.secondary" variant="body2">
                  Confidence:{' '}
                  {analysis.confidence === 'HIGH'
                    ? 'High'
                    : analysis.confidence === 'LOW'
                      ? 'Low'
                      : 'Medium'}
                </Typography>
                {analysis.overallAlignment != null ? (
                  <Chip
                    label={`Resume alignment ${Math.round(analysis.overallAlignment * 100)}%`}
                    size="small"
                    variant="outlined"
                  />
                ) : (
                  <Chip label="Alignment unavailable" size="small" variant="outlined" />
                )}
                {limited ? <Chip color="warning" label="Limited analysis" size="small" /> : null}
              </Stack>

              {noRelevant ? (
                <Alert severity="info">
                  We did not have enough resume-relevant job requirements to identify reliable
                  strengths.
                </Alert>
              ) : null}

              <CategoryCard
                emptyLabel={
                  noRelevant
                    ? 'We did not have enough resume-relevant job requirements to identify reliable strengths.'
                    : 'No confirmed strengths yet.'
                }
                items={analysis.strengths}
                title="Strengths"
              />
              <CategoryCard
                emptyLabel="No major concerns were identified."
                items={analysis.concerns}
                title="Concerns"
              />
              <CategoryCard
                emptyLabel="No missing evidence highlighted."
                items={analysis.missingEvidence}
                title="Missing evidence"
              />
              {analysis.unknowns.length > 0 ? (
                <CategoryCard emptyLabel="None." items={analysis.unknowns} title="Unknowns" />
              ) : null}
              {analysis.keywords?.matched?.length ? (
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                  <Typography fontWeight={600} sx={{ mb: 0.75 }} variant="subtitle2">
                    Matched keywords
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {analysis.keywords.matched.slice(0, 16).map((term) => (
                      <Chip key={term} label={term} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              ) : null}
            </>
          ) : null}
        </>
      )}

      {continueError ? <Alert severity="error">{continueError}</Alert> : null}

      <WorkspaceStickyActions>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          flexWrap="wrap"
          spacing={1.25}
          sx={assistedApplyWorkspaceSx.stackedActionButtons}
        >
          <MuiButton
            component={RouterLink}
            disabled={!selectedVersion}
            fullWidth
            sx={{
              ...assistedApplyTouchTargetSx,
              ...assistedApplyWorkspaceSx.fullWidthMobileButton,
            }}
            to={
              selectedVersion
                ? buildImproveResumeHref({
                    resumeId: selectedVersion.resumeId,
                    jobApplicationId,
                  })
                : '#'
            }
            variant="outlined"
          >
            Improve resume
          </MuiButton>
          <MuiButton
            fullWidth
            onClick={onSelectAnother}
            sx={{
              ...assistedApplyTouchTargetSx,
              ...assistedApplyWorkspaceSx.fullWidthMobileButton,
            }}
            variant="outlined"
          >
            Select another resume
          </MuiButton>
          <MuiButton
            disabled={continuePending}
            fullWidth
            onClick={onContinue}
            sx={{
              ...assistedApplyTouchTargetSx,
              ...assistedApplyWorkspaceSx.fullWidthMobileButton,
            }}
            variant="contained"
          >
            {continuePending ? 'Continuing…' : 'Continue with this resume'}
          </MuiButton>
        </Stack>
      </WorkspaceStickyActions>
    </Stack>
  );
}
