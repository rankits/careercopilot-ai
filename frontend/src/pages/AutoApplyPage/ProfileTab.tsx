import { Box } from '@/lib/material';

import { ExtensionSection } from './ExtensionSection';
import { JobPreferencesSection } from './JobPreferencesSection';
import { PersonalContactSection } from './PersonalContactSection';
import { ProfessionalLinksSection } from './ProfessionalLinksSection';

export function ProfileTab() {
  return (
    <Box
      sx={{
        '& > .MuiPaper-root': {
          borderRadius: 2,
          maxWidth: 'none',
          p: { xs: 2, sm: 3 },
          width: '100%',
        },
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
      }}
    >
      <PersonalContactSection />
      <JobPreferencesSection />
      <ProfessionalLinksSection />
      <ExtensionSection />
    </Box>
  );
}
