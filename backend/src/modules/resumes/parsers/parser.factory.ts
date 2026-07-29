import { AppError } from "@/shared/utils/errors/AppError.js";
import { resumeConfig } from "@/modules/resumes/config/resume.config.js";
import { ResumeParser } from "@/modules/resumes/types/resume.types.js";
import { AiResumeParser } from "@/modules/resumes/parsers/ai-resume.parser.js";
import { RuleBasedResumeParser } from "@/modules/resumes/parsers/rule-based-resume.parser.js";

export const createResumeParser = (): ResumeParser => {
  if (resumeConfig.parserEngine === "RULE_BASED") {
    return new RuleBasedResumeParser();
  }

  if (resumeConfig.parserEngine === "AI") {
    return new AiResumeParser();
  }

  throw new AppError(`Unsupported resume parser engine: ${resumeConfig.parserEngine}`, 501);
};
