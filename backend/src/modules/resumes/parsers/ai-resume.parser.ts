import { createAiModel } from "@/modules/resumes/ai/ai-model.factory.js";
import { RESUME_PARSER_SYSTEM_PROMPT } from "@/modules/resumes/ai/prompts/resume-parser.prompt.js";
import { CanonicalResumeSchema } from "@/modules/resumes/schemas/canonical-resume.schema.js";
import { resumeNormaliserService } from "@/modules/resumes/normalisation/resume-normaliser.service.js";
import { ResumeParser, ResumeParserInput, ResumeParserResult } from "@/modules/resumes/types/resume.types.js";

export class AiResumeParser implements ResumeParser {
  async parseResume(input: ResumeParserInput): Promise<ResumeParserResult> {
    const model = createAiModel();

    const canonical = await model.extract({
      systemPrompt: RESUME_PARSER_SYSTEM_PROMPT,
      documentText: input.extractedText,
      schema: CanonicalResumeSchema,
      metadata: {
        promptVersion: "resume-parser-v1",
        schemaVersion: "resume-schema-v1",
      },
    });

    const normalized = resumeNormaliserService.normalize({
      personalDetails: {
        fullName: canonical.personalInformation.fullName,
        firstName: canonical.personalInformation.firstName,
        lastName: canonical.personalInformation.lastName,
        email: canonical.personalInformation.email,
        phone: canonical.personalInformation.phone,
        location: canonical.personalInformation.location,
        links: canonical.personalInformation.links,
        summary: canonical.professionalSummary,
        currentPosition: canonical.currentPosition,
      },
      experience: canonical.employmentHistory,
      education: canonical.education,
      skills: [
        ...canonical.skills.technical,
        ...canonical.skills.tools,
        ...canonical.skills.frameworks,
        ...canonical.skills.softSkills,
        ...canonical.skills.domains,
      ],
      certifications: canonical.certifications,
    });

    return {
      parserVersion: "ai-resume-v1",
      confidenceScore: canonical.parseQuality.overallConfidence,
      data: normalized,
    };
  }
}
