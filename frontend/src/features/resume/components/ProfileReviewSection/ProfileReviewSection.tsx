import type { ReactNode } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

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
import { spacing } from '@/tokens';

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
  icon: ReactNode;
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
  icon,
  onToggle,
  register,
  status,
  subtitle,
  title,
}: ProfileReviewSectionProps) {
  return (
    <StyledAccordion disableGutters expanded={expanded} onChange={onToggle}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={reviewSectionSx.summary}>
        <Box alignItems="center" display="flex" gap={spacing[3]} minWidth={0} width="100%">
          <Box sx={reviewSectionSx.icon}>{icon}</Box>
          <Box minWidth={0}>
            <Box alignItems="center" display="flex" flexWrap="wrap" gap={spacing[2]}>
              <Typography fontWeight={700}>{title}</Typography>
              {badge ? (
                <Chip color="primary" label={badge} size="small" variant="outlined" />
              ) : null}
            </Box>
            <Typography color="text.secondary" noWrap variant="caption">
              {subtitle}
            </Typography>
          </Box>
          <Typography
            color={status.startsWith('0') ? 'error' : 'primary'}
            fontWeight={700}
            ml="auto"
            mr={spacing[2]}
            variant="caption"
          >
            {status}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={reviewSectionSx.details}>
        <ReviewFields>
          {fields.map(({ label, multiline, name, required }) => (
            <Input
              key={name}
              {...register(name, {
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
              })}
              errorMessage={errors[name]?.message}
              fullWidth
              label={label}
              minRows={multiline ? 3 : undefined}
              multiline={multiline}
              required={required}
              sx={multiline ? reviewSectionSx.multilineInput : reviewSectionSx.input}
            />
          ))}
        </ReviewFields>
      </AccordionDetails>
    </StyledAccordion>
  );
}
