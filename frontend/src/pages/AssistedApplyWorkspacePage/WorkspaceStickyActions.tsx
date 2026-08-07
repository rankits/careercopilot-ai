import type { ReactNode } from 'react';

import { Box, useMediaQuery } from '@/lib/material';
import type { SxProps, Theme } from '@/lib/material';

/** WCAG 2.5.5 — minimum 44×44px touch target (AA-081, mirrors AA-030). */
// eslint-disable-next-line react-refresh/only-export-components -- shared touch-target sx used by step pages
export const assistedApplyTouchTargetSx: SxProps<Theme> = {
  minHeight: 44,
  minWidth: 44,
};

/**
 * On narrow viewports, keeps the step's primary action reachable while long
 * content scrolls (AA-081).
 */
export function WorkspaceStickyActions({ children }: { children: ReactNode }) {
  const isNarrow = useMediaQuery('(max-width:600px)');

  if (!isNarrow) {
    return <Box sx={{ mt: 1 }}>{children}</Box>;
  }

  return (
    <Box
      data-testid="workspace-sticky-actions"
      sx={{
        position: 'sticky',
        bottom: 0,
        zIndex: 2,
        mt: 2,
        mx: { xs: -2, sm: -3 },
        px: { xs: 2, sm: 3 },
        py: 1.5,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
      }}
    >
      {children}
    </Box>
  );
}
