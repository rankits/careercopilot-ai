import type {
  AiMailProfileSummaryDto,
  CandidateEducationContext,
  CandidateExperienceContext,
  CandidateProfileContext,
  CandidateProjectContext,
} from '@/modules/ai-mail/domain/ai-mail.types.js';
import {
  asArray,
  asObject,
  cleanText,
  firstText,
  httpUrl,
  stableUnique,
  textArray,
} from '@/modules/ai-mail/domain/context-normalization.js';
import { normalizeProfessionalSkills } from '@/modules/resumes/utils/skill-normalizer.js';

export interface CandidateProfileSource {
  personalDetails: unknown;
  experience: unknown;
  education: unknown;
  skills: unknown;
  certifications: unknown;
  confirmedAt?: Date | string | null;
  links?: unknown;
}

export interface CandidateProfileLimits {
  maxProfileSkills: number;
  maxExperienceEntries: number;
  maxExperienceHighlightsPerEntry: number;
  maxProjects: number;
  maxAchievements: number;
}

const achievementsFrom = (value: unknown, limit: number): string[] =>
  asArray(value)
    .filter((item) => {
      const object = asObject(item);
      if (Object.keys(object).length === 0) return typeof item === 'string';
      return (
        object.verified === true ||
        object.userEntered === true ||
        ['user', 'user_verified', 'verified'].includes(String(object.source).toLowerCase())
      );
    })
    .flatMap((item) => {
      const object = asObject(item);
      return textArray(
        typeof item === 'string'
          ? item
          : (object.text ?? object.description ?? object.achievement ?? object.value),
        1,
      );
    })
    .slice(0, limit);

export class CandidateProfileContextBuilder {
  constructor(private readonly limits: CandidateProfileLimits) {}

  build(source: CandidateProfileSource): CandidateProfileContext {
    const personal = asObject(source.personalDetails);
    const experience = this.experience(source.experience);
    const projectSource =
      personal.projects ?? asObject(source.experience).projects ?? asObject(source.skills).projects;
    const achievements = stableUnique(
      achievementsFrom(personal.achievements, this.limits.maxAchievements),
    ).slice(0, this.limits.maxAchievements);

    return {
      fullName:
        firstText(personal, ['fullName', 'name', 'displayName'], 160) ??
        stableUnique([
          firstText(personal, ['firstName', 'givenName'], 80),
          firstText(personal, ['lastName', 'familyName'], 80),
        ]).join(' '),
      currentRole:
        firstText(personal, ['currentRole', 'jobTitle', 'headline', 'title'], 160) ??
        experience.find((entry) => entry.current)?.roleTitle ??
        experience[0]?.roleTitle,
      yearsOfExperience: this.years(personal),
      skills: normalizeProfessionalSkills(this.skillValues(source.skills)).slice(
        0,
        this.limits.maxProfileSkills,
      ),
      experience,
      projects: this.projects(projectSource),
      education: this.education(source.education),
      certifications: textArray(source.certifications, this.limits.maxAchievements, 300),
      location: firstText(personal, ['location', 'city', 'region', 'country'], 160),
      approvedAchievements: achievements,
      professionalLinks: this.links(source.links),
    };
  }

  summarize(source: CandidateProfileSource | null): AiMailProfileSummaryDto {
    if (!source) {
      return {
        exists: false,
        confirmed: false,
        topSkills: [],
        fullNamePresent: false,
        currentRolePresent: false,
        locationPresent: false,
        skillCount: 0,
        experienceCount: 0,
        educationCount: 0,
        certificationCount: 0,
        achievementCount: 0,
        professionalLinkCount: 0,
        completenessPercent: 0,
        missingRecommendedSections: [
          'candidate name',
          'current title',
          'skills',
          'experience',
          'education',
        ],
      };
    }
    const context = this.build(source);
    const missingRecommendedSections = [
      !context.fullName ? 'candidate name' : undefined,
      !context.currentRole ? 'current title' : undefined,
      context.skills.length === 0 ? 'skills' : undefined,
      context.experience.length === 0 ? 'experience' : undefined,
      context.education.length === 0 ? 'education' : undefined,
      context.approvedAchievements.length === 0 ? 'achievements' : undefined,
    ].filter((item): item is string => Boolean(item));
    const checks = [
      Boolean(context.fullName),
      Boolean(context.currentRole),
      Boolean(context.location),
      context.skills.length > 0,
      context.experience.length > 0,
      context.education.length > 0,
    ];
    return {
      exists: true,
      confirmed: Boolean(source.confirmedAt),
      candidateName: context.fullName || undefined,
      currentTitle: context.currentRole,
      yearsOfExperience: context.yearsOfExperience,
      topSkills: context.skills.slice(0, 8),
      fullNamePresent: Boolean(context.fullName),
      currentRolePresent: Boolean(context.currentRole),
      locationPresent: Boolean(context.location),
      skillCount: context.skills.length,
      experienceCount: context.experience.length,
      educationCount: context.education.length,
      certificationCount: context.certifications.length,
      achievementCount: context.approvedAchievements.length,
      professionalLinkCount: context.professionalLinks.length,
      completenessPercent: Math.round((checks.filter(Boolean).length / checks.length) * 100),
      missingRecommendedSections,
    };
  }

  private experience(value: unknown): CandidateExperienceContext[] {
    return asArray(value)
      .map((item): CandidateExperienceContext | null => {
        const object = asObject(item);
        const roleTitle = firstText(object, ['roleTitle', 'title', 'position', 'jobTitle'], 160);
        if (!roleTitle) return null;
        const endDate = firstText(object, ['endDate', 'to'], 40);
        return {
          roleTitle,
          companyName: firstText(
            object,
            ['companyName', 'company', 'employer', 'organization'],
            160,
          ),
          startDate: firstText(object, ['startDate', 'from'], 40),
          endDate,
          current:
            object.current === true || object.isCurrent === true || /present/i.test(endDate ?? ''),
          highlights: textArray(
            object.highlights ?? object.bullets ?? object.responsibilities ?? object.description,
            this.limits.maxExperienceHighlightsPerEntry,
          ),
        };
      })
      .filter((entry): entry is CandidateExperienceContext => entry !== null)
      .slice(0, this.limits.maxExperienceEntries);
  }

  private projects(value: unknown): CandidateProjectContext[] {
    return asArray(value)
      .map((item): CandidateProjectContext | null => {
        const object = asObject(item);
        const name = firstText(object, ['name', 'title', 'projectName'], 160);
        if (!name) return null;
        return {
          name,
          description: firstText(object, ['description', 'summary'], 1000),
          technologies: normalizeProfessionalSkills(
            object.technologies ?? object.skills ?? object.techStack,
          ),
          url: httpUrl(object.url ?? object.link),
        };
      })
      .filter((project): project is CandidateProjectContext => project !== null)
      .slice(0, this.limits.maxProjects);
  }

  private education(value: unknown): CandidateEducationContext[] {
    return asArray(value)
      .map((item): CandidateEducationContext | null => {
        const object = asObject(item);
        const institution = firstText(
          object,
          ['institution', 'school', 'university', 'college'],
          200,
        );
        if (!institution) return null;
        return {
          institution,
          degree: firstText(object, ['degree', 'qualification'], 160),
          fieldOfStudy: firstText(object, ['fieldOfStudy', 'field', 'major'], 160),
          graduationDate: firstText(object, ['graduationDate', 'endDate', 'year'], 40),
        };
      })
      .filter((entry): entry is CandidateEducationContext => entry !== null);
  }

  private links(value: unknown): string[] {
    const links = asObject(value);
    return stableUnique(
      ['linkedin', 'github', 'portfolio', 'website'].map((key) => httpUrl(links[key])),
    );
  }

  private skillValues(value: unknown): unknown {
    const object = asObject(value);
    return Array.isArray(value)
      ? value
      : (object.skills ?? object.technicalSkills ?? object.coreSkills ?? []);
  }

  private years(personal: Record<string, unknown>): number | undefined {
    const raw = personal.yearsOfExperience ?? personal.totalExperienceYears;
    const number = typeof raw === 'number' ? raw : Number(cleanText(raw, 20));
    return Number.isFinite(number) && number >= 0 && number <= 80 ? number : undefined;
  }
}
