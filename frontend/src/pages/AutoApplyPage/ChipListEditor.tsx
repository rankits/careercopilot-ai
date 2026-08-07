import { useState, type KeyboardEvent } from 'react';

import { Button } from '@/components/atoms/Button';

import { setupTouchTargetSx } from '@/features/auto-apply/utils/setupFieldFocus';

import { setupPageSx } from './setupPageStyles';
import { SetupTextField } from './SetupTextField';
import { Box, Chip, FormHelperText, Stack, TextField, Typography } from '@/lib/material';

export interface ChipListEditorProps {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  duplicateMessage?: string;
  emptyMessage?: string;
  placeholder?: string;
  normalize?: (value: string) => string;
}

export function ChipListEditor({
  id,
  label,
  values,
  onChange,
  duplicateMessage = 'Already excluded.',
  emptyMessage = 'No exclusions yet.',
  placeholder = 'Type and press Enter',
  normalize = (value) => value.trim(),
}: ChipListEditorProps) {
  const [draft, setDraft] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const fieldId = `setup-field-${id}`;
  const errorId = `${fieldId}-error`;

  const addValue = () => {
    const next = normalize(draft);
    if (!next) return;
    if (values.some((value) => value.toLowerCase() === next.toLowerCase())) {
      setDuplicateError(duplicateMessage);
      return;
    }
    setDuplicateError(null);
    onChange([...values, next]);
    setDraft('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addValue();
    }
  };

  return (
    <Box component="fieldset" sx={{ border: 0, p: 0, m: 0 }}>
      <Stack alignItems="flex-start" direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <SetupTextField
          aria-describedby={duplicateError ? errorId : undefined}
          aria-invalid={duplicateError ? true : undefined}
          fullWidth
          id={fieldId}
          label={label}
          onChange={(event) => {
            setDraft(event.target.value);
            if (duplicateError) setDuplicateError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          size="small"
          sx={{ flex: 1 }}
          value={draft}
        />
        <Button onClick={addValue} sx={setupTouchTargetSx} type="button" variant="outline">
          Add
        </Button>
      </Stack>
      {duplicateError ? (
        <FormHelperText error id={errorId} role="alert" sx={{ ...setupPageSx.errorText, mx: 1.75 }}>
          {duplicateError}
        </FormHelperText>
      ) : null}
      <Box
        aria-live="polite"
        sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5, minHeight: 32 }}
      >
        {values.length === 0 ? (
          <Typography sx={setupPageSx.bodySecondary}>{emptyMessage}</Typography>
        ) : (
          values.map((value) => (
            <Chip
              aria-label={`Remove ${value}`}
              key={value}
              label={value}
              onDelete={() => onChange(values.filter((item) => item !== value))}
              sx={setupTouchTargetSx}
            />
          ))
        )}
      </Box>
    </Box>
  );
}
