import { z } from 'zod';

const NullableText = z.string().nullable();

const ProfessionalLabelSchema = z.object({
  label: z.string(),
  category: z.enum(['ROLE', 'SPECIALISATION', 'TECH_STACK', 'DOMAIN']),
  confidence: z.number().min(0).max(1),
  source: z.enum(['EXPLICIT', 'INFERRED']),
  evidence: z.array(z.string()),
});

const EmploymentSchema = z.object({
  company: NullableText,
  title: NullableText,
  location: NullableText,
  startDate: NullableText,
  endDate: NullableText,
  isCurrent: z.boolean(),
  description: NullableText,
  responsibilities: z.array(z.string()),
  achievements: z.array(z.string()),
  technologies: z.array(z.string()),
});

const ProjectSchema = z.object({
  name: z.string(),
  role: NullableText,
  company: NullableText,
  startDate: NullableText,
  endDate: NullableText,
  isCurrent: z.boolean(),
  description: NullableText,
  responsibilities: z.array(z.string()),
  achievements: z.array(z.string()),
  technologies: z.array(z.string()),
  links: z.array(z.string()),
});

const EducationSchema = z.object({
  institution: NullableText,
  qualification: NullableText,
  fieldOfStudy: NullableText,
  startDate: NullableText,
  endDate: NullableText,
  grade: NullableText,
  location: NullableText,
});

const CertificationSchema = z.object({
  name: NullableText,
  issuer: NullableText,
  issueDate: NullableText,
  expiryDate: NullableText,
  credentialId: NullableText,
  credentialUrl: NullableText,
});

const LanguageProficiencySchema = z.enum([
  'NATIVE',
  'BASIC',
  'CONVERSATIONAL',
  'PROFESSIONAL',
  'FLUENT',
]);

const LanguageSchema = z.object({
  name: z.string(),
  proficiency: LanguageProficiencySchema.nullable(),
  isNative: z.boolean(),
});

const ProfessionalLinksSchema = z.object({
  linkedIn: NullableText,
  github: NullableText,
  portfolio: NullableText,
  website: NullableText,
  stackoverflow: NullableText,
  leetcode: NullableText,
  hackerrank: NullableText,
  behance: NullableText,
  dribbble: NullableText,
  other: z.array(
    z.object({
      platform: NullableText,
      label: NullableText,
      url: z.string(),
    }),
  ),
});

const ProfessionalProfileSchema = z.object({
  headline: NullableText,
  summary: NullableText,
  currentTitle: NullableText,
  primaryRole: NullableText,
  seniorityLevel: z
    .enum([
      'INTERN',
      'ENTRY',
      'JUNIOR',
      'MID',
      'SENIOR',
      'LEAD',
      'MANAGER',
      'DIRECTOR',
      'EXECUTIVE',
      'UNKNOWN',
    ])
    .nullable(),
  totalExperienceMonths: z.number().int().nonnegative(),
  totalExperienceYears: z.number().nonnegative(),
});

export const ExpandedCanonicalResumeSchema = z.object({
  schemaVersion: z.literal('resume-schema-v2'),
  personalInformation: z.object({
    fullName: NullableText,
    firstName: NullableText,
    lastName: NullableText,
    email: NullableText,
    phone: NullableText,
    location: z.object({
      city: NullableText,
      state: NullableText,
      country: NullableText,
      postalCode: NullableText,
    }),
    links: z.object({
      linkedin: NullableText,
      github: NullableText,
      portfolio: NullableText,
      other: z.array(z.string()),
    }),
  }),
  professionalSummary: NullableText,
  currentPosition: z.object({
    title: NullableText,
    company: NullableText,
  }),
  professionalProfile: ProfessionalProfileSchema.nullable(),
  professionalLabels: z.array(ProfessionalLabelSchema),
  employmentHistory: z.array(EmploymentSchema),
  projects: z.array(ProjectSchema),
  education: z.array(EducationSchema),
  skills: z.object({
    technical: z.array(z.string()),
    tools: z.array(z.string()),
    frameworks: z.array(z.string()),
    softSkills: z.array(z.string()),
    domains: z.array(z.string()),
  }),
  certifications: z.array(CertificationSchema),
  languages: z.array(LanguageSchema),
  links: ProfessionalLinksSchema,
  awards: z.array(z.string()),
  publications: z.array(z.string()),
  totalExperienceMonths: z.number().int().nonnegative(),
  totalExperienceYears: z.number().nonnegative(),
  parseQuality: z.object({
    overallConfidence: z.number().min(0).max(1),
    requiresReview: z.boolean(),
    missingImportantFields: z.array(z.string()),
    warnings: z.array(z.string()),
  }),
});

export const CanonicalResumeSchema = ExpandedCanonicalResumeSchema;

export type CanonicalResume = z.infer<typeof ExpandedCanonicalResumeSchema>;
