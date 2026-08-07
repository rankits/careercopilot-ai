/**
 * JSON Schema equivalent of generatedMailOutputSchemaV1 for OpenRouter
 * response_format.json_schema. Keep in sync with mail-output.schema.ts.
 * Local Zod parsing remains the source of truth after the provider returns.
 */
export const mailOutputJsonSchemaV1 = {
  type: 'object',
  additionalProperties: false,
  required: ['subject', 'bodyText', 'detectedContext', 'highlightedQualifications', 'warnings'],
  properties: {
    subject: { type: 'string', minLength: 1 },
    bodyText: { type: 'string', minLength: 1 },
    bodyHtml: { type: 'string', minLength: 1 },
    detectedContext: {
      type: 'object',
      additionalProperties: false,
      properties: {
        roleTitle: { type: 'string', minLength: 1 },
        companyName: { type: 'string', minLength: 1 },
        recruiterName: { type: 'string', minLength: 1 },
      },
    },
    highlightedQualifications: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['claim', 'evidenceCategory'],
        properties: {
          claim: { type: 'string', minLength: 1 },
          evidenceCategory: {
            type: 'string',
            enum: ['skill', 'experience', 'achievement', 'education', 'certification', 'project'],
          },
        },
      },
    },
    warnings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', minLength: 1 },
          message: { type: 'string', minLength: 1 },
          field: { type: 'string', enum: ['subject', 'bodyText', 'bodyHtml'] },
        },
      },
    },
  },
} as const;

export type MailOutputJsonSchemaV1 = typeof mailOutputJsonSchemaV1;
