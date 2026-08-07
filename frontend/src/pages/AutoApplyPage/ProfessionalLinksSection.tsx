import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import {
  useCandidateProfile,
  useUpsertCandidateProfile,
} from '@/features/auto-apply/hooks/useCandidateProfile';

import { Box, CircularProgress, Paper, Typography } from '@/lib/material';

import { useSetupDirty } from './SetupDirtyContext';
import { isValidHttpUrl } from './setupFormUtils';
import { setupPageSx } from './setupPageStyles';
import { SetupSectionHeading } from './SetupSectionHeading';
import { SetupTextField } from './SetupTextField';

type LinkField = 'linkedin' | 'github' | 'portfolio' | 'behance' | 'stackoverflow' | 'medium';
type FieldErrors = Partial<Record<LinkField, string>>;

export function ProfessionalLinksSection() {
  const { data: profile, isLoading } = useCandidateProfile();
  const upsertProfile = useUpsertCandidateProfile();
  const { showToast } = useToast();

  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [behance, setBehance] = useState('');
  const [stackoverflow, setStackoverflow] = useState('');
  const [medium, setMedium] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const savedSnapshot = useMemo(
    () => ({
      linkedin: profile?.links.linkedin ?? '',
      github: profile?.links.github ?? '',
      portfolio: profile?.links.portfolio ?? '',
      behance: profile?.links.behance ?? '',
      stackoverflow: profile?.links.stackoverflow ?? '',
      medium: profile?.links.medium ?? '',
    }),
    [
      profile?.links.behance,
      profile?.links.github,
      profile?.links.linkedin,
      profile?.links.medium,
      profile?.links.portfolio,
      profile?.links.stackoverflow,
    ],
  );

  useEffect(() => {
    setLinkedin(savedSnapshot.linkedin);
    setGithub(savedSnapshot.github);
    setPortfolio(savedSnapshot.portfolio);
    setBehance(savedSnapshot.behance);
    setStackoverflow(savedSnapshot.stackoverflow);
    setMedium(savedSnapshot.medium);
    setErrors({});
  }, [savedSnapshot]);

  const isDirty =
    linkedin !== savedSnapshot.linkedin ||
    github !== savedSnapshot.github ||
    portfolio !== savedSnapshot.portfolio ||
    behance !== savedSnapshot.behance ||
    stackoverflow !== savedSnapshot.stackoverflow ||
    medium !== savedSnapshot.medium;

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
    if (!isValidHttpUrl(behance))
      next.behance = 'Enter a valid URL starting with http:// or https://.';
    if (!isValidHttpUrl(stackoverflow))
      next.stackoverflow = 'Enter a valid URL starting with http:// or https://.';
    if (!isValidHttpUrl(medium))
      next.medium = 'Enter a valid URL starting with http:// or https://.';
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
          behance: behance.trim() || undefined,
          stackoverflow: stackoverflow.trim() || undefined,
          medium: medium.trim() || undefined,
        },
      });
      showToast({ message: 'Links saved.', severity: 'success' });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : "We couldn't save your details. Try again.",
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
    <Paper
      sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 640 }}
      variant="outlined"
    >
      <SetupSectionHeading
        helperText="Optional. Used to prefill application forms in later phases."
        required={false}
        sectionId="links"
        title="Professional links"
      />
      <SetupTextField
        error={Boolean(errors.linkedin)}
        fullWidth
        helperText={errors.linkedin}
        label="LinkedIn profile"
        onChange={(event) => setLinkedin(event.target.value)}
        placeholder="https://linkedin.com/in/..."
        value={linkedin}
      />
      <SetupTextField
        error={Boolean(errors.github)}
        fullWidth
        helperText={errors.github}
        label="GitHub profile"
        onChange={(event) => setGithub(event.target.value)}
        placeholder="https://github.com/..."
        value={github}
      />
      <SetupTextField
        error={Boolean(errors.portfolio)}
        fullWidth
        helperText={errors.portfolio}
        label="Portfolio or personal site"
        onChange={(event) => setPortfolio(event.target.value)}
        placeholder="https://..."
        value={portfolio}
      />
      <SetupTextField
        error={Boolean(errors.behance)}
        fullWidth
        helperText={errors.behance}
        label="Behance / Dribbble"
        onChange={(event) => setBehance(event.target.value)}
        placeholder="https://behance.net/..."
        value={behance}
      />
      <SetupTextField
        error={Boolean(errors.stackoverflow)}
        fullWidth
        helperText={errors.stackoverflow}
        label="Stack Overflow"
        onChange={(event) => setStackoverflow(event.target.value)}
        placeholder="https://stackoverflow.com/users/..."
        value={stackoverflow}
      />
      <SetupTextField
        error={Boolean(errors.medium)}
        fullWidth
        helperText={errors.medium}
        label="Medium / Blog"
        onChange={(event) => setMedium(event.target.value)}
        placeholder="https://medium.com/@..."
        value={medium}
      />
      <Box
        sx={{
          bgcolor: 'primary.50',
          borderRadius: 1.5,
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          p: 2,
        }}
      >
        {['Increase match score', 'Build credibility', 'Stand out from others'].map((tip) => (
          <Typography key={tip} sx={setupPageSx.tipText}>
            {tip}
          </Typography>
        ))}
      </Box>
      <Box>
        <Button
          disabled={!isDirty}
          isLoading={upsertProfile.isPending}
          onClick={() => void handleSave()}
        >
          Save
        </Button>
      </Box>
    </Paper>
  );
}
