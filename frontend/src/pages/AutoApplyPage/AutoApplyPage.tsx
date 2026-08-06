import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useSetupStatus } from '@/features/auto-apply/hooks/useSetupStatus';

import { ROUTES } from '@/constants/routes';
import type { SetupSectionId } from '@/features/auto-apply/types/autoApply.types';
import { focusSetupField } from '@/features/auto-apply/utils/setupFieldFocus';
import { Box, MuiButton, Typography } from '@/lib/material';

import { CommonAnswersSection } from './CommonAnswersSection';
import { ConsentsTab } from './ConsentsTab';
import { DiscardChangesDialog } from './DiscardChangesDialog';
import { EducationSection } from './EducationSection';
import { JobPreferencesSetupSection } from './JobPreferencesSetupSection';
import { PersonalSetupSection } from './PersonalSetupSection';
import { ProfessionalLinksSection } from './ProfessionalLinksSection';
import { ResumeVersionsTab } from './ResumeVersionsTab';
import { SetupChecklist } from './SetupChecklist';
import { SetupDirtyProvider, useSetupDirtyNavigation } from './SetupDirtyContext';
import { SetupSummary } from './SetupSummary';
import { WorkAuthorizationSection } from './WorkAuthorizationSection';

const SECTION_IDS = new Set<SetupSectionId>([
  'personal',
  'work-auth',
  'preferences',
  'links',
  'answers',
  'resumes',
  'education',
  'consents',
]);

const LEGACY_TAB_TO_SECTION: Record<string, SetupSectionId> = {
  answers: 'answers',
  consents: 'consents',
  profile: 'personal',
  resumes: 'resumes',
  rules: 'preferences',
};

function sectionFromParams(section: string | null, tab: string | null): SetupSectionId {
  if (section === 'exclusions') return 'preferences';
  if (section && SECTION_IDS.has(section as SetupSectionId)) return section as SetupSectionId;
  return (tab && LEGACY_TAB_TO_SECTION[tab]) || 'personal';
}

export function AutoApplyPage() {
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  return (
    <SetupDirtyProvider
      onRequestDiscardConfirm={(onProceed) => {
        setPendingNavigation(() => onProceed);
      }}
    >
      <AutoApplyPageContent />
      <DiscardChangesDialog
        onDiscard={() => {
          pendingNavigation?.();
          setPendingNavigation(null);
        }}
        onKeepEditing={() => setPendingNavigation(null)}
        open={pendingNavigation != null}
      />
    </SetupDirtyProvider>
  );
}

function AutoApplyPageContent() {
  const { confirmIfDirty } = useSetupDirtyNavigation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<SetupSectionId>(() =>
    sectionFromParams(searchParams.get('section'), searchParams.get('tab')),
  );
  const sectionFocusDone = useRef(false);

  const setupStatusQuery = useSetupStatus();

  const applySection = (sectionId: SetupSectionId, fieldId?: string | null) => {
    setActiveSection(sectionId);
    const next = new URLSearchParams(searchParams);
    next.set('section', sectionId);
    if (fieldId) {
      next.set('field', fieldId);
    } else {
      next.delete('field');
    }
    next.delete('tab');
    setSearchParams(next, { replace: true });
  };

  const selectSection = (sectionId: SetupSectionId, fieldId?: string | null) => {
    confirmIfDirty(() => {
      applySection(sectionId, fieldId);
      requestAnimationFrame(() => {
        const heading = document.getElementById(`setup-section-heading-${sectionId}`);
        heading?.focus?.();
        heading?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
        focusSetupField(fieldId ?? null);
      });
    });
  };

  useEffect(() => {
    const section = searchParams.get('section');
    const field = searchParams.get('field');
    const tab = searchParams.get('tab');
    if (tab === 'submissions') {
      void navigate(ROUTES.ASSISTED_APPLICATIONS, { replace: true });
      return;
    }
    const resolvedSection = sectionFromParams(section, tab);

    if (section || field) {
      sectionFocusDone.current = true;
      setActiveSection(resolvedSection);
      requestAnimationFrame(() => {
        if (section) {
          document.getElementById(`setup-section-heading-${resolvedSection}`)?.scrollIntoView?.({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
        focusSetupField(field);
      });
      return;
    }

    if (!sectionFocusDone.current) {
      sectionFocusDone.current = true;
      setActiveSection(resolvedSection);
    }
  }, [navigate, searchParams]);

  const browseJobs = () => {
    void navigate(ROUTES.JOB_FEED);
  };

  return (
    <Box
      sx={{
        maxWidth: 1500,
        mx: 'auto',
        p: { xs: 2, sm: 3, lg: 4 },
        pb: { xs: 10, md: 5 },
      }}
    >
      <Box
        sx={{
          alignItems: { sm: 'flex-start', lg: 'center' },
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 2,
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Box>
          <Typography component="h1" sx={{ fontWeight: 700, letterSpacing: '-0.03em', mb: 0.5 }} variant="h4">
            Application Setup
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 740 }} variant="body2">
            Tell us about your preferences. We&apos;ll use this to prepare better applications and
            streamline your review.
          </Typography>
        </Box>
        <Box sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start', lg: 'auto' }, display: 'flex', gap: 1 }}>
          <MuiButton
            onClick={() => {
              const buttons = document.querySelectorAll<HTMLButtonElement>(
                '#application-setup-section-panel button',
              );
              const saveButton = Array.from(buttons).find((button) =>
                button.textContent?.toLowerCase().startsWith('save'),
              );
              saveButton?.click();
            }}
            sx={{ flex: { xs: 1, sm: 'initial' } }}
            variant="outlined"
          >
            Save changes
          </MuiButton>
          <MuiButton
            onClick={() => selectSection('personal')}
            sx={{ flex: { xs: 1, sm: 'initial' }, minWidth: 130 }}
            variant="contained"
          >
            Review setup
          </MuiButton>
        </Box>
      </Box>

      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          gap: 2,
          mb: 3,
          px: { xs: 0, md: 1 },
        }}
      >
        <Typography color="text.secondary" sx={{ flexShrink: 0, fontSize: 12, fontWeight: 600 }}>
          Overall setup progress
        </Typography>
        <Box sx={{ bgcolor: 'grey.200', borderRadius: 99, flex: 1, height: 6, overflow: 'hidden' }}>
          <Box
            sx={{
              bgcolor: 'primary.main',
              borderRadius: 'inherit',
              height: '100%',
              transition: 'width 180ms ease',
              width: `${setupStatusQuery.data?.percent ?? 0}%`,
            }}
          />
        </Box>
        <Typography color="text.secondary" sx={{ flexShrink: 0, fontSize: 12 }}>
          {setupStatusQuery.data?.percent ?? 0}% complete
        </Typography>
      </Box>

      <Box
        sx={{
          alignItems: 'start',
          display: 'grid',
          gap: { xs: 2, xl: 3 },
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '230px minmax(0, 1fr)', xl: '260px minmax(0, 1fr) 260px' },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <SetupChecklist
            activeSection={activeSection}
            isError={setupStatusQuery.isError}
            isLoading={setupStatusQuery.isLoading}
            onBrowseJobs={browseJobs}
            onRetry={() => {
              void setupStatusQuery.refetch();
            }}
            onSelectSection={selectSection}
            status={setupStatusQuery.data}
          />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Box
            id="application-setup-section-panel"
            sx={{
              '& > *, & > * > .MuiPaper-root': { maxWidth: 'none', width: '100%' },
              '& .MuiPaper-root': { borderRadius: 2 },
            }}
          >
            {activeSection === 'personal' && <PersonalSetupSection />}
            {activeSection === 'work-auth' && <WorkAuthorizationSection />}
            {activeSection === 'preferences' && <JobPreferencesSetupSection />}
            {activeSection === 'links' && <ProfessionalLinksSection />}
            {activeSection === 'answers' && <CommonAnswersSection />}
            {activeSection === 'resumes' && <ResumeVersionsTab />}
            {activeSection === 'education' && <EducationSection />}
            {activeSection === 'consents' && <ConsentsTab />}
          </Box>
        </Box>

        <Box sx={{ display: { xs: 'none', xl: 'block' } }}>
          <SetupSummary onBrowseJobs={browseJobs} status={setupStatusQuery.data} />
        </Box>
      </Box>
    </Box>
  );
}
