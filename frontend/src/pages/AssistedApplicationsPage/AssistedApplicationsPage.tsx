import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { useSubmissions } from '@/features/auto-apply/hooks/useSubmissions';

import { assistedApplyWorkspacePath, jobDetailPath, ROUTES } from '@/constants/routes';
import type { JobApplicationDto } from '@/features/auto-apply/types/autoApply.types';
import {
  labelForViewState,
  toAssistedApplyView,
  type AssistedApplyViewState,
} from '@/features/auto-apply/utils/assistedApplyView';
import {
  Alert,
  ArticleOutlinedIcon,
  Box,
  CheckCircleIcon,
  Chip,
  CircularProgress,
  Divider,
  HelpOutlineIcon,
  IconButton,
  Menu,
  MenuItem,
  MoreVertIcon,
  MuiButton,
  NavigateBeforeIcon,
  NavigateNextIcon,
  Paper,
  RemoveCircleOutlineIcon,
  SearchOutlinedIcon,
  SendOutlinedIcon,
  TextField,
  Typography,
} from '@/lib/material';
import { AssistedApplicationsHowItWorksDialog } from '@/pages/AssistedApplicationsPage/AssistedApplicationsHowItWorksDialog';
import { AbandonApplicationModal } from '@/pages/AssistedApplyWorkspacePage/AbandonApplicationModal';
import { formatListRelativeTime } from '@/pages/AutoApplyPage/assistedApplicationsListUtils';

import { assistedApplicationsPageSx } from './styles';

const PAGE_SIZE = 5;

function viewGroup(state: AssistedApplyViewState): 'applied' | 'progress' | 'stopped' {
  if (state === 'APPLIED') return 'applied';
  if (state === 'ABANDONED' || state === 'BLOCKED') return 'stopped';
  return 'progress';
}

function statusColor(state: AssistedApplyViewState): 'success' | 'primary' | 'warning' | 'default' {
  if (state === 'APPLIED' || state === 'OPENED') return 'success';
  if (state === 'READY_TO_OPEN') return 'primary';
  if (state === 'NEEDS_INFO' || state === 'LEGACY_ATTENTION') return 'warning';
  return 'default';
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Paper sx={assistedApplicationsPageSx.metricCard} variant="outlined">
      <Box sx={assistedApplicationsPageSx.metricIconWrap}>{icon}</Box>
      <Box sx={assistedApplicationsPageSx.metricCopy}>
        <Typography fontWeight={800} variant="h5">
          {value}
        </Typography>
        <Typography fontWeight={600} variant="body2">
          {label}
        </Typography>
        <Typography color="text.secondary" variant="caption">
          {detail}
        </Typography>
      </Box>
    </Paper>
  );
}

export function AssistedApplicationsPage() {
  const navigate = useNavigate();
  const { data: applications = [], isLoading, isError, refetch } = useSubmissions();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [timeRange, setTimeRange] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuApplication, setMenuApplication] = useState<JobApplicationDto | null>(null);
  const [abandonApplication, setAbandonApplication] = useState<JobApplicationDto | null>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const counts = useMemo(() => {
    const applied = applications.filter(
      (item) => viewGroup(toAssistedApplyView(item.status)) === 'applied',
    ).length;
    const stopped = applications.filter(
      (item) => viewGroup(toAssistedApplyView(item.status)) === 'stopped',
    ).length;
    return { applied, progress: applications.length - applied - stopped, stopped };
  }, [applications]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const cutoffDays = timeRange === 'all' ? null : Number(timeRange);
    const cutoff = cutoffDays == null ? null : Date.now() - cutoffDays * 86_400_000;
    return [...applications]
      .filter((item) => {
        const state = toAssistedApplyView(item.status);
        const matchesQuery =
          !normalizedQuery ||
          item.jobTitle?.toLowerCase().includes(normalizedQuery) ||
          item.companySlug?.toLowerCase().includes(normalizedQuery);
        const matchesStatus = status === 'all' || viewGroup(state) === status;
        const matchesTime = cutoff == null || new Date(item.updatedAt).getTime() >= cutoff;
        return matchesQuery && matchesStatus && matchesTime;
      })
      .sort((left, right) => {
        const delta = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        return sort === 'newest' ? delta : -delta;
      });
  }, [applications, query, sort, status, timeRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const openApplication = (application: JobApplicationDto) => {
    const state = toAssistedApplyView(application.status);
    const workspace = assistedApplyWorkspacePath(application.id);
    void navigate(state === 'OPENED' ? `${workspace}?step=open` : workspace);
  };

  const closeActionsMenu = () => {
    setMenuAnchor(null);
    setMenuApplication(null);
  };

  const openActionsMenu = (event: MouseEvent<HTMLElement>, application: JobApplicationDto) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuApplication(application);
  };

  const renderApplicationMenuItems = (application: JobApplicationDto) => {
    const state = toAssistedApplyView(application.status);
    const items = [
      <MenuItem
        key="open-workspace"
        onClick={() => {
          openApplication(application);
          closeActionsMenu();
        }}
      >
        {viewGroup(state) === 'applied' ? 'View application' : 'Continue application'}
      </MenuItem>,
    ];

    if (application.jobId) {
      items.push(
        <MenuItem
          key="view-job"
          onClick={() => {
            void navigate(jobDetailPath(application.jobId!));
            closeActionsMenu();
          }}
        >
          View job posting
        </MenuItem>,
      );
    }

    if (state !== 'APPLIED' && state !== 'ABANDONED') {
      items.push(
        <MenuItem
          key="abandon"
          onClick={() => {
            setAbandonApplication(application);
            closeActionsMenu();
          }}
          sx={{ color: 'error.main' }}
        >
          Abandon application
        </MenuItem>,
      );
    }

    return items;
  };

  return (
    <Box sx={assistedApplicationsPageSx.root}>
      <Typography color="text.secondary" sx={{ mb: 1, overflowWrap: 'anywhere' }} variant="caption">
        Dashboard {'>'} Assisted Applications
      </Typography>
      <Box sx={assistedApplicationsPageSx.pageHeader}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h1" sx={assistedApplicationsPageSx.pageTitle} variant="h4">
            Assisted Applications
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Continue applications you prepared with Career Copilot and review their current status.
          </Typography>
        </Box>
        <MuiButton
          onClick={() => setHowItWorksOpen(true)}
          startIcon={<HelpOutlineIcon />}
          sx={assistedApplicationsPageSx.howItWorksButton}
          variant="outlined"
        >
          How it works
        </MuiButton>
      </Box>

      <Box sx={assistedApplicationsPageSx.metricsGrid}>
        <MetricCard
          detail="All time"
          icon={<ArticleOutlinedIcon />}
          label="Total Applications"
          value={applications.length}
        />
        <MetricCard
          detail={`${applications.length ? Math.round((counts.applied / applications.length) * 100) : 0}% of total`}
          icon={<CheckCircleIcon />}
          label="Marked as applied"
          value={counts.applied}
        />
        <MetricCard
          detail={`${applications.length ? Math.round((counts.progress / applications.length) * 100) : 0}% of total`}
          icon={<SendOutlinedIcon />}
          label="In progress"
          value={counts.progress}
        />
        <MetricCard
          detail={`${applications.length ? Math.round((counts.stopped / applications.length) * 100) : 0}% of total`}
          icon={<RemoveCircleOutlineIcon />}
          label="Stopped / Paused"
          value={counts.stopped}
        />
      </Box>

      <Box sx={assistedApplicationsPageSx.filtersWrap}>
        <TextField
          InputProps={{ startAdornment: <SearchOutlinedIcon color="action" sx={{ mr: 1 }} /> }}
          onChange={(event) => updateFilter(setQuery, event.target.value)}
          placeholder="Search by job title, company or source..."
          size="small"
          sx={assistedApplicationsPageSx.searchField}
          value={query}
        />
        <Box sx={assistedApplicationsPageSx.filterControls}>
          <TextField
            onChange={(event) => updateFilter(setStatus, event.target.value)}
            select
            size="small"
            value={status}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="applied">Applied</MenuItem>
            <MenuItem value="progress">In progress</MenuItem>
            <MenuItem value="stopped">Stopped</MenuItem>
          </TextField>
          <TextField
            onChange={(event) => updateFilter(setTimeRange, event.target.value)}
            select
            size="small"
            value={timeRange}
          >
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="7">Last 7 days</MenuItem>
            <MenuItem value="30">Last 30 days</MenuItem>
            <MenuItem value="90">Last 90 days</MenuItem>
          </TextField>
          <TextField
            onChange={(event) => updateFilter(setSort, event.target.value)}
            select
            size="small"
            value={sort}
          >
            <MenuItem value="newest">Newest</MenuItem>
            <MenuItem value="oldest">Oldest</MenuItem>
          </TextField>
        </Box>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Alert
          action={
            <MuiButton color="inherit" onClick={() => void refetch()}>
              Retry
            </MuiButton>
          }
          severity="error"
        >
          We couldn&apos;t load your assisted applications.
        </Alert>
      ) : visible.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }} variant="outlined">
          <Typography fontWeight={700} sx={{ mb: 1 }}>
            No assisted applications found.
          </Typography>
          <MuiButton component={RouterLink} to={ROUTES.JOB_FEED} variant="contained">
            Browse jobs
          </MuiButton>
        </Paper>
      ) : (
        <Paper sx={{ overflow: 'hidden' }} variant="outlined">
          <Box sx={assistedApplicationsPageSx.tableHeader}>
            {['APPLICATION', 'STATUS', 'LAST UPDATED', ''].map((label) => (
              <Typography
                color="text.secondary"
                fontWeight={700}
                key={label || 'actions'}
                variant="caption"
              >
                {label}
              </Typography>
            ))}
          </Box>
          {visible.map((application, index) => {
            const state = toAssistedApplyView(application.status);
            return (
              <Box key={application.id}>
                {index ? <Divider /> : null}
                <Box
                  onClick={() => openApplication(application)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openApplication(application);
                    }
                  }}
                  role="button"
                  sx={assistedApplicationsPageSx.applicationRow}
                  tabIndex={0}
                >
                  <Box sx={assistedApplicationsPageSx.applicationDetails}>
                    <Box sx={assistedApplicationsPageSx.applicationAvatar}>
                      {(application.companySlug ?? 'C').slice(0, 1).toUpperCase()}
                    </Box>
                    <Box sx={assistedApplicationsPageSx.applicationCopy}>
                      <Typography sx={assistedApplicationsPageSx.applicationTitle} variant="body1">
                        {application.jobTitle ?? 'Untitled job'}
                      </Typography>
                      <Typography
                        sx={assistedApplicationsPageSx.applicationCompany}
                        variant="body2"
                      >
                        {application.companySlug ?? 'Unknown company'}
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        Started {new Date(application.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={assistedApplicationsPageSx.applicationStatus}>
                    <Chip
                      color={statusColor(state)}
                      label={labelForViewState(state)}
                      size="small"
                    />
                    {state === 'OPENED' ? (
                      <MuiButton
                        onClick={(event) => {
                          event.stopPropagation();
                          openApplication(application);
                        }}
                        size="small"
                        variant="outlined"
                      >
                        Resume
                      </MuiButton>
                    ) : null}
                  </Box>
                  <Box sx={assistedApplicationsPageSx.applicationUpdated}>
                    <Typography fontWeight={600} variant="body2">
                      {formatListRelativeTime(application.updatedAt)}
                    </Typography>
                    <Typography color="text.secondary" variant="caption">
                      {new Date(application.updatedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <IconButton
                    aria-controls={
                      menuApplication?.id === application.id ? 'assisted-app-actions' : undefined
                    }
                    aria-expanded={menuApplication?.id === application.id ? 'true' : undefined}
                    aria-haspopup="menu"
                    aria-label={`More actions for ${application.jobTitle ?? 'application'}`}
                    onClick={(event) => openActionsMenu(event, application)}
                    sx={assistedApplicationsPageSx.applicationActions}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              </Box>
            );
          })}
        </Paper>
      )}

      <Menu
        anchorEl={menuAnchor}
        id="assisted-app-actions"
        onClick={(event) => event.stopPropagation()}
        onClose={closeActionsMenu}
        open={Boolean(menuAnchor && menuApplication)}
      >
        {menuApplication ? renderApplicationMenuItems(menuApplication) : null}
      </Menu>

      {abandonApplication ? (
        <AbandonApplicationModal
          jobApplicationId={abandonApplication.id}
          onClose={() => setAbandonApplication(null)}
          open
        />
      ) : null}

      <AssistedApplicationsHowItWorksDialog
        onClose={() => setHowItWorksOpen(false)}
        open={howItWorksOpen}
      />

      <Paper sx={assistedApplicationsPageSx.footerBanner} variant="outlined">
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={700}>Keep your progress safe</Typography>
          <Typography color="text.secondary" variant="body2">
            Your applications are saved automatically. Resume anytime and never lose track.
          </Typography>
        </Box>
        <MuiButton
          component={RouterLink}
          sx={{ alignSelf: { xs: 'stretch', sm: 'auto' }, flexShrink: 0 }}
          to={ROUTES.DASHBOARD}
          variant="contained"
        >
          Explore Dashboard
        </MuiButton>
      </Paper>

      <Box sx={assistedApplicationsPageSx.paginationWrap}>
        <Typography
          color="text.secondary"
          sx={{ textAlign: { xs: 'center', sm: 'left' } }}
          variant="caption"
        >
          Showing {filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0} to{' '}
          {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} applications
        </Typography>
        <Box sx={assistedApplicationsPageSx.paginationControls}>
          <IconButton
            disabled={safePage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <NavigateBeforeIcon />
          </IconButton>
          {Array.from({ length: totalPages }, (_, index) => index + 1)
            .slice(0, 5)
            .map((pageNumber) => (
              <MuiButton
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                size="small"
                sx={{ minWidth: 36 }}
                variant={pageNumber === safePage ? 'contained' : 'text'}
              >
                {pageNumber}
              </MuiButton>
            ))}
          <IconButton
            disabled={safePage === totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            <NavigateNextIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
