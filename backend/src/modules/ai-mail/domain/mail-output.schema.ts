import { z } from 'zod';

export const AI_MAIL_OUTPUT_SCHEMA_VERSION = 'v1' as const;

const evidenceCategory = z.enum([
  'skill',
  'experience',
  'achievement',
  'education',
  'certification',
  'project',
]);

const warningSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    field: z.enum(['subject', 'bodyText', 'bodyHtml']).optional(),
  })
  .strict();

export const generatedMailOutputSchemaV1 = z
  .object({
    subject: z.string().trim().min(1),
    bodyText: z.string().trim().min(1),
    bodyHtml: z.string().trim().min(1).optional(),
    detectedContext: z
      .object({
        roleTitle: z.string().trim().min(1).optional(),
        companyName: z.string().trim().min(1).optional(),
        recruiterName: z.string().trim().min(1).optional(),
      })
      .strict()
      .default({}),
    highlightedQualifications: z
      .array(
        z
          .object({
            claim: z.string().trim().min(1),
            evidenceCategory,
          })
          .strict(),
      )
      .default([]),
    warnings: z.array(warningSchema).default([]),
  })
  .strict();

export type GeneratedMailOutputV1 = z.infer<typeof generatedMailOutputSchemaV1>;
