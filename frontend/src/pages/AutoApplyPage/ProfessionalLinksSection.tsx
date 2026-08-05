import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';
import {
  useCandidateProfile,
  useUpsertCandidateProfile,
} from '@/features/auto-apply/hooks/useCandidateProfile';
import { Box, CircularProgress, Paper, TextField } from '@/lib/material';

import { SetupSectionHeading } from './SetupSectionHeading';
import { useSetupDirty } from './SetupDirtyContext';
import { isValidHttpUrl } from './setupFormUtils';

type FieldErrors = Partial<Record<'linkedin' | 'github' | 'portfolio', string>>;

export function ProfessionalLinksSection() {
  const { data: profile, isLoading } = useCandidateProfile();
  const upsertProfile = useUpsertCandidateProfile();
  const { showToast } = useToast();

  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const savedSnapshot = useMemo(
    () => ({
      linkedin: profile?.links.linkedin ?? '',
      github: profile?.links.github ?? '',
      portfolio: profile?.links.portfolio ?? '',
    }),
    [profile?.links.github, profile?.links.linkedin, profile?.links.portfolio],
  );

  useEffect(() => {
    setLinkedin(savedSnapshot.linkedin);
    setGithub(savedSnapshot.github);
    setPortfolio(savedSnapshot.portfolio);
    setErrors({});
  }, [savedSnapshot]);

  const isDirty =
    linkedin !== savedSnapshot.linkedin ||
    github !== savedSnapshot.github ||
    portfolio !== savedSnapshot.portfolio;

  useSetupDirty('links', isDirty);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!isValidHttpUrl(linkedin)) {
      next.linkedin = 'Enter a valid URL starting with http:// or https://.';
    }
    if (!isValidHttpUrl(github)) {
      next.github = 'Enter a valid URL starting with http:// or https://.';
    }
    if (!isValidHttpUrl(portfolio)) {
      next.portfolio = 'Enter a valid URL starting with http:// or https://.';
    }
    return next;
  };

  const handleSave = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await upsertProfile.mutateAsync({
        links: {
          linkedin: linkedin.trim() || undefined,
          github: github.trim() || undefined,
          portfolio: portfolio.trim() || undefined,
        },
      });
      showToast({ message: 'Links saved.', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't save your details. Try again.",
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
    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 640 }} variant="outlined">
      <SetupSectionHeading
        helperText="Optional. Used to prefill application forms in later phases."
        required={false}
        sectionId="links"
        title="Professional links"
      />
      <TextField
        error={Boolean(errors.linkedin)}
        fullWidth
        helperText={errors.linkedin}
        label="LinkedIn profile"
        onChange={(event) => setLinkedin(event.target.value)}
        placeholder="https://linkedin.com/in/..."
        value={linkedin}
      />
      <TextField
        error={Boolean(errors.github)}
        fullWidth
        helperText={errors.github}
        label="GitHub profile"
        onChange={(event) => setGithub(event.target.value)}
        placeholder="https://github.com/..."
        value={github}
      />
      <TextField
        error={Boolean(errors.portfolio)}
        fullWidth
        helperText={errors.portfolio}
        label="Portfolio or personal site"
        onChange={(event) => setPortfolio(event.target.value)}
        placeholder="https://..."
        value={portfolio}
      />
      <Box>
        <Button disabled={!isDirty} isLoading={upsertProfile.isPending} onClick={() => void handleSave()}>
          Save
        </Button>
      </Box>
    </Paper>
  );
}
