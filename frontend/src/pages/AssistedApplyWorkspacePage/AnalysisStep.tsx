import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  useAnalyzeJobPage,
  useLatestJobAnalysis,
} from '@/features/auto-apply/hooks/useJobPageAnalysis';

import type { ApplicationPageAnalysisDto } from '@/features/auto-apply/types/autoApply.types';
import { isAutoApplyClientError } from '@/features/auto-apply/utils/apiError';
import {
  Alert,
  AutoAwesomeOutlinedIcon,
  Box,
  BusinessCenterOutlinedIcon,
  CheckCircleOutlineIcon,
  Chip,
  Collapse,
  ContentCopyOutlinedIcon,
  ExpandMoreIcon,
  IconButton,
  InfoOutlinedIcon,
  LanguageOutlinedIcon,
  Link,
  MuiButton,
  PersonOutlineIcon,
  PhoneOutlinedIcon,
  RefreshIcon,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  VerifiedUserOutlinedIcon,
  WarningAmberOutlinedIcon,
  ArrowForwardIcon,
} from '@/lib/material';
import { trackEvent } from '@/shared/analytics/trackEvent';

import { ANALYSIS_STALENESS_DAYS, analysisAgeDays, isAnalysisStale } from './activityLabels';
import { ActivityTimelinePanel } from './ActivityTimelinePanel';
import {
  analysisStatusLabel,
  averageRequirementConfidencePercent,
  expiresInDaysLabel,
  extractorVersionLabel,
  formatAnalyzedClock,
  formatLocalDateTime,
  formStatusLabel,
  mapRequirementToViewModel,
  providerDisplayLabel,
  submissionCapabilityLabel,
  type RequirementIconId,
  type RequirementViewModel,
} from './analysisRequirementViewModel';
import { assistedApplyTouchTargetSx, WorkspaceStickyActions } from './WorkspaceStickyActions';

const VISIBLE_REQUIREMENT_LIMIT = 3;

function RequirementIcon({ id }: { id: RequirementIconId }) {
  const sx = { fontSize: 20, color: 'primary.main', flexShrink: 0 } as const;
  switch (id) {
    case 'region':
      return <LanguageOutlinedIcon sx={sx} />;
    case 'experience':
      return <BusinessCenterOutlinedIcon sx={sx} />;
    case 'mobile':
      return <PhoneOutlinedIcon sx={sx} />;
    case 'auth':
      return <VerifiedUserOutlinedIcon sx={sx} />;
    case 'sponsorship':
      return <PersonOutlineIcon sx={sx} />;
    case 'skills':
      return <AutoAwesomeOutlinedIcon sx={sx} />;
    default:
      return <InfoOutlinedIcon sx={sx} />;
  }
}

function SideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
        bgcolor: 'background.paper',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.035)',
      }}
    >
      <Typography fontWeight={700} sx={{ mb: 1.25 }} variant="subtitle2">
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function AnalysisSkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton height={96} variant="rounded" />
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(260px, 300px)' },
        }}
      >
        <Stack spacing={2}>
          <Skeleton height={280} variant="rounded" />
          <Skeleton height={160} variant="rounded" />
        </Stack>
        <Stack spacing={2}>
          <Skeleton height={160} variant="rounded" />
          <Skeleton height={180} variant="rounded" />
          <Skeleton height={120} variant="rounded" />
        </Stack>
      </Box>
    </Stack>
  );
}

function RequirementRow({ view }: { view: RequirementViewModel }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = `requirement-details-${view.code}`;

  return (
    <Box
      sx={{
        border: 1,
        borderColor: view.reviewTone === 'warning' ? 'warning.light' : 'divider',
        borderRadius: 2,
        p: { xs: 1.5, sm: 2 },
        bgcolor: view.reviewTone === 'warning' ? 'warning.50' : 'background.paper',
      }}
    >
      <Stack
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
      >
        <Stack alignItems="flex-start" direction="row" spacing={1.25} sx={{ flex: 1, minWidth: 0 }}>
          <Box
            aria-hidden
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <RequirementIcon id={view.iconId} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography fontWeight={700} variant="subtitle2">
              {view.title} — {view.operatorLabel}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75 }} variant="body2">
              According to the posting: &ldquo;{view.evidence}&rdquo;
            </Typography>
            <Stack
              direction="row"
              flexWrap="wrap"
              spacing={1}
              sx={{ mt: 1.25, rowGap: 1, alignItems: 'center' }}
            >
              <Chip
                label={view.valueLabel}
                size="small"
                sx={{ fontWeight: 600 }}
                variant="outlined"
              />
              <Chip
                color={view.required ? 'success' : 'default'}
                label={view.requiredLabel}
                size="small"
                variant="outlined"
              />
              {view.reviewLabel ? (
                <Chip
                  color={view.reviewTone === 'warning' ? 'warning' : 'default'}
                  label={view.reviewLabel}
                  size="small"
                  variant="filled"
                />
              ) : null}
            </Stack>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 0.5, sm: 3 }}
              sx={{ mt: 1.25 }}
            >
              <Typography variant="caption">
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  Confidence{' '}
                </Box>
                <Box component="span" fontWeight={700}>
                  {view.confidencePercent == null ? 'Not available' : `${view.confidencePercent}%`}
                </Box>
              </Typography>
              <Typography variant="caption">
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  Source{' '}
                </Box>
                <Box component="span" fontWeight={600}>
                  {view.sourceLabel}
                </Box>
              </Typography>
            </Stack>
          </Box>
        </Stack>
        <MuiButton
          aria-controls={detailsId}
          aria-expanded={expanded}
          endIcon={
            <ExpandMoreIcon
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 120ms',
              }}
            />
          }
          onClick={() => setExpanded((value) => !value)}
          size="small"
          sx={{ ...assistedApplyTouchTargetSx, alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
          variant="text"
        >
          {expanded ? 'Hide details' : 'Expand'}
        </MuiButton>
      </Stack>

      <Collapse in={expanded} unmountOnExit>
        <Box
          id={detailsId}
          sx={{
            mt: 1.5,
            pt: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            display: 'grid',
            gap: 1,
            gridTemplateColumns: { xs: '1fr', sm: 'minmax(140px, 180px) 1fr' },
          }}
        >
          {view.details.map((row) => (
            <Box
              key={row.label}
              sx={{
                display: 'contents',
              }}
            >
              <Typography color="text.secondary" variant="caption">
                {row.label}
              </Typography>
              <Typography sx={{ wordBreak: 'break-word' }} variant="body2">
                {row.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

export interface AnalysisStepProps {
  jobId: string;
  jobApplicationId?: string;
  jobTitle?: string | null;
  company?: string | null;
  workplaceMode?: string | null;
  viewLabel?: string;
  onContinue?: () => void;
  onReanalyzeStateChange?: (state: { isPending: boolean; reanalyze: () => void }) => void;
}

export function AnalysisStep({
  jobId,
  jobApplicationId,
  jobTitle = null,
  company = null,
  workplaceMode = null,
  viewLabel = 'Tracking',
  onContinue,
  onReanalyzeStateChange,
}: AnalysisStepProps) {
  const latestQuery = useLatestJobAnalysis(jobId);
  const analyzeMutation = useAnalyzeJobPage(jobId);
  const [staleDismissed, setStaleDismissed] = useState(false);
  const [feedback, setFeedback] = useState<{
    severity: 'success' | 'warning';
    message: string;
  } | null>(null);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [showAllRequirements, setShowAllRequirements] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);

  const analysis = (analyzeMutation.data ?? latestQuery.data) as ApplicationPageAnalysisDto | null;
  const hasCachedAnalysis = Boolean(latestQuery.data);
  const isInitialLoading =
    latestQuery.isLoading ||
    (!hasCachedAnalysis && analyzeMutation.isPending && !analyzeMutation.isError);

  const requirementViews = useMemo(
    () => (analysis?.requirements ?? []).map((item) => mapRequirementToViewModel(item)),
    [analysis?.requirements],
  );

  const visibleRequirements = showAllRequirements
    ? requirementViews
    : requirementViews.slice(0, VISIBLE_REQUIREMENT_LIMIT);

  const avgConfidence = averageRequirementConfidencePercent(analysis?.requirements ?? []);

  useEffect(() => {
    if (autoTriggered) return;
    if (latestQuery.isLoading || latestQuery.isFetching) return;
    if (latestQuery.data) {
      setAutoTriggered(true);
      return;
    }
    if (latestQuery.isError) {
      setAutoTriggered(true);
      return;
    }
    setAutoTriggered(true);
    analyzeMutation.mutate({});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once after latest query settles
  }, [
    autoTriggered,
    latestQuery.data,
    latestQuery.isLoading,
    latestQuery.isFetching,
    latestQuery.isError,
  ]);

  useEffect(() => {
    if (analysis) {
      trackEvent('job_analysis_viewed', {
        job_id: jobId,
        provider: analysis.provider ?? 'UNKNOWN',
      });
    } else if (latestQuery.isError || analyzeMutation.isError) {
      trackEvent('job_analysis_failed', { job_id: jobId });
    }
  }, [analysis, jobId, latestQuery.isError, analyzeMutation.isError]);

  const analyzeMutate = analyzeMutation.mutate;
  const analyzePending = analyzeMutation.isPending;

  const handleReanalyze = useCallback(() => {
    setFeedback(null);
    trackEvent('job_analysis_reanalyzed', { job_id: jobId });
    const previousRequirements = analysis?.requirements ?? [];

    analyzeMutate(
      { forceRefresh: true },
      {
        onError: () => {
          setFeedback({
            severity: 'warning',
            message: 'Analysis failed; the previous result has been retained.',
          });
        },
        onSuccess: (newAnalysis) => {
          setStaleDismissed(false);
          if (newAnalysis.previousAnalysisId && newAnalysis.status !== 'FAILED') {
            const oldCodes = new Set(previousRequirements.map((r) => r.code));
            const newCodes = new Set(newAnalysis.requirements.map((r) => r.code));
            let added = 0;
            for (const code of newCodes) {
              if (!oldCodes.has(code)) added += 1;
            }
            if (added > 0) {
              setFeedback({
                severity: 'success',
                message: `Analysis updated: ${added} requirement${added > 1 ? 's' : ''} added.`,
              });
            } else {
              setFeedback({
                severity: 'success',
                message: 'Analysis refreshed successfully.',
              });
            }
          } else {
            setFeedback({ severity: 'success', message: 'Analysis updated.' });
          }
        },
      },
    );
  }, [analysis?.requirements, analyzeMutate, jobId]);

  useEffect(() => {
    onReanalyzeStateChange?.({
      isPending: analyzePending,
      reanalyze: handleReanalyze,
    });
  }, [analyzePending, handleReanalyze, onReanalyzeStateChange]);

  const handleCopyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setHashCopied(true);
      window.setTimeout(() => setHashCopied(false), 1500);
    } catch {
      setHashCopied(false);
    }
  };

  if (isInitialLoading) {
    return <AnalysisSkeleton />;
  }

  const initialFailed = !analysis && (analyzeMutation.isError || latestQuery.isError);
  if (initialFailed || (analysis && analysis.status === 'FAILED')) {
    const status = isAutoApplyClientError(analyzeMutation.error)
      ? analyzeMutation.error.statusCode
      : undefined;
    return (
      <Stack spacing={2}>
        <Alert
          action={
            <MuiButton
              disabled={analyzeMutation.isPending}
              onClick={() => analyzeMutation.mutate({})}
              size="small"
            >
              Retry
            </MuiButton>
          }
          severity="error"
        >
          {status === 429
            ? "You've made a lot of requests. Try again in a moment."
            : "We couldn't analyze this job posting."}
        </Alert>
      </Stack>
    );
  }

  if (!analysis) {
    return (
      <Stack spacing={1.5}>
        <Alert severity="info">No analysis available yet.</Alert>
        <MuiButton onClick={() => analyzeMutation.mutate({})} variant="outlined">
          Retry
        </MuiButton>
      </Stack>
    );
  }

  const stale = isAnalysisStale(analysis.analyzedAt);
  const ageDays = analysisAgeDays(analysis.analyzedAt);
  const reanalyzing = analyzeMutation.isPending;
  const contentHash = analysis.snapshot?.contentHash ?? '';
  const shortHash = contentHash ? contentHash.slice(0, 8) : '—';
  const expiresDays = expiresInDaysLabel(analysis.expiresAt);
  const workplaceLabel = workplaceMode
    ? workplaceMode
        .replaceAll('_', ' ')
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase())
    : null;

  return (
    <Stack spacing={2}>
      <Stack
        alignItems={{ xs: 'stretch', sm: 'center' }}
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="flex-end"
        spacing={1}
        sx={{ display: { xs: 'flex', md: 'none' } }}
      >
        <MuiButton
          disabled={reanalyzing}
          onClick={handleReanalyze}
          startIcon={<RefreshIcon />}
          sx={assistedApplyTouchTargetSx}
          variant="outlined"
        >
          {reanalyzing ? 'Reanalyzing…' : 'Reanalyze'}
        </MuiButton>
      </Stack>

      <Collapse in={stale && !staleDismissed}>
        <Alert onClose={() => setStaleDismissed(true)} severity="info">
          This analysis is {Math.max(ageDays, ANALYSIS_STALENESS_DAYS)} days old. The posting may
          have changed.
        </Alert>
      </Collapse>

      {feedback ? <Alert severity={feedback.severity}>{feedback.message}</Alert> : null}

      {/* Job summary */}
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          p: { xs: 1.75, sm: 2 },
          bgcolor: 'background.paper',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.035)',
        }}
      >
        <Stack
          alignItems={{ xs: 'stretch', md: 'center' }}
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Stack alignItems="flex-start" direction="row" spacing={1.5} sx={{ minWidth: 0 }}>
            <Box
              aria-hidden
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1.25,
                bgcolor: 'grey.900',
                color: 'common.white',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {(company ?? jobTitle ?? 'J').slice(0, 1).toUpperCase()}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700} variant="subtitle1">
                {jobTitle ?? 'Job'}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {[company, workplaceLabel].filter(Boolean).join(' · ')}
              </Typography>
              <Stack alignItems="center" direction="row" flexWrap="wrap" spacing={1} sx={{ mt: 1 }}>
                <Chip
                  color="success"
                  label={viewLabel || 'Tracking'}
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Box>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1.25, sm: 3 }}
            sx={{ flexShrink: 0 }}
          >
            <Box>
              <Typography color="text.secondary" variant="caption">
                Job page ({providerDisplayLabel(analysis.provider)})
              </Typography>
              <Typography variant="body2">
                {analysis.jobPageUrl ? (
                  <Link href={analysis.jobPageUrl} rel="noopener noreferrer" target="_blank">
                    View job page
                  </Link>
                ) : (
                  '—'
                )}
              </Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" variant="caption">
                Analyzed
              </Typography>
              <Typography variant="body2">{formatAnalyzedClock(analysis.analyzedAt)}</Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" variant="caption">
                Method
              </Typography>
              <Typography variant="body2">
                {extractorVersionLabel(analysis.extractorVersion)}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(260px, 300px)' },
          alignItems: 'start',
          '& > *': { minWidth: 0 },
        }}
      >
        <Stack spacing={2}>
          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              p: { xs: 1.75, sm: 2 },
              bgcolor: 'background.paper',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.035)',
            }}
          >
            <Stack
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              spacing={1}
              sx={{ mb: 1.5 }}
            >
              <Typography component="h2" fontWeight={700} variant="subtitle1">
                Requirements extracted from job posting
              </Typography>
              <Chip
                color="success"
                label={`${requirementViews.length} Requirement${requirementViews.length === 1 ? '' : 's'} Found`}
                size="small"
              />
            </Stack>

            {requirementViews.length === 0 ? (
              <Alert severity="info">
                <Typography fontWeight={700} variant="subtitle2">
                  No structured requirements were found
                </Typography>
                <Typography variant="body2">
                  Career Copilot analyzed the job posting but could not identify specific,
                  structured requirements. You can still continue to Fit &amp; Eligibility using the
                  available job information.
                </Typography>
              </Alert>
            ) : (
              <Stack spacing={1.25}>
                {visibleRequirements.map((view) => (
                  <RequirementRow key={`${view.code}-${view.valueLabel}`} view={view} />
                ))}
                {requirementViews.length > VISIBLE_REQUIREMENT_LIMIT ? (
                  <MuiButton
                    endIcon={
                      <ExpandMoreIcon
                        sx={{ transform: showAllRequirements ? 'rotate(180deg)' : 'none' }}
                      />
                    }
                    onClick={() => setShowAllRequirements((value) => !value)}
                    sx={{ ...assistedApplyTouchTargetSx, alignSelf: 'flex-start' }}
                    variant="text"
                  >
                    {showAllRequirements
                      ? 'Show fewer requirements'
                      : `View all requirements (${requirementViews.length})`}
                  </MuiButton>
                ) : requirementViews.length > 0 ? (
                  <Typography color="text.secondary" variant="caption">
                    View all requirements ({requirementViews.length})
                  </Typography>
                ) : null}
              </Stack>
            )}
          </Box>

          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              p: { xs: 1.75, sm: 2 },
              bgcolor: 'background.paper',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.035)',
            }}
          >
            <Typography component="h2" fontWeight={700} sx={{ mb: 1.5 }} variant="subtitle1">
              Analysis information
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 1.25,
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(3, minmax(0, 1fr))',
                  lg: 'repeat(5, minmax(0, 1fr))',
                },
              }}
            >
              <InfoTile label="Provider" value={providerDisplayLabel(analysis.provider)} />
              <InfoTile
                label="Analysis status"
                tone={analysis.status === 'COMPLETE' ? 'success' : 'default'}
                value={analysisStatusLabel(analysis.status ?? analysis.outcomeStatus)}
              />
              <InfoTile
                label="Form status"
                tone={analysis.formStatus === 'NOT_INSPECTED' ? 'warning' : 'default'}
                value={formStatusLabel(analysis.formStatus)}
              />
              <InfoTile
                label="Submission capability"
                tone="info"
                value={submissionCapabilityLabel(analysis.submissionCapability)}
              />
              <Box
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1.25,
                  p: 1.25,
                  minWidth: 0,
                }}
              >
                <Typography color="text.secondary" variant="caption">
                  Content hash
                </Typography>
                <Stack alignItems="center" direction="row" spacing={0.5}>
                  <Typography fontFamily="monospace" fontWeight={700} variant="body2">
                    {shortHash}
                  </Typography>
                  {contentHash ? (
                    <Tooltip title={hashCopied ? 'Copied' : 'Copy full hash'}>
                      <IconButton
                        aria-label="Copy content hash"
                        onClick={() => void handleCopyHash(contentHash)}
                        size="small"
                      >
                        <ContentCopyOutlinedIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Stack>
              </Box>
            </Box>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 0.5, sm: 3 }}
              sx={{ mt: 1.5 }}
            >
              <Typography color="text.secondary" variant="caption">
                Fetched at:{' '}
                {formatLocalDateTime(analysis.snapshot?.fetchedAt ?? analysis.analyzedAt)}
              </Typography>
              <Typography color="text.secondary" variant="caption">
                Expires on: {formatLocalDateTime(analysis.expiresAt)}
                {expiresDays ? ` (${expiresDays})` : ''}
              </Typography>
            </Stack>
          </Box>
        </Stack>

        <Stack spacing={2} sx={{ position: { lg: 'sticky' }, top: { lg: 16 } }}>
          <SideCard title="Summary">
            <Stack spacing={1.25}>
              <SummaryRow label="Requirements found" value={String(requirementViews.length)} />
              <SummaryRow label="Form fields found" value={String(analysis.fields?.length ?? 0)} />
              <SummaryRow
                label="Confidence (avg.)"
                value={avgConfidence == null ? 'Not available' : `${avgConfidence}%`}
                valueTone={avgConfidence != null && avgConfidence >= 90 ? 'success' : 'default'}
              />
              <Stack alignItems="center" direction="row" justifyContent="space-between">
                <Typography color="text.secondary" variant="body2">
                  Overall status
                </Typography>
                <Chip
                  color={analysis.status === 'COMPLETE' ? 'success' : 'default'}
                  label={analysisStatusLabel(analysis.status ?? 'COMPLETE')}
                  size="small"
                />
              </Stack>
            </Stack>
          </SideCard>

          {jobApplicationId ? (
            <Box sx={{ '& > aside': { maxWidth: '100%', width: '100%' } }}>
              <ActivityTimelinePanel jobApplicationId={jobApplicationId} />
            </Box>
          ) : (
            <SideCard title="Activity">
              <Typography color="text.secondary" variant="body2">
                Activity will appear once this application is tracked.
              </Typography>
            </SideCard>
          )}

          <Box
            sx={{
              border: 1,
              borderColor: 'primary.light',
              borderRadius: 2,
              p: 2,
              bgcolor: 'primary.50',
            }}
          >
            <Stack alignItems="flex-start" direction="row" spacing={1} sx={{ mb: 1 }}>
              <InfoOutlinedIcon color="primary" sx={{ fontSize: 20, mt: 0.2 }} />
              <Box>
                <Typography fontWeight={700} variant="subtitle2">
                  What&apos;s next?
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Review your fit &amp; eligibility based on these requirements.
                </Typography>
              </Box>
            </Stack>
            <MuiButton
              endIcon={<ArrowForwardIcon />}
              fullWidth
              onClick={onContinue}
              sx={assistedApplyTouchTargetSx}
              variant="contained"
            >
              Go to Fit &amp; Eligibility
            </MuiButton>
          </Box>
        </Stack>
      </Box>

      <WorkspaceStickyActions>
        <MuiButton
          endIcon={<ArrowForwardIcon />}
          fullWidth
          onClick={onContinue}
          sx={{ ...assistedApplyTouchTargetSx, display: { xs: 'inline-flex', md: 'none' } }}
          variant="contained"
        >
          Go to Fit &amp; Eligibility
        </MuiButton>
      </WorkspaceStickyActions>
    </Stack>
  );
}

function InfoTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'info';
}) {
  const color =
    tone === 'success'
      ? 'success.main'
      : tone === 'warning'
        ? 'warning.dark'
        : tone === 'info'
          ? 'primary.main'
          : 'text.primary';

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.25,
        p: 1.25,
        minWidth: 0,
      }}
    >
      <Typography color="text.secondary" variant="caption">
        {label}
      </Typography>
      <Stack alignItems="center" direction="row" spacing={0.75} sx={{ mt: 0.25 }}>
        {tone === 'success' ? (
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 16 }} />
        ) : null}
        {tone === 'warning' ? (
          <WarningAmberOutlinedIcon color="warning" sx={{ fontSize: 16 }} />
        ) : null}
        <Typography fontWeight={700} sx={{ color }} variant="body2">
          {value}
        </Typography>
      </Stack>
    </Box>
  );
}

function SummaryRow({
  label,
  value,
  valueTone = 'default',
}: {
  label: string;
  value: string;
  valueTone?: 'default' | 'success';
}) {
  return (
    <Stack alignItems="center" direction="row" justifyContent="space-between" spacing={1}>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography
        fontWeight={700}
        sx={{ color: valueTone === 'success' ? 'success.main' : 'text.primary' }}
        variant="body2"
      >
        {value}
      </Typography>
    </Stack>
  );
}
