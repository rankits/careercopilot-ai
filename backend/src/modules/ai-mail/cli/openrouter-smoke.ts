/**
 * Manual-only OpenRouter smoke test for AI Mail Phase 1E.
 * Never runs in CI. Requires OPENROUTER_API_KEY + OPENROUTER_MODEL.
 *
 * Usage:
 *   npm run ai-mail:openrouter:smoke
 *   AI_MAIL_SMOKE_PRINT_OUTPUT=true npm run ai-mail:openrouter:smoke
 */
import { MailOutputParser } from '@/modules/ai-mail/application/mail-output.parser.js';
import { MailPromptBuilder } from '@/modules/ai-mail/application/mail-prompt.builder.js';
import { MailTruthfulnessValidator } from '@/modules/ai-mail/application/mail-truthfulness.validator.js';
import { aiMailServerConfig } from '@/modules/ai-mail/config/ai-mail.config.js';
import type { MailGenerationContext } from '@/modules/ai-mail/domain/ai-mail.types.js';
import { OpenRouterMailGenerationAdapter } from '@/modules/ai-mail/providers/openrouter/openrouter-mail.adapter.js';

const printOutput = process.env.AI_MAIL_SMOKE_PRINT_OUTPUT === 'true';

const syntheticContext = (): MailGenerationContext => ({
  candidate: {
    fullName: 'Smoke Test Candidate',
    skills: ['TypeScript', 'Node.js'],
    experience: [
      {
        roleTitle: 'Software Engineer',
        companyName: 'Example Corp',
        current: true,
        highlights: ['Built APIs with TypeScript'],
      },
    ],
    projects: [],
    education: [],
    certifications: [],
    approvedAchievements: ['Shipped a production API'],
    professionalLinks: [],
  },
  resume: {
    resumeId: 'smoke-resume',
    fileName: 'smoke.pdf',
    skills: ['TypeScript', 'Node.js'],
    experience: [
      {
        roleTitle: 'Software Engineer',
        companyName: 'Example Corp',
        current: true,
        highlights: ['Built APIs with TypeScript'],
      },
    ],
    verifiedAchievements: ['Shipped a production API'],
    projects: [],
    education: [],
    certifications: [],
    parseStatus: 'COMPLETED',
  },
  job: {
    description: 'Looking for a Backend Engineer with TypeScript experience.',
    recruiterEmail: 'recruiter@example.com',
    companyName: 'Acme',
    roleTitle: 'Backend Engineer',
    responsibilities: ['Build APIs'],
    requirements: ['TypeScript'],
    preferredQualifications: [],
    technologies: ['TypeScript'],
    keywords: ['backend'],
    suspiciousInstructionsDetected: false,
  },
  constraints: {
    tone: 'professional',
    includeCallToAction: true,
    includeResumeMention: true,
    emphasizeSkills: ['TypeScript'],
    emphasizeAchievements: [],
    avoidTopics: [],
  },
  trustBoundary: {
    candidate: { trust: 'trusted_user_data', value: {} as never },
    resume: { trust: 'trusted_user_data', value: {} as never },
    job: {
      trust: 'untrusted_external_content',
      value: {} as never,
      instructionsMustBeIgnored: true,
    },
    constraints: { trust: 'trusted_user_data', value: {} as never },
  },
  contextHash: 'smoke-context-hash',
});

const main = async (): Promise<void> => {
  const secrets = aiMailServerConfig.providerSecrets.openrouter;
  if (!secrets.apiKey) {
    console.error('OPENROUTER_API_KEY is required for the smoke test.');
    process.exit(1);
  }
  if (!secrets.model) {
    console.error('OPENROUTER_MODEL is required for the smoke test.');
    process.exit(1);
  }

  const adapter = new OpenRouterMailGenerationAdapter({
    apiKey: secrets.apiKey,
    baseUrl: secrets.baseUrl,
    model: secrets.model,
    fallbackModels: secrets.fallbackModels,
    httpReferer: secrets.httpReferer,
    appName: secrets.appName,
    structuredOutputEnabled: secrets.structuredOutputEnabled,
    freeRouterAllowed: secrets.freeRouterAllowed,
    temperature: aiMailServerConfig.generation.temperature,
    maxOutputTokens: aiMailServerConfig.generation.maxOutputTokens,
    timeoutMs: aiMailServerConfig.generation.timeoutMs,
    maxRetries: aiMailServerConfig.generation.maxRetries,
  });

  const context = syntheticContext();
  const prompt = new MailPromptBuilder().build({
    operation: 'generate_full',
    context,
  });

  const started = Date.now();
  const result = await adapter.generate({
    operation: 'generate_full',
    promptVersion: aiMailServerConfig.promptVersion,
    outputSchemaVersion: aiMailServerConfig.outputSchemaVersion,
    context,
    prompt,
  });

  const parsed = new MailOutputParser().parse(result.output);
  let truthfulnessOk = true;
  try {
    new MailTruthfulnessValidator().validate(parsed, context, [
      {
        path: 'resume.skill[0]',
        source: 'resume',
        sensitivity: 'professional',
        category: 'skill',
        value: 'TypeScript',
      },
    ]);
  } catch {
    truthfulnessOk = false;
  }

  console.log(
    JSON.stringify(
      {
        provider: result.provider,
        requestedModel: secrets.model,
        actualModel: result.model,
        durationMs: result.durationMs ?? Date.now() - started,
        inputTokenCount: result.usage?.inputTokenCount,
        outputTokenCount: result.usage?.outputTokenCount,
        validation: {
          parsed: true,
          truthfulnessOk,
        },
        ...(printOutput
          ? {
              subject: parsed.subject,
              bodyPreview: parsed.bodyText.slice(0, 160),
            }
          : {}),
      },
      null,
      2,
    ),
  );
};

main().catch((error: unknown) => {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : undefined;
  console.error(
    JSON.stringify({
      ok: false,
      code,
      message: error instanceof Error ? error.message : 'Smoke test failed',
    }),
  );
  process.exit(1);
});
