import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useApplicationReadiness } from '@/features/auto-apply/hooks/useApplicationReadiness';
import { useLatestJobAnalysis } from '@/features/auto-apply/hooks/useJobPageAnalysis';
import { usePrepareApplication } from '@/features/auto-apply/hooks/usePrepareApplication';

import { ROUTES } from '@/constants/routes';
import type { ProfileJobMatchDto } from '@/features/auto-apply/types/autoApply.types';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AutoAwesomeOutlinedIcon,
  Box,
  BusinessCenterOutlinedIcon,
  CheckCircleOutlineIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  ErrorOutlineIcon,
  ExpandMoreIcon,
  HelpOutlineIcon,
  InfoOutlinedIcon,
  LocationOnOutlinedIcon,
  MuiButton,
  NetworkCheckOutlinedIcon,
  PersonOutlineIcon,
  RemoveCircleOutlineIcon,
  SecurityOutlinedIcon,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
  VerifiedUserOutlinedIcon,
  WarningAmberOutlinedIcon,
  WorkOutlineOutlinedIcon,
  ArrowForwardIcon,
} from '@/lib/material';
import { trackEvent } from '@/shared/analytics/trackEvent';

import {
  mapRequirementToViewModel,
  type RequirementViewModel,
} from './analysisRequirementViewModel';
import {
  toFitViewModel,
  type FitDimensionViewModel,
  type FitIssueViewModel,
  type FitViewModel,
} from './profileMatchViewModel';
import { assistedApplyWorkspaceSx } from './styles';
import { assistedApplyTouchTargetSx, WorkspaceStickyActions } from './WorkspaceStickyActions';

type FitSubTab = 'overview' | 'eligibility' | 'role' | 'skills' | 'requirements' | 'missing';

function formatWorkplaceMode(mode: string): string {
  const normalized = mode.replaceAll('_', ' ').toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function statusChipColor(status: string): 'success' | 'warning' | 'error' | 'default' | 'info' {
  switch (status) {
    case 'MATCH':
    case 'ELIGIBLE':
    case 'CONFIRMED':
      return 'success';
    case 'PARTIAL':
    case 'INFORMATION_REQUIRED':
    case 'UNKNOWN':
      return 'warning';
    case 'GAP':
    case 'NO_MATCH':
    case 'NOT_ELIGIBLE':
      return 'error';
    case 'NOT_APPLICABLE':
      return 'default';
    default:
      return 'info';
  }
}

function DimensionIcon({ id }: { id: string }) {
  const sx = { fontSize: 20, color: 'text.secondary', flexShrink: 0 } as const;
  switch (id) {
    case 'ROLE':
    case 'role':
      return <BusinessCenterOutlinedIcon sx={sx} />;
    case 'SKILLS':
    case 'skills':
      return <AutoAwesomeOutlinedIcon sx={sx} />;
    case 'EXPERIENCE':
    case 'experience':
      return <WorkOutlineOutlinedIcon sx={sx} />;
    case 'LOCATION':
    case 'location':
      return <LocationOnOutlinedIcon sx={sx} />;
    case 'WORK_AUTHORIZATION':
    case 'workAuth':
      return <VerifiedUserOutlinedIcon sx={sx} />;
    case 'SPONSORSHIP':
    case 'sponsorship':
      return <PersonOutlineIcon sx={sx} />;
    default:
      return <InfoOutlinedIcon sx={sx} />;
  }
}

function MatchDonut({ pct, label }: { pct: number | null; label: string }) {
  const value = pct ?? 0;
  const color =
    pct == null
      ? 'text.disabled'
      : pct >= 70
        ? 'success.main'
        : pct >= 45
          ? 'warning.main'
          : 'error.main';

  return (
    <Box sx={{ position: 'relative', width: 140, height: 140, mx: 'auto', flexShrink: 0 }}>
      <CircularProgress
        aria-hidden
        size={140}
        sx={{ color: 'action.hover', position: 'absolute', inset: 0 }}
        thickness={4.5}
        value={100}
        variant="determinate"
      />
      <CircularProgress
        aria-label={`Profile alignment ${pct == null ? 'unavailable' : `${pct} percent`}, ${label}`}
        size={140}
        sx={{ color, position: 'absolute', inset: 0 }}
        thickness={4.5}
        value={value}
        variant="determinate"
      />
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ position: 'absolute', inset: 0, textAlign: 'center', px: 1 }}
      >
        <Typography fontWeight={800} variant="h5">
          {pct == null ? '—' : `${pct}%`}
        </Typography>
        <Typography color="text.secondary" variant="caption">
          {label}
        </Typography>
      </Stack>
    </Box>
  );
}

function DimensionStatusList({ dimensions }: { dimensions: FitDimensionViewModel[] }) {
  return (
    <Stack spacing={1.25} sx={{ mt: { xs: 0, lg: 2 }, width: '100%' }}>
      {dimensions.map((dim) => (
        <Box key={dim.id}>
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Typography variant="body2">{dim.label}</Typography>
            <Typography
              color={
                dim.severity === 'HARD_BLOCKER'
                  ? 'error.main'
                  : dim.severity === 'INFORMATION_REQUIRED'
                    ? 'warning.main'
                    : 'text.secondary'
              }
              fontWeight={600}
              variant="caption"
            >
              {dim.score != null ? `${dim.score}%` : dim.statusLabel}
            </Typography>
          </Stack>
          <Typography
            color="text.secondary"
            sx={{ mt: 0.25, overflowWrap: 'anywhere' }}
            variant="caption"
          >
            {dim.summary}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

function KpiCard({
  title,
  value,
  hint,
  tone = 'default',
  icon,
}: {
  title: string;
  value: string;
  hint: string;
  tone?: 'default' | 'success' | 'warning' | 'error';
  icon: ReactNode;
}) {
  const valueColor =
    tone === 'success'
      ? 'success.main'
      : tone === 'warning'
        ? 'warning.main'
        : tone === 'error'
          ? 'error.main'
          : 'text.primary';

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.5,
        p: 1.5,
        minWidth: 0,
        bgcolor: 'background.paper',
      }}
    >
      <Stack alignItems="flex-start" direction="row" justifyContent="space-between" spacing={1}>
        <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }} variant="caption">
          {title}
        </Typography>
        <Box aria-hidden sx={{ color: 'text.secondary', display: 'flex', lineHeight: 0 }}>
          {icon}
        </Box>
      </Stack>
      <Typography
        fontWeight={700}
        sx={{ mt: 0.5, color: valueColor, overflowWrap: 'anywhere' }}
        variant="subtitle1"
      >
        {value}
      </Typography>
      <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }} variant="caption">
        {hint}
      </Typography>
    </Box>
  );
}

function DimensionRow({
  dim,
  defaultExpanded,
}: {
  dim: FitDimensionViewModel;
  defaultExpanded?: boolean;
}) {
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.5,
        overflow: 'hidden',
        '&:before': { display: 'none' },
        bgcolor: 'background.paper',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          minHeight: 56,
          px: 1.5,
          '& .MuiAccordionSummary-content': { my: 1.25 },
        }}
      >
        <Stack
          alignItems="center"
          direction="row"
          spacing={1.25}
          sx={{ width: '100%', pr: 0.5, minWidth: 0 }}
        >
          <DimensionIcon id={dim.id} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack
              alignItems="center"
              direction="row"
              flexWrap="wrap"
              justifyContent="space-between"
              spacing={1}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={600} variant="subtitle2">
                  {dim.label}
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ display: { xs: 'none', sm: 'block' } }}
                  variant="caption"
                >
                  {dim.description}
                </Typography>
              </Box>
              <Chip
                color={statusChipColor(dim.status)}
                label={dim.statusLabel}
                size="small"
                variant="outlined"
              />
            </Stack>
            <Typography
              color="text.secondary"
              sx={{ display: { xs: 'none', md: 'block' }, mt: 0.5, overflowWrap: 'anywhere' }}
              variant="body2"
            >
              {dim.summary}
            </Typography>
          </Box>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
        <Stack spacing={0.75}>
          <Typography
            color="text.secondary"
            sx={{ display: { xs: 'block', md: 'none' } }}
            variant="body2"
          >
            {dim.summary}
          </Typography>
          {dim.score != null ? <Typography variant="body2">Score: {dim.score}%</Typography> : null}
          {dim.evidence.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              No additional evidence for this dimension yet.
            </Typography>
          ) : (
            dim.evidence.map((line) => (
              <Typography key={line} sx={{ wordBreak: 'break-word' }} variant="body2">
                {line}
              </Typography>
            ))
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function SideCard({
  title,
  children,
  collapsible = false,
  defaultExpanded = true,
}: {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  if (collapsible) {
    return (
      <Accordion
        defaultExpanded={defaultExpanded}
        disableGutters
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1.5,
          '&:before': { display: 'none' },
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={700} variant="subtitle2">
            {title}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>{children}</AccordionDetails>
      </Accordion>
    );
  }

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, p: 1.75 }}>
      <Typography fontWeight={700} sx={{ mb: 1 }} variant="subtitle2">
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function IssueCard({
  issue,
  tone,
}: {
  issue: FitIssueViewModel;
  tone: 'error' | 'warning' | 'info';
}) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: `${tone}.light`,
        borderRadius: 1.5,
        p: 1.5,
        bgcolor: tone === 'error' ? 'error.50' : tone === 'warning' ? 'warning.50' : 'transparent',
      }}
    >
      <Typography fontWeight={600} variant="subtitle2">
        {issue.title}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, wordBreak: 'break-word' }} variant="body2">
        {issue.message}
      </Typography>
      {issue.evidence.map((row) => (
        <Typography
          color="text.secondary"
          key={`${row.label}-${row.value}`}
          sx={{ mt: 0.5, wordBreak: 'break-word' }}
          variant="caption"
          component="div"
        >
          <strong>{row.label}:</strong> {row.value}
        </Typography>
      ))}
      {issue.impact ? (
        <Typography color="text.secondary" sx={{ mt: 0.75 }} variant="caption" component="div">
          Impact: {issue.impact}
        </Typography>
      ) : null}
      {issue.action ? (
        <MuiButton
          component={RouterLink}
          size="small"
          sx={{ mt: 1, ...assistedApplyTouchTargetSx }}
          to={issue.action.route}
          variant="outlined"
        >
          {issue.action.label}
        </MuiButton>
      ) : null}
    </Box>
  );
}

function FitSkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton height={72} variant="rounded" />
      <Skeleton height={64} variant="rounded" />
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            xl: 'minmax(220px, 280px) minmax(0, 1fr) minmax(240px, 300px)',
          },
        }}
      >
        <Skeleton height={280} variant="rounded" />
        <Skeleton height={360} variant="rounded" />
        <Skeleton height={280} variant="rounded" />
      </Box>
    </Stack>
  );
}

function SummaryColumn({
  title,
  count,
  tone,
  empty,
  children,
}: {
  title: string;
  count: number;
  tone: 'error' | 'warning' | 'success';
  empty: string;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: `${tone}.light`,
        borderRadius: 1.5,
        p: 1.5,
        minWidth: 0,
        bgcolor: 'background.paper',
      }}
    >
      <Typography color={`${tone}.main`} fontWeight={700} variant="subtitle2">
        {count} {title}
      </Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {count === 0 ? (
          <Typography color="text.secondary" variant="body2">
            {empty}
          </Typography>
        ) : (
          children
        )}
      </Stack>
    </Box>
  );
}

function ProfileMatchContent({
  view,
  jobTitle,
  company,
  workplaceMode,
  viewLabel,
  onBack,
  onContinue,
  requirementViews,
  onSelectResume,
  onViewDetails,
}: {
  view: FitViewModel;
  jobTitle: string | null;
  company: string | null;
  workplaceMode: string | null;
  viewLabel: string;
  onBack: () => void;
  onContinue: () => void;
  requirementViews: RequirementViewModel[];
  onSelectResume?: () => void;
  onViewDetails?: () => void;
}) {
  const [subTab, setSubTab] = useState<FitSubTab>('overview');
  const [howOpen, setHowOpen] = useState(false);

  const bannerIcon =
    view.banner.tone === 'success' ? (
      <CheckCircleOutlineIcon color="success" />
    ) : view.banner.tone === 'error' ? (
      <ErrorOutlineIcon color="error" />
    ) : view.banner.tone === 'warning' ? (
      <WarningAmberOutlinedIcon color="warning" />
    ) : (
      <InfoOutlinedIcon color="info" />
    );

  const eligibilityTone: 'success' | 'warning' | 'error' =
    view.eligibility.status === 'ELIGIBLE'
      ? 'success'
      : view.eligibility.status === 'NOT_ELIGIBLE'
        ? 'error'
        : 'warning';

  const hardBlockerCount = view.hardBlockers.length;
  const infoRequiredCount = view.informationRequired.length;

  return (
    <Stack spacing={2} sx={assistedApplyWorkspaceSx.stepRoot}>
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1.5,
          p: { xs: 1.5, sm: 2 },
          bgcolor: 'background.paper',
        }}
      >
        <Stack
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Stack alignItems="flex-start" direction="row" spacing={1.5}>
            <Box
              aria-hidden
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1.25,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {(company ?? jobTitle ?? 'J').slice(0, 1).toUpperCase()}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                fontWeight={700}
                sx={assistedApplyWorkspaceSx.overflowWrap}
                variant="subtitle1"
              >
                {jobTitle ?? 'Job'}
              </Typography>
              <Typography
                color="text.secondary"
                sx={assistedApplyWorkspaceSx.overflowWrap}
                variant="body2"
              >
                {[company, workplaceMode ? formatWorkplaceMode(workplaceMode) : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>
            </Box>
          </Stack>
          <Chip color="default" label={viewLabel || 'Tracking'} size="small" variant="outlined" />
        </Stack>
      </Box>

      {view.completedMode ? (
        <Alert severity="info" sx={{ borderRadius: 1.5 }}>
          <Typography fontWeight={700} variant="subtitle2">
            Application submitted manually
          </Typography>
          <Typography variant="body2">
            This profile and eligibility evaluation is retained from when the application was
            prepared.
          </Typography>
        </Alert>
      ) : null}

      <Alert
        action={
          <MuiButton
            color="inherit"
            fullWidth
            onClick={() => setHowOpen(true)}
            size="small"
            startIcon={<InfoOutlinedIcon fontSize="small" />}
            sx={{
              ...assistedApplyTouchTargetSx,
              ...assistedApplyWorkspaceSx.fullWidthMobileButton,
            }}
          >
            Why this matters
          </MuiButton>
        }
        icon={bannerIcon}
        severity={view.banner.tone}
        sx={{ ...assistedApplyWorkspaceSx.alertWithAction, borderRadius: 1.5 }}
      >
        <Typography fontWeight={700} variant="subtitle2">
          {view.banner.title}
        </Typography>
        <Typography variant="body2">{view.banner.body}</Typography>
      </Alert>

      {!view.navigation.canOpenEmployerHandoff && !view.completedMode ? (
        <Alert role="status" severity="warning" sx={{ borderRadius: 1.5 }} variant="outlined">
          <Typography fontWeight={600} variant="subtitle2">
            Employer handoff is currently blocked
          </Typography>
          <Typography variant="body2">
            You can still review your resume and the role analysis.
            {view.navigation.handoffBlockedReasons.length > 0
              ? ` ${view.navigation.handoffBlockedReasons.slice(0, 3).join(' ')}`
              : ' Mandatory conditions or missing information must be resolved first.'}
          </Typography>
        </Alert>
      ) : null}

      {view.recommendationContextPct != null ? (
        <Alert severity="info" sx={{ borderRadius: 1.5 }} variant="outlined">
          <Typography variant="body2">
            Previous recommendation score (context only):{' '}
            <strong>{view.recommendationContextPct}%</strong> — this is general recommendation
            context, not your application-specific profile match.
          </Typography>
        </Alert>
      ) : null}

      <Dialog fullWidth maxWidth="sm" onClose={() => setHowOpen(false)} open={howOpen}>
        <DialogTitle>How Fit &amp; Eligibility works</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1.5 }} variant="body2">
            Alignment shows how closely your verified profile resembles the role. Eligibility shows
            whether mandatory conditions are satisfied. Resume review stays available even when you
            are not eligible; employer handoff uses a separate readiness check.
          </Typography>
          <Stack spacing={0.75}>
            {(
              [
                ['Verified Profile', view.sources.verifiedProfile],
                ['Answer Vault', view.sources.answerVault],
                ['Stored Job Data', view.sources.storedJobData],
                ['Job Page Analysis', view.sources.jobPageAnalysis],
              ] as const
            ).map(([label, used]) => (
              <Typography key={label} variant="body2">
                {used ? '✓' : '○'} {label}
                {!used ? ' (not available for this match)' : ''}
              </Typography>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(0, 1fr) minmax(240px, 300px)',
            xl: 'minmax(220px, 280px) minmax(0, 1fr) minmax(240px, 300px)',
          },
          alignItems: 'start',
          '& > *': { minWidth: 0 },
        }}
      >
        <Stack
          spacing={2}
          sx={{ gridColumn: { md: '1 / -1', xl: 'auto' }, order: { xs: 1, xl: 0 } }}
        >
          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.5,
              p: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Typography fontWeight={700} sx={{ mb: 1 }} variant="subtitle2">
              Profile Alignment
            </Typography>
            <Stack
              alignItems={{ xs: 'stretch', sm: 'center', lg: 'stretch' }}
              direction={{ xs: 'column', sm: 'row', lg: 'column' }}
              spacing={2}
            >
              <MatchDonut label={view.alignment.labelText} pct={view.alignment.pct} />
              <Box sx={{ flex: 1, width: '100%', minWidth: 0 }}>
                <DimensionStatusList dimensions={view.dimensions} />
              </Box>
            </Stack>
          </Box>

          <SideCard title="Data sources used">
            <Stack spacing={0.75}>
              {(
                [
                  ['Verified Profile', view.sources.verifiedProfile],
                  ['Answer Vault', view.sources.answerVault],
                  ['Stored Job Data', view.sources.storedJobData],
                  ['Job Page Analysis', view.sources.jobPageAnalysis],
                ] as const
              ).map(([label, ok]) => (
                <Stack alignItems="center" direction="row" key={label} spacing={1}>
                  {ok ? (
                    <CheckCircleOutlineIcon
                      aria-label={`${label} used`}
                      color="success"
                      sx={{ fontSize: 18 }}
                    />
                  ) : (
                    <InfoOutlinedIcon
                      aria-label={`${label} not available`}
                      color="disabled"
                      sx={{ fontSize: 18 }}
                    />
                  )}
                  <Typography color={ok ? 'text.primary' : 'text.secondary'} variant="body2">
                    {label}
                  </Typography>
                </Stack>
              ))}
              {view.updatedAt ? (
                <Typography color="text.secondary" sx={{ pt: 0.5 }} variant="caption">
                  Last updated {new Date(view.updatedAt).toLocaleString()}
                </Typography>
              ) : null}
            </Stack>
          </SideCard>
        </Stack>

        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1.5,
            minWidth: 0,
            p: { xs: 1.5, sm: 2 },
            bgcolor: 'background.paper',
            order: { xs: 2, xl: 0 },
            width: '100%',
          }}
        >
          <Tabs
            allowScrollButtonsMobile
            aria-label="Fit details"
            onChange={(_e, value: FitSubTab) => setSubTab(value)}
            scrollButtons="auto"
            sx={{
              mb: 2,
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': { minHeight: 44, minWidth: 'auto', px: 1.5, textTransform: 'none' },
            }}
            value={subTab}
            variant="scrollable"
          >
            <Tab label="Overview" value="overview" />
            <Tab label="Eligibility" value="eligibility" />
            <Tab label="Role & Experience" value="role" />
            <Tab label="Skills" value="skills" />
            <Tab label="Requirements" value="requirements" />
            <Tab label="What’s Missing" value="missing" />
          </Tabs>

          {subTab === 'overview' ? (
            <Stack spacing={2}>
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.25,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                  },
                }}
              >
                <KpiCard
                  hint={view.alignment.labelText}
                  icon={
                    <CircularProgress
                      size={16}
                      thickness={5}
                      value={view.alignment.pct ?? 0}
                      variant="determinate"
                    />
                  }
                  title="Profile Alignment"
                  value={view.alignment.pct == null ? '—' : `${view.alignment.pct}%`}
                />
                <KpiCard
                  hint={
                    hardBlockerCount > 0
                      ? `${hardBlockerCount} hard blocker${hardBlockerCount === 1 ? '' : 's'}`
                      : infoRequiredCount > 0
                        ? 'Need your input'
                        : 'No blockers found'
                  }
                  icon={<SecurityOutlinedIcon sx={{ fontSize: 18 }} />}
                  title="Eligibility Status"
                  tone={eligibilityTone}
                  value={view.eligibility.label}
                />
                <KpiCard
                  hint={view.confidence.explanation}
                  icon={<NetworkCheckOutlinedIcon sx={{ fontSize: 18 }} />}
                  title="Confidence"
                  tone={
                    view.confidence.level === 'HIGH'
                      ? 'success'
                      : view.confidence.level === 'MEDIUM'
                        ? 'warning'
                        : 'error'
                  }
                  value={
                    view.confidence.level.charAt(0) + view.confidence.level.slice(1).toLowerCase()
                  }
                />
                <KpiCard
                  hint={
                    infoRequiredCount === 0
                      ? 'No missing required facts'
                      : 'Missing or unconfirmed facts'
                  }
                  icon={<HelpOutlineIcon sx={{ fontSize: 18 }} />}
                  title="Information Required"
                  tone={infoRequiredCount === 0 ? 'success' : 'warning'}
                  value={
                    infoRequiredCount === 0
                      ? 'None'
                      : `${infoRequiredCount} item${infoRequiredCount === 1 ? '' : 's'}`
                  }
                />
              </Box>

              <Typography fontWeight={700} variant="subtitle2">
                Summary of Fit
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.25,
                  gridTemplateColumns: { xs: '1fr', xl: 'repeat(3, minmax(0, 1fr))' },
                }}
              >
                <SummaryColumn
                  count={hardBlockerCount}
                  empty="No hard blockers."
                  title={hardBlockerCount === 1 ? 'Hard blocker' : 'Hard blockers'}
                  tone="error"
                >
                  {view.hardBlockers.slice(0, 4).map((issue) => (
                    <IssueCard issue={issue} key={`${issue.code}-${issue.message}`} tone="error" />
                  ))}
                </SummaryColumn>
                <SummaryColumn
                  count={infoRequiredCount}
                  empty="No mandatory information missing."
                  title="Information required"
                  tone="warning"
                >
                  {view.informationRequired.slice(0, 4).map((issue) => (
                    <IssueCard
                      issue={issue}
                      key={`${issue.code}-${issue.message}`}
                      tone="warning"
                    />
                  ))}
                </SummaryColumn>
                <SummaryColumn
                  count={view.confirmedStrengths.length}
                  empty="No confirmed strengths yet."
                  title={view.confirmedStrengths.length === 1 ? 'Strength' : 'Strengths'}
                  tone="success"
                >
                  {view.confirmedStrengths.slice(0, 4).map((item) => (
                    <Stack alignItems="flex-start" direction="row" key={item} spacing={1}>
                      <CheckCircleOutlineIcon
                        aria-hidden
                        color="success"
                        sx={{ fontSize: 18, mt: 0.2, flexShrink: 0 }}
                      />
                      <Typography variant="body2">{item}</Typography>
                    </Stack>
                  ))}
                </SummaryColumn>
              </Box>

              {view.advisoryGaps.length > 0 ? (
                <Alert severity="info" sx={{ overflowWrap: 'anywhere' }} variant="outlined">
                  <Typography fontWeight={600} variant="subtitle2">
                    Advisory gaps ({view.advisoryGaps.length})
                  </Typography>
                  <Typography variant="body2">
                    These do not block resume review or employer handoff. Skills not confirmed from
                    your profile are reviewed in the Resume step.
                  </Typography>
                </Alert>
              ) : null}

              <Alert severity="info" variant="outlined">
                Resume matching is the next step. We&apos;ll compare your resume against these
                requirements.
              </Alert>
            </Stack>
          ) : null}

          {subTab === 'eligibility' ? (
            <Stack spacing={1.25}>
              {view.eligibilityChecklist.map((row) => (
                <Box
                  key={row.title}
                  sx={{
                    border: 1,
                    borderColor: row.blocking ? 'error.light' : 'divider',
                    borderRadius: 1.5,
                    p: 1.5,
                    bgcolor: row.blocking ? 'error.50' : 'transparent',
                  }}
                >
                  <Stack
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Typography
                      fontWeight={600}
                      sx={assistedApplyWorkspaceSx.overflowWrap}
                      variant="subtitle2"
                    >
                      {row.title}
                    </Typography>
                    <Chip
                      color={row.blocking ? 'error' : 'success'}
                      label={row.statusLabel}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                  <Typography color="text.secondary" sx={{ mt: 0.75 }} variant="body2">
                    <strong>Job requirement:</strong> {row.jobRequirement}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    <strong>Candidate value:</strong> {row.candidateValue}
                  </Typography>
                  {row.summary ? (
                    <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
                      {row.summary}
                    </Typography>
                  ) : null}
                  <Typography
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                    variant="caption"
                    component="div"
                  >
                    Impact: {row.impact}
                  </Typography>
                  {row.actionHref && row.actionLabel ? (
                    <MuiButton
                      component={RouterLink}
                      size="small"
                      sx={{ mt: 1, ...assistedApplyTouchTargetSx }}
                      to={row.actionHref}
                      variant="outlined"
                    >
                      {row.actionLabel}
                    </MuiButton>
                  ) : null}
                </Box>
              ))}
            </Stack>
          ) : null}

          {subTab === 'role' ? (
            <Stack spacing={1}>
              {view.dimensions
                .filter((d) => d.id === 'ROLE' || d.id === 'EXPERIENCE')
                .map((dim) => (
                  <DimensionRow defaultExpanded dim={dim} key={dim.id} />
                ))}
            </Stack>
          ) : null}

          {subTab === 'skills' ? (
            <Stack spacing={1.5}>
              <Alert severity="info">
                Skills evidence comes only from your verified application profile and Answer Vault.
                Resume-based matching happens in the next step. Unconfirmed skills are not confirmed
                gaps.
              </Alert>
              {view.dimensions
                .filter((d) => d.id === 'SKILLS')
                .map((dim) => (
                  <DimensionRow defaultExpanded dim={dim} key={dim.id} />
                ))}
              <Box>
                <Typography fontWeight={600} variant="subtitle2">
                  Confirmed profile skills
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {view.skillsMatched.length > 0
                    ? view.skillsMatched.join(', ')
                    : 'None confirmed from your verified profile.'}
                </Typography>
              </Box>
              <Box>
                <Typography fontWeight={600} variant="subtitle2">
                  Unconfirmed skills
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {view.skillsUnknown.length > 0
                    ? view.skillsUnknown.join(', ')
                    : 'No unconfirmed skills listed.'}
                </Typography>
                {view.skillsUnknown.length > 0 ? (
                  <Typography
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                    variant="caption"
                    component="div"
                  >
                    Status: Not confirmed · Checked in Resume step
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          ) : null}

          {subTab === 'requirements' ? (
            <Stack spacing={1.25}>
              {requirementViews.length === 0 ? (
                <Alert severity="info">
                  No structured requirements were extracted from the job page analysis yet.
                </Alert>
              ) : (
                requirementViews.map((req) => (
                  <Box
                    key={req.code}
                    sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, p: 1.5 }}
                  >
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Typography fontWeight={600} variant="subtitle2">
                        {req.title}
                      </Typography>
                      <Chip
                        label={req.requiredLabel}
                        size="small"
                        variant="outlined"
                        color={req.required ? 'warning' : 'default'}
                      />
                    </Stack>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
                      {req.operatorLabel}: {req.valueLabel}
                    </Typography>
                    <Typography
                      color="text.secondary"
                      sx={{ mt: 0.5, wordBreak: 'break-word' }}
                      variant="body2"
                    >
                      Evidence: {req.evidence}
                    </Typography>
                    {req.confidencePercent != null ? (
                      <Typography color="text.secondary" variant="caption" component="div">
                        Confidence: {req.confidencePercent}%
                      </Typography>
                    ) : null}
                  </Box>
                ))
              )}
            </Stack>
          ) : null}

          {subTab === 'missing' ? (
            <Stack spacing={1.25}>
              {hardBlockerCount === 0 &&
              infoRequiredCount === 0 &&
              view.advisoryGaps.length === 0 ? (
                <Alert severity="success">No unresolved issues for this fit evaluation.</Alert>
              ) : null}
              {hardBlockerCount > 0 ? (
                <Box>
                  <Typography fontWeight={700} sx={{ mb: 1 }} variant="subtitle2">
                    Hard blockers
                  </Typography>
                  <Stack spacing={1}>
                    {view.hardBlockers.map((issue) => (
                      <IssueCard
                        issue={issue}
                        key={`missing-hard-${issue.code}-${issue.message}`}
                        tone="error"
                      />
                    ))}
                  </Stack>
                </Box>
              ) : null}
              {infoRequiredCount > 0 ? (
                <Box>
                  <Typography fontWeight={700} sx={{ mb: 1 }} variant="subtitle2">
                    Information required
                  </Typography>
                  <Stack spacing={1}>
                    {view.informationRequired.map((issue) => (
                      <IssueCard
                        issue={issue}
                        key={`missing-info-${issue.code}-${issue.message}`}
                        tone="warning"
                      />
                    ))}
                  </Stack>
                </Box>
              ) : null}
              {view.advisoryGaps.length > 0 ? (
                <Box>
                  <Typography fontWeight={700} sx={{ mb: 1 }} variant="subtitle2">
                    Advisory gaps
                  </Typography>
                  <Stack spacing={1}>
                    {view.advisoryGaps.map((issue) => (
                      <IssueCard
                        issue={issue}
                        key={`missing-adv-${issue.code}-${issue.message}`}
                        tone="info"
                      />
                    ))}
                  </Stack>
                </Box>
              ) : null}
            </Stack>
          ) : null}
        </Box>

        <Stack spacing={2} sx={{ minWidth: 0, order: { xs: 3, xl: 0 }, width: '100%' }}>
          <SideCard title="Eligibility Summary">
            <Stack spacing={1}>
              {view.eligibilityChecklist.map((row) => (
                <Stack
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  key={row.title}
                  spacing={1}
                >
                  <Typography sx={assistedApplyWorkspaceSx.overflowWrap} variant="body2">
                    {row.title}
                  </Typography>
                  <Chip
                    color={
                      row.blocking
                        ? 'error'
                        : row.statusLabel === 'Not required'
                          ? 'default'
                          : 'success'
                    }
                    label={row.statusLabel}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              ))}
            </Stack>
          </SideCard>

          <SideCard collapsible defaultExpanded title="Top Strengths">
            {view.confirmedStrengths.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                No confirmed strengths yet.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {view.confirmedStrengths.map((item) => (
                  <Stack alignItems="flex-start" direction="row" key={item} spacing={1}>
                    <SecurityOutlinedIcon
                      aria-hidden
                      color="primary"
                      sx={{ fontSize: 18, mt: 0.2, flexShrink: 0 }}
                    />
                    <Typography variant="body2">{item}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </SideCard>

          <SideCard collapsible defaultExpanded title="Key Gaps">
            {hardBlockerCount === 0 && infoRequiredCount === 0 ? (
              <Typography color="text.secondary" variant="body2">
                No blocking gaps. Advisory items are listed under What&apos;s Missing.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {[...view.hardBlockers, ...view.informationRequired].slice(0, 6).map((issue) => (
                  <Stack
                    alignItems="flex-start"
                    direction="row"
                    key={`gap-${issue.code}-${issue.message}`}
                    spacing={1}
                  >
                    <RemoveCircleOutlineIcon
                      aria-hidden
                      color={issue.severity === 'HARD_BLOCKER' ? 'error' : 'warning'}
                      sx={{ fontSize: 18, mt: 0.2, flexShrink: 0 }}
                    />
                    <Typography variant="body2">{issue.title}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </SideCard>

          <SideCard title="Next Steps">
            {view.completedMode ? (
              <Stack spacing={1}>
                <MuiButton
                  onClick={onSelectResume}
                  size="small"
                  sx={assistedApplyTouchTargetSx}
                  variant="outlined"
                >
                  View resume used
                </MuiButton>
                <MuiButton
                  component={RouterLink}
                  size="small"
                  sx={assistedApplyTouchTargetSx}
                  to={ROUTES.APPLICATIONS}
                  variant="outlined"
                >
                  View application details
                </MuiButton>
                <MuiButton
                  onClick={onViewDetails}
                  size="small"
                  sx={assistedApplyTouchTargetSx}
                  variant="text"
                >
                  Update application status
                </MuiButton>
              </Stack>
            ) : (
              <Stack component="ol" spacing={0.75} sx={{ m: 0, pl: 2 }}>
                <Typography component="li" variant="body2">
                  Review the gaps and suggestions
                </Typography>
                <Typography component="li" variant="body2">
                  Update your profile or answers
                </Typography>
                <Typography component="li" variant="body2">
                  Continue to resume review
                </Typography>
                {!view.navigation.canOpenEmployerHandoff ? (
                  <Typography component="li" variant="body2">
                    Resolve mandatory conditions before employer handoff
                  </Typography>
                ) : null}
              </Stack>
            )}
          </SideCard>
        </Stack>
      </Box>

      {!view.completedMode ? (
        <WorkspaceStickyActions>
          <Stack
            alignItems={{ xs: 'stretch', sm: 'center' }}
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            spacing={1.25}
            sx={{ width: '100%' }}
          >
            <MuiButton
              endIcon={<ArrowForwardIcon />}
              disabled={!view.navigation.canReviewResume}
              fullWidth
              onClick={onContinue}
              sx={{ ...assistedApplyTouchTargetSx, display: { xs: 'inline-flex', sm: 'none' } }}
              variant="contained"
            >
              Next: Resume
            </MuiButton>
            <MuiButton
              onClick={onBack}
              sx={{
                ...assistedApplyTouchTargetSx,
                display: { xs: 'inline-flex', sm: 'none' },
              }}
              variant="text"
            >
              Back to Analysis
            </MuiButton>
            <Typography
              color="text.secondary"
              sx={{ display: { xs: 'block', md: 'none' }, textAlign: 'center' }}
              variant="body2"
            >
              Need to make updates?{' '}
              <MuiButton
                component={RouterLink}
                size="small"
                sx={{ textTransform: 'none', verticalAlign: 'baseline', minWidth: 0, p: 0 }}
                to={`${ROUTES.AUTO_APPLY}?tab=profile`}
                variant="text"
              >
                Update my profile or answers
              </MuiButton>
            </Typography>
            {(view.eligibility.status === 'NOT_ELIGIBLE' ||
              view.eligibility.status === 'INFORMATION_REQUIRED') && (
              <Typography
                color="text.secondary"
                sx={{ display: { xs: 'block', sm: 'none' }, textAlign: 'center' }}
                variant="caption"
              >
                You can still review your resume. Employer handoff stays blocked until mandatory
                conditions are resolved.
              </Typography>
            )}

            <MuiButton
              onClick={onBack}
              startIcon={<ChevronLeftIcon />}
              sx={{ ...assistedApplyTouchTargetSx, display: { xs: 'none', sm: 'inline-flex' } }}
              variant="outlined"
            >
              Back to Analysis
            </MuiButton>
            <Typography
              color="text.secondary"
              sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'center' }}
              variant="body2"
            >
              Need to make updates?{' '}
              <MuiButton
                component={RouterLink}
                size="small"
                sx={{ textTransform: 'none', verticalAlign: 'baseline', minWidth: 0, p: 0 }}
                to={`${ROUTES.AUTO_APPLY}?tab=profile`}
                variant="text"
              >
                Update my profile or answers
              </MuiButton>
            </Typography>
            <Stack alignItems="flex-end" spacing={0.5}>
              <MuiButton
                endIcon={<ArrowForwardIcon />}
                disabled={!view.navigation.canReviewResume}
                onClick={onContinue}
                sx={{ ...assistedApplyTouchTargetSx, display: { xs: 'none', sm: 'inline-flex' } }}
                variant="contained"
              >
                Next: Resume
              </MuiButton>
              {view.eligibility.status === 'NOT_ELIGIBLE' ||
              view.eligibility.status === 'INFORMATION_REQUIRED' ? (
                <Typography
                  color="text.secondary"
                  sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: 280, textAlign: 'right' }}
                  variant="caption"
                >
                  You can still review your resume. Employer handoff stays blocked until mandatory
                  conditions are resolved.
                </Typography>
              ) : (
                <Typography
                  color="text.secondary"
                  sx={{ display: { xs: 'none', sm: 'block' } }}
                  variant="caption"
                >
                  You can always return to this step.
                </Typography>
              )}
            </Stack>
          </Stack>
        </WorkspaceStickyActions>
      ) : (
        <WorkspaceStickyActions>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: '100%' }}>
            <MuiButton
              fullWidth
              onClick={onBack}
              startIcon={<ChevronLeftIcon />}
              sx={{
                ...assistedApplyTouchTargetSx,
                ...assistedApplyWorkspaceSx.fullWidthMobileButton,
              }}
              variant="outlined"
            >
              Back to Analysis
            </MuiButton>
            <MuiButton
              component={RouterLink}
              endIcon={<ChevronRightIcon />}
              fullWidth
              sx={{
                ...assistedApplyTouchTargetSx,
                ...assistedApplyWorkspaceSx.fullWidthMobileButton,
              }}
              to={ROUTES.APPLICATIONS}
              variant="contained"
            >
              View application details
            </MuiButton>
          </Stack>
        </WorkspaceStickyActions>
      )}
    </Stack>
  );
}

export interface FitStepProps {
  jobId: string;
  jobApplicationId: string;
  onContinue: () => void;
  onBack?: () => void;
  onRefresh?: () => void;
  profileMatch?: ProfileJobMatchDto | null;
  jobTitle?: string | null;
  company?: string | null;
  workplaceMode?: string | null;
  viewLabel?: string;
  viewState?: string | null;
  applicationStatus?: string | null;
  profileMatchLoading?: boolean;
  onSelectResume?: () => void;
  onViewDetails?: () => void;
}

export function FitStep({
  jobId,
  jobApplicationId,
  onContinue,
  onBack,
  onRefresh,
  profileMatch = null,
  jobTitle = null,
  company = null,
  workplaceMode = null,
  viewLabel = 'Tracking',
  viewState = null,
  applicationStatus = null,
  profileMatchLoading = false,
  onSelectResume,
  onViewDetails,
}: FitStepProps) {
  const readinessQuery = useApplicationReadiness(jobId, 'HANDOFF', jobApplicationId);
  const analysisQuery = useLatestJobAnalysis(jobId);
  const prepareMutation = usePrepareApplication();
  const [prepareError, setPrepareError] = useState<string | null>(null);

  const view = useMemo(
    () =>
      profileMatch
        ? toFitViewModel({
            profileMatch,
            handoffReadiness: readinessQuery.data ?? null,
            applicationStatus,
            viewState,
          })
        : null,
    [profileMatch, readinessQuery.data, applicationStatus, viewState],
  );

  const requirementViews = useMemo(
    () => (analysisQuery.data?.requirements ?? []).map((item) => mapRequirementToViewModel(item)),
    [analysisQuery.data?.requirements],
  );

  useEffect(() => {
    if (!view) return;
    trackEvent('fit_panel_viewed', {
      job_id: jobId,
      alignment_label: view.alignment.label,
      eligibility: view.eligibility.status,
      has_profile_match: true,
      info_required: view.informationRequired.length,
      hard_blockers: view.hardBlockers.length,
      can_open_handoff: view.navigation.canOpenEmployerHandoff,
      completed_mode: view.completedMode,
    });
  }, [jobId, view]);

  if (profileMatchLoading || readinessQuery.isLoading) {
    return <FitSkeleton />;
  }

  if (readinessQuery.isError) {
    return (
      <Alert
        action={
          <MuiButton
            fullWidth
            onClick={() => void readinessQuery.refetch()}
            size="small"
            sx={assistedApplyWorkspaceSx.fullWidthMobileButton}
          >
            Retry
          </MuiButton>
        }
        severity="error"
        sx={assistedApplyWorkspaceSx.alertWithAction}
      >
        We couldn&apos;t load fit details for this job.
      </Alert>
    );
  }

  if (!profileMatch || !view) {
    return (
      <Stack spacing={2} sx={assistedApplyWorkspaceSx.stepRoot}>
        <Alert severity="warning">
          <Typography fontWeight={700} variant="subtitle2">
            Fit analysis is not ready
          </Typography>
          <Typography variant="body2">
            Career Copilot has not completed the profile-to-job comparison yet. This match uses your
            verified profile — not your resume.
          </Typography>
        </Alert>
        {prepareError ? <Alert severity="error">{prepareError}</Alert> : null}
        <WorkspaceStickyActions>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: '100%' }}>
            {onBack ? (
              <MuiButton
                fullWidth
                onClick={onBack}
                sx={{
                  ...assistedApplyTouchTargetSx,
                  ...assistedApplyWorkspaceSx.fullWidthMobileButton,
                }}
                variant="outlined"
              >
                Back to Analysis
              </MuiButton>
            ) : null}
            <MuiButton
              disabled={prepareMutation.isPending}
              fullWidth
              onClick={() => {
                setPrepareError(null);
                prepareMutation.mutate(
                  {
                    jobId,
                    jobApplicationId,
                    applyMode: 'ASSISTED',
                    allowMatchCompute: true,
                    forceRefreshAnalysis: true,
                  },
                  {
                    onSuccess: () => {
                      onRefresh?.();
                      void readinessQuery.refetch();
                    },
                    onError: (error) => {
                      setPrepareError(
                        error instanceof Error
                          ? error.message
                          : 'Unable to prepare this application.',
                      );
                    },
                  },
                );
              }}
              sx={{
                ...assistedApplyTouchTargetSx,
                ...assistedApplyWorkspaceSx.fullWidthMobileButton,
              }}
              variant="contained"
            >
              {prepareMutation.isPending ? 'Preparing…' : 'Retry preparation'}
            </MuiButton>
          </Stack>
        </WorkspaceStickyActions>
      </Stack>
    );
  }

  const analysisLimited = analysisQuery.data?.status === 'LIMITED';
  const analysisFailed = analysisQuery.data?.status === 'FAILED';

  return (
    <Stack spacing={2} sx={assistedApplyWorkspaceSx.stepRoot}>
      {analysisLimited || analysisFailed ? (
        <Alert severity="warning">
          Job posting analysis was {analysisLimited ? 'limited' : 'unsuccessful'}, so some
          requirements may be incomplete.
        </Alert>
      ) : null}

      <ProfileMatchContent
        company={company}
        jobTitle={jobTitle}
        onBack={onBack ?? (() => undefined)}
        onContinue={onContinue}
        onSelectResume={onSelectResume}
        onViewDetails={onViewDetails}
        requirementViews={requirementViews}
        view={view}
        viewLabel={viewLabel}
        workplaceMode={workplaceMode}
      />
    </Stack>
  );
}
