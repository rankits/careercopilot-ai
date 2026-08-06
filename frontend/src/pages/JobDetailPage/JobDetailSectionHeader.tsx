import { Box, Typography } from '@/lib/material';

import { jobDetailPageSx } from './styles';

export function JobDetailSectionHeader({ title }: { title: string }) {
  return (
    <Box sx={jobDetailPageSx.sectionHeader}>
      <Box sx={jobDetailPageSx.sectionHeaderTitleRow}>
        <Box aria-hidden="true" sx={jobDetailPageSx.sectionHeaderAccent} />
        <Typography component="h2" sx={jobDetailPageSx.sectionTitle}>
          {title}
        </Typography>
      </Box>
      <Box aria-hidden="true" sx={jobDetailPageSx.sectionHeaderDivider} />
    </Box>
  );
}
