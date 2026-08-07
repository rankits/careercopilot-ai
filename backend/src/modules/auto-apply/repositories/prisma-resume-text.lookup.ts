import { prisma } from '@/shared/config/db.conf.js';

export interface IResumeTextLookup {
  findResumeTextForUser(userId: string, resumeId: string): Promise<string | null>;
}

/**
 * Loads the best available plain-text resume body for grounded generation.
 * Prefers extraction text, then latest analysis edited content.
 */
export class PrismaResumeTextLookup implements IResumeTextLookup {
  async findResumeTextForUser(userId: string, resumeId: string): Promise<string | null> {
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
      select: { id: true },
    });
    if (!resume) return null;

    const extraction = await prisma.resumeExtraction.findFirst({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
      select: { extractedText: true },
    });
    if (extraction?.extractedText?.trim()) {
      return extraction.extractedText.trim();
    }

    const analysis = await prisma.resumeAnalysis.findFirst({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
      select: { editedContent: true },
    });
    return analysis?.editedContent?.trim() || null;
  }
}
