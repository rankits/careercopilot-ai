import { ExpandedCanonicalResumeSchema } from '@/modules/resumes/schemas/canonical-resume.schema.js';
import {
  normalizeProfessionalSkills,
  normalizeResumeSkills,
} from '@/modules/resumes/utils/skill-normalizer.js';
import {
  CanonicalResume,
  ParsedResumeData,
  ProfessionalLabelCategory,
  ProfessionalLabelSource,
  ProfessionalSeniorityLevel,
} from '@/modules/resumes/types/resume.types.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toNullableText = (value: unknown): string | null => {
  const text = toText(value);
  return text.length > 0 ? text : null;
};

const ensureUrl = (value: string | null | undefined): string | null => {
  const text = toNullableText(value);
  if (!text) {
    return null;
  }

  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
};

const MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

const isPresentDateToken = (value: string): boolean =>
  /^(present|current|now|till\s+date|to\s+date|ongoing)$/i.test(value.trim());

const normaliseResumeDate = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (isPresentDateToken(trimmed)) {
    return null;
  }

  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{4}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }

  const numericMonthYear = /^(\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (numericMonthYear) {
    const month = Number(numericMonthYear[1]);
    if (month >= 1 && month <= 12) {
      return `${numericMonthYear[2]}-${String(month).padStart(2, '0')}`;
    }
  }

  const yearMonthNumeric = /^(\d{4})[/-](\d{1,2})$/.exec(trimmed);
  if (yearMonthNumeric) {
    const month = Number(yearMonthNumeric[2]);
    if (month >= 1 && month <= 12) {
      return `${yearMonthNumeric[1]}-${String(month).padStart(2, '0')}`;
    }
  }

  const monthYear = /^([A-Za-z]{3,9})\.?\s+(\d{4})$/.exec(trimmed);
  if (monthYear) {
    const month = MONTHS[monthYear[1].slice(0, 3).toLowerCase()];
    return month ? `${monthYear[2]}-${month}` : null;
  }

  const yearMonthName = /^(\d{4})\s+([A-Za-z]{3,9})\.?$/.exec(trimmed);
  if (yearMonthName) {
    const month = MONTHS[yearMonthName[2].slice(0, 3).toLowerCase()];
    return month ? `${yearMonthName[1]}-${month}` : null;
  }

  // Keep the first year when the model returns a compact range in one field.
  const yearOnlyInRange = /\b((?:19|20)\d{2})\b/.exec(trimmed);
  if (yearOnlyInRange && /[-–—to]/i.test(trimmed)) {
    return `${yearOnlyInRange[1]}-01`;
  }

  return null;
};

const splitDateRange = (
  value: unknown,
): { startDate: string | null; endDate: string | null; isCurrent: boolean } => {
  const text = toNullableText(value);
  if (!text) {
    return { startDate: null, endDate: null, isCurrent: false };
  }

  const parts = text
    .split(/\s*(?:-|–|—|to|till|until)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const endToken = parts[parts.length - 1] ?? '';
    const startToken = parts[0] ?? '';
    const isCurrent = isPresentDateToken(endToken);
    return {
      startDate: normaliseResumeDate(startToken),
      endDate: isCurrent ? null : normaliseResumeDate(endToken),
      isCurrent,
    };
  }

  return {
    startDate: normaliseResumeDate(text),
    endDate: null,
    isCurrent: isPresentDateToken(text),
  };
};

const extractStatedExperienceYears = (
  ...sources: Array<string | null | undefined>
): number | null => {
  for (const source of sources) {
    if (!source) {
      continue;
    }

    const match =
      /(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp\b)/i.exec(source) ??
      /(?:experience|exp)\s*(?:of|:)?\s*(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/i.exec(source);

    if (match) {
      const years = Number(match[1]);
      if (Number.isFinite(years) && years > 0 && years < 60) {
        return years;
      }
    }
  }

  return null;
};

const toPositiveExperienceNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
};

const resolveTotalExperience = (input: {
  experience: CanonicalResume['employmentHistory'];
  declaredYears?: unknown;
  declaredMonths?: unknown;
  summary?: string | null;
  headline?: string | null;
}): { totalExperienceMonths: number; totalExperienceYears: number } => {
  const calculatedMonths = calculateTotalExperienceMonths(input.experience);
  const declaredMonths = toPositiveExperienceNumber(input.declaredMonths);
  const declaredYears = toPositiveExperienceNumber(input.declaredYears);
  const statedYears = extractStatedExperienceYears(input.summary, input.headline);

  const monthsFromDeclaredYears = declaredYears !== null ? Math.round(declaredYears * 12) : null;
  const monthsFromStatedYears = statedYears !== null ? Math.round(statedYears * 12) : null;

  const totalExperienceMonths = Math.max(
    calculatedMonths,
    declaredMonths ?? 0,
    monthsFromDeclaredYears ?? 0,
    monthsFromStatedYears ?? 0,
  );

  return {
    totalExperienceMonths,
    totalExperienceYears: Number((totalExperienceMonths / 12).toFixed(1)),
  };
};

const normaliseProficiency = (
  value: string | null | undefined,
): 'NATIVE' | 'BASIC' | 'CONVERSATIONAL' | 'PROFESSIONAL' | 'FLUENT' | null => {
  switch (value?.trim().toLowerCase()) {
    case 'native':
      return 'NATIVE';
    case 'basic':
    case 'beginner':
      return 'BASIC';
    case 'conversational':
    case 'intermediate':
      return 'CONVERSATIONAL';
    case 'professional':
    case 'working proficiency':
      return 'PROFESSIONAL';
    case 'fluent':
    case 'advanced':
      return 'FLUENT';
    default:
      return null;
  }
};

const firstDefined = (...values: unknown[]): unknown => values.find((value) => value !== undefined);

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Map<string, string>();

  for (const item of value) {
    if (typeof item === 'string') {
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

const normalizeLinks = (value: unknown): CanonicalResume['links'] => {
  const source = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.other)
      ? value.other
      : [];

  const result = {
    linkedIn: null as string | null,
    github: null as string | null,
    portfolio: null as string | null,
    website: null as string | null,
    stackoverflow: null as string | null,
    leetcode: null as string | null,
    hackerrank: null as string | null,
    behance: null as string | null,
    dribbble: null as string | null,
    other: [] as Array<{
      platform: string | null;
      label: string | null;
      url: string;
    }>,
  };

  for (const item of source) {
    if (typeof item === 'string') {
      const url = ensureUrl(item);
      if (url) {
        result.other.push({ platform: null, label: null, url });
      }
      continue;
    }

    if (!isRecord(item)) {
      continue;
    }

    const platform = toText(item.platform ?? item.type ?? item.name).toLowerCase();
    const url = ensureUrl(toNullableText(firstDefined(item.url, item.href, item.link)));

    if (!url) {
      continue;
    }

    switch (platform) {
      case 'linkedin':
        result.linkedIn = url;
        break;
      case 'github':
        result.github = url;
        break;
      case 'portfolio':
        result.portfolio = url;
        break;
      case 'website':
      case 'personal website':
        result.website = url;
        break;
      case 'stackoverflow':
      case 'stack overflow':
        result.stackoverflow = url;
        break;
      case 'leetcode':
        result.leetcode = url;
        break;
      case 'hackerrank':
        result.hackerrank = url;
        break;
      case 'behance':
        result.behance = url;
        break;
      case 'dribbble':
        result.dribbble = url;
        break;
      default:
        result.other.push({
          platform: toNullableText(item.platform),
          label: toNullableText(item.label),
          url,
        });
    }
  }

  return result;
};

const mapProfessionalLinksToLegacy = (
  value: CanonicalResume['links'],
): Record<string, unknown> => ({
  linkedIn: value.linkedIn,
  github: value.github,
  portfolio: value.portfolio,
  other: value.other.map((link) => link.url),
});

const mapLocation = (value: unknown): CanonicalResume['personalInformation']['location'] => {
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

const mapPersonalInformation = (value: unknown): CanonicalResume['personalInformation'] => {
  const data = isRecord(value) ? value : {};
  const links = normalizeLinks(firstDefined(data.links, data.socialLinks, data.urls));
  const location = isRecord(data.location) ? data.location : {};

  return {
    fullName: toNullableText(firstDefined(data.fullName, data.full_name, data.name)),
    firstName: toNullableText(firstDefined(data.firstName, data.first_name, data.given_name)),
    lastName: toNullableText(firstDefined(data.lastName, data.last_name, data.family_name)),
    email: toNullableText(data.email),
    phone: toNullableText(data.phone),
    location: mapLocation(firstDefined(location.formatted, data.location, data.address)),
    links: {
      linkedin: links.linkedIn,
      github: links.github,
      portfolio: links.portfolio,
      other: links.other.map((link) => link.url),
    },
  };
};

const mapProfessionalLabels = (value: unknown): CanonicalResume['professionalLabels'] => {
  const labels = Array.isArray(value) ? value : [];

  return labels.flatMap((item) => {
    if (typeof item === 'string') {
      const label = toText(item);
      return label
        ? [
            {
              label,
              category: 'ROLE' as ProfessionalLabelCategory,
              confidence: 0.7,
              source: 'INFERRED' as ProfessionalLabelSource,
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
        category: (toText(item.category).toUpperCase() || 'ROLE') as ProfessionalLabelCategory,
        confidence:
          typeof item.confidence === 'number' && item.confidence >= 0 && item.confidence <= 1
            ? item.confidence
            : 0.7,
        source: (toText(item.source).toUpperCase() || 'INFERRED') as ProfessionalLabelSource,
        evidence: normalizeStringArray(item.evidence),
      },
    ];
  });
};

const mapExperience = (value: unknown): CanonicalResume['employmentHistory'] => {
  const items = Array.isArray(value) ? value : [];

  return items.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const title = toNullableText(
      firstDefined(item.title, item.position, item.role, item.job_title),
    );
    const company = toNullableText(item.company);
    const range = splitDateRange(
      firstDefined(
        item.dateRange,
        item.date_range,
        item.duration,
        item.period,
        item.dates,
        item.tenure,
      ),
    );
    const startDate =
      normaliseResumeDate(
        toNullableText(firstDefined(item.startDate, item.start_date, item.from, item.start)),
      ) ?? range.startDate;
    const endDate =
      normaliseResumeDate(
        toNullableText(firstDefined(item.endDate, item.end_date, item.to, item.end)),
      ) ?? range.endDate;
    const endText = toText(item.endDate ?? item.end_date ?? item.to ?? item.end);
    const isCurrent =
      item.isCurrent === true ||
      item.current === true ||
      range.isCurrent ||
      isPresentDateToken(endText) ||
      (!endDate && Boolean(startDate) && (item.endDate === null || item.end_date === null));

    return [
      {
        company,
        title,
        location: toNullableText(item.location),
        startDate,
        endDate: isCurrent ? null : endDate,
        isCurrent,
        description: toNullableText(item.description),
        responsibilities: normalizeStringArray(item.responsibilities),
        achievements: normalizeStringArray(item.achievements),
        technologies: normalizeStringArray(item.technologies),
      },
    ];
  });
};

const mapProjects = (value: unknown): CanonicalResume['projects'] => {
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
        startDate: normaliseResumeDate(
          toNullableText(firstDefined(item.startDate, item.start_date)),
        ),
        endDate: normaliseResumeDate(toNullableText(firstDefined(item.endDate, item.end_date))),
        isCurrent:
          item.isCurrent === true ||
          item.current === true ||
          toText(item.endDate ?? item.end_date).toLowerCase() === 'present',
        description: toNullableText(item.description),
        responsibilities: normalizeStringArray(item.responsibilities),
        achievements: normalizeStringArray(item.achievements),
        technologies: normalizeStringArray(item.technologies),
        links: normalizeStringArray(item.links),
      },
    ];
  });
};

const mapEducation = (value: unknown): CanonicalResume['education'] => {
  const items = Array.isArray(value) ? value : [];

  return items.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    return [
      {
        institution: toNullableText(item.institution),
        qualification: toNullableText(
          firstDefined(item.qualification, item.degree, item.job_title),
        ),
        fieldOfStudy: toNullableText(firstDefined(item.fieldOfStudy, item.field_of_study)),
        startDate: normaliseResumeDate(
          toNullableText(firstDefined(item.startDate, item.start_date)),
        ),
        endDate: normaliseResumeDate(toNullableText(firstDefined(item.endDate, item.end_date))),
        grade: toNullableText(item.grade),
        location: toNullableText(item.location),
      },
    ];
  });
};

const mapCertifications = (value: unknown): CanonicalResume['certifications'] => {
  const items = Array.isArray(value) ? value : [];

  return items.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    return [
      {
        name: toNullableText(firstDefined(item.name, item.title)),
        issuer: toNullableText(item.issuer),
        issueDate: normaliseResumeDate(
          toNullableText(firstDefined(item.issueDate, item.issue_date, item.year)),
        ),
        expiryDate: normaliseResumeDate(
          toNullableText(firstDefined(item.expiryDate, item.expiry_date)),
        ),
        credentialId: toNullableText(firstDefined(item.credentialId, item.credential_id)),
        credentialUrl: toNullableText(firstDefined(item.credentialUrl, item.credential_url)),
      },
    ];
  });
};

const mapLanguages = (value: unknown): CanonicalResume['languages'] => {
  const items = Array.isArray(value) ? value : [];

  return items.flatMap((item) => {
    if (typeof item === 'string') {
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

    const name = toText(firstDefined(item.name, item.language, item.label));
    if (!name) {
      return [];
    }

    const proficiency = normaliseProficiency(
      toText(firstDefined(item.proficiency, item.level, item.fluency)),
    );

    return [
      {
        name,
        proficiency,
        isNative: item.isNative === true || proficiency === 'NATIVE',
      },
    ];
  });
};

const mapSkills = (value: unknown): CanonicalResume['skills'] => {
  const data = isRecord(value) ? value : {};

  if (Array.isArray(value)) {
    const skills = normalizeResumeSkills(
      value.flatMap((item) => {
        if (typeof item === 'string') {
          return [item];
        }

        if (isRecord(item)) {
          return [item.name ?? item.label ?? item.skill ?? ''];
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

  const groupedSkills = normalizeResumeSkills(
    [
      data.backend,
      data.frontend,
      data.data,
      data.cloudDevops,
      data.cloud_devops,
      data.practices,
      data.tools,
      data.frameworks,
      data.softSkills,
      data.soft_skills,
      data.domains,
      data.technical,
      data.coreSkills,
      data.core_skills,
      data.coreCompetencies,
      data.core_competencies,
      data.competencies,
      data.core,
      data.backendTechnologies,
      data.backend_technologies,
      data.frontendTechnologies,
      data.frontend_technologies,
      data.database,
      data.databases,
    ].flatMap(normalizeStringArray),
  );

  return {
    technical:
      normalizeResumeSkills(data.technical).length > 0
        ? normalizeResumeSkills(data.technical)
        : groupedSkills,
    tools: normalizeResumeSkills(data.tools),
    frameworks: normalizeResumeSkills(data.frameworks),
    softSkills: normalizeResumeSkills(
      [data.softSkills, data.soft_skills].flatMap(normalizeStringArray),
    ),
    domains: normalizeResumeSkills(data.domains),
  };
};

const calculateTotalExperienceMonths = (
  experience: CanonicalResume['employmentHistory'],
  currentDate = new Date(),
): number => {
  const periods = experience
    .filter((item) => typeof item.startDate === 'string' && item.startDate.length > 0)
    .map((item) => {
      const startMatch = /^(\d{4})-(\d{2})$/.exec(String(item.startDate));
      if (!startMatch) {
        return null;
      }

      const start = new Date(Number(startMatch[1]), Number(startMatch[2]) - 1, 1);
      const end =
        item.isCurrent || !item.endDate
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
    .filter(
      (period): period is { start: Date; end: Date } =>
        period !== null && period.end >= period.start,
    )
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
  if (months <= 0) {
    return 'UNKNOWN';
  }

  if (months < 12) {
    return 'ENTRY';
  }

  if (months < 36) {
    return 'JUNIOR';
  }

  if (months < 72) {
    return 'MID';
  }

  if (months < 144) {
    return 'SENIOR';
  }

  return 'UNKNOWN';
};

const deriveProfessionalLabels = (
  experience: CanonicalResume['employmentHistory'],
  skills: CanonicalResume['skills'],
  currentTitle: string | null,
): CanonicalResume['professionalLabels'] => {
  const evidence = normalizeStringArray([
    ...(currentTitle ? [currentTitle] : []),
    ...skills.technical,
    ...skills.tools,
    ...skills.frameworks,
    ...skills.softSkills,
    ...skills.domains,
  ]);

  const labels: CanonicalResume['professionalLabels'] = [];

  if (currentTitle) {
    labels.push({
      label: currentTitle,
      category: 'ROLE',
      confidence: 0.8,
      source: 'INFERRED',
      evidence: currentTitle ? [currentTitle] : [],
    });
  } else if (experience.length > 0 && experience[0].title) {
    labels.push({
      label: String(experience[0].title),
      category: 'ROLE',
      confidence: 0.72,
      source: 'INFERRED',
      evidence: [String(experience[0].title)],
    });
  }

  const skillEvidence = evidence.filter((item) =>
    /selenium|playwright|cucumber|testng|rest assured|postman|api testing/i.test(item),
  );

  if (skillEvidence.length > 0) {
    labels.push({
      label: 'QA Automation Engineer',
      category: 'SPECIALISATION',
      confidence: 0.88,
      source: 'INFERRED',
      evidence: skillEvidence.slice(0, 5),
    });
  }

  return labels;
};

const deriveProfessionalProfile = (input: {
  headline: string | null;
  professionalSummary: string | null;
  currentPosition: { title: string | null; company: string | null };
  experience: CanonicalResume['employmentHistory'];
  skills: CanonicalResume['skills'];
  labels: CanonicalResume['professionalLabels'];
  declaredYears?: unknown;
  declaredMonths?: unknown;
}): CanonicalResume['professionalProfile'] => {
  const { totalExperienceMonths, totalExperienceYears } = resolveTotalExperience({
    experience: input.experience,
    declaredYears: input.declaredYears,
    declaredMonths: input.declaredMonths,
    summary: input.professionalSummary,
    headline: input.headline,
  });
  const currentTitle =
    input.currentPosition.title ?? input.experience.find((item) => item.isCurrent)?.title ?? null;
  const primaryRole =
    input.labels.find((label) => label.category === 'ROLE')?.label ??
    input.labels.find((label) => label.category === 'SPECIALISATION')?.label ??
    currentTitle;

  return {
    headline: input.headline ?? currentTitle ?? primaryRole,
    summary:
      input.professionalSummary ??
      (() => {
        const skills = [
          ...input.skills.technical,
          ...input.skills.tools,
          ...input.skills.frameworks,
        ].slice(0, 6);
        if (!currentTitle && !skills.length && !input.experience.length) {
          return null;
        }
        const role = currentTitle ?? primaryRole ?? 'Professional';
        const company =
          input.currentPosition.company ??
          input.experience.find((item) => item.isCurrent)?.company ??
          input.experience[0]?.company;
        return [
          `${role}${company ? ` at ${company}` : ''} with demonstrated experience across relevant roles.`,
          skills.length ? `Core skills include ${skills.join(', ')}.` : null,
        ]
          .filter(Boolean)
          .join(' ');
      })(),
    currentTitle,
    primaryRole,
    seniorityLevel: deriveSeniorityLevel(totalExperienceMonths),
    totalExperienceMonths,
    totalExperienceYears,
  };
};

export const buildCanonicalResume = (value: unknown): CanonicalResume => {
  const data = isRecord(value) ? value : {};
  // Models often put contact fields at the top level instead of nesting them
  // under personalInformation. Prefer nested objects, then fall back to the
  // root payload so name/email/phone are not dropped during normalisation.
  const personalInformationRaw = firstDefined(
    data.personal_information,
    data.personalInformation,
    data.personal_info,
    data.personalDetails,
    data.contact,
    data.contactInformation,
    data.contact_information,
  );
  const personalInfoRecord = isRecord(personalInformationRaw) ? personalInformationRaw : {};
  // Nested contact objects win; otherwise accept top-level name/email/phone.
  const personalInformation = mapPersonalInformation({
    ...data,
    ...personalInfoRecord,
  });
  const links = normalizeLinks(
    firstDefined(
      data.links,
      personalInfoRecord.links,
      personalInfoRecord.social_links,
      personalInfoRecord.urls,
      personalInformation.links,
    ),
  );
  const employmentHistory = mapExperience(
    firstDefined(
      data.employmentHistory,
      data.employment_history,
      data.work_experience,
      data.workExperience,
      data.workHistory,
      data.work_history,
      data.experience,
      data.experiences,
      data.jobs,
      data.employment,
    ),
  );
  const education = mapEducation(
    firstDefined(
      data.education,
      data.educationHistory,
      data.education_history,
      data.academics,
      data.qualifications,
    ),
  );
  const certifications = mapCertifications(
    firstDefined(data.certifications, data.certificates, data.licenses),
  );
  const skills = mapSkills(
    firstDefined(
      data.skills,
      data.skillBlocks,
      data.skillset,
      data.coreSkills,
      data.core_skills,
      data.coreCompetencies,
      data.core_competencies,
    ),
  );
  const projects = mapProjects(
    firstDefined(data.projects, data.projectHighlights, data.project_history, data.projectHistory),
  );
  const languages = mapLanguages(firstDefined(data.languages, data.spokenLanguages));
  const professionalSummary = toNullableText(
    firstDefined(
      personalInfoRecord.summary,
      personalInfoRecord.professional_summary,
      data.professionalSummary,
      data.summary,
      data.professional_summary,
    ),
  );
  const professionalHeadline = toNullableText(
    firstDefined(
      personalInfoRecord.headline,
      personalInfoRecord.professional_headline,
      data.professionalHeadline,
      data.headline,
      data.professional_headline,
    ),
  );
  const currentPosition = {
    title: toNullableText(
      firstDefined(
        data.currentPosition && isRecord(data.currentPosition)
          ? data.currentPosition.title
          : undefined,
        personalInfoRecord.current_title,
        personalInfoRecord.headline,
        data.currentTitle,
        data.current_title,
        employmentHistory.find((item) => item.isCurrent)?.title,
      ),
    ),
    company: toNullableText(
      firstDefined(
        data.currentPosition && isRecord(data.currentPosition)
          ? data.currentPosition.company
          : undefined,
        personalInfoRecord.current_company,
        data.currentCompany,
        data.current_company,
        employmentHistory.find((item) => item.isCurrent)?.company,
      ),
    ),
  };
  const professionalLabels = mapProfessionalLabels(
    firstDefined(
      personalInfoRecord.professional_labels,
      personalInfoRecord.professionalLabels,
      data.professionalLabels,
      data.professional_labels,
      data.labels,
    ),
  );
  const professionalProfile = deriveProfessionalProfile({
    headline: professionalHeadline,
    professionalSummary,
    currentPosition,
    experience: employmentHistory,
    skills,
    labels: professionalLabels,
    declaredYears: firstDefined(
      data.totalExperienceYears,
      data.total_experience_years,
      data.yearsOfExperience,
      data.years_of_experience,
      isRecord(data.professionalProfile)
        ? data.professionalProfile.totalExperienceYears
        : undefined,
      personalInfoRecord.totalExperience,
      personalInfoRecord.total_experience,
    ),
    declaredMonths: firstDefined(
      data.totalExperienceMonths,
      data.total_experience_months,
      isRecord(data.professionalProfile)
        ? data.professionalProfile.totalExperienceMonths
        : undefined,
    ),
  }) as NonNullable<CanonicalResume['professionalProfile']>;

  return ExpandedCanonicalResumeSchema.parse({
    schemaVersion: 'resume-schema-v2',
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
        typeof data.parseQuality === 'object' &&
        data.parseQuality !== null &&
        typeof (data.parseQuality as Record<string, unknown>).overallConfidence === 'number'
          ? ((data.parseQuality as Record<string, unknown>).overallConfidence as number)
          : 0.7,
      requiresReview:
        typeof data.parseQuality === 'object' &&
        data.parseQuality !== null &&
        typeof (data.parseQuality as Record<string, unknown>).requiresReview === 'boolean'
          ? ((data.parseQuality as Record<string, unknown>).requiresReview as boolean)
          : professionalProfile.totalExperienceMonths === 0 || professionalLabels.length === 0,
      missingImportantFields: normalizeStringArray(
        typeof data.parseQuality === 'object' && data.parseQuality !== null
          ? (data.parseQuality as Record<string, unknown>).missingImportantFields
          : [],
      ),
      warnings: normalizeStringArray(
        typeof data.parseQuality === 'object' && data.parseQuality !== null
          ? (data.parseQuality as Record<string, unknown>).warnings
          : [],
      ),
    },
  });
};

export const toParsedResumeData = (canonical: CanonicalResume) =>
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
    experience: canonical.employmentHistory as unknown as ParsedResumeData['experience'],
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
  }) as unknown as ParsedResumeData;
