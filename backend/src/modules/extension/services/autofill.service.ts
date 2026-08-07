import { AppError } from '@/shared/utils/errors/AppError.js';
import { prisma } from '@/shared/config/db.conf.js';

export interface FieldInfo {
  identifier: string;
  tagName: string;
  type: string;
  name?: string;
  label: string;
}

export class AutofillService {
  async generateAnswers(userId: string, url: string, fields: FieldInfo[]): Promise<Record<string, string>> {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;
    const apiKey = openRouterKey || openAiKey;
    
    if (!apiKey) {
      throw new AppError('AI API key not configured (set OPENROUTER_API_KEY or OPENAI_API_KEY)', 500, 'AI_UNAVAILABLE');
    }

    // 1. Fetch user profile
    const profile = await prisma.candidateApplicationProfile.findUnique({
      where: { userId },
    });
    
    const activeResume = await prisma.approvedResumeVersion.findFirst({
      where: { userId, isActive: true }
    });

    let resumeText = "No resume available";
    if (activeResume?.resumeId) {
      const extraction = await prisma.resumeExtraction.findFirst({
        where: { resumeId: activeResume.resumeId },
        orderBy: { createdAt: 'desc' }
      });
      if (extraction?.extractedText) {
        resumeText = extraction.extractedText;
      }
    }
    const profileText = profile ? JSON.stringify(profile.preferences) + " " + JSON.stringify(profile.links) : "No profile available";

    // 3. Construct prompt
    const systemPrompt = `You are a job application assistant. Your task is to auto-fill a job application form for the user based on their resume and profile.
User Profile: ${profileText}
User Resume: ${resumeText}

You will receive a list of form fields extracted from the page.
Respond ONLY with a JSON object mapping the field "identifier" to the corresponding string value that should be typed into the field.
If you see a file upload field (type="file") that asks for a Resume or CV, output the literal string "__RESUME__" for that field's identifier.
If you need to write a summary, cover letter, or answer a question, always write in the FIRST PERSON (e.g., "I am...", "My experience...") as if the candidate themselves is directly filling out the form. Do NOT refer to the candidate in the third person.
If you don't know the answer or the field shouldn't be filled by you (e.g. passwords, terms checkboxes), omit it from the JSON.
Do NOT wrap the JSON in markdown blocks like \`\`\`json. Return only the raw JSON.`;

    const userMessage = `Form URL: ${url}
Fields:
${JSON.stringify(fields, null, 2)}`;

    const apiUrl = openRouterKey 
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    // 4. Call AI API
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: openRouterKey ? 'openai/gpt-4o-mini' : 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const providerName = openRouterKey ? 'OpenRouter' : 'OpenAI';
        console.error(`[AutofillService] ${providerName} API Error: ${response.status} - ${errorText}`);
        
        if (response.status === 402) {
          throw new AppError('AI provider has insufficient credits to complete this request.', 502, 'AI_ERROR');
        }
        if (response.status === 401 || response.status === 403) {
          throw new AppError('AI provider configuration is invalid or unauthorized.', 502, 'AI_ERROR');
        }
        
        throw new AppError('The AI provider is currently unavailable. Please try again later.', 502, 'AI_ERROR');
      }

      const data = await response.json() as any;
      const content = data.choices[0].message.content.trim();
      
      // Parse the content, stripping markdown code blocks if the AI disobeyed
      const jsonContent = content.replace(/^```json/i, '').replace(/```$/, '').trim();
      
      const answers = JSON.parse(jsonContent);
      return answers;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate answers from AI', 500, 'AI_ERROR');
    }
  }
}

export const autofillService = new AutofillService();
