import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type {
  StructuredAiExtractionRequest,
  StructuredAiModel,
} from '@/modules/resumes/ai/ai-model.contract.js';

const extractJsonPayload = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((part) => (typeof part === 'string' ? part : ''))
      .join('')
      .trim();
  }

  return '';
};

export class GeminiStructuredAiModel implements StructuredAiModel {
  constructor(
    private readonly config: {
      apiKey: string;
      model: string;
      temperature: number;
      maxRetries: number;
    },
  ) {}

  async extract<T>(request: StructuredAiExtractionRequest<T>): Promise<T> {
    const model = new ChatGoogleGenerativeAI({
      apiKey: this.config.apiKey,
      model: this.config.model,
      temperature: this.config.temperature,
      maxRetries: this.config.maxRetries,
    });

    const response = await model.invoke([
      {
        role: 'system',
        content: request.systemPrompt,
      },
      {
        role: 'user',
        content: `
Extract the resume information from the content below.

<resume_content>
${request.documentText}
</resume_content>
Return only a valid JSON object that matches the requested schema.
        `.trim(),
      },
    ]);

    const rawText = extractJsonPayload((response as { content?: unknown }).content ?? response);
    const jsonText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error('Gemini did not return valid JSON for the resume parser');
    }

    return request.schema.parse(parsed);
  }
}
