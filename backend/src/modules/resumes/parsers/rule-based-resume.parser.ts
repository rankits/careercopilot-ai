import {
  ResumeParser,
  ResumeParserInput,
  ResumeParserResult,
} from '@/modules/resumes/types/resume.types.js';

const skillKeywords = [
  'javascript',
  'typescript',
  'react',
  'node',
  'express',
  'postgresql',
  'mongodb',
  'aws',
  'docker',
  'kubernetes',
  'python',
  'java',
  'spring',
  'sql',
  'redis',
  'rabbitmq',
  'graphql',
];

const SECTION_STOP =
  /^(experience|work\s+experience|employment|education|skills|projects?|certifications?|achievements?|awards?|languages?|interests?|references?|contact|summary|professional\s+summary|profile|objective|about(\s+me)?)\b/i;

const SUMMARY_HEADER =
  /^(professional\s+summary|summary|profile|objective|about(\s+me)?|career\s+summary)\s*:?\s*$/i;

const PROJECTS_HEADER =
  /^(projects?|personal\s+projects?|key\s+projects?|project\s+experience)\s*:?\s*$/i;

const compactLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const extractSectionLines = (lines: string[], headerPattern: RegExp): string[] => {
  const startIndex = lines.findIndex((line) => headerPattern.test(line));
  if (startIndex < 0) return [];

  const body: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (SECTION_STOP.test(line) && !headerPattern.test(line)) break;
    body.push(line);
  }
  return body;
};

const synthesiseSummary = (input: {
  experience: Array<{ raw: string }>;
  skills: string[];
  designation?: string;
}): string | undefined => {
  const roleHint =
    input.designation || input.experience[0]?.raw?.split(/[-–—|@]/)[0]?.trim() || 'Professional';
  const skillHint = input.skills.slice(0, 6).join(', ');
  if (!skillHint && !input.experience.length) return undefined;
  return [
    `${roleHint} with demonstrated experience across relevant roles.`,
    skillHint ? `Core skills include ${skillHint}.` : null,
  ]
    .filter(Boolean)
    .join(' ');
};

const parseProjects = (projectLines: string[]): Array<Record<string, unknown>> => {
  if (!projectLines.length) return [];

  const projects: Array<Record<string, unknown>> = [];
  let current: {
    name: string;
    description?: string;
    technologies?: string[];
    duration?: string;
    responsibilities?: string[];
  } | null = null;

  const flush = () => {
    if (!current?.name) return;
    projects.push({ ...current });
    current = null;
  };

  for (const line of projectLines) {
    const techMatch = line.match(/^(?:tech(?:nologies?)?|stack|tools)\s*[:\-–—]\s*(.+)$/i);
    if (techMatch && current) {
      current.technologies = techMatch[1]
        .split(/[,|/]/)
        .map((item) => item.trim())
        .filter(Boolean);
      continue;
    }

    const durationMatch = line.match(/^(?:duration|period|timeline)\s*[:\-–—]\s*(.+)$/i);
    if (durationMatch && current) {
      current.duration = durationMatch[1].trim();
      continue;
    }

    const responsibilityMatch = line.match(/^[-•*]\s*(.+)$/);
    if (responsibilityMatch && current) {
      current.responsibilities = [
        ...(current.responsibilities ?? []),
        responsibilityMatch[1].trim(),
      ];
      continue;
    }

    const looksLikeTitle =
      line.length <= 120 && !/^[a-z]/.test(line) && !/^(description|overview)\b/i.test(line);

    if (looksLikeTitle && (!current || (current.description && current.responsibilities?.length))) {
      flush();
      const [namePart, ...rest] = line.split(/\s[-–—|]\s/);
      current = {
        name: namePart.trim(),
        description: rest.length ? rest.join(' — ').trim() : undefined,
      };
      continue;
    }

    if (!current) {
      current = { name: line, description: undefined };
      continue;
    }

    current.description = current.description ? `${current.description} ${line}` : line;
  }

  flush();
  return projects.slice(0, 12);
};

export class RuleBasedResumeParser implements ResumeParser {
  async parseResume(input: ResumeParserInput): Promise<ResumeParserResult> {
    const text = input.extractedText;
    const lines = compactLines(text);
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim();
    const linkedIn = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s]+/i)?.[0];
    const lowerText = text.toLowerCase();

    const skills = skillKeywords.filter((skill) => lowerText.includes(skill));
    const education = lines
      .filter((line) =>
        /(university|college|bachelor|master|degree|b\.tech|m\.tech|mba|phd)/i.test(line),
      )
      .slice(0, 10)
      .map((line) => ({ raw: line }));
    const experience = lines
      .filter((line) =>
        /(engineer|developer|manager|analyst|consultant|intern|architect|lead)/i.test(line),
      )
      .slice(0, 12)
      .map((line) => ({ raw: line }));
    const certifications = lines
      .filter((line) => /(certified|certification|certificate|aws certified|pmp|scrum)/i.test(line))
      .slice(0, 8)
      .map((line) => ({ raw: line }));

    const summaryLines = extractSectionLines(lines, SUMMARY_HEADER);
    let summary = summaryLines.join(' ').trim() || undefined;
    const projects = parseProjects(extractSectionLines(lines, PROJECTS_HEADER));
    const designation = experience[0]?.raw?.split(/[-–—|@]/)[0]?.trim() || undefined;

    if (!summary) {
      summary = synthesiseSummary({ experience, skills, designation });
    }

    return {
      parserVersion: 'rule-based-v2',
      confidenceScore: 0.45,
      data: {
        personalDetails: {
          fullName: lines[0],
          email,
          phone,
          linkedIn,
          summary,
          designation,
        },
        professionalProfile: summary
          ? {
              summary,
              currentTitle: designation ?? null,
            }
          : undefined,
        experience,
        education,
        skills,
        certifications,
        projects,
      },
    };
  }
}
