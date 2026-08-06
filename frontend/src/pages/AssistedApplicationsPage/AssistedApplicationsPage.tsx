import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { useSubmissions } from '@/features/auto-apply/hooks/useSubmissions';

import { assistedApplyWorkspacePath, ROUTES } from '@/constants/routes';
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

import { formatListRelativeTime } from '@/pages/AutoApplyPage/assistedApplicationsListUtils';

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
    <Paper sx={{ alignItems: 'center', display: 'flex', gap: 2, p: 2.25 }} variant="outlined">
      <Box sx={{ alignItems: 'center', bgcolor: 'primary.50', borderRadius: 2, color: 'primary.main', display: 'flex', height: 52, justifyContent: 'center', width: 52 }}>
        {icon}
      </Box>
      <Box>
        <Typography fontWeight={800} variant="h5">{value}</Typography>
        <Typography fontWeight={600} variant="body2">{label}</Typography>
        <Typography color="text.secondary" variant="caption">{detail}</Typography>
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

  const counts = useMemo(() => {
    const applied = applications.filter((item) => viewGroup(toAssistedApplyView(item.status)) === 'applied').length;
    const stopped = applications.filter((item) => viewGroup(toAssistedApplyView(item.status)) === 'stopped').length;
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

  return (
    <Box
      sx={{
        maxWidth: 1220,
        mx: 'auto',
        p: { xs: 2, sm: 3, lg: 4 },
        pb: { xs: 10, md: 5 },
      }}
    >
      <Typography color="text.secondary" sx={{ mb: 1 }} variant="caption">
        Dashboard {'>'} Assisted Applications
      </Typography>
      <Box sx={{ alignItems: 'flex-start', display: 'flex', gap: 2, justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography component="h1" sx={{ fontWeight: 700, letterSpacing: '-0.03em', mb: 0.5 }} variant="h4">
            Assisted Applications
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Continue applications you prepared with Career Copilot and review their current status.
          </Typography>
        </Box>
        <MuiButton startIcon={<HelpOutlineIcon />} sx={{ display: { xs: 'none', sm: 'flex' } }} variant="outlined">
          How it works
        </MuiButton>
      </Box>

      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, mb: 3 }}>
        <MetricCard detail="All time" icon={<ArticleOutlinedIcon />} label="Total Applications" value={applications.length} />
        <MetricCard detail={`${applications.length ? Math.round((counts.applied / applications.length) * 100) : 0}% of total`} icon={<CheckCircleIcon />} label="Marked as applied" value={counts.applied} />
        <MetricCard detail={`${applications.length ? Math.round((counts.progress / applications.length) * 100) : 0}% of total`} icon={<SendOutlinedIcon />} label="In progress" value={counts.progress} />
        <MetricCard detail={`${applications.length ? Math.round((counts.stopped / applications.length) * 100) : 0}% of total`} icon={<RemoveCircleOutlineIcon />} label="Stopped / Paused" value={counts.stopped} />
      </Box>

      <Box sx={{ alignItems: { md: 'center' }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, justifyContent: 'space-between', mb: 2 }}>
        <TextField
          InputProps={{ startAdornment: <SearchOutlinedIcon color="action" sx={{ mr: 1 }} /> }}
          onChange={(event) => updateFilter(setQuery, event.target.value)}
          placeholder="Search by job title, company or source..."
          size="small"
          sx={{ maxWidth: { md: 430 }, width: '100%' }}
          value={query}
        />
        <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', md: 'auto' } }}>
          <TextField onChange={(event) => updateFilter(setStatus, event.target.value)} select size="small" sx={{ flex: 1, minWidth: 140 }} value={status}>
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="applied">Applied</MenuItem>
            <MenuItem value="progress">In progress</MenuItem>
            <MenuItem value="stopped">Stopped</MenuItem>
          </TextField>
          <TextField onChange={(event) => updateFilter(setTimeRange, event.target.value)} select size="small" sx={{ flex: 1, minWidth: 120 }} value={timeRange}>
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="7">Last 7 days</MenuItem>
            <MenuItem value="30">Last 30 days</MenuItem>
            <MenuItem value="90">Last 90 days</MenuItem>
          </TextField>
          <TextField onChange={(event) => updateFilter(setSort, event.target.value)} select size="small" sx={{ flex: 1, minWidth: 110 }} value={sort}>
            <MenuItem value="newest">Newest</MenuItem>
            <MenuItem value="oldest">Oldest</MenuItem>
          </TextField>
        </Box>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : isError ? (
        <Alert action={<MuiButton color="inherit" onClick={() => void refetch()}>Retry</MuiButton>} severity="error">
          We couldn&apos;t load your assisted applications.
        </Alert>
      ) : visible.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }} variant="outlined">
          <Typography fontWeight={700} sx={{ mb: 1 }}>No assisted applications found.</Typography>
          <MuiButton component={RouterLink} to={ROUTES.JOB_FEED} variant="contained">Browse jobs</MuiButton>
        </Paper>
      ) : (
        <Paper sx={{ overflow: 'hidden' }} variant="outlined">
          <Box sx={{ bgcolor: 'grey.50', display: { xs: 'none', md: 'grid' }, gridTemplateColumns: 'minmax(0, 1.7fr) minmax(210px, .9fr) 150px 48px', px: 2.5, py: 1.5 }}>
            {['APPLICATION', 'STATUS', 'LAST UPDATED', ''].map((label) => <Typography color="text.secondary" fontWeight={700} key={label || 'actions'} variant="caption">{label}</Typography>)}
          </Box>
          {visible.map((application, index) => {
            const state = toAssistedApplyView(application.status);
            return (
              <Box key={application.id}>
                {index ? <Divider /> : null}
                <Box
                  onClick={() => openApplication(application)}
                  role="button"
                  sx={{
                    alignItems: { md: 'center' },
                    cursor: 'pointer',
                    display: 'grid',
                    gap: 1.5,
                    gridTemplateColumns: { xs: '1fr auto', md: 'minmax(0, 1.7fr) minmax(210px, .9fr) 150px 48px' },
                    p: 2.5,
                    '&:hover': { bgcolor: 'grey.50' },
                  }}
                  tabIndex={0}
                >
                  <Box sx={{ alignItems: 'center', display: 'flex', gap: 1.5, minWidth: 0 }}>
                    <Box sx={{ alignItems: 'center', bgcolor: 'primary.50', borderRadius: 2, color: 'primary.main', display: 'flex', flexShrink: 0, fontSize: 18, fontWeight: 800, height: 48, justifyContent: 'center', width: 48 }}>
                      {(application.companySlug ?? 'C').slice(0, 1).toUpperCase()}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={700} noWrap>{application.jobTitle ?? 'Untitled job'}</Typography>
                      <Typography color="text.secondary" noWrap variant="body2">{application.companySlug ?? 'Unknown company'}</Typography>
                      <Typography color="text.secondary" variant="caption">Started {new Date(application.createdAt).toLocaleDateString()}</Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Chip color={statusColor(state)} label={labelForViewState(state)} size="small" />
                    {state === 'OPENED' ? <MuiButton onClick={(event) => { event.stopPropagation(); openApplication(application); }} size="small" sx={{ ml: 1 }} variant="outlined">Resume</MuiButton> : null}
                  </Box>
                  <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
                    <Typography fontWeight={600} variant="body2">{formatListRelativeTime(application.updatedAt)}</Typography>
                    <Typography color="text.secondary" variant="caption">{new Date(application.updatedAt).toLocaleDateString()}</Typography>
                  </Box>
                  <IconButton aria-label={`Open ${application.jobTitle ?? 'application'}`} onClick={(event) => { event.stopPropagation(); openApplication(application); }}>
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              </Box>
            );
          })}
        </Paper>
      )}

      <Paper sx={{ alignItems: 'center', bgcolor: 'primary.50', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'space-between', mt: 2, p: 2.5 }} variant="outlined">
        <Box>
          <Typography fontWeight={700}>Keep your progress safe</Typography>
          <Typography color="text.secondary" variant="body2">Your applications are saved automatically. Resume anytime and never lose track.</Typography>
        </Box>
        <MuiButton component={RouterLink} to={ROUTES.DASHBOARD} variant="contained">Explore Dashboard</MuiButton>
      </Paper>

      <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Typography color="text.secondary" variant="caption">
          Showing {filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0} to {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} applications
        </Typography>
        <Box sx={{ alignItems: 'center', display: 'flex', gap: 0.5 }}>
          <IconButton disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><NavigateBeforeIcon /></IconButton>
          {Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 5).map((pageNumber) => (
            <MuiButton key={pageNumber} onClick={() => setPage(pageNumber)} size="small" sx={{ minWidth: 36 }} variant={pageNumber === safePage ? 'contained' : 'text'}>{pageNumber}</MuiButton>
          ))}
          <IconButton disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}><NavigateNextIcon /></IconButton>
        </Box>
      </Box>
    </Box>
  );
}
