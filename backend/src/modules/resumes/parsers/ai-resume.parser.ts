import { createResumeAiProviders } from '@/modules/resumes/ai/ai-model.factory.js';
import { parseResumeWithFallback } from '@/modules/resumes/ai/resumeParser.js';
import { resumeNormaliserService } from '@/modules/resumes/normalisation/resume-normaliser.service.js';
import { parseAiResumeModelResponse } from '@/modules/resumes/parsers/ai-resume.parser.json.js';
import {
  buildCanonicalResume,
  toParsedResumeData,
} from '@/modules/resumes/parsers/ai-resume.parser.mapping.js';
import { buildAiResumeParseRequest } from '@/modules/resumes/parsers/ai-resume.parser.prompt.js';
import {
  ResumeParser,
  ResumeParserInput,
  ResumeParserResult,
} from '@/modules/resumes/types/resume.types.js';

export class AiResumeParser implements ResumeParser {
  async parseResume(input: ResumeParserInput): Promise<ResumeParserResult> {
    const response = await parseResumeWithFallback(
      buildAiResumeParseRequest(input),
      createResumeAiProviders(),
    );
    const parsed = parseAiResumeModelResponse(response);
    const canonical = buildCanonicalResume(parsed);
    const parsedData = resumeNormaliserService.normalize(toParsedResumeData(canonical));

    return {
      parserVersion: 'ai-resume-v3',
      confidenceScore: canonical.parseQuality.overallConfidence,
      data: parsedData,
    };
  }
}
