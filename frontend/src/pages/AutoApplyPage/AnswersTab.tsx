import { Box } from '@/lib/material';

import { AdvancedAnswersPanel } from './AdvancedAnswersPanel';
import { BaselineAnswersSection } from './BaselineAnswersSection';
import { WorkAuthorizationSection } from './WorkAuthorizationSection';

export function AnswersTab({
  suggestedQuestionKey,
}: {
  suggestedQuestionKey?: string;
} = {}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 720 }}>
      <WorkAuthorizationSection />
      <BaselineAnswersSection />
      <AdvancedAnswersPanel suggestedQuestionKey={suggestedQuestionKey} />
    </Box>
  );
}
