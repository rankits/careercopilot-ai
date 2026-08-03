import type { ResumePresentation } from '@/features/resume/utils/resumePresentation';
import {
  Alert,
  AutoAwesomeOutlinedIcon,
  Box,
  CheckCircleOutlineIcon,
  Chip,
  CircularProgress,
  LightbulbOutlinedIcon,
  Typography,
} from '@/lib/material';
import { borderRadius, borderWidth, colorTokens, spacing } from '@/tokens';

import { InsightsCard } from './styles';

const Empty = ({ children }: { children: string }) => (
  <Typography color="text.secondary" variant="body2">
    {children}
  </Typography>
);

interface ResumeInsightsProps {
  error?: string;
  hasParsedResume: boolean;
  isLoading: boolean;
  presentation: ResumePresentation;
}

export function ResumeInsights({
  error,
  hasParsedResume,
  isLoading,
  presentation,
}: ResumeInsightsProps) {
  const score =
    presentation.confidenceScore === null
      ? null
      : Math.round(
          presentation.confidenceScore <= 1
            ? presentation.confidenceScore * 100
            : presentation.confidenceScore,
        );

  return (
    <InsightsCard as="aside" aria-labelledby="ai-insights-title">
      <Box alignItems="center" display="flex" gap={spacing[2]}>
        <AutoAwesomeOutlinedIcon color="primary" fontSize="small" />
        <Typography component="h2" fontWeight={700} id="ai-insights-title">
          AI Insights
        </Typography>
      </Box>

      {isLoading ? (
        <Box alignItems="center" display="flex" gap={spacing[2]}>
          <CircularProgress size={20} />
          <Typography color="text.secondary" variant="body2">
            Loading resume insights…
          </Typography>
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : !hasParsedResume ? (
        <Empty>Parse a resume to view the score and insights returned by the parser.</Empty>
      ) : (
        <>
          <Box>
            <Typography fontWeight={700} variant="caption">
              Areas to improve
            </Typography>
            {presentation.insights.areasToImprove.length ? (
              presentation.insights.areasToImprove.map((item) => (
                <Box
                  alignItems="flex-start"
                  display="flex"
                  gap={spacing[2]}
                  mt={spacing[2]}
                  key={item}
                >
                  <LightbulbOutlinedIcon color="primary" sx={{ fontSize: 17 }} />
                  <Typography variant="body2">{item}</Typography>
                </Box>
              ))
            ) : (
              <Empty>No improvement areas were returned by the API.</Empty>
            )}
          </Box>

          <Box>
            <Typography fontWeight={700} variant="caption">
              Resume score
            </Typography>
            <Box
              alignItems="center"
              border={`${borderWidth.thin} solid ${colorTokens.actionPrimarySubtle}`}
              borderRadius={borderRadius.full}
              display="flex"
              flexDirection="column"
              height="7rem"
              justifyContent="center"
              mt={spacing[2]}
              mx="auto"
              sx={{ boxShadow: `inset 0 0 0 0.45rem ${colorTokens.actionPrimarySubtle}` }}
              width="7rem"
            >
              <Typography color="primary" fontWeight={700} variant="h5">
                {score ?? '—'}
              </Typography>
              <Typography color="text.secondary" variant="caption">
                {score === null ? 'Not provided' : '/100'}
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography fontWeight={700} variant="caption">
              Strengths
            </Typography>
            {presentation.insights.strengths.length ? (
              presentation.insights.strengths.map((item) => (
                <Box
                  alignItems="flex-start"
                  display="flex"
                  gap={spacing[2]}
                  mt={spacing[2]}
                  key={item}
                >
                  <CheckCircleOutlineIcon color="primary" sx={{ fontSize: 17 }} />
                  <Typography variant="body2">{item}</Typography>
                </Box>
              ))
            ) : (
              <Empty>No strengths were returned by the API.</Empty>
            )}
          </Box>

          <Box>
            <Typography fontWeight={700} variant="caption">
              Missing information
            </Typography>
            {presentation.insights.missingInformation.length ? (
              <Box display="flex" flexWrap="wrap" gap={spacing[2]} mt={spacing[2]}>
                {presentation.insights.missingInformation.map((item) => (
                  <Chip key={item} label={item} size="small" />
                ))}
              </Box>
            ) : (
              <Empty>No missing information was returned by the API.</Empty>
            )}
          </Box>

          <Box>
            <Typography fontWeight={700} variant="caption">
              AI suggestions
            </Typography>
            {presentation.insights.suggestions.length ? (
              presentation.insights.suggestions.map((item) => (
                <Box
                  alignItems="flex-start"
                  display="flex"
                  gap={spacing[2]}
                  mt={spacing[2]}
                  key={item}
                >
                  <LightbulbOutlinedIcon color="primary" sx={{ fontSize: 17 }} />
                  <Typography variant="body2">{item}</Typography>
                </Box>
              ))
            ) : (
              <Empty>No suggestions were returned by the API.</Empty>
            )}
          </Box>
        </>
      )}
    </InsightsCard>
  );
}
