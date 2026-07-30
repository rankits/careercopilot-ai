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

const compactLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

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

    return {
      parserVersion: 'rule-based-v1',
      confidenceScore: 0.45,
      data: {
        personalDetails: {
          fullName: lines[0],
          email,
          phone,
          linkedIn,
        },
        experience,
        education,
        skills,
        certifications,
      },
    };
  }
}
