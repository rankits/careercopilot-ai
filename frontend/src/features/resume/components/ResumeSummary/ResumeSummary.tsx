import type { ResumePresentation } from '@/features/resume/utils/resumePresentation';
import { AutoAwesomeOutlinedIcon, Box, LinearProgress, Typography } from '@/lib/material';
import { colorTokens, spacing } from '@/tokens';

interface ResumeSummaryProps {
  presentation: ResumePresentation;
  totalExperience: string;
}

export function ResumeSummary({ presentation, totalExperience }: ResumeSummaryProps) {
  const metrics = [
    ['Skills', presentation.counts.skills],
    ['Years experience', totalExperience || '—'],
    ['Companies', presentation.counts.companies],
    ['Certifications', presentation.counts.certifications],
  ] as const;
  const confidence =
    presentation.confidenceScore === null
      ? null
      : Math.round(
          presentation.confidenceScore <= 1
            ? presentation.confidenceScore * 100
            : presentation.confidenceScore,
        );

  return (
    <Box display="grid" gap={spacing[4]}>
      <Box alignItems="center" color={colorTokens.actionPrimary} display="flex" gap={spacing[2]}>
        <AutoAwesomeOutlinedIcon fontSize="small" />
        <Typography color="inherit" fontWeight={700}>
          Resume summary
        </Typography>
      </Box>
      <Box
        display="grid"
        gap={spacing[3]}
        gridTemplateColumns="repeat(auto-fit, minmax(5.5rem, 1fr))"
      >
        {metrics.map(([label, value]) => (
          <Box key={label}>
            <Typography fontWeight={700}>{value}</Typography>
            <Typography color="text.secondary" variant="caption">
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box>
        <Box display="flex" justifyContent="space-between" mb={spacing[1]}>
          <Typography variant="caption">Parser confidence</Typography>
          <Typography fontWeight={700} variant="caption">
            {confidence === null ? 'Not provided' : `${confidence}%`}
          </Typography>
        </Box>
        <LinearProgress
          aria-label="Parser confidence"
          value={confidence ?? 0}
          variant="determinate"
        />
      </Box>
    </Box>
  );
}
