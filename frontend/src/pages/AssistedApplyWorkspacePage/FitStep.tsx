import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useApplicationReadiness } from '@/features/auto-apply/hooks/useApplicationReadiness';
import { useLatestJobAnalysis } from '@/features/auto-apply/hooks/useJobPageAnalysis';

import type { ApplicationReadinessReasonDto } from '@/features/auto-apply/types/autoApply.types';
import {
  Alert,
  Box,
  CircularProgress,
  MuiButton,
  Stack,
  Tooltip,
  Typography,
} from '@/lib/material';
import { trackEvent } from '@/shared/analytics/trackEvent';

import { assistedApplyTouchTargetSx, WorkspaceStickyActions } from './WorkspaceStickyActions';
import {
  destinationToSetupHref,
  resolveReadinessFixActions,
} from '@/pages/AutoApplyPage/missingFieldNavigation';

/** Warning codes that belong in the neutral "Unknown" section, not "Worth reviewing". */
const UNKNOWN_REASON_CODES = new Set([
  'SPONSORSHIP_UNKNOWN_COMPATIBILITY',
  'ANALYSIS_UNAVAILABLE',
  'MATCH_SCORE_MISSING',
]);

const FORM_NOT_INSPECTED_UNKNOWN =
  "We haven't inspected the employer's application form itself — you'll fill that out after handoff.";

function sectionTone(kind: 'block' | 'warn' | 'unknown') {
  if (kind === 'block') return { borderColor: 'error.light', bgcolor: 'error.50' };
  if (kind === 'warn') return { borderColor: 'warning.light', bgcolor: 'warning.50' };
  return { borderColor: 'divider', bgcolor: 'action.hover' };
}

function ReasonList({
  title,
  reasons,
  kind,
  showFixSetup,
}: {
  title: string;
  reasons: ApplicationReadinessReasonDto[];
  kind: 'block' | 'warn' | 'unknown';
  showFixSetup?: boolean;
}) {
  if (reasons.length === 0) return null;
  const tone = sectionTone(kind);

  return (
    <Box
      sx={{
        border: 1,
        borderColor: tone.borderColor,
        borderRadius: 1,
        p: 2,
        bgcolor: tone.bgcolor,
      }}
    >
      <Typography fontWeight={600} sx={{ mb: 1 }} variant="subtitle2">
        {title}
      </Typography>
      <Stack spacing={1.5}>
        {reasons.map((reason) => {
          const fix =
            showFixSetup && kind === 'block'
              ? resolveReadinessFixActions([reason])[0]
              : undefined;
          const href = fix ? destinationToSetupHref(fix.destination) : null;
          return (
            <Box key={`${reason.code}-${reason.field ?? ''}`}>
              <Typography variant="body2">{reason.message}</Typography>
              {href ? (
                <MuiButton
                  component={RouterLink}
                  size="small"
                  sx={{ mt: 0.5 }}
                  to={href}
                  variant="outlined"
                >
                  Fix setup
                </MuiButton>
              ) : null}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

export interface FitStepProps {
  jobId: string;
  jobApplicationId: string;
  onContinue: () => void;
}

export function FitStep({ jobId, jobApplicationId, onContinue }: FitStepProps) {
  const readinessQuery = useApplicationReadiness(jobId, 'HANDOFF', jobApplicationId);
  const analysisQuery = useLatestJobAnalysis(jobId);

  useEffect(() => {
    const data = readinessQuery.data;
    if (!data) return;
    const advisory = data.warnings.filter((r) => !UNKNOWN_REASON_CODES.has(r.code));
    const unknownFromApi = data.warnings.filter((r) => UNKNOWN_REASON_CODES.has(r.code));
    const formNotInspected =
      !analysisQuery.data || analysisQuery.data.formStatus === 'NOT_INSPECTED';
    const unknownCount = unknownFromApi.length + (formNotInspected ? 1 : 0);
    trackEvent('fit_panel_viewed', {
      job_id: jobId,
      blocking_count: data.blockingReasons.length,
      warning_count: advisory.length,
      unknown_count: unknownCount,
    });
  }, [jobId, readinessQuery.data, analysisQuery.data]);

  if (readinessQuery.isLoading) {
    return (
      <Stack alignItems="center" direction="row" spacing={1.5} sx={{ py: 3 }}>
        <CircularProgress aria-label="Loading fit" size={22} />
        <Typography>Checking fit…</Typography>
      </Stack>
    );
  }

  if (readinessQuery.isError || !readinessQuery.data) {
    return (
      <Alert
        action={
          <MuiButton onClick={() => void readinessQuery.refetch()} size="small">
            Retry
          </MuiButton>
        }
        severity="error"
      >
        We couldn&apos;t load fit details for this job.
      </Alert>
    );
  }

  const { blockingReasons, warnings } = readinessQuery.data;
  const advisory = warnings.filter((r) => !UNKNOWN_REASON_CODES.has(r.code));
  const unknownFromApi = warnings.filter((r) => UNKNOWN_REASON_CODES.has(r.code));

  const formNotInspected =
    !analysisQuery.data || analysisQuery.data.formStatus === 'NOT_INSPECTED';
  const unknownEntries: ApplicationReadinessReasonDto[] = [
    ...unknownFromApi,
    ...(formNotInspected
      ? [
          {
            code: 'FORM_NOT_INSPECTED',
            message: FORM_NOT_INSPECTED_UNKNOWN,
            severity: 'WARNING' as const,
          },
        ]
      : []),
  ];

  const allClear =
    blockingReasons.length === 0 && advisory.length === 0 && unknownEntries.length === 0;
  const continueDisabled = blockingReasons.length > 0;

  return (
    <Stack spacing={2}>
      {allClear ? (
        <Alert severity="success">No fit concerns found.</Alert>
      ) : (
        <>
          <ReasonList
            kind="block"
            reasons={blockingReasons}
            showFixSetup
            title="Blocks you"
          />
          <ReasonList kind="warn" reasons={advisory} title="Worth reviewing" />
          <ReasonList kind="unknown" reasons={unknownEntries} title="Unknown" />
        </>
      )}

      <WorkspaceStickyActions>
        {continueDisabled ? (
          <Tooltip title="Resolve the items above to continue.">
            <span>
              <MuiButton disabled sx={assistedApplyTouchTargetSx} variant="contained">
                Continue
              </MuiButton>
            </span>
          </Tooltip>
        ) : (
          <MuiButton onClick={onContinue} sx={assistedApplyTouchTargetSx} variant="contained">
            Continue
          </MuiButton>
        )}
      </WorkspaceStickyActions>
    </Stack>
  );
}
