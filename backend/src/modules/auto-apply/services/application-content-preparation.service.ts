import { IApplicationAnswerRepository } from '@/modules/auto-apply/contracts/application-answer.contract.js';
import { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import { IJobDescriptionLookup } from '@/modules/auto-apply/contracts/vacancy-email.contract.js';
import { IUserContactLookup } from '@/modules/auto-apply/contracts/application-readiness.contract.js';
import {
  ApplicationContentPackage,
  ApplicationContentPreparationInput,
} from '@/modules/auto-apply/types/application-content.types.js';
import {
  ICoverLetterGenerationPort,
  OpenRouterCoverLetterGenerator,
  TemplateCoverLetterGenerator,
} from '@/modules/auto-apply/services/cover-letter-generation.service.js';
import { ScreeningAnswerPreparationService } from '@/modules/auto-apply/services/screening-answer-preparation.service.js';
import {
  IResumeTextLookup,
  PrismaResumeTextLookup,
} from '@/modules/auto-apply/repositories/prisma-resume-text.lookup.js';
import { logger } from '@/shared/logger/logger.js';
import { withTimeout } from '@/shared/utils/withTimeout.js';

const COVER_LETTER_TIMEOUT_MS = 45_000;

/**
 * AJA-AI-001 — prepares cover letter + screening answers for plan review.
 * Failures degrade gracefully (warnings) and never hard-block EXTERNAL_MANUAL.
 */
export class ApplicationContentPreparationService {
  private readonly screening: ScreeningAnswerPreparationService;

  constructor(
    private readonly answerRepository: IApplicationAnswerRepository,
    private readonly consentRepository: IApplicationConsentRepository,
    private readonly jobDescriptionLookup: IJobDescriptionLookup,
    private readonly resumeTextLookup: IResumeTextLookup,
    private readonly userContactLookup: IUserContactLookup,
    private readonly coverLetterGenerator: ICoverLetterGenerationPort,
  ) {
    this.screening = new ScreeningAnswerPreparationService(answerRepository);
  }

  static createDefault(
    answerRepository: IApplicationAnswerRepository,
    consentRepository: IApplicationConsentRepository,
    jobDescriptionLookup: IJobDescriptionLookup,
    userContactLookup: IUserContactLookup,
  ): ApplicationContentPreparationService {
    const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
    return new ApplicationContentPreparationService(
      answerRepository,
      consentRepository,
      jobDescriptionLookup,
      new PrismaResumeTextLookup(),
      userContactLookup,
      hasOpenRouter ? new OpenRouterCoverLetterGenerator() : new TemplateCoverLetterGenerator(),
    );
  }

  async prepare(input: ApplicationContentPreparationInput): Promise<ApplicationContentPackage> {
    const warnings: string[] = [];
    const screeningAnswers = await this.screening.prepareFromVault(input.userId);

    const contentConsent = await this.consentRepository.findActiveByType(
      input.userId,
      'CONTENT_GENERATION',
    );
    if (!contentConsent) {
      warnings.push(
        'Content generation consent is not granted — cover letter uses a minimal template until you consent under Auto Apply → Consents.',
      );
    }

    let coverLetter: string | null = null;

    if (!input.resumeId) {
      warnings.push('No approved resume selected — cover letter was not generated.');
    } else {
      try {
        const [resumeText, jobDescription, contact] = await Promise.all([
          this.resumeTextLookup.findResumeTextForUser(input.userId, input.resumeId),
          this.jobDescriptionLookup.findDescriptionText(input.jobId),
          this.userContactLookup.findByUserId(input.userId),
        ]);

        if (!resumeText) {
          warnings.push(
            'Resume text is not available yet — upload/parse a resume so generation can ground in your experience.',
          );
        } else {
          const useAi = Boolean(contentConsent && process.env.OPENROUTER_API_KEY?.trim());
          const activeGenerator = useAi
            ? this.coverLetterGenerator
            : new TemplateCoverLetterGenerator();

          coverLetter = await withTimeout(
            activeGenerator.generate({
              jobTitle: input.jobTitle?.trim() || 'the open role',
              companySlug: input.companySlug?.trim() || 'the company',
              jobDescription: jobDescription?.trim() || 'No job description provided.',
              resumeText,
              candidateName:
                [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || null,
            }),
            COVER_LETTER_TIMEOUT_MS,
            'coverLetter.generate',
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Cover letter generation failed';
        logger.warn(
          { err: error, userId: input.userId, jobId: input.jobId },
          'Cover letter generation failed — plan continues without AI content',
        );
        warnings.push(`Cover letter generation failed: ${message}`);
      }
    }

    const readyVaultCount = screeningAnswers.filter(
      (a) => a.status === 'READY' && a.source === 'USER_VERIFIED',
    ).length;

    return {
      coverLetter,
      screeningAnswers,
      contentGenerationAvailable: Boolean(coverLetter) || readyVaultCount > 0,
      warnings,
    };
  }
}
