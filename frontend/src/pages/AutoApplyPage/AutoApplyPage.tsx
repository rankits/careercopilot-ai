import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';
import { useSetupStatus } from '@/features/auto-apply/hooks/useSetupStatus';
import type { SetupSectionId } from '@/features/auto-apply/types/autoApply.types';
import { focusSetupField } from '@/features/auto-apply/utils/setupFieldFocus';
import { tabForSetupSection } from '@/features/auto-apply/utils/setupSectionNavigation';
import { Box, Tab, Tabs, Typography } from '@/lib/material';

import { AnswersTab } from './AnswersTab';
import { ConsentsTab } from './ConsentsTab';
import { answerKeyForMissingField, type AutoApplyTabId } from './missingFieldNavigation';
import { ProfileTab } from './ProfileTab';
import { ResumeVersionsTab } from './ResumeVersionsTab';
import { RulesTab } from './RulesTab';
import { DiscardChangesDialog } from './DiscardChangesDialog';
import { SetupChecklist } from './SetupChecklist';
import { SetupDirtyProvider, useSetupDirtyNavigation } from './SetupDirtyContext';
import { SubmissionsTab, type NavigateFixAction } from './SubmissionsTab';

const TABS: { id: AutoApplyTabId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'answers', label: 'Verified Answers' },
  { id: 'resumes', label: 'Resume Versions' },
  { id: 'rules', label: 'Exclusions' },
  { id: 'consents', label: 'Consents' },
  { id: 'submissions', label: 'Submissions' },
];

const TAB_IDS = new Set<string>(TABS.map((tab) => tab.id));

function tabFromSearchParam(value: string | null): AutoApplyTabId {
  if (value && TAB_IDS.has(value)) {
    return value as AutoApplyTabId;
  }
  return 'profile';
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
  const [activeTab, setActiveTab] = useState<AutoApplyTabId>(() => {
    const fromSection = tabForSetupSection(searchParams.get('section'));
    if (fromSection) return fromSection;
    return tabFromSearchParam(searchParams.get('tab'));
  });
  const [suggestedAnswerKey, setSuggestedAnswerKey] = useState<string | undefined>();
  const sectionFocusDone = useRef(false);

  const setupStatusQuery = useSetupStatus();

  const applyTab = (tab: AutoApplyTabId, sectionId?: SetupSectionId, fieldId?: string | null) => {
    setSuggestedAnswerKey(undefined);
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (sectionId) {
      next.set('section', sectionId);
    } else {
      next.delete('section');
    }
    if (fieldId) {
      next.set('field', fieldId);
    } else {
      next.delete('field');
    }
    if (tab === 'profile') {
      next.delete('tab');
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next, { replace: true });
  };

  const selectTab = (tab: AutoApplyTabId, sectionId?: SetupSectionId, fieldId?: string | null) => {
    confirmIfDirty(() => applyTab(tab, sectionId, fieldId));
  };

  const selectSection = (sectionId: SetupSectionId, fieldId?: string | null) => {
    const tab = tabForSetupSection(sectionId) ?? 'profile';
    confirmIfDirty(() => {
      applyTab(tab, sectionId, fieldId);
      requestAnimationFrame(() => {
        const heading = document.getElementById(`setup-section-${sectionId}`);
        heading?.focus?.();
        heading?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
        focusSetupField(fieldId ?? null);
      });
    });
  };

  useEffect(() => {
    const section = searchParams.get('section');
    const field = searchParams.get('field');
    const tab = tabForSetupSection(section) ?? tabFromSearchParam(searchParams.get('tab'));

    if (section || field) {
      sectionFocusDone.current = true;
      setActiveTab(tab);
      if (tab === 'answers' && field) {
        setSuggestedAnswerKey(answerKeyForMissingField(field) ?? field);
      }
      requestAnimationFrame(() => {
        if (section) {
          document.getElementById(`setup-section-${section}`)?.scrollIntoView?.({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
        focusSetupField(field);
      });
      return;
    }

    if (!sectionFocusDone.current && tab) {
      sectionFocusDone.current = true;
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleNavigateFix: NavigateFixAction = (action) => {
    if (action.destination.kind === 'route') {
      void navigate(action.destination.href);
      return;
    }

    if (action.destination.kind === 'section') {
      confirmIfDirty(() =>
        selectSection(action.destination.sectionId, action.destination.fieldId ?? action.field ?? null),
      );
      return;
    }

    const tab = action.destination.tab;
    const fieldId = action.destination.fieldId ?? action.field;
    confirmIfDirty(() => {
      if (tab === 'answers' && fieldId) {
        setSuggestedAnswerKey(answerKeyForMissingField(fieldId) ?? fieldId);
      } else {
        setSuggestedAnswerKey(undefined);
      }
      applyTab(tab, undefined, fieldId ?? null);
      focusSetupField(fieldId ?? null);
    });
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, pb: { xs: 10, md: 4 } }}>
      <Typography component="h1" sx={{ mb: 0.5 }} variant="h4">
        Application Setup
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }} variant="body1">
        Save your profile, resume, and answers once. When you&apos;re ready to apply, use Assisted
        Apply from any job — nothing is sent to an employer until you open the application yourself.
      </Typography>

      <SetupChecklist
        isError={setupStatusQuery.isError}
        isLoading={setupStatusQuery.isLoading}
        onBrowseJobs={() => {
          void navigate(ROUTES.JOB_FEED);
        }}
        onRetry={() => {
          void setupStatusQuery.refetch();
        }}
        onSelectSection={selectSection}
        status={setupStatusQuery.data}
      />

      <Tabs
        aria-label="Application Setup sections"
        onChange={(_event, value: AutoApplyTabId) => selectTab(value)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        value={activeTab}
        variant="scrollable"
      >
        {TABS.map((tab) => (
          <Tab key={tab.id} label={tab.label} sx={{ minHeight: 48 }} value={tab.id} />
        ))}
      </Tabs>

      <Box id="application-setup-section-panel">
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'answers' && <AnswersTab suggestedQuestionKey={suggestedAnswerKey} />}
        {activeTab === 'resumes' && <ResumeVersionsTab />}
        {activeTab === 'rules' && <RulesTab />}
        {activeTab === 'consents' && <ConsentsTab />}
        {activeTab === 'submissions' && <SubmissionsTab onNavigateFix={handleNavigateFix} />}
      </Box>
    </Box>
  );
}
