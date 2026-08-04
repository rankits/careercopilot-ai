import { useEffect, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import {
  useApplicationRule,
  useToggleAutopilotPause,
  useUpsertApplicationRule,
} from '@/features/auto-apply/hooks/useApplicationRule';

import { Alert, Box, CircularProgress, Paper, TextField, Typography } from '@/lib/material';

export function RulesTab() {
  const { data: rule, isLoading } = useApplicationRule();
  const upsertRule = useUpsertApplicationRule();
  const togglePause = useToggleAutopilotPause();
  const { showToast } = useToast();

  const [minMatchScore, setMinMatchScore] = useState('0.85');
  const [dailyLimit, setDailyLimit] = useState('5');
  const [weeklyLimit, setWeeklyLimit] = useState('');
  const [blacklistedCompanies, setBlacklistedCompanies] = useState('');
  const [excludedTitles, setExcludedTitles] = useState('');
  const [excludedSources, setExcludedSources] = useState('');

  useEffect(() => {
    if (!rule) return;
    setMinMatchScore(String(rule.minMatchScore));
    setDailyLimit(String(rule.dailyApplicationLimit));
    setWeeklyLimit(rule.weeklyApplicationLimit?.toString() ?? '');
    setBlacklistedCompanies(rule.blacklistedCompanySlugs.join(', '));
    setExcludedTitles(rule.excludedTitleKeywords.join(', '));
    setExcludedSources(rule.excludedSources.join(', '));
  }, [rule]);

  const handleSave = async () => {
    try {
      await upsertRule.mutateAsync({
        minMatchScore: minMatchScore ? Number(minMatchScore) : undefined,
        dailyApplicationLimit: dailyLimit ? Number(dailyLimit) : undefined,
        weeklyApplicationLimit: weeklyLimit ? Number(weeklyLimit) : null,
        blacklistedCompanySlugs: blacklistedCompanies
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        excludedTitleKeywords: excludedTitles
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        excludedSources: excludedSources
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      });
      showToast({ message: 'Rule configuration saved.', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to save rule configuration.',
        severity: 'error',
      });
    }
  };

  const handleTogglePause = async () => {
    try {
      await togglePause.mutateAsync(!rule?.autopilotPausedAt);
      showToast({
        message: rule?.autopilotPausedAt ? 'Autopilot resumed.' : 'Autopilot paused.',
        severity: 'success',
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to change autopilot pause state.',
        severity: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 640 }}>
      <Alert severity="info">
        Full autopilot submission is not enabled yet — these limits are the eligibility
        engine&apos;s operational policy, and the pause switch works today regardless.
      </Alert>

      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }} variant="outlined">
        <Typography variant="h6">Eligibility &amp; autopilot policy</Typography>

        <TextField
          helperText="0.00 - 1.00"
          label="Minimum match score"
          onChange={(event) => setMinMatchScore(event.target.value)}
          slotProps={{ htmlInput: { min: 0, max: 1, step: 0.01 } }}
          type="number"
          value={minMatchScore}
        />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Daily application limit"
            onChange={(event) => setDailyLimit(event.target.value)}
            type="number"
            value={dailyLimit}
          />
          <TextField
            label="Weekly application limit"
            onChange={(event) => setWeeklyLimit(event.target.value)}
            type="number"
            value={weeklyLimit}
          />
        </Box>
        <TextField
          fullWidth
          helperText="Comma-separated company slugs"
          label="Blacklisted companies"
          onChange={(event) => setBlacklistedCompanies(event.target.value)}
          value={blacklistedCompanies}
        />
        <TextField
          fullWidth
          helperText="Comma-separated keywords"
          label="Excluded title keywords"
          onChange={(event) => setExcludedTitles(event.target.value)}
          value={excludedTitles}
        />
        <TextField
          fullWidth
          helperText="Comma-separated provider names"
          label="Excluded sources"
          onChange={(event) => setExcludedSources(event.target.value)}
          value={excludedSources}
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button isLoading={upsertRule.isPending} onClick={() => void handleSave()}>
            Save configuration
          </Button>
          <Button
            isLoading={togglePause.isPending}
            onClick={() => void handleTogglePause()}
            tone={rule?.autopilotPausedAt ? 'primary' : 'danger'}
            variant="outline"
          >
            {rule?.autopilotPausedAt ? 'Resume autopilot' : 'Pause autopilot'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
