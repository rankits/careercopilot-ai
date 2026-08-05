import { useEffect, useState } from 'react';

import {
  useAnalyzeJobPage,
  useLatestJobAnalysis,
} from '@/features/auto-apply/hooks/useJobPageAnalysis';

import type { ApplicationPageAnalysisDto } from '@/features/auto-apply/types/autoApply.types';
import { isAutoApplyClientError } from '@/features/auto-apply/utils/apiError';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  MuiButton,
  Stack,
  Typography,
} from '@/lib/material';
import { trackEvent } from '@/shared/analytics/trackEvent';

import {
  ANALYSIS_STALENESS_DAYS,
  analysisAgeDays,
  formatRelativeTime,
  isAnalysisStale,
} from './activityLabels';

const FORM_STATUS_NOTICE =
  "We've reviewed the job posting, but haven't inspected the application form itself. You'll fill that out yourself after we hand off.";

function providerLabel(provider: string | undefined): string {
  if (!provider || provider === 'UNKNOWN' || provider === 'unknown') return 'Unknown provider';
  return provider
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function requirementTitle(req: ApplicationPageAnalysisDto['requirements'][number]): string {
  if (req.assertion) {
    return `${req.code.replace(/_/g, ' ')} — ${req.assertion.replace(/_/g, ' ').toLowerCase()}`;
  }
  return req.code.replace(/_/g, ' ');
}

function QuoteExcerpt({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncate = text.length > 180;
  const shown = !needsTruncate || expanded ? text : `${text.slice(0, 180).trimEnd()}…`;

  return (
    <Box sx={{ mt: 0.5 }}>
      <Typography
        color="text.secondary"
        component="blockquote"
        sx={{ m: 0, fontStyle: 'italic', borderLeft: 2, borderColor: 'divider', pl: 1.5 }}
        variant="body2"
      >
        According to the posting: &ldquo;{shown}&rdquo;
      </Typography>
      {needsTruncate ? (
        <MuiButton
          onClick={() => setExpanded((v) => !v)}
          size="small"
          sx={{ mt: 0.5, px: 0 }}
          variant="text"
        >
          {expanded ? 'Show less' : 'Show more'}
        </MuiButton>
      ) : null}
    </Box>
  );
}

export interface AnalysisStepProps {
  jobId: string;
}

export function AnalysisStep({ jobId }: AnalysisStepProps) {
  const latestQuery = useLatestJobAnalysis(jobId);
  const analyzeMutation = useAnalyzeJobPage(jobId);
  const [staleDismissed, setStaleDismissed] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  const analysis = (analyzeMutation.data ?? latestQuery.data) as ApplicationPageAnalysisDto | null;
  const hasCachedAnalysis = Boolean(latestQuery.data);
  const isInitialLoading =
    latestQuery.isLoading ||
    (!hasCachedAnalysis && analyzeMutation.isPending && !analyzeMutation.isError);

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
    // Cache miss — trigger analysis once (AA-050 cache-first)
    setAutoTriggered(true);
    analyzeMutation.mutate({});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once after latest query settles
  }, [autoTriggered, latestQuery.data, latestQuery.isLoading, latestQuery.isFetching, latestQuery.isError]);

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

  const handleRetry = () => {
    setReanalyzeError(null);
    analyzeMutation.mutate({});
  };

  const handleReanalyze = () => {
    setReanalyzeError(null);
    trackEvent('job_analysis_reanalyzed', { job_id: jobId });
    analyzeMutation.mutate(
      { forceRefresh: true },
      {
        onError: () => {
          // Keep previous analysis visible (AA-051)
          setReanalyzeError('Reanalysis failed. Your previous analysis is still shown.');
        },
        onSuccess: () => {
          setStaleDismissed(false);
        },
      },
    );
  };

  if (isInitialLoading) {
    return (
      <Stack alignItems="center" direction="row" spacing={1.5} sx={{ py: 3 }}>
        <CircularProgress aria-label="Analyzing job posting" size={22} />
        <Typography>Analyzing job posting…</Typography>
      </Stack>
    );
  }

  const initialFailed = !analysis && (analyzeMutation.isError || latestQuery.isError);
  if (initialFailed) {
    const status = isAutoApplyClientError(analyzeMutation.error)
      ? analyzeMutation.error.statusCode
      : undefined;
    const message =
      status === 429
        ? "You've made a lot of requests. Try again in a moment."
        : "We couldn't analyze this job posting.";
    return (
      <Stack spacing={1.5}>
        <Alert severity="error">{message}</Alert>
        <MuiButton onClick={handleRetry} variant="outlined">
          Retry
        </MuiButton>
      </Stack>
    );
  }

  if (!analysis) {
    return (
      <Stack spacing={1.5}>
        <Alert severity="info">No analysis available yet.</Alert>
        <MuiButton onClick={handleRetry} variant="outlined">
          Retry
        </MuiButton>
      </Stack>
    );
  }

  const stale = isAnalysisStale(analysis.analyzedAt);
  const ageDays = analysisAgeDays(analysis.analyzedAt);
  const reanalyzing = analyzeMutation.isPending;

  return (
    <Stack spacing={2}>
      <Stack
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        spacing={1}
      >
        <Stack alignItems="center" direction="row" flexWrap="wrap" spacing={1}>
          <Chip label={providerLabel(analysis.provider)} size="small" />
          <Typography
            color="text.secondary"
            title={new Date(analysis.analyzedAt).toLocaleString()}
            variant="body2"
          >
            Analyzed {formatRelativeTime(analysis.analyzedAt)}
          </Typography>
        </Stack>
        <MuiButton
          disabled={reanalyzing}
          onClick={handleReanalyze}
          size="small"
          variant="outlined"
        >
          {reanalyzing ? 'Reanalyzing…' : 'Reanalyze'}
        </MuiButton>
      </Stack>

      <Collapse in={stale && !staleDismissed}>
        <Alert onClose={() => setStaleDismissed(true)} severity="info" sx={{ mb: 0 }}>
          This analysis is {Math.max(ageDays, ANALYSIS_STALENESS_DAYS)} days old. The posting may
          have changed.
        </Alert>
      </Collapse>

      {reanalyzeError ? (
        <Alert severity="warning">{reanalyzeError}</Alert>
      ) : null}

      <Alert severity="info">{FORM_STATUS_NOTICE}</Alert>

      {analysis.requirements.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          No specific requirements were extracted from this posting.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          <Typography fontWeight={600} variant="subtitle2">
            Requirements
          </Typography>
          {analysis.requirements.map((req, index) => (
            <Box
              key={`${req.code}-${index}`}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
              }}
            >
              <Typography variant="body2">{requirementTitle(req)}</Typography>
              {req.sourceText ? <QuoteExcerpt text={req.sourceText} /> : null}
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
