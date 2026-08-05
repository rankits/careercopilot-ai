import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useCandidateProfile } from '@/features/auto-apply/hooks/useCandidateProfile';
import { useConsents } from '@/features/auto-apply/hooks/useConsents';
import { loadSubmissionReview, useCreatePlan } from '@/features/auto-apply/hooks/usePlan';
import { useResumeVersions } from '@/features/auto-apply/hooks/useResumeVersions';
import {
  useApproveSubmission,
  useConfirmSubmission,
  useDeleteSubmission,
  useInitiateSubmission,
  useQueueSubmission,
  useReopenSubmission,
  useRetrySubmission,
  useSubmissions,
  useWithdrawSubmission,
} from '@/features/auto-apply/hooks/useSubmissions';

import type {
  ApplicationPageAnalysisSummary,
  ApplicationPlanResult,
  JobApplicationDto,
} from '@/features/auto-apply/types/autoApply.types';
import { isAutoApplyClientError } from '@/features/auto-apply/utils/apiError';
import { isAutoApplySetupComplete } from '@/features/auto-apply/utils/setupCompleteness';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  DeleteOutlineIcon,
  ExpandMoreIcon,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@/lib/material';

import type { AutoApplyTabId } from './missingFieldNavigation';
import { resolveReadinessFixActions } from './missingFieldNavigation';

const DECISION_COLOR: Record<
  ApplicationPlanResult['decision'],
  'success' | 'warning' | 'error' | 'default'
> = {
  READY_FOR_REVIEW: 'success',
  INFORMATION_REQUIRED: 'warning',
  UNSUPPORTED_CHANNEL: 'default',
  NOT_ELIGIBLE: 'error',
};

function formatRequirementCode(code: string): string {
  return code
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function PageAnalysisPanel({ analysis }: { analysis: ApplicationPageAnalysisSummary }) {
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography fontWeight={600} sx={{ mb: 0.75 }} variant="body2">
        Job page analysis
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
        <Chip label={`Provider: ${analysis.provider}`} size="small" variant="outlined" />
        <Chip
          color={
            analysis.submissionCapability === 'EXTERNAL_MANUAL' ? 'warning' : 'default'
          }
          label={analysis.submissionCapability.replace(/_/g, ' ')}
          size="small"
        />
        <Chip
          label={`Form: ${analysis.formStatus.replace(/_/g, ' ')}`}
          size="small"
          variant="outlined"
        />
      </Box>
      <Typography color="text.secondary" sx={{ display: 'block', mb: 1 }} variant="caption">
        {analysis.submissionCapability === 'EXTERNAL_MANUAL'
          ? 'Final submit stays on the employer site — Career Copilot does not auto-submit.'
          : `Submission mode: ${analysis.submissionCapability.replace(/_/g, ' ')}.`}
        {analysis.formStatus === 'NOT_INSPECTED'
          ? ' Form fields are not inspected yet (browser-assisted later).'
          : ''}
      </Typography>
      {analysis.requirements.length === 0 ? (
        <Typography color="text.secondary" variant="caption">
          No structured requirements extracted yet.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {analysis.requirements.map((requirement) => (
            <Box
              key={`${requirement.code}-${requirement.assertion}`}
              sx={{
                pl: 1.25,
                borderLeft: '2px solid',
                borderColor: 'divider',
              }}
            >
              <Typography fontWeight={600} variant="caption">
                {formatRequirementCode(requirement.code)}
                {' · '}
                {requirement.importance.toLowerCase()}
                {' · '}
                {requirement.assertion.replace(/_/g, ' ').toLowerCase()}
                {requirement.reviewStatus === 'REVIEW_REQUIRED' ? ' · review' : ''}
              </Typography>
              {requirement.sourceText ? (
                <Typography
                  color="text.secondary"
                  component="blockquote"
                  sx={{ m: 0, mt: 0.25, fontStyle: 'italic' }}
                  variant="caption"
                >
                  “{requirement.sourceText}”
                </Typography>
              ) : null}
              <Typography color="text.secondary" sx={{ display: 'block' }} variant="caption">
                Evidence: {requirement.evidenceStrength.replace(/_/g, ' ').toLowerCase()}
                {typeof requirement.confidence === 'number'
                  ? ` · confidence ${Math.round(requirement.confidence * 100)}%`
                  : ''}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

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

export type NavigateFixAction = (action: {
  destination: { kind: 'tab'; tab: AutoApplyTabId } | { kind: 'route'; href: string };
  field?: string;
}) => void;

function PlanPanel({
  plan,
  onNavigateFix,
  isRefreshing,
}: {
  plan: ApplicationPlanResult;
  onNavigateFix?: NavigateFixAction;
  isRefreshing?: boolean;
}) {
  const blocking = plan.readiness?.blockingReasons ?? [];
  const warnings = plan.readiness?.warnings ?? [];
  const readinessReasons = [...blocking, ...warnings];
  const fixActions = resolveReadinessFixActions(readinessReasons, plan.unresolvedQuestions);
  const warningOnly =
    blocking.length === 0 && warnings.length > 0 && plan.decision === 'READY_FOR_REVIEW';

  const evidenceQuote = (reason: (typeof readinessReasons)[number]): string | null => {
    const evidence = reason.metadata?.evidence;
    return typeof evidence === 'string' && evidence.trim() ? evidence.trim() : null;
  };

  return (
    <Box sx={{ mt: 1, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Typography fontWeight={600} variant="body2">
          Application details
        </Typography>
        <Chip
          color={DECISION_COLOR[plan.decision]}
          label={plan.decision.replace(/_/g, ' ')}
          size="small"
        />
        <Typography color="text.secondary" variant="body2">
          Channel: {plan.channel.replace(/_/g, ' ')}
        </Typography>
        {isRefreshing && <CircularProgress size={14} />}
      </Box>

      {plan.selectedResumeVersion && (
        <Typography variant="body2">
          Resume: {plan.selectedResumeVersion.label}
          {(plan.selectedResumeVersion.tags?.length ?? 0) > 0
            ? ` · ${plan.selectedResumeVersion.tags.join(', ')}`
            : ''}
        </Typography>
      )}

      {plan.pageAnalysis ? <PageAnalysisPanel analysis={plan.pageAnalysis} /> : null}

      {(blocking.length > 0 || warnings.length > 0) && (
        <Box sx={{ mt: 1.5 }}>
          <Typography fontWeight={600} sx={{ mb: 0.75 }} variant="body2">
            Job page findings
          </Typography>
          {blocking.map((reason) => {
            const quote = evidenceQuote(reason);
            return (
              <Box key={`block-${reason.code}-${reason.field ?? ''}`} sx={{ mb: 1 }}>
                <Typography color="error.main" variant="body2">
                  {reason.message}
                </Typography>
                {quote ? (
                  <Typography
                    color="text.secondary"
                    component="blockquote"
                    sx={{
                      m: 0,
                      mt: 0.35,
                      pl: 1.25,
                      borderLeft: '2px solid',
                      borderColor: 'divider',
                      fontStyle: 'italic',
                    }}
                    variant="caption"
                  >
                    “{quote}”
                  </Typography>
                ) : null}
              </Box>
            );
          })}
          {warnings.map((reason) => {
            const quote = evidenceQuote(reason);
            return (
              <Box key={`warn-${reason.code}-${reason.field ?? ''}`} sx={{ mb: 1 }}>
                <Typography color="text.secondary" variant="body2">
                  {reason.message}
                </Typography>
                {quote ? (
                  <Typography
                    color="text.secondary"
                    component="blockquote"
                    sx={{
                      m: 0,
                      mt: 0.35,
                      pl: 1.25,
                      borderLeft: '2px solid',
                      borderColor: 'divider',
                      fontStyle: 'italic',
                    }}
                    variant="caption"
                  >
                    “{quote}”
                  </Typography>
                ) : null}
              </Box>
            );
          })}
        </Box>
      )}

      {(plan.contentWarnings?.length ?? 0) > 0 && (
        <Box sx={{ mt: 1 }}>
          {plan.contentWarnings!.map((warning) => (
            <Typography
              color="text.secondary"
              key={warning}
              sx={{ display: 'block' }}
              variant="caption"
            >
              {warning}
            </Typography>
          ))}
        </Box>
      )}

      {(plan.coverLetter || plan.application.coverLetterContent) && (
        <Box sx={{ mt: 1.5 }}>
          <Typography fontWeight={600} variant="body2">
            Cover letter
          </Typography>
          <Typography
            component="pre"
            sx={{
              mt: 0.5,
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              typography: 'body2',
              color: 'text.secondary',
            }}
          >
            {plan.coverLetter ?? plan.application.coverLetterContent}
          </Typography>
        </Box>
      )}

      {(plan.screeningAnswers?.length ?? 0) > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography fontWeight={600} sx={{ mb: 0.5 }} variant="body2">
            Screening answers
          </Typography>
          {plan.screeningAnswers!.map((answer) => (
            <Box key={answer.questionKey} sx={{ mb: 0.75 }}>
              <Typography fontWeight={600} variant="caption">
                {answer.questionLabel}
                {answer.requiresUserReview ? ' · review required' : ''}
                {answer.status === 'REQUIRES_USER_ACTION' ? ' · missing' : ''}
              </Typography>
              <Typography color="text.secondary" sx={{ display: 'block' }} variant="caption">
                {answer.answer ?? 'Not filled — add in Verified Answers, then return here.'}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {fixActions.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography
            color={warningOnly ? 'text.secondary' : 'warning.main'}
            sx={{ mb: 1 }}
            variant="body2"
          >
            {plan.decision === 'INFORMATION_REQUIRED'
              ? 'Finish these details — we will re-check when you return:'
              : warningOnly
                ? 'Notes (you can continue):'
                : 'Related items:'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {fixActions.map((action) => (
              <Box key={action.id}>
                {(action.message || action.hint) && (
                  <Typography
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.5 }}
                    variant="caption"
                  >
                    {action.message ?? action.hint}
                  </Typography>
                )}
                <Button
                  onClick={() =>
                    onNavigateFix?.({
                      destination: action.destination,
                      field: action.field,
                    })
                  }
                  size="small"
                  variant="outline"
                >
                  {action.label}
                </Button>
              </Box>
            ))}
          </Box>
        </Box>
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

const REVIEWABLE_STATUSES: JobApplicationDto['status'][] = [
  'DISCOVERED',
  'MATCHED',
  'APPLICATION_PLANNING',
  'INFORMATION_REQUIRED',
  'READY_FOR_REVIEW',
  'NOT_ELIGIBLE',
  'APPROVED',
  'ACTION_REQUIRED',
  'SUBMISSION_FAILED',
];

function SubmissionRow({
  submission,
  onNavigateFix,
  setupComplete,
}: {
  submission: JobApplicationDto;
  onNavigateFix?: NavigateFixAction;
  setupComplete: boolean;
}) {
  const approveSubmission = useApproveSubmission();
  const queueSubmission = useQueueSubmission();
  const confirmSubmission = useConfirmSubmission();
  const retrySubmission = useRetrySubmission();
  const withdrawSubmission = useWithdrawSubmission();
  const deleteSubmission = useDeleteSubmission();
  const reopenSubmission = useReopenSubmission();
  const createPlan = useCreatePlan();
  const { showToast } = useToast();
  const [plan, setPlan] = useState<ApplicationPlanResult | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(
    () =>
      submission.status === 'READY_FOR_REVIEW' ||
      submission.status === 'INFORMATION_REQUIRED' ||
      submission.status === 'NOT_ELIGIBLE',
  );
  const [loadingDetails, setLoadingDetails] = useState(false);
  const loadedFor = useRef<string | null>(null);

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

  useEffect(() => {
    if (!submission.jobId || !REVIEWABLE_STATUSES.includes(submission.status)) return;
    const key = `${submission.id}:${submission.status}:${submission.planVersion}`;
    if (loadedFor.current === key) return;
    loadedFor.current = key;

    let cancelled = false;
    setLoadingDetails(true);
    void (async () => {
      try {
        const result = await loadSubmissionReview(submission.jobId!, submission.status);
        if (!cancelled) {
          setPlan(result);
          if (result) {
            setDetailsOpen(true);
          }
        }
      } catch (error) {
        if (!cancelled) {
          showToast({
            message: error instanceof Error ? error.message : 'Unable to load application details.',
            severity: 'error',
          });
        }
      } finally {
        if (!cancelled) setLoadingDetails(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [submission.id, submission.jobId, submission.status, submission.planVersion, showToast]);

  const isProcessing = submission.status === 'QUEUED' || submission.status === 'SUBMITTING';
  const isTerminal = TERMINAL_STATUSES.includes(submission.status);
  const canDelete = submission.status !== 'QUEUED' && submission.status !== 'SUBMITTING';
  const canShowDetails = Boolean(plan) || loadingDetails || Boolean(submission.jobId);

  const guardSetup = (proceed: () => void) => {
    if (!setupComplete) {
      showToast({
        message: 'Finish your Auto Apply setup (profile, resume, and resume permission) first.',
        severity: 'warning',
      });
      return;
    }
    proceed();
  };

  const handleApplyAgain = () => {
    guardSetup(
      () =>
        void runAction(
          async () => {
            const reopened = await reopenSubmission.mutateAsync(submission.id);
            if (reopened.jobId) {
              const result = await createPlan.mutateAsync(reopened.jobId);
              setPlan(result);
              setDetailsOpen(true);
            }
          },
          'Ready to apply again — review is preparing.',
          'Unable to restart this application.',
        ),
    );
  };

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

        {canShowDetails && submission.status !== 'WITHDRAWN' && (
          <Button onClick={() => setDetailsOpen((open) => !open)} size="small" variant="outline">
            {detailsOpen ? 'Hide details' : 'View details'}
            <ExpandMoreIcon
              fontSize="small"
              sx={{
                ml: 0.5,
                transform: detailsOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s',
              }}
            />
          </Button>
        )}

        {submission.status === 'READY_FOR_REVIEW' && (
          <Button
            isLoading={approveSubmission.isPending}
            onClick={() =>
              guardSetup(
                () =>
                  void runAction(
                    () => approveSubmission.mutateAsync(submission.id),
                    'Submission approved.',
                    'Unable to approve this submission.',
                  ),
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
              guardSetup(
                () =>
                  void runAction(
                    () => queueSubmission.mutateAsync(submission.id),
                    'Submission queued.',
                    'Unable to queue this submission.',
                  ),
              )
            }
            size="small"
          >
            Continue to apply
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

        {submission.status === 'WITHDRAWN' && (
          <Button
            isLoading={reopenSubmission.isPending || createPlan.isPending}
            onClick={handleApplyAgain}
            size="small"
          >
            Apply again
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

        {canDelete && (
          <IconButton
            aria-label="Delete submission"
            disabled={deleteSubmission.isPending}
            onClick={() =>
              void runAction(
                () => deleteSubmission.mutateAsync(submission.id),
                'Submission deleted.',
                'Unable to delete this submission.',
              )
            }
            size="small"
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {submission.status === 'SUBMISSION_FAILED' && submission.failureMessage && (
        <Typography color="error.main" sx={{ mt: 1 }} variant="caption">
          {submission.failureMessage}
        </Typography>
      )}

      <Collapse in={detailsOpen && submission.status !== 'WITHDRAWN'}>
        {loadingDetails && !plan && (
          <Typography color="text.secondary" sx={{ mt: 1 }} variant="caption">
            Loading application details…
          </Typography>
        )}
        {plan && (
          <PlanPanel isRefreshing={loadingDetails} onNavigateFix={onNavigateFix} plan={plan} />
        )}
        {!loadingDetails && !plan && submission.jobId && (
          <Typography color="text.secondary" sx={{ mt: 1 }} variant="caption">
            No saved review details yet for this submission.
          </Typography>
        )}
      </Collapse>
    </Box>
  );
}

export function SubmissionsTab({
  onNavigateFix,
}: {
  onNavigateFix?: NavigateFixAction;
} = {}) {
  const { data: submissions, isLoading } = useSubmissions();
  const { data: profile } = useCandidateProfile();
  const { data: resumes } = useResumeVersions();
  const { data: consents } = useConsents();
  const initiateSubmission = useInitiateSubmission();
  const createPlan = useCreatePlan();
  const { showToast } = useToast();
  const [jobId, setJobId] = useState('');

  const setupComplete = isAutoApplySetupComplete({ profile, resumes, consents });

  const handleTrack = async () => {
    if (!setupComplete) {
      showToast({
        message: 'Finish Profile, Resume Versions, and Consents before tracking a job.',
        severity: 'warning',
      });
      return;
    }
    try {
      const result = await initiateSubmission.mutateAsync(jobId.trim());
      if (result.application.jobId) {
        try {
          await createPlan.mutateAsync(result.application.jobId);
        } catch {
          // Row load will fetch details.
        }
      }
      setJobId('');
      if (result.possibleDuplicates.length > 0) {
        showToast({
          message:
            'Tracking started — a possible duplicate was detected. Review the submissions list.',
          severity: 'warning',
        });
      } else {
        showToast({
          message: 'Tracking started. Application details will appear below.',
          severity: 'success',
        });
      }
    } catch (error) {
      if (isAutoApplyClientError(error) && error.code === 'APPLICATION_EXISTS') {
        setJobId('');
        showToast({
          message: 'This job is already in your submissions list.',
          severity: 'info',
        });
        return;
      }
      showToast({
        message: error instanceof Error ? error.message : 'Unable to start tracking this job.',
        severity: 'error',
      });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 820 }}>
      {!setupComplete && (
        <Alert severity="warning">
          Complete your setup (Profile, an approved resume, and resume permission) before tracking
          jobs or approving applications.
        </Alert>
      )}

      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }} variant="outlined">
        <Typography variant="h6">Track a job</Typography>
        <Typography color="text.secondary" variant="body2">
          Prefer Assisted Apply from a job page. Or paste a Job ID here — review details load
          automatically.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            disabled={!setupComplete}
            fullWidth
            helperText="From the job feed / job detail page"
            label="Job ID"
            onChange={(event) => setJobId(event.target.value)}
            value={jobId}
          />
          <Button
            disabled={!setupComplete || !jobId.trim()}
            isLoading={initiateSubmission.isPending || createPlan.isPending}
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
              <SubmissionRow
                onNavigateFix={onNavigateFix}
                setupComplete={setupComplete}
                submission={submission}
              />
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}
