import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useCandidateProfile } from '@/features/auto-apply/hooks/useCandidateProfile';
import { useConsents } from '@/features/auto-apply/hooks/useConsents';
import { useResumeVersions } from '@/features/auto-apply/hooks/useResumeVersions';

import { getAutoApplySetupGaps } from '@/features/auto-apply/utils/setupCompleteness';
import { Alert, Box, MuiButton, Tab, Tabs, Typography } from '@/lib/material';

import { AnswersTab } from './AnswersTab';
import { ConsentsTab } from './ConsentsTab';
import { answerKeyForMissingField, type AutoApplyTabId } from './missingFieldNavigation';
import { ProfileTab } from './ProfileTab';
import { ResumeVersionsTab } from './ResumeVersionsTab';
import { RulesTab } from './RulesTab';
import { SubmissionsTab, type NavigateFixAction } from './SubmissionsTab';

const TABS: { id: AutoApplyTabId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'answers', label: 'Verified Answers' },
  { id: 'resumes', label: 'Resume Versions' },
  { id: 'rules', label: 'Rules' },
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<AutoApplyTabId>(() =>
    tabFromSearchParam(searchParams.get('tab')),
  );
  const [suggestedAnswerKey, setSuggestedAnswerKey] = useState<string | undefined>();

  const { data: profile } = useCandidateProfile();
  const { data: resumes } = useResumeVersions();
  const { data: consents } = useConsents();
  const setupGaps = getAutoApplySetupGaps({ profile, resumes, consents });

  const selectTab = (tab: AutoApplyTabId) => {
    setSuggestedAnswerKey(undefined);
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'profile') {
      next.delete('tab');
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next, { replace: true });
  };

  const handleNavigateFix: NavigateFixAction = (action) => {
    if (action.destination.kind === 'route') {
      void navigate(action.destination.href);
      return;
    }

    const tab = action.destination.tab;
    if (tab === 'answers' && action.field) {
      setSuggestedAnswerKey(answerKeyForMissingField(action.field) ?? action.field);
    } else {
      setSuggestedAnswerKey(undefined);
    }
    selectTab(tab);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography sx={{ mb: 0.5 }} variant="h4">
        Application Setup
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }} variant="body1">
        Save your profile, resume, and answers once. When you&apos;re ready to apply, use Assisted
        Apply from any job — nothing is sent to an employer until you open the application yourself.
      </Typography>

      {setupGaps.length > 0 && (
        <Alert
          action={
            <MuiButton color="inherit" onClick={() => selectTab(setupGaps[0]!.tab)} size="small">
              Fix next
            </MuiButton>
          }
          severity="warning"
          sx={{ mb: 2 }}
        >
          Complete these before Assisted Apply or tracking:{' '}
          {setupGaps.map((gap) => gap.label).join(' · ')}
        </Alert>
      )}

      <Tabs
        aria-label="Application Setup sections"
        onChange={(_event, value: AutoApplyTabId) => selectTab(value)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        value={activeTab}
      >
        {TABS.map((tab) => (
          <Tab key={tab.id} label={tab.label} value={tab.id} />
        ))}
      </Tabs>

      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'answers' && <AnswersTab suggestedQuestionKey={suggestedAnswerKey} />}
      {activeTab === 'resumes' && <ResumeVersionsTab />}
      {activeTab === 'rules' && <RulesTab />}
      {activeTab === 'consents' && <ConsentsTab />}
      {activeTab === 'submissions' && <SubmissionsTab onNavigateFix={handleNavigateFix} />}
    </Box>
  );
}
