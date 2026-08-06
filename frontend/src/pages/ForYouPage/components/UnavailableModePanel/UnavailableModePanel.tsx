import { Button } from '@/components/atoms/Button';

import { Box, Typography } from '@/lib/material';

import { getPanelId, getTabId, type RecommendationMode } from '../../utils';

type UnavailableModePanelProps = {
  activeMode: RecommendationMode;
  panelLabel: string;
  onViewProfileMatches: () => void;
};

export function UnavailableModePanel({
  activeMode,
  panelLabel,
  onViewProfileMatches,
}: UnavailableModePanelProps) {
  return (
    <Box
      aria-labelledby={getTabId(activeMode)}
      id={getPanelId(activeMode)}
      role="tabpanel"
      sx={{ display: 'grid', gap: 2, justifyItems: 'start', py: 4 }}
    >
      <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 800, m: 0 }}>
        {panelLabel}
      </Typography>
      <Typography role="status" sx={{ color: 'text.secondary' }}>
        This mode is being wired into the recommendation engine.
      </Typography>
      <Button onClick={onViewProfileMatches} size="small" variant="outline">
        View profile matches
      </Button>
    </Box>
  );
}
