import { useEffect, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useApplicationRule, useUpsertApplicationRule } from '@/features/auto-apply/hooks/useApplicationRule';

import { setupTouchTargetSx } from '@/features/auto-apply/utils/setupFieldFocus';
import { Box, CircularProgress, Paper, Typography } from '@/lib/material';

import { ChipListEditor } from './ChipListEditor';

export function RulesTab() {
  const { data: rule, isLoading } = useApplicationRule();
  const upsertRule = useUpsertApplicationRule();
  const { showToast } = useToast();

  const [companies, setCompanies] = useState<string[]>([]);
  const [titleKeywords, setTitleKeywords] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);

  useEffect(() => {
    if (!rule) return;
    setCompanies(rule.blacklistedCompanySlugs);
    setTitleKeywords(rule.excludedTitleKeywords);
    setSources(rule.excludedSources);
  }, [rule]);

  const handleSave = async () => {
    try {
      await upsertRule.mutateAsync({
        blacklistedCompanySlugs: companies,
        excludedTitleKeywords: titleKeywords,
        excludedSources: sources,
      });
      showToast({ message: 'Exclusions saved.', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't update your exclusions. Try again.",
        severity: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <Box aria-busy="true" aria-label="Loading exclusions" sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box
      aria-labelledby="setup-exclusions-heading"
      id="setup-section-exclusions"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 720 }}
    >
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }} variant="outlined">
        <Typography component="h2" data-setup-heading id="setup-exclusions-heading" tabIndex={-1} variant="h6">
          Exclusions
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Optional filters to keep certain companies, title keywords, or job sources out of Assisted Apply
          recommendations.
        </Typography>

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
          <Button isLoading={upsertRule.isPending} onClick={() => void handleSave()} sx={setupTouchTargetSx}>
            Save exclusions
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
