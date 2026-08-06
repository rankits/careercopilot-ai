import { ROUTES } from '@/constants/routes';

export type CleanSnapshot = {
  content: string;
  targetRole: string;
  jobDescription: string;
  skillsKey: string;
  skills: string[];
};

export const EMPTY_CLEAN_SNAPSHOT: CleanSnapshot = {
  content: '',
  targetRole: '',
  jobDescription: '',
  skillsKey: '',
  skills: [],
};

export function skillsKeyOf(skills: string[]) {
  return skills
    .map((skill) => skill.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|');
}

/** Builder workspace paths (not Saved Resumes). */
export function isResumeBuilderWorkspacePath(pathname: string) {
  if (pathname === ROUTES.SAVED_RESUMES || pathname.startsWith(`${ROUTES.SAVED_RESUMES}/`)) {
    return false;
  }
  return pathname === ROUTES.RESUME_BUILDER || pathname.startsWith(`${ROUTES.RESUME_BUILDER}/`);
}

export function analysisInputFingerprint(input: {
  resumeId: string;
  targetRole: string;
  jobDescription: string;
  industry: string;
  employmentType: string;
  experienceLevel: string;
  skillsKey: string;
}) {
  return [
    input.resumeId,
    input.targetRole.trim(),
    input.jobDescription.trim(),
    input.industry.trim(),
    input.employmentType.trim(),
    input.experienceLevel,
    input.skillsKey,
  ].join('\u0000');
}
