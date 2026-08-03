import type {
  CandidateProfileData,
  ResumeProfileFormValues,
  UpdateCandidateProfilePayload,
} from '@/features/resume/types/resume.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown) => (typeof value === 'string' ? value : '');

const formatRecord = (record: Record<string, unknown>, keys: string[]) =>
  keys
    .map((key) => text(record[key]).trim())
    .filter(Boolean)
    .join(' — ');

const linesToRecords = (value: string): Record<string, unknown>[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((description) => ({ description }));

/** `personalDetails` is a free-form JSON blob - fields with no dedicated
 * CandidateProfile column (currentCompany, designation, totalExperience,
 * summary, projects) are nested inside it rather than requiring a schema
 * migration. */
export function mapProfileToFormValues(profile: CandidateProfileData): ResumeProfileFormValues {
  const personal = profile.personalDetails;
  const projects = Array.isArray(personal.projects) ? personal.projects.filter(isRecord) : [];

  return {
    certifications: profile.certifications
      .map((item) => formatRecord(item, ['name', 'issuer']))
      .filter(Boolean)
      .join('\n'),
    currentCompany: text(personal.currentCompany),
    designation: text(personal.designation),
    education: profile.education
      .map((item) => formatRecord(item, ['qualification', 'institution']))
      .filter(Boolean)
      .join('\n'),
    email: text(personal.email),
    fullName: text(personal.fullName),
    location: text(personal.location),
    phone: text(personal.phone),
    projects: projects
      .map((item) => formatRecord(item, ['name', 'description']))
      .filter(Boolean)
      .join('\n'),
    skills: profile.skills.join(', '),
    summary: text(personal.summary),
    totalExperience:
      typeof personal.totalExperience === 'number'
        ? String(personal.totalExperience)
        : text(personal.totalExperience),
    workExperience: profile.experience
      .map((item) => formatRecord(item, ['title', 'designation', 'company', 'companyName']))
      .filter(Boolean)
      .join('\n'),
  };
}

/** Reverse of `mapProfileToFormValues`. The form edits structured resume
 * data as flattened, freeform text (see `mapResumeToProfile`), so
 * work-experience/education/certifications/projects can only be
 * round-tripped as one free-text `description` entry per non-empty line -
 * the original per-field structure (title vs. company, etc.) isn't
 * recoverable from the flattened text. */
export function mapFormValuesToProfileUpdate(
  values: ResumeProfileFormValues,
): UpdateCandidateProfilePayload {
  return {
    certifications: linesToRecords(values.certifications),
    education: linesToRecords(values.education),
    experience: linesToRecords(values.workExperience),
    personalDetails: {
      currentCompany: values.currentCompany.trim(),
      designation: values.designation.trim(),
      email: values.email.trim(),
      fullName: values.fullName.trim(),
      location: values.location.trim(),
      phone: values.phone.trim(),
      projects: linesToRecords(values.projects),
      summary: values.summary.trim(),
      totalExperience: values.totalExperience.trim(),
    },
    skills: values.skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean),
  };
}
