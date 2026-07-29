import { OnboardingProfilePayload, ParsedResumeData } from "@/modules/resumes/types/resume.types.js";

export const resumeFieldMapper = {
  toOnboardingProfile(input: {
    userId: string;
    resumeId?: string;
    parsedData: ParsedResumeData;
  }): OnboardingProfilePayload {
    return {
      userId: input.userId,
      sourceResumeId: input.resumeId,
      personalDetails: input.parsedData.personalDetails || {},
      experience: input.parsedData.experience || [],
      education: input.parsedData.education || [],
      skills: Array.from(new Set(input.parsedData.skills || [])).sort(),
      certifications: input.parsedData.certifications || [],
    };
  },
};
