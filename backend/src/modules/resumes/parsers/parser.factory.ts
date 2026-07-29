import { AppError } from "@/shared/utils/errors/AppError.js";
import { resumeConfig } from "@/modules/resumes/config/resume.config.js";
import { ResumeParser } from "@/modules/resumes/types/resume.types.js";
import { RuleBasedResumeParser } from "@/modules/resumes/parsers/rule-based-resume.parser.js";

export const createResumeParser = (): ResumeParser => {
  if (resumeConfig.parserEngine === "RULE_BASED") {
    return new RuleBasedResumeParser();
  }

  throw new AppError("AI resume parser is not configured yet", 501);
};
