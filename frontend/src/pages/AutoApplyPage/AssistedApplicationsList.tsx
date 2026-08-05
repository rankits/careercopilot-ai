import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { useSubmissions } from '@/features/auto-apply/hooks/useSubmissions';
import type { JobApplicationDto } from '@/features/auto-apply/types/autoApply.types';
import {
  labelForViewState,
  toAssistedApplyView,
  tooltipForViewState,
  type AssistedApplyViewState,
} from '@/features/auto-apply/utils/assistedApplyView';
import { ROUTES, assistedApplyWorkspacePath } from '@/constants/routes';
import {
  Alert,
  Box,
  Chip,
  Divider,
  List,
  ListItemButton,
  MuiButton,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@/lib/material';

import { formatListRelativeTime } from './assistedApplicationsListUtils';

function statusChipColor(
  viewState: AssistedApplyViewState,
): 'success' | 'error' | 'default' | 'warning' {
  if (viewState === 'READY_TO_OPEN' || viewState === 'OPENED' || viewState === 'APPLIED') {
    return 'success';
  }
  if (viewState === 'BLOCKED') return 'error';
  if (viewState === 'ABANDONED') return 'default';
  return 'warning';
}

function StatusChip({ status }: { status: JobApplicationDto['status'] }) {
  const viewState = toAssistedApplyView(status);
  const label = labelForViewState(viewState);
  const tooltip = tooltipForViewState(viewState);
  const chip = <Chip color={statusChipColor(viewState)} label={label} size="small" />;
  if (tooltip) {
    return <Tooltip title={tooltip}>{chip}</Tooltip>;
  }
  return chip;
}

function ApplicationRow({ application }: { application: JobApplicationDto }) {
  const navigate = useNavigate();
  const viewState = toAssistedApplyView(application.status);
  const workspacePath = assistedApplyWorkspacePath(application.id);
  const openStepPath = `${workspacePath}?step=open`;

  return (
    <ListItemButton
      alignItems="flex-start"
      aria-label={`Open ${application.jobTitle ?? 'application'} workspace`}
      onClick={() => {
        void navigate(viewState === 'OPENED' ? openStepPath : workspacePath);
      }}
      sx={{ py: 1.5, gap: 1, flexWrap: 'wrap' }}
    >
      <Box sx={{ flex: 1, minWidth: 180 }}>
        <Typography fontWeight={600} variant="body1">
          {application.jobTitle ?? 'Untitled job'}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {application.companySlug ?? 'Unknown company'}
        </Typography>
        {application.updatedAt ? (
          <Typography color="text.secondary" sx={{ mt: 0.25 }} variant="caption">
            Updated {formatListRelativeTime(application.updatedAt)}
          </Typography>
        ) : null}
      </Box>
      <Stack alignItems="flex-end" direction="row" flexWrap="wrap" spacing={1}>
        <StatusChip status={application.status} />
        {viewState === 'OPENED' ? (
          <MuiButton
            onClick={(event) => {
              event.stopPropagation();
              void navigate(openStepPath);
            }}
            size="small"
            variant="outlined"
          >
            Resume
          </MuiButton>
        ) : null}
      </Stack>
    </ListItemButton>
  );
}

function ListSkeleton() {
  return (
    <Stack spacing={0} sx={{ p: 1 }}>
      {[0, 1, 2].map((key) => (
        <Box key={key} sx={{ px: 1.5, py: 1.5 }}>
          <Skeleton height={22} width="55%" />
          <Skeleton height={18} sx={{ mt: 0.5 }} width="35%" />
          <Skeleton height={14} sx={{ mt: 0.75 }} width="25%" />
        </Box>
      ))}
    </Stack>
  );
}

export function AssistedApplicationsList() {
  const { data: submissions, isLoading, isError, refetch, isFetching } = useSubmissions();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 820 }}>
      <Typography variant="h6">Assisted applications</Typography>

      {isLoading ? (
        <Paper variant="outlined">
          <ListSkeleton />
        </Paper>
      ) : isError ? (
        <Alert
          action={
            <MuiButton
              color="inherit"
              disabled={isFetching}
              onClick={() => {
                void refetch();
              }}
              size="small"
            >
              Retry
            </MuiButton>
          }
          severity="error"
        >
          We couldn&apos;t load your applications.
        </Alert>
      ) : !submissions || submissions.length === 0 ? (
        <Paper sx={{ p: 3 }} variant="outlined">
          <Typography sx={{ mb: 2 }} variant="body1">
            You haven&apos;t started any assisted applications yet.
          </Typography>
          <MuiButton component={RouterLink} to={ROUTES.JOB_FEED} variant="contained">
            Browse jobs
          </MuiButton>
        </Paper>
      ) : (
        <Paper variant="outlined">
          <List disablePadding>
            {submissions.map((application, index) => (
              <Box key={application.id}>
                {index > 0 ? <Divider /> : null}
                <ApplicationRow application={application} />
              </Box>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}
