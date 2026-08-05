import { useEffect, useMemo } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';

import { useConsents } from '@/features/auto-apply/hooks/useConsents';
import { useResumeVersions } from '@/features/auto-apply/hooks/useResumeVersions';
import { useResumeAnalysis } from '@/features/auto-apply/hooks/useResumeHandoff';
import { buildImproveResumeHref } from '@/features/auto-apply/utils/returnToNavigation';
import { ROUTES } from '@/constants/routes';
import {
  Alert,
  Box,
  CircularProgress,
  MuiButton,
  Stack,
  Typography,
} from '@/lib/material';
import { trackEvent } from '@/shared/analytics/trackEvent';

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
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
      <Typography fontWeight={600} sx={{ mb: 0.75 }} variant="subtitle2">
        {title}
      </Typography>
      {items.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          {emptyLabel}
        </Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          {items.map((item) => (
            <Typography component="li" key={item} variant="body2">
              {item}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}

export interface ResumeAnalysisStepProps {
  jobApplicationId: string;
  selectedResumeVersionId: string | null;
  onSelectAnother: () => void;
  onContinue: () => void;
  continuePending?: boolean;
  continueError?: string | null;
}

export function ResumeAnalysisStep({
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

  useEffect(() => {
    if (!returnedSaved) return;
    // Clear the one-shot flag after the forced fetch is kicked off
    const next = new URLSearchParams(searchParams);
    next.delete('resumeReturned');
    setSearchParams(next, { replace: true });
  }, [returnedSaved, searchParams, setSearchParams]);

  useEffect(() => {
    const analysis = analysisQuery.data;
    if (!analysis) return;
    const degraded = analysis.confidence === 'LOW' || analysis.strengths.length === 0;
    trackEvent(degraded ? 'resume_analysis_degraded' : 'resume_analysis_viewed', {
      job_application_id: jobApplicationId,
      confidence: analysis.confidence,
      cached: Boolean(analysis.cached),
    });
  }, [analysisQuery.data, jobApplicationId]);

  const hasResumeConsent =
    consentsQuery.data?.some(
      (c) => c.consentType === 'RESUME_USAGE' && !c.revokedAt,
    ) ?? false;

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
            size="small"
            to={`${ROUTES.AUTO_APPLY}?section=consents`}
            variant="outlined"
          >
            Grant in Setup
          </MuiButton>
        }
        severity="warning"
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
      <Stack alignItems="center" direction="row" spacing={1.5} sx={{ py: 2 }}>
        <CircularProgress aria-label="Comparing resume" size={20} />
        <Typography>Comparing your resume to this job…</Typography>
      </Stack>
    );
  }

  const analysis = analysisQuery.data;
  const degraded = analysis?.degraded || analysisQuery.isError;

  return (
    <Stack spacing={2}>
      <Alert severity="info">Suggestions — review carefully</Alert>

      {degraded ? (
        <Alert severity="warning">We couldn&apos;t generate detailed suggestions this time.</Alert>
      ) : null}

      {analysis && !degraded ? (
        <>
          <Typography color="text.secondary" variant="body2">
            Confidence:{' '}
            {analysis.confidence === 'HIGH'
              ? 'High confidence'
              : analysis.confidence === 'LOW'
                ? 'Low confidence'
                : 'Medium confidence'}
          </Typography>
          <CategoryCard emptyLabel="None noted." items={analysis.strengths} title="Strengths" />
          <CategoryCard emptyLabel="None noted." items={analysis.concerns} title="Concerns" />
          <CategoryCard
            emptyLabel="None noted."
            items={analysis.missingEvidence}
            title="Missing evidence"
          />
          <CategoryCard emptyLabel="None noted." items={analysis.unknowns} title="Unknowns" />
        </>
      ) : null}

      {continueError ? <Alert severity="error">{continueError}</Alert> : null}

      <WorkspaceStickyActions>
        <Stack direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" spacing={1}>
          <MuiButton
            component={RouterLink}
            disabled={!selectedVersion}
            sx={assistedApplyTouchTargetSx}
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
          <MuiButton onClick={onSelectAnother} sx={assistedApplyTouchTargetSx} variant="outlined">
            Select another resume
          </MuiButton>
          <MuiButton
            disabled={continuePending}
            onClick={onContinue}
            sx={assistedApplyTouchTargetSx}
            variant="contained"
          >
            {continuePending ? 'Continuing…' : 'Continue with this resume'}
          </MuiButton>
        </Stack>
      </WorkspaceStickyActions>
    </Stack>
  );
}
