import { useState } from 'react';

import { Button } from '@/components/atoms/Button';

import { ConnectedDevicesList, ConnectExtensionModal } from '@/features/extension';
import { Box, Paper, Typography } from '@/lib/material';

import { SetupSectionHeading } from './SetupSectionHeading';

export function ExtensionSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Paper
      sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 640 }}
      variant="outlined"
    >
      <SetupSectionHeading sectionId="extension" title="Browser Extension" />

      <Typography variant="body2" color="text.secondary">
        Connect the Career Copilot browser extension to enable assisted application filling directly
        on job boards.
      </Typography>

      <Box sx={{ mt: 2 }}>
        <ConnectedDevicesList />
      </Box>

      <Box sx={{ mt: 3 }}>
        <Button onClick={() => setIsModalOpen(true)}>Connect New Extension</Button>
      </Box>

      <ConnectExtensionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </Paper>
  );
}
