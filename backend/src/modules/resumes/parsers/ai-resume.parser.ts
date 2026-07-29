import { createAiModel } from "@/modules/resumes/ai/ai-model.factory.js";
import { RESUME_PARSER_SYSTEM_PROMPT } from "@/modules/resumes/ai/prompts/resume-parser.prompt.js";
import { ExpandedCanonicalResumeSchema } from "@/modules/resumes/schemas/canonical-resume.schema.js";
import { resumeNormaliserService } from "@/modules/resumes/normalisation/resume-normaliser.service.js";
import {
  CanonicalResume,
  LanguageProficiency,
  ParsedResumeData,
  ProfessionalLabelCategory,
  ProfessionalLabelSource,
  ProfessionalSeniorityLevel,
  ResumeParser,
  ResumeParserInput,
  ResumeParserResult,
} from "@/modules/resumes/types/resume.types.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const toNullableText = (value: unknown): string | null => {
  const text = toText(value);
  return text.length > 0 ? text : null;
};

const firstDefined = (...values: unknown[]): unknown => values.find((value) => value !== undefined);

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Map<string, string>();

  for (const item of value) {
    if (typeof item === "string") {
      const text = toText(item);
      if (!text) {
        continue;
      }

      const key = text.toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, text);
      }
      continue;
    }

    if (isRecord(item)) {
      const text = toText(item.name ?? item.label ?? item.value ?? item.url);
      if (!text) {
        continue;
      }

      const key = text.toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, text);
      }
    }
  }

  return Array.from(unique.values());
};

const normalizeRecordArray = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
};

const normalizeLinks = (value: unknown): CanonicalResume["links"] => {
  const data = isRecord(value) ? value : {};
  const other = Array.isArray(data.other)
    ? data.other.flatMap((item) => {
        if (typeof item === "string") {
          const url = toText(item);
          return url ? [{ platform: null, label: null, url }] : [];
        }

        if (!isRecord(item)) {
          return [];
        }

        const url = toText(item.url ?? item.href ?? item.link);
        if (!url) {
          return [];
        }

        return [
          {
            platform: toNullableText(item.platform),
            label: toNullableText(item.label),
            url,
          },
        ];
      })
    : [];

  return {
    linkedIn: toNullableText(firstDefined(data.linkedIn, data.linkedin)),
    github: toNullableText(data.github),
    portfolio: toNullableText(data.portfolio),
    website: toNullableText(data.website),
    stackoverflow: toNullableText(data.stackoverflow),
    leetcode: toNullableText(data.leetcode),
    hackerrank: toNullableText(data.hackerrank),
    behance: toNullableText(data.behance),
    dribbble: toNullableText(data.dribbble),
    other,
  };
};

const mapProfessionalLinksToLegacy = (value: CanonicalResume["links"]): Record<string, unknown> => ({
  linkedIn: value.linkedIn,
  github: value.github,
  portfolio: value.portfolio,
  other: value.other.map((link) => link.url),
});

const mapLocation = (value: unknown): CanonicalResume["personalInformation"]["location"] => {
  if (isRecord(value)) {
    return {
      city: toNullableText(value.city ?? value.town ?? value.locality),
      state: toNullableText(value.state ?? value.region),
      country: toNullableText(value.country),
      postalCode: toNullableText(value.postalCode ?? value.postal_code ?? value.zip),
    };
  }

  const locationText = toNullableText(value);
  return {
    city: locationText,
    state: null,
    country: null,
    postalCode: null,
  };
};

const mapPersonalInformation = (value: unknown): CanonicalResume["personalInformation"] => {
  const data = isRecord(value) ? value : {};
  const links = normalizeLinks(firstDefined(data.links, data.socialLinks, data.urls));

  return {
    fullName: toNullableText(firstDefined(data.fullName, data.full_name, data.name)),
    firstName: toNullableText(firstDefined(data.firstName, data.first_name)),
    lastName: toNullableText(firstDefined(data.lastName, data.last_name)),
    email: toNullableText(data.email),
    phone: toNullableText(data.phone),
    location: mapLocation(firstDefined(data.location, data.address)),
    links: {
      linkedin: links.linkedIn,
      github: links.github,
      portfolio: links.portfolio,
      other: links.other.map((link) => link.url),
    },
  };
};

const mapProfessionalLabels = (value: unknown): CanonicalResume["professionalLabels"] => {
  const labels = Array.isArray(value) ? value : [];

  return labels.flatMap((item) => {
    if (typeof item === "string") {
      const label = toText(item);
      return label
        ? [
            {
              label,
              category: "ROLE" as ProfessionalLabelCategory,
              confidence: 0.7,
              source: "INFERRED" as ProfessionalLabelSource,
              evidence: [label],
            },
          ]
        : [];
    }

    if (!isRecord(item)) {
      return [];
    }

    const label = toText(item.label ?? item.name ?? item.value);
    if (!label) {
      return [];
    }

    return [
      {
        label,
        category: (toText(item.category).toUpperCase() || "ROLE") as ProfessionalLabelCategory,
        confidence:
          typeof item.confidence === "number" && item.confidence >= 0 && item.confidence <= 1
            ? item.confidence
            : 0.7,
        source: (toText(item.source).toUpperCase() || "INFERRED") as ProfessionalLabelSource,
        evidence: normalizeStringArray(item.evidence),
      },
    ];
  });
};

const mapExperience = (value: unknown): CanonicalResume["employmentHistory"] => {
  const items = Array.isArray(value) ? value : [];

  return items.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const title = toNullableText(firstDefined(item.title, item.position, item.role));
    const company = toNullableText(item.company);

    return [
      {
        company,
        title,
        location: toNullableText(item.location),
        startDate: toNullableText(firstDefined(item.startDate, item.start_date)),
        endDate: toNullableText(firstDefined(item.endDate, item.end_date)),
        isCurrent:
          item.isCurrent === true ||
          item.current === true ||
          (!item.endDate && !item.end_date) ||
          item.endDate === null ||
          item.end_date === null,
        description: toNullableText(item.description),
        responsibilities: normalizeStringArray(item.responsibilities),
        achievements: normalizeStringArray(item.achievements),
        technologies: normalizeStringArray(item.technologies),
      },
    ];
  });
};

const mapProjects = (value: unknown): CanonicalResume["projects"] => {
  const items = Array.isArray(value) ? value : [];

  return items.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const name = toText(firstDefined(item.name, item.projectName, item.title));
    if (!name) {
      return [];
    }

    return [
      {
        name,
        role: toNullableText(item.role),
        company: toNullableText(item.company),
        startDate: toNullableText(firstDefined(item.startDate, item.start_date)),
        endDate: toNullableText(firstDefined(item.endDate, item.end_date)),
        isCurrent: item.isCurrent === true || item.current === true,
        description: toNullableText(item.description),
        responsibilities: normalizeStringArray(item.responsibilities),
        achievements: normalizeStringArray(item.achievements),
        technologies: normalizeStringArray(item.technologies),
        links: normalizeStringArray(item.links),
      },
    ];
  });
};

const mapEducation = (value: unknown): CanonicalResume["education"] => {
  const items = Array.isArray(value) ? value : [];

  return items.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    return [
      {
        institution: toNullableText(item.institution),
        qualification: toNullableText(firstDefined(item.qualification, item.degree)),
        fieldOfStudy: toNullableText(firstDefined(item.fieldOfStudy, item.field_of_study)),
        startDate: toNullableText(firstDefined(item.startDate, item.start_date)),
        endDate: toNullableText(firstDefined(item.endDate, item.end_date)),
        grade: toNullableText(item.grade),
        location: toNullableText(item.location),
      },
    ];
  });
};

const mapCertifications = (value: unknown): CanonicalResume["certifications"] => {
  const items = Array.isArray(value) ? value : [];

  return items.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    return [
      {
        name: toNullableText(firstDefined(item.name, item.title)),
        issuer: toNullableText(item.issuer),
        issueDate: toNullableText(firstDefined(item.issueDate, item.issue_date)),
        expiryDate: toNullableText(firstDefined(item.expiryDate, item.expiry_date)),
        credentialId: toNullableText(firstDefined(item.credentialId, item.credential_id)),
        credentialUrl: toNullableText(firstDefined(item.credentialUrl, item.credential_url)),
      },
    ];
  });
};

const mapLanguages = (value: unknown): CanonicalResume["languages"] => {
  const items = Array.isArray(value) ? value : [];

  return items.flatMap((item) => {
    if (typeof item === "string") {
      const name = toText(item);
      return name
        ? [
            {
              name,
              proficiency: null,
              isNative: false,
            },
          ]
        : [];
    }

    if (!isRecord(item)) {
      return [];
    }

    const name = toText(item.name);
    if (!name) {
      return [];
    }

    const proficiencyValue = toText(item.proficiency).toUpperCase();
    const proficiency =
      proficiencyValue === "NATIVE" ||
      proficiencyValue === "BASIC" ||
      proficiencyValue === "CONVERSATIONAL" ||
      proficiencyValue === "PROFESSIONAL" ||
      proficiencyValue === "FLUENT"
        ? (proficiencyValue as LanguageProficiency)
        : null;

    return [
      {
        name,
        proficiency,
        isNative: item.isNative === true || proficiency === "NATIVE",
      },
    ];
  });
};

const mapSkills = (value: unknown): CanonicalResume["skills"] => {
  const data = isRecord(value) ? value : {};

  if (Array.isArray(value)) {
    const skills = normalizeStringArray(
      value.flatMap((item) => {
        if (typeof item === "string") {
          return [item];
        }

        if (isRecord(item)) {
          return [item.name ?? item.label ?? item.skill ?? ""];
        }

        return [];
      }),
    );

    return {
      technical: skills,
      tools: [],
      frameworks: [],
      softSkills: [],
      domains: [],
    };
  }

  return {
    technical: normalizeStringArray(data.technical),
    tools: normalizeStringArray(data.tools),
    frameworks: normalizeStringArray(data.frameworks),
    softSkills: normalizeStringArray(data.softSkills),
    domains: normalizeStringArray(data.domains),
  };
};

const calculateTotalExperienceMonths = (
  experience: CanonicalResume["employmentHistory"],
  currentDate = new Date(),
): number => {
  const periods = experience
    .filter((item) => typeof item.startDate === "string" && item.startDate.length > 0)
    .map((item) => {
      const startMatch = /^(\d{4})-(\d{2})$/.exec(String(item.startDate));
      if (!startMatch) {
        return null;
      }

      const start = new Date(Number(startMatch[1]), Number(startMatch[2]) - 1, 1);
      const end = item.isCurrent || !item.endDate
        ? currentDate
        : (() => {
            const endMatch = /^(\d{4})-(\d{2})$/.exec(String(item.endDate));
            return endMatch ? new Date(Number(endMatch[1]), Number(endMatch[2]) - 1, 1) : null;
          })();

      if (!end) {
        return null;
      }

      return {
        start: new Date(start.getFullYear(), start.getMonth(), 1),
        end: new Date(end.getFullYear(), end.getMonth(), 1),
      };
    })
    .filter((period): period is { start: Date; end: Date } => period !== null && period.end >= period.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (periods.length === 0) {
    return 0;
  }

  const merged: typeof periods = [];

  for (const period of periods) {
    const previous = merged[merged.length - 1];

    if (!previous || period.start > previous.end) {
      merged.push({ ...period });
      continue;
    }

    if (period.end > previous.end) {
      previous.end = period.end;
    }
  }

  return merged.reduce((total, period) => {
    const months =
      (period.end.getFullYear() - period.start.getFullYear()) * 12 +
      period.end.getMonth() -
      period.start.getMonth() +
      1;

    return total + Math.max(months, 0);
  }, 0);
};

const deriveSeniorityLevel = (months: number): ProfessionalSeniorityLevel => {
  if (months < 12) {
    return "ENTRY";
  }

  if (months < 36) {
    return "JUNIOR";
  }

  if (months < 72) {
    return "MID";
  }

  if (months < 144) {
    return "SENIOR";
  }

  return "UNKNOWN";
};

const deriveProfessionalLabels = (
  experience: CanonicalResume["employmentHistory"],
  skills: CanonicalResume["skills"],
  currentTitle: string | null,
): CanonicalResume["professionalLabels"] => {
  const evidence = normalizeStringArray([
    ...(currentTitle ? [currentTitle] : []),
    ...skills.technical,
    ...skills.tools,
    ...skills.frameworks,
    ...skills.softSkills,
    ...skills.domains,
  ]);

  const labels: CanonicalResume["professionalLabels"] = [];

  if (currentTitle) {
    labels.push({
      label: currentTitle,
      category: "ROLE",
      confidence: 0.8,
      source: "INFERRED",
      evidence: currentTitle ? [currentTitle] : [],
    });
  } else if (experience.length > 0 && experience[0].title) {
    labels.push({
      label: String(experience[0].title),
      category: "ROLE",
      confidence: 0.72,
      source: "INFERRED",
      evidence: [String(experience[0].title)],
    });
  }

  const skillEvidence = evidence.filter((item) =>
    /selenium|playwright|cucumber|testng|rest assured|postman|api testing/i.test(item),
  );

  if (skillEvidence.length > 0) {
    labels.push({
      label: "QA Automation Engineer",
      category: "SPECIALISATION",
      confidence: 0.88,
      source: "INFERRED",
      evidence: skillEvidence.slice(0, 5),
    });
  }

  return labels;
};

const deriveProfessionalProfile = (input: {
  professionalSummary: string | null;
  currentPosition: { title: string | null; company: string | null };
  experience: CanonicalResume["employmentHistory"];
  skills: CanonicalResume["skills"];
  labels: CanonicalResume["professionalLabels"];
}): CanonicalResume["professionalProfile"] => {
  const totalExperienceMonths = calculateTotalExperienceMonths(input.experience);
  const totalExperienceYears = Number((totalExperienceMonths / 12).toFixed(1));
  const currentTitle = input.currentPosition.title ?? input.experience.find((item) => item.isCurrent)?.title ?? null;
  const primaryRole =
    input.labels.find((label) => label.category === "ROLE")?.label ??
    input.labels.find((label) => label.category === "SPECIALISATION")?.label ??
    currentTitle;

  return {
    headline: currentTitle ?? primaryRole,
    summary: input.professionalSummary,
    currentTitle,
    primaryRole,
    seniorityLevel: deriveSeniorityLevel(totalExperienceMonths),
    totalExperienceMonths,
    totalExperienceYears,
  };
};

const buildCanonicalResume = (value: unknown): CanonicalResume => {
  const data = isRecord(value) ? value : {};
  const personalInformation = mapPersonalInformation(firstDefined(data.personalInformation, data.personal_info));
  const links = normalizeLinks(firstDefined(data.links, data.personalInformation && isRecord(data.personalInformation) ? data.personalInformation.links : undefined, data.personal_info && isRecord(data.personal_info) ? data.personal_info.links : undefined));
  const employmentHistory = mapExperience(firstDefined(data.employmentHistory, data.work_experience, data.workExperience, data.experience));
  const education = mapEducation(firstDefined(data.education, data.academics, data.qualifications));
  const certifications = mapCertifications(firstDefined(data.certifications, data.certificates, data.licenses));
  const skills = mapSkills(firstDefined(data.skills, data.skillBlocks, data.skillset));
  const projects = mapProjects(firstDefined(data.projects, data.projectHighlights, data.project_history));
  const languages = mapLanguages(firstDefined(data.languages, data.spokenLanguages));
  const professionalSummary = toNullableText(firstDefined(data.professionalSummary, data.summary, data.professional_summary));
  const currentPosition = {
    title: toNullableText(firstDefined(data.currentPosition && isRecord(data.currentPosition) ? data.currentPosition.title : undefined, data.currentTitle, data.current_title)),
    company: toNullableText(firstDefined(data.currentPosition && isRecord(data.currentPosition) ? data.currentPosition.company : undefined, data.currentCompany, data.current_company)),
  };
  const professionalLabels = mapProfessionalLabels(firstDefined(data.professionalLabels, data.professional_labels, data.labels));
  const professionalProfile = deriveProfessionalProfile({
    professionalSummary,
    currentPosition,
    experience: employmentHistory,
    skills,
    labels: professionalLabels,
  }) as NonNullable<CanonicalResume["professionalProfile"]>;

  return ExpandedCanonicalResumeSchema.parse({
    schemaVersion: "resume-schema-v2",
    personalInformation,
    professionalSummary,
    currentPosition,
    professionalProfile,
    professionalLabels,
    employmentHistory,
    projects,
    education,
    skills,
    certifications,
    languages,
    links,
    awards: normalizeStringArray(firstDefined(data.awards, [])),
    publications: normalizeStringArray(firstDefined(data.publications, [])),
    totalExperienceMonths: professionalProfile.totalExperienceMonths,
    totalExperienceYears: professionalProfile.totalExperienceYears,
    parseQuality: {
      overallConfidence:
        typeof data.parseQuality === "object" && data.parseQuality !== null && typeof (data.parseQuality as Record<string, unknown>).overallConfidence === "number"
          ? ((data.parseQuality as Record<string, unknown>).overallConfidence as number)
          : 0.7,
      requiresReview:
        typeof data.parseQuality === "object" &&
        data.parseQuality !== null &&
        typeof (data.parseQuality as Record<string, unknown>).requiresReview === "boolean"
          ? ((data.parseQuality as Record<string, unknown>).requiresReview as boolean)
          : professionalProfile.totalExperienceMonths === 0 || professionalLabels.length === 0,
      missingImportantFields: normalizeStringArray(
        typeof data.parseQuality === "object" && data.parseQuality !== null
          ? (data.parseQuality as Record<string, unknown>).missingImportantFields
          : [],
      ),
      warnings: normalizeStringArray(
        typeof data.parseQuality === "object" && data.parseQuality !== null
          ? (data.parseQuality as Record<string, unknown>).warnings
          : [],
      ),
    },
  });
};

const toParsedResumeData = (canonical: CanonicalResume) =>
  ({
  personalDetails: {
    fullName: canonical.personalInformation.fullName,
    firstName: canonical.personalInformation.firstName,
    lastName: canonical.personalInformation.lastName,
    email: canonical.personalInformation.email,
    phone: canonical.personalInformation.phone,
    location: canonical.personalInformation.location.city,
    links: mapProfessionalLinksToLegacy(canonical.links),
    summary: canonical.professionalProfile?.summary ?? canonical.professionalSummary,
    currentTitle: canonical.professionalProfile?.currentTitle ?? canonical.currentPosition.title,
    primaryRole: canonical.professionalProfile?.primaryRole ?? null,
    seniorityLevel: canonical.professionalProfile?.seniorityLevel ?? null,
  },
  professionalProfile: canonical.professionalProfile ?? undefined,
  professionalLabels: canonical.professionalLabels,
    experience: canonical.employmentHistory as unknown as ParsedResumeData["experience"],
  projects: canonical.projects,
  education: canonical.education,
  skills: [
    ...canonical.skills.technical,
    ...canonical.skills.tools,
    ...canonical.skills.frameworks,
    ...canonical.skills.softSkills,
    ...canonical.skills.domains,
  ],
  certifications: canonical.certifications,
  languages: canonical.languages,
  links: canonical.links,
    totalExperienceMonths: canonical.totalExperienceMonths,
    totalExperienceYears: canonical.totalExperienceYears,
  } as unknown as ParsedResumeData);

export class AiResumeParser implements ResumeParser {
  async parseResume(input: ResumeParserInput): Promise<ResumeParserResult> {
    const model = createAiModel();

    const response = await model.extract({
      systemPrompt: RESUME_PARSER_SYSTEM_PROMPT,
      documentText: input.extractedText,
      schema: {
        parse: (value: unknown) => value,
      } as never,
      metadata: {
        promptVersion: "resume-parser-v2",
        schemaVersion: "resume-schema-v2",
      },
    });

    const parsed = typeof response === "string" ? JSON.parse(response) : response;
    const canonical = buildCanonicalResume(parsed);
    const parsedData = resumeNormaliserService.normalize(toParsedResumeData(canonical));

    return {
      parserVersion: "ai-resume-v3",
      confidenceScore: canonical.parseQuality.overallConfidence,
      data: parsedData,
    };
  }
}
