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
    <Box sx={{ mb: 1 }}>
      <Box sx={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 0.5 }}>
        <Typography
          component="h2"
          data-setup-heading
          id={`setup-section-heading-${sectionId}`}
          sx={{ fontSize: { xs: 17, sm: 19 }, fontWeight: 700, letterSpacing: '-0.02em' }}
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
              fontSize: 10,
              fontWeight: 700,
              height: 20,
            }}
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
