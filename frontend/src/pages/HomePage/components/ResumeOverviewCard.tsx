import { DASHBOARD_COPY } from '@/constants/pages/dashboard';
import { ROUTES } from '@/constants/routes';
import {
  CheckCircleIcon,
  CircularProgress,
  Skeleton,
  WarningAmberOutlinedIcon,
} from '@/lib/material';

import type { DashboardResumeCheckModel } from '../hooks/useDashboardOverview';
import {
  EmptyText,
  PanelHeader,
  PanelLink,
  PanelRoot,
  PanelTitle,
  ResumeCheckItem,
  ResumeCheckList,
  ResumeChecksTitle,
  ResumeScoreBody,
  ResumeScoreCenter,
  ResumeScoreMeta,
  ResumeScoreProgressFill,
  ResumeScoreRing,
  ResumeScoreUnit,
  ResumeScoreValue,
  ResumeScoreWord,
  ResumeSummaryText,
} from '../styles';

export interface ResumeOverviewCardProps {
  checks: DashboardResumeCheckModel[];
  loading?: boolean;
  score: number | null;
  scoreLabel: string | null;
}

export function ResumeOverviewCard({
  checks,
  loading = false,
  score,
  scoreLabel,
}: ResumeOverviewCardProps) {
  const displayScore = score ?? 0;
  const completedChecks = checks.filter((check) => check.complete).length;

  return (
    <PanelRoot>
      <PanelHeader>
        <PanelTitle>{DASHBOARD_COPY.resumeScoreTitle}</PanelTitle>
        <PanelLink to={ROUTES.RESUME_BUILDER}>{DASHBOARD_COPY.improveResume} →</PanelLink>
      </PanelHeader>

      {loading ? (
        <ResumeScoreBody aria-busy="true" aria-label="Loading resume score">
          <Skeleton height={120} variant="circular" width={120} />
          <ResumeScoreMeta>
            <Skeleton height={18} width="50%" />
            <Skeleton height={16} width="70%" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton height={36} key={index} width="100%" />
            ))}
          </ResumeScoreMeta>
        </ResumeScoreBody>
      ) : (
        <ResumeScoreBody>
          <ResumeScoreRing
            aria-label={
              score === null ? 'Resume score unavailable' : `Resume score ${displayScore} percent`
            }
          >
            <CircularProgress
              className="dashboard-resume-track"
              size={120}
              thickness={4.5}
              value={100}
              variant="determinate"
            />
            <ResumeScoreProgressFill>
              <CircularProgress
                size={120}
                thickness={4.5}
                value={score === null ? 0 : Math.min(100, Math.max(0, displayScore))}
                variant="determinate"
              />
            </ResumeScoreProgressFill>
            <ResumeScoreCenter>
              <ResumeScoreValue>
                {score === null ? '—' : Math.round(displayScore)}
                {score === null ? null : <ResumeScoreUnit>%</ResumeScoreUnit>}
              </ResumeScoreValue>
              {scoreLabel ? <ResumeScoreWord>{scoreLabel}</ResumeScoreWord> : null}
            </ResumeScoreCenter>
          </ResumeScoreRing>

          <ResumeScoreMeta>
            {score === null ? (
              <EmptyText>{DASHBOARD_COPY.emptyResumeScore}</EmptyText>
            ) : (
              <ResumeSummaryText>
                {completedChecks} of {checks.length} profile checks ready
              </ResumeSummaryText>
            )}

            <ResumeChecksTitle>{DASHBOARD_COPY.resumeChecksTitle}</ResumeChecksTitle>
            <ResumeCheckList>
              {checks.map((check) => (
                <ResumeCheckItem complete={check.complete} key={check.id}>
                  {check.complete ? (
                    <CheckCircleIcon aria-hidden="true" fontSize="small" />
                  ) : (
                    <WarningAmberOutlinedIcon aria-hidden="true" fontSize="small" />
                  )}
                  <span>{check.label}</span>
                </ResumeCheckItem>
              ))}
            </ResumeCheckList>
          </ResumeScoreMeta>
        </ResumeScoreBody>
      )}
    </PanelRoot>
  );
}
