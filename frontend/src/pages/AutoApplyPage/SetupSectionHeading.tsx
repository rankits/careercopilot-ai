import type { SetupSectionId } from '@/features/auto-apply/types/autoApply.types';
import { Box, Chip, Typography } from '@/lib/material';

export interface SetupSectionHeadingProps {
  sectionId: SetupSectionId;
  title: string;
  required?: boolean;
  helperText?: string;
}

export function SetupSectionHeading({
  sectionId,
  title,
  required,
  helperText,
}: SetupSectionHeadingProps) {
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
        <Typography
          component="h2"
          data-setup-heading
          id={`setup-section-heading-${sectionId}`}
          tabIndex={-1}
          variant="h6"
        >
          {title}
        </Typography>
        {required != null && (
          <Chip
            color={required ? 'primary' : 'default'}
            label={required ? 'Required' : 'Optional'}
            size="small"
            variant="outlined"
          />
        )}
      </Box>
      {helperText ? (
        <Typography color="text.secondary" variant="body2">
          {helperText}
        </Typography>
      ) : null}
    </Box>
  );
}
