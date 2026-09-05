import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import Skeleton from '@mui/material/Skeleton';

import { DASHBOARD_COPY } from '@/constants/pages/dashboard';
import { ROUTES } from '@/constants/routes';

import type { DashboardPipelineStageModel } from '../hooks/useDashboardOverview';
import {
  PanelHeader,
  PanelLink,
  PanelRoot,
  PanelTitle,
  PipelineCount,
  PipelineIcon,
  PipelineLabel,
  PipelineStage,
  PipelineTrack,
} from '../styles';

const STAGE_ICONS = {
  applied: SendOutlinedIcon,
  reviewed: RateReviewOutlinedIcon,
  interview: BusinessCenterOutlinedIcon,
  offer: WorkspacePremiumOutlinedIcon,
} as const;

export interface ApplicationPipelineCardProps {
  loading?: boolean;
  stages: DashboardPipelineStageModel[];
}

export function ApplicationPipelineCard({ loading = false, stages }: ApplicationPipelineCardProps) {
  return (
    <PanelRoot>
      <PanelHeader>
        <PanelTitle>{DASHBOARD_COPY.pipelineTitle}</PanelTitle>
        <PanelLink to={ROUTES.APPLICATIONS}>{DASHBOARD_COPY.viewAllApplications} →</PanelLink>
      </PanelHeader>

      {loading ? (
        <PipelineTrack aria-busy="true" aria-label="Loading application pipeline">
          {Array.from({ length: 4 }).map((_, index) => (
            <PipelineStage key={index}>
              <Skeleton height={40} variant="circular" width={40} />
              <Skeleton height={16} width={64} />
              <Skeleton height={28} width={32} />
            </PipelineStage>
          ))}
        </PipelineTrack>
      ) : (
        <PipelineTrack aria-label="Application pipeline stages">
          {stages.map((stage) => {
            const Icon = STAGE_ICONS[stage.id as keyof typeof STAGE_ICONS] ?? SendOutlinedIcon;
            return (
              <PipelineStage key={stage.id}>
                <PipelineIcon tone={stage.id}>
                  <Icon fontSize="small" />
                </PipelineIcon>
                <PipelineLabel>{stage.label}</PipelineLabel>
                <PipelineCount>{stage.count}</PipelineCount>
              </PipelineStage>
            );
          })}
        </PipelineTrack>
      )}
    </PanelRoot>
  );
}
