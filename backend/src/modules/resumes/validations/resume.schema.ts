import { z } from 'zod';

export const resumeIdParamsSchema = z.object({
  params: z.object({
    resumeId: z.string().uuid(),
  }),
});

export const resumeParseActionParamsSchema = z.object({
  params: z.object({
    resumeId: z.string().uuid(),
  }),
});

export const resumeReparseSchema = z.object({
  params: z.object({
    resumeId: z.string().uuid(),
  }),
  body: z.object({
    reason: z.string().min(1).max(500).optional(),
  }),
});

export const candidateProfileParamsSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
});

const recordSchema = z.record(z.string(), z.unknown());
const recordArraySchema = z.array(recordSchema);

/** Non-empty when provided - mirrors the Save button being disabled until
 * at least one skill is entered, on both the create and edit profile pages. */
const skillsSchema = z
  .array(z.string().trim().min(1))
  .min(1, 'At least one skill is required.')
  .max(200);

/** Fields the FE always sends filled-in for a first-time `personalDetails`
 * (it gates the Save button on them - see `REQUIRED_PROFILE_FIELDS` in
 * ProfilePage.tsx/EditProfilePage.tsx). Only enforced at profile creation
 * (`confirmProfileSchema`) - a caller that bypasses the FE can't create a
 * profile missing a mandatory field. Edits use the plain `recordSchema`
 * below since they're merged onto the existing `personalDetails` (see
 * `resumeRepository.updateCandidateProfile`), so a partial edit is
 * expected and safe. */
const MANDATORY_PERSONAL_DETAIL_FIELDS = [
  'fullName',
  'email',
  'phone',
  'designation',
  'totalExperience',
  'summary',
] as const;

const newPersonalDetailsSchema = recordSchema.superRefine((value, ctx) => {
  for (const field of MANDATORY_PERSONAL_DETAIL_FIELDS) {
    const fieldValue = value[field];
    if (typeof fieldValue !== 'string' || fieldValue.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `personalDetails.${field} is required.`,
      });
    }
  }
});

export const confirmProfileSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
  body: z.object({
    resumeId: z.string().uuid(),
    personalDetails: newPersonalDetailsSchema.optional(),
    experience: recordArraySchema.optional(),
    education: recordArraySchema.optional(),
    skills: skillsSchema.optional(),
    certifications: recordArraySchema.optional(),
  }),
});

export const updateCandidateProfileSchema = z.object({
  body: z
    .object({
      personalDetails: recordSchema.optional(),
      experience: recordArraySchema.optional(),
      education: recordArraySchema.optional(),
      skills: skillsSchema.optional(),
      certifications: recordArraySchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    }),
});
