import { createAiModel } from "@/modules/resumes/ai/ai-model.factory.js";
import { RESUME_PARSER_SYSTEM_PROMPT } from "@/modules/resumes/ai/prompts/resume-parser.prompt.js";
import { resumeNormaliserService } from "@/modules/resumes/normalisation/resume-normaliser.service.js";
import { ResumeParser, ResumeParserInput, ResumeParserResult } from "@/modules/resumes/types/resume.types.js";
import { z } from "zod";

const extractJsonPayload = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((part) => (typeof part === "string" ? part : ""))
      .join("")
      .trim();
  }

  return "";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toRecordArray = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const firstDefined = (...values: unknown[]): unknown => values.find((value) => value !== undefined);

const buildParsedResumeData = (value: unknown) => {
  const data = isRecord(value) ? value : {};
  const personalInformation = isRecord(data.personalInformation) ? data.personalInformation : {};
  const links = isRecord(personalInformation.links) ? personalInformation.links : {};
  const skills = isRecord(data.skills) ? data.skills : {};

  const personalDetails = {
    fullName: String(
      firstDefined(data.fullName, personalInformation.fullName, data.name, personalInformation.name, "") ?? "",
    ),
    email: String(firstDefined(data.email, personalInformation.email, "") ?? ""),
    phone: String(firstDefined(data.phone, personalInformation.phone, "") ?? ""),
    linkedIn: String(
      firstDefined(
        data.linkedIn,
        data.linkedin,
        personalInformation.linkedIn,
        personalInformation.linkedin,
        links.linkedin,
        "",
      ) ?? "",
    ),
  };

  const experience = toRecordArray(
    firstDefined(
      data.experience,
      data.employmentHistory,
      data.workExperience,
      data.jobs,
      data.employment,
      [],
    ),
  );

  const education = toRecordArray(firstDefined(data.education, data.academics, data.qualifications, []));
  const certifications = toRecordArray(firstDefined(data.certifications, data.certificates, data.licenses, []));

  const skillBuckets = [
    skills.technical,
    skills.tools,
    skills.frameworks,
    skills.softSkills,
    skills.domains,
  ].flatMap(toStringArray);

  const skillsList = toStringArray(
    firstDefined(data.skills, data.skillKeywords, data.technicalSkills, data.keySkills, []),
  );

  return resumeNormaliserService.normalize({
    personalDetails,
    experience,
    education,
    skills: skillsList.length > 0 ? skillsList : skillBuckets,
    certifications,
  });
};

export class AiResumeParser implements ResumeParser {
  async parseResume(input: ResumeParserInput): Promise<ResumeParserResult> {
    const model = createAiModel();

    const response = await model.extract({
      systemPrompt: RESUME_PARSER_SYSTEM_PROMPT,
      documentText: input.extractedText,
      schema: z.any(),
      metadata: {
        promptVersion: "resume-parser-v1",
        schemaVersion: "resume-schema-v1",
      },
    });

    const rawText = extractJsonPayload(response);
    const cleanedText = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      throw new Error("Gemini did not return valid JSON for the resume parser");
    }

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
