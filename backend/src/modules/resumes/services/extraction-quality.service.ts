export interface ExtractionQualityResult {
  score: number;
  requiresReview: boolean;
  warnings: string[];
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/;

export const extractionQualityService = {
  analyze(extractedText: string): ExtractionQualityResult {
    const trimmed = extractedText.trim();
    const lines = trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const warnings: string[] = [];
    let score = 1;

    if (trimmed.length < 200) {
      score -= 0.35;
      warnings.push("Extracted text is very short.");
    }

    if (lines.length < 8) {
      score -= 0.2;
      warnings.push("Extracted text has very few non-empty lines.");
    }

    if (!EMAIL_PATTERN.test(trimmed)) {
      score -= 0.2;
      warnings.push("No email address detected in extracted text.");
    }

    if (!PHONE_PATTERN.test(trimmed)) {
      score -= 0.1;
      warnings.push("No phone number detected in extracted text.");
    }

    if (/(page \d+ of \d+|confidential|resume|curriculum vitae)/i.test(trimmed)) {
      warnings.push("Document may contain boilerplate or repeated headers.");
    }

    const normalizedScore = Math.max(0, Math.min(1, Number(score.toFixed(2))));

    return {
      score: normalizedScore,
      requiresReview: normalizedScore < 0.55 || warnings.length >= 3,
      warnings,
    };
  },
};

