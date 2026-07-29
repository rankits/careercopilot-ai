import { resumeConfig } from "@/modules/resumes/config/resume.config.js";
import { ResumeAiProviderName } from "@/modules/resumes/ai/ai-model.contract.js";

export interface ParserProfile {
  provider: ResumeAiProviderName;
  model: string;
  temperature: number;
  maxRetries: number;
  schemaVersion: "resume-schema-v2";
  promptVersion: "resume-parser-v2";
}

const parserProfiles: Record<string, ParserProfile> = {
  "resume-parser-default": {
    provider: resumeConfig.ai.provider as ResumeAiProviderName,
    model: resumeConfig.ai.model,
    temperature: resumeConfig.ai.temperature,
    maxRetries: resumeConfig.ai.maxRetries,
    schemaVersion: "resume-schema-v2",
    promptVersion: "resume-parser-v2",
  },
};

export const getParserProfile = (profileName = "resume-parser-default"): ParserProfile => {
  const profile = parserProfiles[profileName];

  if (!profile) {
    throw new Error(`Unknown resume parser profile: ${profileName}`);
  }

  return profile;
};

export { parserProfiles };
