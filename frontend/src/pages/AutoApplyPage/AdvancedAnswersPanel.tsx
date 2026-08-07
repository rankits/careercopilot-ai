import { useEffect, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import {
  useApplicationAnswers,
  useCreateApplicationAnswer,
  useDeleteApplicationAnswer,
} from '@/features/auto-apply/hooks/useApplicationAnswers';

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  DeleteOutlineIcon,
  ExpandMoreIcon,
  FormControlLabel,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@/lib/material';

const SUGGESTED_ANSWER_KEYS: ReadonlyArray<{ key: string; hint: string }> = [
  { key: 'current_work_region', hint: 'e.g. India, United States, Canada' },
  { key: 'mobile_design_experience', hint: 'e.g. 4 years mobile product design' },
  { key: 'expected_salary', hint: 'e.g. 120000 USD' },
];

export function AdvancedAnswersPanel({
  suggestedQuestionKey,
}: {
  suggestedQuestionKey?: string;
} = {}) {
  const { data: answers, isLoading } = useApplicationAnswers();
  const createAnswer = useCreateApplicationAnswer();
  const deleteAnswer = useDeleteApplicationAnswer();
  const { showToast } = useToast();

  const [expanded, setExpanded] = useState(Boolean(suggestedQuestionKey));
  const [questionKey, setQuestionKey] = useState(suggestedQuestionKey ?? '');
  const [answerValue, setAnswerValue] = useState('');
  const [autoSubmitAllowed, setAutoSubmitAllowed] = useState(false);

  useEffect(() => {
    if (suggestedQuestionKey) {
      setQuestionKey(suggestedQuestionKey);
      setExpanded(true);
    }
  }, [suggestedQuestionKey]);

  const handleAdd = async () => {
    try {
      await createAnswer.mutateAsync({
        questionKey: questionKey.trim(),
        answer: answerValue.trim(),
        autoSubmitAllowed,
      });
      setQuestionKey('');
      setAnswerValue('');
      setAutoSubmitAllowed(false);
      showToast({ message: 'Verified answer saved.', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to save this answer.',
        severity: 'error',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnswer.mutateAsync(id);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to delete this answer.',
        severity: 'error',
      });
    }
  };

  return (
    <Accordion expanded={expanded} onChange={(_event, next) => setExpanded(next)} variant="outlined">
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1">Advanced answers</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography color="text.secondary" variant="body2">
            Manage custom answer keys beyond the common questions above. Demographic, disability, and
            veteran-status questions are always rejected — never stored, per platform policy.
          </Typography>

          {suggestedQuestionKey && (
            <Alert severity="info">
              Question key prefilled from your application review. Enter the answer and save, then
              return to Submissions — we will re-check automatically.
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {SUGGESTED_ANSWER_KEYS.map((item) => (
              <Chip
                clickable
                color={questionKey === item.key ? 'primary' : 'default'}
                key={item.key}
                label={item.key}
                onClick={() => setQuestionKey(item.key)}
                size="small"
                variant={questionKey === item.key ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
          <Typography color="text.secondary" variant="caption">
            {SUGGESTED_ANSWER_KEYS.find((item) => item.key === questionKey)?.hint ??
              'Pick a common key or type your own snake_case key'}
          </Typography>

          <TextField
            fullWidth
            helperText="snake_case, e.g. current_work_region"
            label="Question key"
            onChange={(event) => setQuestionKey(event.target.value)}
            value={questionKey}
          />
          <TextField
            fullWidth
            label="Answer"
            multiline
            onChange={(event) => setAnswerValue(event.target.value)}
            value={answerValue}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={autoSubmitAllowed}
                onChange={(event) => setAutoSubmitAllowed(event.target.checked)}
              />
            }
            label="Allow auto-submitting this answer (ignored for sensitive questions)"
          />
          <Box>
            <Button
              disabled={!questionKey.trim() || !answerValue.trim()}
              isLoading={createAnswer.isPending}
              onClick={() => void handleAdd()}
            >
              Add answer
            </Button>
          </Box>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : !answers || answers.length === 0 ? (
            <Alert severity="info">No verified answers yet.</Alert>
          ) : (
            <Paper variant="outlined">
              {answers.map((answer, index) => (
                <Box
                  key={answer.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    borderTop: index === 0 ? 'none' : '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={600} variant="body2">
                      {answer.questionKey}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {answer.answer}
                    </Typography>
                  </Box>
                  {answer.sensitive && <Chip label="Sensitive" size="small" />}
                  <Chip
                    color={answer.autoSubmitAllowed ? 'success' : 'default'}
                    label={answer.autoSubmitAllowed ? 'Auto-submit allowed' : 'Review required'}
                    size="small"
                    variant="outlined"
                  />
                  <IconButton
                    aria-label="Delete answer"
                    onClick={() => void handleDelete(answer.id)}
                    size="small"
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Paper>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
