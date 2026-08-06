import type { ReactNode } from 'react';
import type { FieldErrors, UseFormRegister, UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '@/components/atoms';

import type { ResumeProfileFormValues } from '@/features/resume/types/resume.types';
import {
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  ExpandMoreIcon,
  Typography,
} from '@/lib/material';

import { ReviewFields, reviewSectionSx, StyledAccordion } from './styles';

export interface ReviewField {
  label: string;
  multiline?: boolean;
  name: keyof ResumeProfileFormValues;
  required?: boolean;
}

interface ProfileReviewSectionProps {
  badge?: string;
  expanded: boolean;
  errors: FieldErrors<ResumeProfileFormValues>;
  fields: ReviewField[];
  /** Optional action rendered above a specific field (e.g. summary AI button). */
  fieldActions?: Partial<Record<keyof ResumeProfileFormValues, ReactNode>>;
  icon: ReactNode;
  onFieldChange?: () => void;
  onToggle: () => void;
  register: UseFormRegister<ResumeProfileFormValues>;
  status: string;
  subtitle: string;
  title: string;
}

export function ProfileReviewSection({
  badge,
  expanded,
  errors,
  fields,
  fieldActions,
  icon,
  onFieldChange,
  onToggle,
  register,
  status,
  subtitle,
  title,
}: ProfileReviewSectionProps) {
  return (
    <StyledAccordion disableGutters expanded={expanded} onChange={onToggle}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={reviewSectionSx.summary}>
        <Box sx={reviewSectionSx.summaryContent}>
          <Box sx={reviewSectionSx.icon}>{icon}</Box>
          <Box sx={reviewSectionSx.summaryCopy}>
            <Box sx={reviewSectionSx.summaryTitleRow}>
              <Typography component="h3" sx={reviewSectionSx.summaryTitle}>
                {title}
              </Typography>
              {badge ? (
                <Chip color="primary" label={badge} size="small" variant="outlined" />
              ) : null}
              <Typography
                color={status.startsWith('0') ? 'error' : 'primary'}
                component="span"
                sx={reviewSectionSx.summaryStatus}
              >
                {status}
              </Typography>
            </Box>
            <Typography color="text.secondary" sx={reviewSectionSx.summarySubtitle}>
              {subtitle}
            </Typography>
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={reviewSectionSx.details}>
        <ReviewFields>
          {fields.map(({ label, multiline, name, required }) => {
            const registration: UseFormRegisterReturn = register(name, {
              pattern:
                name === 'email'
                  ? { message: 'Enter a valid email address.', value: /^\S+@\S+\.\S+$/ }
                  : name === 'totalExperience'
                    ? {
                        message: 'Enter a valid number of years.',
                        value: /^\d+(?:\.\d{1,2})?$/,
                      }
                    : undefined,
              required: required ? `${label} is required.` : false,
            });
            const fieldAction = fieldActions?.[name];

            return (
              <Box
                key={name}
                sx={multiline ? reviewSectionSx.multilineInput : reviewSectionSx.input}
              >
                {fieldAction ? <Box sx={reviewSectionSx.fieldActionRow}>{fieldAction}</Box> : null}
                <Input
                  {...registration}
                  errorMessage={errors[name]?.message}
                  fullWidth
                  label={label}
                  minRows={multiline ? 3 : undefined}
                  multiline={multiline}
                  onChange={(event) => {
                    void registration.onChange(event);
                    onFieldChange?.();
                  }}
                  required={required}
                  sx={{ width: '100%' }}
                />
              </Box>
            );
          })}
        </ReviewFields>
      </AccordionDetails>
    </StyledAccordion>
  );
}
