import { useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useCreatePlan } from '@/features/auto-apply/hooks/usePlan';
import {
  useApproveSubmission,
  useConfirmSubmission,
  useInitiateSubmission,
  useQueueSubmission,
  useRetrySubmission,
  useSubmissions,
  useWithdrawSubmission,
} from '@/features/auto-apply/hooks/useSubmissions';

import type {
  ApplicationPlanResult,
  JobApplicationDto,
} from '@/features/auto-apply/types/autoApply.types';
import { Alert, Box, Chip, CircularProgress, Paper, TextField, Typography } from '@/lib/material';

const DECISION_COLOR: Record<
  ApplicationPlanResult['decision'],
  'success' | 'warning' | 'error' | 'default'
> = {
  READY_FOR_REVIEW: 'success',
  INFORMATION_REQUIRED: 'warning',
  UNSUPPORTED_CHANNEL: 'default',
  NOT_ELIGIBLE: 'error',
};

function StatusChip({ status }: { status: JobApplicationDto['status'] }) {
  const color =
    status === 'READY_FOR_REVIEW' || status === 'SUBMITTED' || status === 'CONFIRMATION_RECEIVED'
      ? 'success'
      : status === 'NOT_ELIGIBLE' || status === 'SUBMISSION_FAILED'
        ? 'error'
        : status === 'WITHDRAWN'
          ? 'default'
          : 'warning';
  return <Chip color={color} label={status.replace(/_/g, ' ')} size="small" />;
}

function PlanPanel({ plan }: { plan: ApplicationPlanResult }) {
  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography fontWeight={600} variant="body2">
          Plan decision:
        </Typography>
        <Chip
          color={DECISION_COLOR[plan.decision]}
          label={plan.decision.replace(/_/g, ' ')}
          size="small"
        />
        <Typography color="text.secondary" variant="body2">
          Channel: {plan.channel.replace(/_/g, ' ')}
        </Typography>
      </Box>

      {plan.selectedResumeVersion && (
        <Typography variant="body2">Resume: {plan.selectedResumeVersion.label}</Typography>
      )}

      {plan.unresolvedQuestions.length > 0 && (
        <Typography color="warning.main" variant="body2">
          Unresolved answers needed: {plan.unresolvedQuestions.join(', ')}
        </Typography>
      )}

      {!plan.contentGenerationAvailable && (
        <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="caption">
          AI-generated cover letter / screening answers are not available yet.
        </Typography>
      )}

      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {plan.eligibility.checks.map((check) => (
          <Typography
            color={check.status === 'FAILED' ? 'error.main' : 'text.secondary'}
            key={check.check}
            variant="caption"
          >
            {check.check}: {check.status}
            {check.reason ? ` — ${check.reason}` : ''}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

const TERMINAL_STATUSES: JobApplicationDto['status'][] = [
  'WITHDRAWN',
  'SUBMITTED',
  'CONFIRMATION_RECEIVED',
];

function SubmissionRow({ submission }: { submission: JobApplicationDto }) {
  const createPlan = useCreatePlan();
  const approveSubmission = useApproveSubmission();
  const queueSubmission = useQueueSubmission();
  const confirmSubmission = useConfirmSubmission();
  const retrySubmission = useRetrySubmission();
  const withdrawSubmission = useWithdrawSubmission();
  const { showToast } = useToast();
  const [plan, setPlan] = useState<ApplicationPlanResult | null>(null);

  const runAction = async (
    action: () => Promise<unknown>,
    successMessage: string,
    fallbackMessage: string,
  ) => {
    try {
      await action();
      showToast({ message: successMessage, severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : fallbackMessage,
        severity: 'error',
      });
    }
  };

  const handleGeneratePlan = async () => {
    if (!submission.jobId) return;
    try {
      const result = await createPlan.mutateAsync(submission.jobId);
      setPlan(result);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to generate a plan for this job.',
        severity: 'error',
      });
    }
  };

  const isProcessing = submission.status === 'QUEUED' || submission.status === 'SUBMITTING';
  const isTerminal = TERMINAL_STATUSES.includes(submission.status);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography fontWeight={600} variant="body2">
            {submission.jobTitle ?? 'Untitled job'}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {submission.companySlug ?? 'Unknown company'}
          </Typography>
        </Box>
        <StatusChip status={submission.status} />

        {submission.status === 'READY_FOR_REVIEW' && (
          <Button
            isLoading={approveSubmission.isPending}
            onClick={() =>
              void runAction(
                () => approveSubmission.mutateAsync(submission.id),
                'Submission approved.',
                'Unable to approve this submission.',
              )
            }
            size="small"
          >
            Approve
          </Button>
        )}

        {submission.status === 'APPROVED' && (
          <Button
            isLoading={queueSubmission.isPending}
            onClick={() =>
              void runAction(
                () => queueSubmission.mutateAsync(submission.id),
                'Submission queued.',
                'Unable to queue this submission.',
              )
            }
            size="small"
          >
            Queue for submission
          </Button>
        )}

        {isProcessing && (
          <Typography color="text.secondary" variant="caption">
            Processing…
          </Typography>
        )}

        {submission.status === 'ACTION_REQUIRED' && (
          <>
            {submission.externalConfirmationUrl && (
              <Button
                aria-label="Open application (opens in a new tab)"
                component="a"
                href={submission.externalConfirmationUrl}
                rel="noopener noreferrer"
                size="small"
                target="_blank"
                variant="outline"
              >
                Open application
              </Button>
            )}
            <Button
              isLoading={confirmSubmission.isPending}
              onClick={() =>
                void runAction(
                  () => confirmSubmission.mutateAsync(submission.id),
                  "Marked as submitted — we'll track any recruiter response.",
                  'Unable to confirm this submission.',
                )
              }
              size="small"
            >
              I&apos;ve applied
            </Button>
          </>
        )}

        {submission.status === 'SUBMISSION_FAILED' && (
          <Button
            isLoading={retrySubmission.isPending}
            onClick={() =>
              void runAction(
                () => retrySubmission.mutateAsync(submission.id),
                'Submission re-queued for retry.',
                'This submission cannot be retried automatically.',
              )
            }
            size="small"
            variant="outline"
          >
            Retry
          </Button>
        )}

        {!isTerminal && (
          <Button
            isLoading={createPlan.isPending}
            onClick={() => void handleGeneratePlan()}
            size="small"
            variant="outline"
          >
            {submission.status === 'DISCOVERED' ? 'Generate plan' : 'Refresh plan'}
          </Button>
        )}

        {!isTerminal && (
          <Button
            isLoading={withdrawSubmission.isPending}
            onClick={() =>
              void runAction(
                () => withdrawSubmission.mutateAsync(submission.id),
                'Submission withdrawn.',
                'Unable to withdraw this submission.',
              )
            }
            size="small"
            tone="danger"
            variant="outline"
          >
            Withdraw
          </Button>
        )}
      </Box>

      {submission.status === 'SUBMISSION_FAILED' && submission.failureMessage && (
        <Typography color="error.main" sx={{ mt: 1 }} variant="caption">
          {submission.failureMessage}
        </Typography>
      )}

      {plan && <PlanPanel plan={plan} />}
    </Box>
  );
}

export function SubmissionsTab() {
  const { data: submissions, isLoading } = useSubmissions();
  const initiateSubmission = useInitiateSubmission();
  const { showToast } = useToast();
  const [jobId, setJobId] = useState('');

  const handleTrack = async () => {
    try {
      const result = await initiateSubmission.mutateAsync(jobId.trim());
      setJobId('');
      if (result.possibleDuplicates.length > 0) {
        showToast({
          message:
            'Tracking started — a possible duplicate was detected, review your submissions list.',
          severity: 'warning',
        });
      } else {
        showToast({ message: 'Now tracking this job for auto-apply.', severity: 'success' });
      }
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to start tracking this job.',
        severity: 'error',
      });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 820 }}>
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }} variant="outlined">
        <Typography variant="h6">Track a job for auto-apply</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            helperText="From the job feed / job detail page URL"
            label="Job ID"
            onChange={(event) => setJobId(event.target.value)}
            value={jobId}
          />
          <Button
            disabled={!jobId.trim()}
            isLoading={initiateSubmission.isPending}
            onClick={() => void handleTrack()}
            sx={{ alignSelf: 'flex-start' }}
          >
            Track
          </Button>
        </Box>
      </Paper>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : !submissions || submissions.length === 0 ? (
        <Alert severity="info">No jobs tracked yet.</Alert>
      ) : (
        <Paper variant="outlined">
          {submissions.map((submission, index) => (
            <Box
              key={submission.id}
              sx={{ borderTop: index === 0 ? 'none' : '1px solid', borderColor: 'divider' }}
            >
              <SubmissionRow submission={submission} />
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}
