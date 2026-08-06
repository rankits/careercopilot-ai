import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useApplicationReadiness } from '@/features/auto-apply/hooks/useApplicationReadiness';
import { useLatestJobAnalysis } from '@/features/auto-apply/hooks/useJobPageAnalysis';

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
  LinearProgress,
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
  toProfileMatchViewModel,
  type FitDimensionView,
  type ProfileMatchViewModel,
} from './profileMatchViewModel';
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
    case 'role':
      return <BusinessCenterOutlinedIcon sx={sx} />;
    case 'skills':
      return <AutoAwesomeOutlinedIcon sx={sx} />;
    case 'experience':
      return <WorkOutlineOutlinedIcon sx={sx} />;
    case 'location':
      return <LocationOnOutlinedIcon sx={sx} />;
    case 'workAuth':
      return <VerifiedUserOutlinedIcon sx={sx} />;
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
        aria-label={`Overall profile match ${pct == null ? 'unavailable' : `${pct} percent`}, ${label}`}
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

function BreakdownBars({ dimensions }: { dimensions: FitDimensionView[] }) {
  return (
    <Stack spacing={1.25} sx={{ mt: { xs: 0, lg: 2 }, width: '100%' }}>
      {dimensions.map((dim) => (
        <Box key={dim.id}>
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Typography variant="body2">{dim.title}</Typography>
            <Typography color="text.secondary" variant="caption">
              {dim.scoreLabel ?? dim.statusLabel}
            </Typography>
          </Stack>
          {dim.scoreLabel === 'Not required' ? (
            <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="caption">
              Not required for this role
            </Typography>
          ) : (
            <LinearProgress
              aria-label={`${dim.title}: ${dim.scoreLabel ?? dim.statusLabel}`}
              color={
                (dim.score ?? 0) >= 70 ? 'success' : (dim.score ?? 0) >= 40 ? 'warning' : 'error'
              }
              sx={{ mt: 0.5, height: 8, borderRadius: 1 }}
              value={dim.score ?? 0}
              variant="determinate"
            />
          )}
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
        <Typography color="text.secondary" variant="caption">
          {title}
        </Typography>
        <Box aria-hidden sx={{ color: 'text.secondary', display: 'flex', lineHeight: 0 }}>
          {icon}
        </Box>
      </Stack>
      <Typography fontWeight={700} sx={{ mt: 0.5, color: valueColor }} variant="subtitle1">
        {value}
      </Typography>
      <Typography color="text.secondary" variant="caption">
        {hint}
      </Typography>
    </Box>
  );
}

function DimensionRow({
  dim,
  defaultExpanded,
}: {
  dim: FitDimensionView;
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
                  {dim.title}
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
              sx={{ display: { xs: 'none', md: 'block' }, mt: 0.5 }}
              noWrap
              variant="body2"
            >
              {dim.summary}
            </Typography>
            <Typography
              color="primary.main"
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                mt: 0.5,
                alignItems: 'center',
                gap: 0.25,
              }}
              variant="caption"
            >
              View details <ChevronRightIcon sx={{ fontSize: 14 }} />
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
          {dim.evidence.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              No additional evidence for this dimension yet.
            </Typography>
          ) : (
            dim.evidence.map((line) => (
              <Typography key={line} variant="body2">
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
            lg: 'minmax(220px, 280px) minmax(0, 1fr) minmax(240px, 300px)',
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

function ProfileMatchContent({
  view,
  jobTitle,
  company,
  workplaceMode,
  viewLabel,
  onBack,
  onContinue,
  continueDisabled,
}: {
  view: ProfileMatchViewModel;
  jobTitle: string | null;
  company: string | null;
  workplaceMode: string | null;
  viewLabel: string;
  onBack: () => void;
  onContinue: () => void;
  continueDisabled: boolean;
}) {
  const [subTab, setSubTab] = useState<FitSubTab>('overview');
  const [howOpen, setHowOpen] = useState(false);
  const [showAllGaps, setShowAllGaps] = useState(false);

  const visibleGaps = showAllGaps ? view.keyGaps : view.keyGaps.slice(0, 4);

  const bannerIcon =
    view.bannerTone === 'success' ? (
      <CheckCircleOutlineIcon color="success" />
    ) : view.bannerTone === 'error' ? (
      <ErrorOutlineIcon color="error" />
    ) : view.bannerTone === 'warning' ? (
      <WarningAmberOutlinedIcon color="warning" />
    ) : (
      <InfoOutlinedIcon color="info" />
    );

  const eligibilityTone: 'success' | 'warning' | 'error' =
    view.eligibilityStatus === 'ELIGIBLE'
      ? 'success'
      : view.eligibilityStatus === 'NOT_ELIGIBLE'
        ? 'error'
        : 'warning';

  return (
    <Stack spacing={2}>
      {/* Job summary */}
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1.5,
          p: 2,
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
              <Typography fontWeight={700} variant="subtitle1">
                {jobTitle ?? 'Job'}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {[company, workplaceMode ? formatWorkplaceMode(workplaceMode) : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>
            </Box>
          </Stack>
          <Chip color="default" label={viewLabel || 'Tracking'} size="small" variant="outlined" />
        </Stack>
      </Box>

      {/* Banner */}
      <Alert
        action={
          <MuiButton
            color="inherit"
            onClick={() => setHowOpen(true)}
            size="small"
            startIcon={<InfoOutlinedIcon fontSize="small" />}
          >
            How we match
          </MuiButton>
        }
        icon={bannerIcon}
        severity={view.bannerTone}
        sx={{ borderRadius: 1.5 }}
      >
        <Typography fontWeight={700} variant="subtitle2">
          {view.bannerTitle}
        </Typography>
        <Typography variant="body2">{view.bannerBody}</Typography>
      </Alert>

      {view.recommendationContextPct != null ? (
        <Alert severity="info" sx={{ borderRadius: 1.5 }} variant="outlined">
          <Typography variant="body2">
            Previous recommendation score (context only):{' '}
            <strong>{view.recommendationContextPct}%</strong> — this is general recommendation
            context, not your application-specific profile match.
          </Typography>
        </Alert>
      ) : null}

      <Dialog onClose={() => setHowOpen(false)} open={howOpen}>
        <DialogTitle>How we match</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1.5 }} variant="body2">
            This score compares your verified application profile and Answer Vault to this
            job&apos;s stored listing and page analysis. It does not use your resume yet.
          </Typography>
          <Stack spacing={0.75}>
            {(
              [
                ['Verified Profile', view.sourcesUsed.verifiedProfile],
                ['Answer Vault', view.sourcesUsed.answerVault],
                ['Stored Job Data', view.sourcesUsed.storedJobData],
                ['Job Page Analysis', view.sourcesUsed.jobPageAnalysis],
              ] as const
            ).map(([label, used]) => (
              <Typography key={label} variant="body2">
                {used ? '✓' : '○'} {label}
                {!used ? ' (not available for this match)' : ''}
              </Typography>
            ))}
          </Stack>
          {view.recommendationContextPct != null ? (
            <Typography color="text.secondary" sx={{ mt: 2 }} variant="caption">
              Previous general recommendation context: {view.recommendationContextPct}% (not the
              application-specific match).
            </Typography>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Main grid */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(0, 1fr) minmax(240px, 300px)',
            lg: 'minmax(220px, 280px) minmax(0, 1fr) minmax(240px, 300px)',
          },
          alignItems: 'start',
          '& > *': { minWidth: 0 },
        }}
      >
        {/* Left: overall + sources */}
        <Stack
          spacing={2}
          sx={{ gridColumn: { md: '1 / -1', lg: 'auto' }, order: { xs: 1, lg: 0 } }}
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
              Overall Profile Match
            </Typography>
            <Stack
              alignItems={{ xs: 'stretch', sm: 'center', lg: 'stretch' }}
              direction={{ xs: 'column', sm: 'row', lg: 'column' }}
              spacing={2}
            >
              <MatchDonut label={view.overallLabelText} pct={view.overallAlignmentPct} />
              <Box sx={{ flex: 1, width: '100%', minWidth: 0 }}>
                <BreakdownBars dimensions={view.dimensions} />
              </Box>
            </Stack>
          </Box>

          <SideCard title="Data sources used">
            <Stack spacing={0.75}>
              {(
                [
                  ['Verified Profile', view.sourcesUsed.verifiedProfile],
                  ['Answer Vault', view.sourcesUsed.answerVault],
                  ['Stored Job Data', view.sourcesUsed.storedJobData],
                  ['Job Page Analysis', view.sourcesUsed.jobPageAnalysis],
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

        {/* Center: tabs + details */}
        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1.5,
            p: { xs: 1.5, sm: 2 },
            bgcolor: 'background.paper',
            order: { xs: 2, lg: 0 },
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
              <Typography fontWeight={700} variant="subtitle2">
                Profile Match Summary
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.25,
                  gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, minmax(0, 1fr))' },
                }}
              >
                <KpiCard
                  hint={view.overallLabelText}
                  icon={
                    <CircularProgress
                      size={16}
                      thickness={5}
                      value={view.overallAlignmentPct ?? 0}
                      variant="determinate"
                    />
                  }
                  title="Overall Alignment"
                  value={view.overallAlignmentPct == null ? '—' : `${view.overallAlignmentPct}%`}
                />
                <KpiCard
                  hint={
                    view.eligibilityStatus === 'ELIGIBLE'
                      ? 'No blockers found'
                      : view.eligibilityStatus === 'NOT_ELIGIBLE'
                        ? 'Hard blockers found'
                        : 'Need your input'
                  }
                  icon={<SecurityOutlinedIcon sx={{ fontSize: 18 }} />}
                  title="Eligibility Status"
                  tone={eligibilityTone}
                  value={view.eligibilityLabel}
                />
                <KpiCard
                  hint={view.confidenceReason}
                  icon={<NetworkCheckOutlinedIcon sx={{ fontSize: 18 }} />}
                  title="Confidence"
                  tone={
                    view.confidence === 'HIGH'
                      ? 'success'
                      : view.confidence === 'MEDIUM'
                        ? 'warning'
                        : 'error'
                  }
                  value={view.confidence.charAt(0) + view.confidence.slice(1).toLowerCase()}
                />
                <KpiCard
                  hint={
                    view.informationRequiredCount === 0
                      ? 'No missing required facts'
                      : 'Need your input'
                  }
                  icon={<HelpOutlineIcon sx={{ fontSize: 18 }} />}
                  title="Information Required"
                  tone={view.informationRequiredCount === 0 ? 'success' : 'warning'}
                  value={
                    view.informationRequiredCount === 0
                      ? 'None'
                      : `${view.informationRequiredCount} item${view.informationRequiredCount === 1 ? '' : 's'}`
                  }
                />
              </Box>

              <Typography fontWeight={700} variant="subtitle2">
                Detailed Match Results
              </Typography>
              <Stack spacing={1}>
                {view.dimensions.map((dim) => (
                  <DimensionRow dim={dim} key={dim.id} />
                ))}
              </Stack>
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
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Typography fontWeight={600} variant="subtitle2">
                      {row.title}
                    </Typography>
                    <Chip
                      color={row.blocking ? 'error' : 'success'}
                      label={row.status}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                  {row.summary ? (
                    <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
                      {row.summary}
                    </Typography>
                  ) : null}
                </Box>
              ))}
            </Stack>
          ) : null}

          {subTab === 'role' ? (
            <Stack spacing={1}>
              {view.dimensions
                .filter((d) => d.id === 'role' || d.id === 'experience')
                .map((dim) => (
                  <DimensionRow defaultExpanded dim={dim} key={dim.id} />
                ))}
            </Stack>
          ) : null}

          {subTab === 'skills' ? (
            <Stack spacing={1.5}>
              <Alert severity="info">
                Skills are not confirmed from your application profile yet. Resume-based skill
                matching comes in a later step.
              </Alert>
              {view.dimensions
                .filter((d) => d.id === 'skills')
                .map((dim) => (
                  <DimensionRow defaultExpanded dim={dim} key={dim.id} />
                ))}
              {view.skillsUnknown.length > 0 ? (
                <Typography color="text.secondary" variant="body2">
                  Unconfirmed job skills: {view.skillsUnknown.join(', ')}
                </Typography>
              ) : null}
            </Stack>
          ) : null}

          {subTab === 'requirements' ? (
            <Stack spacing={1}>
              {view.dimensions
                .filter((d) => ['location', 'workAuth', 'sponsorship', 'experience'].includes(d.id))
                .map((dim) => (
                  <DimensionRow dim={dim} key={dim.id} />
                ))}
            </Stack>
          ) : null}

          {subTab === 'missing' ? (
            <Stack spacing={1.25}>
              {view.missingInfo.length === 0 && view.keyGaps.length === 0 ? (
                <Alert severity="success">No missing required information for this match.</Alert>
              ) : null}
              {view.missingInfo.map((item) => (
                <Box
                  key={`${item.field}-${item.label}`}
                  sx={{ border: 1, borderColor: 'warning.light', borderRadius: 1.5, p: 1.5 }}
                >
                  <Typography fontWeight={600} variant="subtitle2">
                    {item.label}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    {item.message}
                  </Typography>
                  {item.href ? (
                    <MuiButton
                      component={RouterLink}
                      size="small"
                      sx={{ mt: 1 }}
                      to={item.href}
                      variant="outlined"
                    >
                      Update setup
                    </MuiButton>
                  ) : null}
                </Box>
              ))}
            </Stack>
          ) : null}
        </Box>

        {/* Right: eligibility / strengths / gaps / next */}
        <Stack spacing={2} sx={{ order: { xs: 3, lg: 0 } }}>
          <SideCard title="Eligibility Summary">
            <Stack spacing={1}>
              {view.eligibilityChecklist.map((row) => (
                <Stack
                  alignItems="center"
                  direction="row"
                  justifyContent="space-between"
                  key={row.title}
                  spacing={1}
                >
                  <Typography variant="body2">{row.title}</Typography>
                  <Chip
                    color={
                      row.blocking ? 'error' : row.status === 'Not required' ? 'default' : 'success'
                    }
                    label={row.status}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              ))}
            </Stack>
          </SideCard>

          <SideCard collapsible defaultExpanded title="Top Strengths">
            {view.topStrengths.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                No confirmed strengths yet.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {view.topStrengths.map((item) => (
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
            {view.keyGaps.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                No key gaps highlighted.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {visibleGaps.map((item) => (
                  <Stack alignItems="flex-start" direction="row" key={item} spacing={1}>
                    <RemoveCircleOutlineIcon
                      aria-hidden
                      color="error"
                      sx={{ fontSize: 18, mt: 0.2, flexShrink: 0 }}
                    />
                    <Typography variant="body2">{item}</Typography>
                  </Stack>
                ))}
                {view.keyGaps.length > 4 ? (
                  <MuiButton
                    onClick={() => setShowAllGaps((v) => !v)}
                    size="small"
                    sx={{ alignSelf: 'flex-start', textTransform: 'none', px: 0 }}
                    variant="text"
                  >
                    {showAllGaps ? 'Show fewer gaps' : 'See all gaps'}
                  </MuiButton>
                ) : null}
              </Stack>
            )}
          </SideCard>

          <SideCard title="Next Steps">
            <Stack component="ol" spacing={0.75} sx={{ m: 0, pl: 2 }}>
              <Typography component="li" variant="body2">
                Review the gaps and suggestions
              </Typography>
              <Typography component="li" variant="body2">
                Update your resume or answers
              </Typography>
              <Typography component="li" variant="body2">
                Continue to job page
              </Typography>
            </Stack>
          </SideCard>
        </Stack>
      </Box>

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
            disabled={continueDisabled}
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
          <MuiButton
            endIcon={<ArrowForwardIcon />}
            disabled={continueDisabled}
            onClick={onContinue}
            sx={{ ...assistedApplyTouchTargetSx, display: { xs: 'none', sm: 'inline-flex' } }}
            variant="contained"
          >
            Next: Resume
          </MuiButton>
        </Stack>
      </WorkspaceStickyActions>
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
  profileMatchLoading?: boolean;
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
  profileMatchLoading = false,
}: FitStepProps) {
  const readinessQuery = useApplicationReadiness(jobId, 'HANDOFF', jobApplicationId);
  const analysisQuery = useLatestJobAnalysis(jobId);

  const view = useMemo(
    () => (profileMatch ? toProfileMatchViewModel(profileMatch) : null),
    [profileMatch],
  );

  useEffect(() => {
    if (!view) return;
    trackEvent('fit_panel_viewed', {
      job_id: jobId,
      overall_label: view.overallLabel,
      eligibility: view.eligibilityStatus,
      has_profile_match: true,
      info_required: view.informationRequiredCount,
    });
  }, [jobId, view]);

  if (profileMatchLoading || readinessQuery.isLoading) {
    return <FitSkeleton />;
  }

  if (readinessQuery.isError) {
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

  if (!profileMatch || !view) {
    return (
      <Stack spacing={2}>
        <Alert severity="info">
          <Typography fontWeight={700} variant="subtitle2">
            We&apos;re still preparing your fit analysis.
          </Typography>
          <Typography variant="body2">
            Run prepare from the Analysis step, or refresh this page after tracking starts. This
            match uses your verified profile — not your resume.
          </Typography>
        </Alert>
        <WorkspaceStickyActions>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {onBack ? (
              <MuiButton onClick={onBack} sx={assistedApplyTouchTargetSx} variant="outlined">
                Back to Analysis
              </MuiButton>
            ) : null}
            <MuiButton
              onClick={() => {
                onRefresh?.();
                void readinessQuery.refetch();
              }}
              sx={assistedApplyTouchTargetSx}
              variant="contained"
            >
              Refresh
            </MuiButton>
          </Stack>
        </WorkspaceStickyActions>
      </Stack>
    );
  }

  const analysisLimited = analysisQuery.data?.status === 'LIMITED';
  const analysisFailed = analysisQuery.data?.status === 'FAILED';

  return (
    <Stack spacing={2}>
      {analysisLimited || analysisFailed ? (
        <Alert severity="warning">
          Job posting analysis was {analysisLimited ? 'limited' : 'unsuccessful'}, so some
          requirements may be incomplete.
        </Alert>
      ) : null}

      <ProfileMatchContent
        company={company}
        continueDisabled={false}
        jobTitle={jobTitle}
        onBack={onBack ?? (() => undefined)}
        onContinue={onContinue}
        view={view}
        viewLabel={viewLabel}
        workplaceMode={workplaceMode}
      />
    </Stack>
  );
}
