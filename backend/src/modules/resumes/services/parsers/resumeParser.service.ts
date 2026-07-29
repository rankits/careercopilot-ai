import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { ParsedResumeData } from '@/modules/resumes/types/resume.types.js';

export interface ResumeDocument {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export class ResumeParserService {
  public async parseResume(document: ResumeDocument): Promise<ParsedResumeData> {
    const extractedText = await this.extractText(document);
    const normalizedText = extractedText.replace(/\s+/g, ' ').trim();

    return {
      personalDetails: {
        fullName: this.extractFullName(normalizedText),
        email: this.extractEmail(normalizedText),
        phone: this.extractPhone(normalizedText),
        location: this.extractLocation(normalizedText),
      },
      experience: this.extractExperience(normalizedText),
      education: this.extractEducation(normalizedText),
      skills: this.extractSkills(normalizedText),
      certifications: this.extractCertifications(normalizedText),
    };
  }

  private async extractText(document: ResumeDocument): Promise<string> {
    const lowerName = document.originalName.toLowerCase();

    if (lowerName.endsWith('.pdf')) {
      const parser = new PDFParse({ data: document.buffer });
      try {
        const parsed = await parser.getText();
        return parsed.text || '';
      } finally {
        await parser.destroy();
      }
    }

    if (lowerName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: document.buffer });
      return result.value || '';
    }

    if (lowerName.endsWith('.doc')) {
      return '';
    }

    return document.buffer.toString('utf8');
  }

  private extractFullName(text: string): string {
    const lines = text
      .split(/\n|\r/)
      .map((line) => line.trim())
      .filter(Boolean);
    return lines[0] ?? 'Unknown';
  }

  private extractEmail(text: string): string {
    const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match?.[0] ?? '';
  }

  private extractPhone(text: string): string {
    const match = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/);
    return match?.[0] ?? '';
  }

  private extractLocation(text: string): string {
    const match = text.match(/([A-Z][a-z]+(?:,\s*[A-Z][a-z]+)?)/);
    return match?.[0] ?? '';
  }

  private extractExperience(text: string): Array<Record<string, unknown>> {
    const matches = [...text.matchAll(/(\d+)\s+years?/gi)];

    return matches.length
      ? matches.slice(0, 3).map((match, index) => ({
          role: `Experience ${index + 1}`,
          years: Number(match[1]),
        }))
      : [];
  }

  private extractEducation(text: string): Array<Record<string, unknown>> {
    const educationKeywords = ['bachelor', 'master', 'degree', 'university', 'college', 'diploma'];
    const matches = educationKeywords.filter((keyword) => text.toLowerCase().includes(keyword));

    return matches.length
      ? matches.map((keyword) => ({
          degree: keyword,
          source: 'rule-based-parser',
        }))
      : [];
  }

  private extractSkills(text: string): string[] {
    const skillKeywords = [
      'typescript',
      'node',
      'javascript',
      'react',
      'aws',
      'docker',
      'sql',
      'postgres',
      'python',
      'java',
      'agile',
    ];
    return skillKeywords.filter((skill) => text.toLowerCase().includes(skill));
  }

  private extractCertifications(text: string): Array<Record<string, unknown>> {
    const certKeywords = ['certified', 'certificate', 'aws', 'scrum', 'azure'];
    return certKeywords
      .filter((keyword) => text.toLowerCase().includes(keyword))
      .map((keyword) => ({
        name: keyword,
        source: 'rule-based-parser',
      }));
  }
}
