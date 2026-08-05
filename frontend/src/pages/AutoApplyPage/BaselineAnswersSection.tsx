import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';
import {
  useApplicationAnswers,
  useUpsertApplicationAnswer,
} from '@/features/auto-apply/hooks/useApplicationAnswers';
import { Box, CircularProgress, Paper, TextField } from '@/lib/material';

import { SetupSectionHeading } from './SetupSectionHeading';
import { useSetupDirty } from './SetupDirtyContext';
import { BASELINE_ANSWER_FIELDS } from './setupFormUtils';

export function BaselineAnswersSection() {
  const { data: answers, isLoading } = useApplicationAnswers();
  const upsertAnswer = useUpsertApplicationAnswer();
  const { showToast } = useToast();

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const savedSnapshot = useMemo(() => {
    const snapshot: Record<string, string> = {};
    for (const field of BASELINE_ANSWER_FIELDS) {
      snapshot[field.key] =
        answers?.find((answer) => answer.questionKey === field.key)?.answer ?? '';
    }
    return snapshot;
  }, [answers]);

  useEffect(() => {
    setValues(savedSnapshot);
    setErrors({});
  }, [savedSnapshot]);

  const isDirty = BASELINE_ANSWER_FIELDS.some((field) => values[field.key] !== savedSnapshot[field.key]);

  useSetupDirty('answers', isDirty);

  const handleSave = async () => {
    const nextErrors: Record<string, string | undefined> = {};
    for (const field of BASELINE_ANSWER_FIELDS) {
      const error = field.validate(values[field.key] ?? '');
      if (error) nextErrors[field.key] = error;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      for (const field of BASELINE_ANSWER_FIELDS) {
        const value = values[field.key]?.trim();
        if (!value) continue;
        await upsertAnswer.mutateAsync({
          questionKey: field.key,
          answer: value,
          autoSubmitAllowed: field.key !== 'years_of_experience',
        });
      }
      showToast({ message: 'Common answers saved.', severity: 'success' });
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
    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 720 }} variant="outlined">
      <SetupSectionHeading
        helperText="These are the questions almost every application asks. Answer them once here."
        required
        sectionId="answers"
        title="Common answers"
      />

      {BASELINE_ANSWER_FIELDS.map((field) => (
        <TextField
          error={Boolean(errors[field.key])}
          fullWidth
          helperText={errors[field.key]}
          key={field.key}
          label={field.label}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              [field.key]: event.target.value,
            }))
          }
          placeholder={field.placeholder}
          type={field.inputType}
          value={values[field.key] ?? ''}
        />
      ))}

      <Box>
        <Button disabled={!isDirty} isLoading={upsertAnswer.isPending} onClick={() => void handleSave()}>
          Save
        </Button>
      </Box>
    </Paper>
  );
}
