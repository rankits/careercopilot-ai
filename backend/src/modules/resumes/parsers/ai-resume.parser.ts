import { createAiModel } from "@/modules/resumes/ai/ai-model.factory.js";
import { RESUME_PARSER_SYSTEM_PROMPT } from "@/modules/resumes/ai/prompts/resume-parser.prompt.js";
import { resumeNormaliserService } from "@/modules/resumes/normalisation/resume-normaliser.service.js";
import { ResumeParser, ResumeParserInput, ResumeParserResult } from "@/modules/resumes/types/resume.types.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const toNullableText = (value: unknown): string | null => {
  const text = toText(value);
  return text.length > 0 ? text : null;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Map<string, string>();

  for (const item of value) {
    const text = toText(item);
    if (!text) {
      continue;
    }

    const key = text.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, text);
    }
  }

  return Array.from(seen.values());
};

const toRecordArray = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
};

const firstDefined = (...values: unknown[]): unknown => values.find((value) => value !== undefined);

const mapLinkedIn = (links: unknown): string | null => {
  if (!Array.isArray(links)) {
    return null;
  }

  for (const link of links) {
    if (typeof link === "string" && link.toLowerCase().includes("linkedin")) {
      return link.trim();
    }

    if (isRecord(link)) {
      const type = toText(link.type ?? link.platform ?? link.name).toLowerCase();
      const url = toText(link.url ?? link.href ?? link.link);
      if (url && (type === "linkedin" || url.toLowerCase().includes("linkedin"))) {
        return url;
      }
    }
  }

  return null;
};

const mapSkills = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") {
        return [toText(item)];
      }

      if (isRecord(item)) {
        return [toText(item.name ?? item.label ?? item.skill)];
      }

      return [];
    });
  }

  if (isRecord(value)) {
    return [
      ...toStringArray(value.technical),
      ...toStringArray(value.tools),
      ...toStringArray(value.frameworks),
      ...toStringArray(value.softSkills),
      ...toStringArray(value.domains),
    ];
  }

  return [];
};

const buildParsedResumeData = (value: unknown) => {
  const data = isRecord(value) ? value : {};
  const personalInfo = isRecord(data.personal_info) ? data.personal_info : {};
  const links = personalInfo.links;

  const personalDetails = {
    fullName: toNullableText(firstDefined(data.fullName, personalInfo.full_name, personalInfo.name)),
    email: toNullableText(firstDefined(data.email, personalInfo.email)),
    phone: toNullableText(firstDefined(data.phone, personalInfo.phone)),
    linkedIn: mapLinkedIn(links) ?? toNullableText(firstDefined(data.linkedIn, data.linkedin, personalInfo.linkedin)),
    location: toNullableText(firstDefined(data.location, personalInfo.location)),
  };

  const experienceSource = firstDefined(
    data.work_experience,
    data.workExperience,
    data.experience,
    data.employmentHistory,
    [],
  );

  const experience = toRecordArray(experienceSource).map((item) => ({
    company: toNullableText(firstDefined(item.company, item.employer, item.organization)),
    title: toNullableText(firstDefined(item.position, item.title, item.role)),
    location: toNullableText(item.location),
    startDate: toNullableText(firstDefined(item.start_date, item.startDate)),
    endDate: toNullableText(firstDefined(item.end_date, item.endDate)),
    isCurrent:
      firstDefined(item.isCurrent, item.current, item.end_date, item.endDate) === null ||
      firstDefined(item.isCurrent, item.current) === true,
    description: toNullableText(item.description),
    responsibilities: toStringArray(item.responsibilities),
    achievements: toStringArray(item.achievements),
    technologies: toStringArray(item.technologies),
  }));

  const educationSource = firstDefined(data.education, data.academics, data.qualifications, []);
  const education = toRecordArray(educationSource).map((item) => ({
    institution: toNullableText(item.institution),
    qualification: toNullableText(firstDefined(item.qualification, item.degree)),
    fieldOfStudy: toNullableText(firstDefined(item.field_of_study, item.fieldOfStudy)),
    startDate: toNullableText(firstDefined(item.start_date, item.startDate)),
    endDate: toNullableText(firstDefined(item.end_date, item.endDate)),
    grade: toNullableText(item.grade),
    location: toNullableText(item.location),
  }));

  const certificationsSource = firstDefined(data.certifications, data.certificates, data.licenses, []);
  const certifications = toRecordArray(certificationsSource).map((item) => ({
    name: toNullableText(firstDefined(item.name, item.title)),
    issuer: toNullableText(item.issuer),
    issueDate: toNullableText(firstDefined(item.issue_date, item.issueDate)),
    expiryDate: toNullableText(firstDefined(item.expiry_date, item.expiryDate)),
    credentialId: toNullableText(firstDefined(item.credential_id, item.credentialId)),
    credentialUrl: toNullableText(firstDefined(item.credential_url, item.credentialUrl)),
  }));

  const skills = mapSkills(firstDefined(data.skills, data.skillKeywords, data.technicalSkills, data.keySkills, []));

  return resumeNormaliserService.normalize({
    personalDetails,
    experience,
    education,
    skills,
    certifications,
  });
};

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
        promptVersion: "resume-parser-v1",
        schemaVersion: "resume-schema-v1",
      },
    });

    const parsed = typeof response === "string" ? JSON.parse(response) : response;
    const normalized = buildParsedResumeData(parsed);
    const confidence =
      isRecord(parsed) &&
      isRecord(parsed.parseQuality) &&
      typeof parsed.parseQuality.overallConfidence === "number"
        ? parsed.parseQuality.overallConfidence
        : 0.7;

    return {
      parserVersion: "ai-resume-v2",
      confidenceScore: confidence,
      data: normalized,
    };
  }
}
