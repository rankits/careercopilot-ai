import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';

import { Box, Typography } from '@/lib/material';

export interface LegacyAttentionBannerProps {
  isPending: boolean;
  onAbandon: () => void;
}

export function LegacyAttentionBanner({ isPending, onAbandon }: LegacyAttentionBannerProps) {
  const [clicked, setClicked] = useState(false);

  const handleAbandon = () => {
    if (clicked || isPending) return;
    setClicked(true);
    onAbandon();
  };

  return (
    <Box
      aria-label="This application needs attention. Abandon it or browse jobs."
      role="status"
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 1,
        bgcolor: 'warning.light',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Typography fontWeight={600} variant="subtitle2">
        This application needs attention
      </Typography>
      <Typography variant="body2">
        This application was left in an older processing state. You can abandon it and start
        Assisted Apply again from the job, or contact support if it stays stuck.
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1,
          mt: 1,
        }}
      >
        <Button disabled={isPending || clicked} onClick={handleAbandon} size="small">
          {isPending || clicked ? 'Abandoning…' : 'Abandon'}
        </Button>
        <Button component={Link} size="small" to="/jobs" variant="outline">
          Browse jobs
        </Button>
      </Box>
    </Box>
  );
}
