import { useState } from 'react';

import { Box, Tab, Tabs, Typography } from '@/lib/material';

import { AnswersTab } from './AnswersTab';
import { ConsentsTab } from './ConsentsTab';
import { ProfileTab } from './ProfileTab';
import { ResumeVersionsTab } from './ResumeVersionsTab';
import { RulesTab } from './RulesTab';
import { SubmissionsTab } from './SubmissionsTab';

type AutoApplyTabId = 'profile' | 'answers' | 'resumes' | 'rules' | 'consents' | 'submissions';

const TABS: { id: AutoApplyTabId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'answers', label: 'Verified Answers' },
  { id: 'resumes', label: 'Resume Versions' },
  { id: 'rules', label: 'Rules' },
  { id: 'consents', label: 'Consents' },
  { id: 'submissions', label: 'Submissions' },
];

export function AutoApplyPage() {
  const [activeTab, setActiveTab] = useState<AutoApplyTabId>('profile');

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography sx={{ mb: 0.5 }} variant="h4">
        Auto Apply
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }} variant="body1">
        Set up your profile, verified answers, and rules, then track jobs and review generated
        application plans. Nothing is ever submitted without your review — full autopilot is not
        enabled yet.
      </Typography>

      <Tabs
        aria-label="Auto Apply sections"
        onChange={(_event, value: AutoApplyTabId) => setActiveTab(value)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        value={activeTab}
      >
        {TABS.map((tab) => (
          <Tab key={tab.id} label={tab.label} value={tab.id} />
        ))}
      </Tabs>

      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'answers' && <AnswersTab />}
      {activeTab === 'resumes' && <ResumeVersionsTab />}
      {activeTab === 'rules' && <RulesTab />}
      {activeTab === 'consents' && <ConsentsTab />}
      {activeTab === 'submissions' && <SubmissionsTab />}
    </Box>
  );
}
