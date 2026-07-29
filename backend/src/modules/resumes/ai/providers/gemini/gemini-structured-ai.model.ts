import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { ZodType } from "zod";
import type { StructuredAiExtractionRequest, StructuredAiModel } from "@/modules/resumes/ai/ai-model.contract.js";

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

    const structuredModel = model.withStructuredOutput(request.schema as ZodType<T>);

    const response = await structuredModel.invoke([
      {
        role: "system",
        content: request.systemPrompt,
      },
      {
        role: "user",
        content: `
Extract the resume information from the content below.

<resume_content>
${request.documentText}
</resume_content>
        `.trim(),
      },
    ]);

    return request.schema.parse(response);
  }
}

