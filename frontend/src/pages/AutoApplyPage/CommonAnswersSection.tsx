import { Box } from '@/lib/material';

import { AdvancedAnswersPanel } from './AdvancedAnswersPanel';
import { BaselineAnswersSection } from './BaselineAnswersSection';

export function CommonAnswersSection() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <BaselineAnswersSection />
      <AdvancedAnswersPanel />
    </Box>
  );
}
