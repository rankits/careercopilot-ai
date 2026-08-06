import { Box } from '@/lib/material';

import { JobPreferencesSection } from './JobPreferencesSection';
import { RulesTab } from './RulesTab';

export function JobPreferencesSetupSection() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <JobPreferencesSection />
      <RulesTab />
    </Box>
  );
}
