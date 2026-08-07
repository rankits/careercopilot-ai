import type { ResumeProfileFormValues } from '@/features/resume/types/resume.types';

const EMPTY_PROFILE: ResumeProfileFormValues = {
  certifications: '',
  currentCompany: '',
  designation: '',
  education: '',
  email: '',
  fullName: '',
  location: '',
  phone: '',
  projects: '',
  skills: '',
  summary: '',
  totalExperience: '',
  workExperience: '',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const records = (value: unknown) => (Array.isArray(value) ? value.filter(isRecord) : []);
const texts = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/** Prefers structured keys, then falls back to `raw` (RULE_BASED parser). */
const formatRecord = (record: Record<string, unknown>, keys: string[]) => {
  const structured = keys
    .map((key) => text(record[key]))
    .filter(Boolean)
    .join(' — ');
  return structured || text(record.raw);
};

const formatProject = (record: Record<string, unknown>) => {
  const name = text(record.name) || text(record.title) || text(record.projectName);
  const description = text(record.description);
  const duration =
    text(record.duration) ||
    [text(record.startDate), text(record.endDate) || (record.isCurrent ? 'Present' : '')]
      .filter(Boolean)
      .join(' – ');
  const technologies = texts(record.technologies).join(', ') || text(record.technologies);
  const responsibilities = texts(record.responsibilities);

  const lines = [
    name,
    description ? `Description: ${description}` : null,
    technologies ? `Technologies: ${technologies}` : null,
    duration ? `Duration: ${duration}` : null,
    responsibilities.length ? `Responsibilities: ${responsibilities.join('; ')}` : null,
  ].filter(Boolean);

  return lines.join('\n') || formatRecord(record, ['name', 'description']);
};

const buildFallbackSummary = (profile: ResumeProfileFormValues): string => {
  if (profile.summary.trim()) return profile.summary;
  const role = profile.designation || profile.workExperience.split('\n')[0] || 'Professional';
  const skills = profile.skills
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(', ');
  if (!skills && !profile.workExperience.trim()) return '';
  return [
    `${role.split(' — ')[0]} with demonstrated experience across relevant roles.`,
    skills ? `Core skills include ${skills}.` : null,
  ]
    .filter(Boolean)
    .join(' ');
};

export function mapResumeToProfile(value: unknown): ResumeProfileFormValues {
  if (!isRecord(value)) throw new Error('Resume parser returned an invalid response.');
  if (Object.keys(value).length === 0) throw new Error('Resume parser returned an empty response.');

  const legacyPersonal = isRecord(value.personalDetails) ? value.personalDetails : {};
  const personal = isRecord(value.personalInformation) ? value.personalInformation : legacyPersonal;
  const professionalProfile = isRecord(value.professionalProfile) ? value.professionalProfile : {};
  const experienceRecords = records(value.employmentHistory).length
    ? records(value.employmentHistory)
    : records(value.experience);
  const firstExperience = experienceRecords[0] ?? {};
  const current = isRecord(value.currentPosition) ? value.currentPosition : firstExperience;
  const location = isRecord(personal.location) ? personal.location : {};
  const skills = isRecord(value.skills) ? value.skills : {};
  const skillValues = isRecord(value.skills)
    ? ['technical', 'tools', 'frameworks', 'softSkills', 'domains'].flatMap((key) =>
        texts(skills[key]),
      )
    : texts(value.skills);
  const totalExperienceYears =
    typeof value.totalExperienceYears === 'number'
      ? value.totalExperienceYears
      : typeof professionalProfile.totalExperienceYears === 'number'
        ? professionalProfile.totalExperienceYears
        : typeof personal.totalExperience === 'number'
          ? personal.totalExperience
          : null;

  const projectRecords = records(value.projects).length
    ? records(value.projects)
    : records(legacyPersonal.projects);

  const mapped: ResumeProfileFormValues = {
    ...EMPTY_PROFILE,
    certifications: records(value.certifications)
      .map((item) => formatRecord(item, ['name', 'issuer']))
      .filter(Boolean)
      .join('\n'),
    currentCompany:
      text(current.company) ||
      text(current.companyName) ||
      text(personal.currentCompany) ||
      text(value.currentCompany),
    designation:
      text(current.title) ||
      text(current.designation) ||
      text(personal.designation) ||
      text(personal.currentTitle) ||
      text(professionalProfile.currentTitle),
    education: records(value.education)
      .map((item) => formatRecord(item, ['qualification', 'institution']))
      .filter(Boolean)
      .join('\n'),
    email: text(personal.email) || text(value.email),
    fullName: text(personal.fullName) || text(personal.name) || text(value.fullName),
    location:
      ['city', 'state', 'country']
        .map((key) => text(location[key]))
        .filter(Boolean)
        .join(', ') ||
      text(personal.location) ||
      text(value.location),
    phone: text(personal.phone) || text(value.phone),
    projects: projectRecords
      .map((item) => formatProject(item))
      .filter(Boolean)
      .join('\n\n'),
    skills: [...new Set(skillValues)].join(', '),
    summary:
      text(value.professionalSummary) ||
      text(professionalProfile.summary) ||
      text(personal.summary) ||
      text(value.summary),
    totalExperience:
      totalExperienceYears !== null ? String(totalExperienceYears) : text(personal.totalExperience),
    workExperience: experienceRecords
      .map((item) => formatRecord(item, ['title', 'designation', 'company', 'companyName']))
      .filter(Boolean)
      .join('\n'),
  };

  return {
    ...mapped,
    summary: buildFallbackSummary(mapped),
  };
}
