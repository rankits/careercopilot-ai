import { Box } from '@/lib/material';

import { ExtensionSection } from './ExtensionSection';
import { JobPreferencesSection } from './JobPreferencesSection';
import { PersonalContactSection } from './PersonalContactSection';
import { ProfessionalLinksSection } from './ProfessionalLinksSection';

export function ProfileTab() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <PersonalContactSection />
      <JobPreferencesSection />
      <ProfessionalLinksSection />
      <ExtensionSection />
    </Box>
  );
}
