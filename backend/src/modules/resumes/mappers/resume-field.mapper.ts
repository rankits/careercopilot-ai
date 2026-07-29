import { resumeNormaliserService } from "@/modules/resumes/normalisation/resume-normaliser.service.js";
import { OnboardingProfilePayload, ParsedResumeData } from "@/modules/resumes/types/resume.types.js";

export const resumeFieldMapper = {
  toOnboardingProfile(input: {
    userId: string;
    resumeId?: string;
    parsedData: ParsedResumeData;
  }): OnboardingProfilePayload {
    const normalized = resumeNormaliserService.normalize(input.parsedData);

    return {
      userId: input.userId,
      sourceResumeId: input.resumeId,
      personalDetails: normalized.personalDetails,
      experience: normalized.experience,
      education: normalized.education,
      skills: normalized.skills,
      certifications: normalized.certifications,
    };
  },
};
