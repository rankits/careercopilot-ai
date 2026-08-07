import { describe, expect, it } from 'vitest';

import { mailOutputJsonSchemaV1 } from '@/modules/ai-mail/domain/mail-output.json-schema.js';
import { generatedMailOutputSchemaV1 } from '@/modules/ai-mail/domain/mail-output.schema.js';

describe('mailOutputJsonSchemaV1', () => {
  it('mirrors the required top-level fields of the Zod v1 output contract', () => {
    const props = Object.keys(mailOutputJsonSchemaV1.properties).sort();
    expect(props).toEqual(
      [
        'bodyHtml',
        'bodyText',
        'detectedContext',
        'highlightedQualifications',
        'subject',
        'warnings',
      ].sort(),
    );
    expect(mailOutputJsonSchemaV1.required).toEqual(
      expect.arrayContaining([
        'subject',
        'bodyText',
        'detectedContext',
        'highlightedQualifications',
        'warnings',
      ]),
    );
    expect(mailOutputJsonSchemaV1.additionalProperties).toBe(false);
  });

  it('accepts a fixture that also passes Zod v1 parsing', () => {
    const fixture = {
      subject: 'Application for Backend Engineer',
      bodyText: 'I am writing to express interest in the Backend Engineer role.',
      detectedContext: { roleTitle: 'Backend Engineer', companyName: 'Acme' },
      highlightedQualifications: [{ claim: 'Node.js experience', evidenceCategory: 'skill' }],
      warnings: [],
    };

    expect(generatedMailOutputSchemaV1.safeParse(fixture).success).toBe(true);
    expect(mailOutputJsonSchemaV1.properties.subject.type).toBe('string');
    expect(
      mailOutputJsonSchemaV1.properties.highlightedQualifications.items.properties.evidenceCategory
        .enum,
    ).toContain('skill');
  });
});
