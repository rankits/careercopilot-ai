import { z } from "zod";

const NullableText = z.string().nullable();

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

const ProjectSchema = z.object({
  name: NullableText,
  description: NullableText,
  role: NullableText,
  technologies: z.array(z.string()),
  url: NullableText,
});

const LanguageSchema = z.object({
  name: z.string(),
  proficiency: NullableText,
});

export const CanonicalResumeSchema = z.object({
  schemaVersion: z.literal("resume-schema-v1"),
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
  employmentHistory: z.array(EmploymentSchema),
  education: z.array(EducationSchema),
  skills: z.object({
    technical: z.array(z.string()),
    tools: z.array(z.string()),
    frameworks: z.array(z.string()),
    softSkills: z.array(z.string()),
    domains: z.array(z.string()),
  }),
  certifications: z.array(CertificationSchema),
  projects: z.array(ProjectSchema),
  languages: z.array(LanguageSchema),
  awards: z.array(z.string()),
  publications: z.array(z.string()),
  totalExperienceMonths: z.number().int().nonnegative().nullable(),
  parseQuality: z.object({
    overallConfidence: z.number().min(0).max(1),
    requiresReview: z.boolean(),
    missingImportantFields: z.array(z.string()),
    warnings: z.array(z.string()),
  }),
});

export type CanonicalResume = z.infer<typeof CanonicalResumeSchema>;

