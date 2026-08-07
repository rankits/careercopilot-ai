import { useEffect, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import {
  useApplicationRule,
  useUpsertApplicationRule,
} from '@/features/auto-apply/hooks/useApplicationRule';

import { setupTouchTargetSx } from '@/features/auto-apply/utils/setupFieldFocus';
import { Box, CircularProgress, Paper, TextField, Typography } from '@/lib/material';

import { ChipListEditor } from './ChipListEditor';
import { setupPageSx } from './setupPageStyles';
import { SetupTextField } from './SetupTextField';

export function RulesTab() {
  const { data: rule, isLoading } = useApplicationRule();
  const upsertRule = useUpsertApplicationRule();
  const { showToast } = useToast();

  const [companies, setCompanies] = useState<string[]>([]);
  const [titleKeywords, setTitleKeywords] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [minMatchScore, setMinMatchScore] = useState(70);
  const [dailyLimit, setDailyLimit] = useState(10);
  const [weeklyLimit, setWeeklyLimit] = useState('');

  useEffect(() => {
    if (!rule) return;
    setCompanies(rule.blacklistedCompanySlugs);
    setTitleKeywords(rule.excludedTitleKeywords);
    setSources(rule.excludedSources);
    setMinMatchScore(rule.minMatchScore);
    setDailyLimit(rule.dailyApplicationLimit);
    setWeeklyLimit(rule.weeklyApplicationLimit == null ? '' : String(rule.weeklyApplicationLimit));
  }, [rule]);

  const handleSave = async () => {
    try {
      await upsertRule.mutateAsync({
        blacklistedCompanySlugs: companies,
        excludedTitleKeywords: titleKeywords,
        excludedSources: sources,
        minMatchScore,
        dailyApplicationLimit: dailyLimit,
        weeklyApplicationLimit: weeklyLimit ? Number(weeklyLimit) : null,
      });
      showToast({ message: 'Auto-apply rules saved.', severity: 'success' });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : "We couldn't update your exclusions. Try again.",
        severity: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <Box
        aria-busy="true"
        aria-label="Loading exclusions"
        sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box
      aria-labelledby="setup-rules-heading"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }} variant="outlined">
        <Typography
          component="h2"
          data-setup-heading
          id="setup-rules-heading"
          sx={setupPageSx.sectionTitle}
          tabIndex={-1}
          variant="h6"
        >
          Auto-apply rules
        </Typography>
        <Typography sx={setupPageSx.sectionHelper}>
          Control which opportunities qualify and how frequently applications can be prepared.
        </Typography>
        <Box
          sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}
        >
          <TextField
            inputProps={{ max: 100, min: 0 }}
            label="Minimum match score"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setMinMatchScore(Number(event.target.value))}
            type="number"
            value={minMatchScore}
          />
          <SetupTextField
            inputProps={{ min: 1 }}
            label="Daily application limit"
            onChange={(event) => setDailyLimit(Number(event.target.value))}
            type="number"
            value={dailyLimit}
          />
          <SetupTextField
            helperText="Optional"
            inputProps={{ min: 1 }}
            label="Weekly application limit"
            onChange={(event) => setWeeklyLimit(event.target.value)}
            type="number"
            value={weeklyLimit}
          />
        </Box>

        <ChipListEditor
          id="excludedCompanies"
          label="Companies to exclude"
          onChange={setCompanies}
          values={companies}
        />
        <ChipListEditor
          id="excludedTitleKeywords"
          label="Title keywords to exclude"
          onChange={setTitleKeywords}
          values={titleKeywords}
        />
        <ChipListEditor
          id="excludedSources"
          label="Sources to exclude"
          onChange={setSources}
          values={sources}
        />

        <Box>
          <Button
            isLoading={upsertRule.isPending}
            onClick={() => void handleSave()}
            sx={setupTouchTargetSx}
          >
            Save rules
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
