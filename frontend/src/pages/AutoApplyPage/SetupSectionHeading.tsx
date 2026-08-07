import type { SetupSectionId } from '@/features/auto-apply/types/autoApply.types';
import { Box, Chip, Typography } from '@/lib/material';

import { setupPageSx } from './setupPageStyles';

export interface SetupSectionHeadingProps {
  sectionId: SetupSectionId;
  title: string;
  required?: boolean;
  helperText?: string;
  headingId?: string;
}

export function SetupSectionHeading({
  sectionId,
  title,
  required,
  helperText,
  headingId,
}: SetupSectionHeadingProps) {
  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 0.5 }}>
        <Typography
          component="h2"
          data-setup-heading
          id={headingId ?? `setup-section-heading-${sectionId}`}
          sx={setupPageSx.sectionTitle}
          tabIndex={-1}
        >
          {title}
        </Typography>
        {required != null && (
          <Chip
            label={required ? 'Required' : 'Optional'}
            size="small"
            sx={{
              bgcolor: required ? 'primary.50' : 'grey.100',
              border: 0,
              color: required ? 'primary.main' : 'text.secondary',
              ...setupPageSx.sectionBadge,
            }}
          />
        )}
      </Box>
      {helperText ? (
        <Typography color="text.secondary" sx={setupPageSx.sectionHelper} variant="body2">
          {helperText}
        </Typography>
      ) : null}
    </Box>
  );
}
