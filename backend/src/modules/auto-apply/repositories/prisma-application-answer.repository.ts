import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import {
  CreateApplicationAnswerData,
  IApplicationAnswerRepository,
  UpdateApplicationAnswerData,
} from '@/modules/auto-apply/contracts/application-answer.contract.js';
import { ApplicationAnswerDto } from '@/modules/auto-apply/types/application-answer.types.js';

function toDto(record: {
  id: string;
  userId: string;
  questionKey: string;
  answer: string;
  source: string;
  sensitive: boolean;
  autoSubmitAllowed: boolean;
  lastVerifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): ApplicationAnswerDto {
  return {
    id: record.id,
    userId: record.userId,
    questionKey: record.questionKey,
    answer: record.answer,
    source: 'USER_VERIFIED',
    sensitive: record.sensitive,
    autoSubmitAllowed: record.autoSubmitAllowed,
    lastVerifiedAt: record.lastVerifiedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaApplicationAnswerRepository implements IApplicationAnswerRepository {
  async findManyByUserId(userId: string): Promise<ApplicationAnswerDto[]> {
    const records = await prisma.applicationAnswerProfile.findMany({
      where: { userId },
      orderBy: { questionKey: 'asc' },
    });
    return records.map(toDto);
  }

  async findByUserIdAndKey(
    userId: string,
    questionKey: string,
  ): Promise<ApplicationAnswerDto | null> {
    const record = await prisma.applicationAnswerProfile.findUnique({
      where: { userId_questionKey: { userId, questionKey } },
    });
    return record ? toDto(record) : null;
  }

  async findById(userId: string, id: string): Promise<ApplicationAnswerDto | null> {
    const record = await prisma.applicationAnswerProfile.findFirst({ where: { id, userId } });
    return record ? toDto(record) : null;
  }

  async create(data: CreateApplicationAnswerData): Promise<ApplicationAnswerDto> {
    try {
      const record = await prisma.applicationAnswerProfile.create({
        data: {
          userId: data.userId,
          questionKey: data.questionKey,
          answer: data.answer,
          sensitive: data.sensitive,
          autoSubmitAllowed: data.autoSubmitAllowed,
          lastVerifiedAt: new Date(),
        },
      });
      return toDto(record);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new AppError(
          'A verified answer for this question already exists — update it instead.',
          409,
          'ANSWER_EXISTS',
        );
      }
      throw error;
    }
  }

  async update(
    userId: string,
    id: string,
    data: UpdateApplicationAnswerData,
  ): Promise<ApplicationAnswerDto> {
    const existing = await prisma.applicationAnswerProfile.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new AppError('Verified answer not found', 404, 'ANSWER_NOT_FOUND');
    }

    const record = await prisma.applicationAnswerProfile.update({
      where: { id: existing.id },
      data: {
        ...(data.answer !== undefined && { answer: data.answer, lastVerifiedAt: new Date() }),
        ...(data.autoSubmitAllowed !== undefined && { autoSubmitAllowed: data.autoSubmitAllowed }),
        ...(data.sensitive !== undefined && { sensitive: data.sensitive }),
      },
    });
    return toDto(record);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const existing = await prisma.applicationAnswerProfile.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new AppError('Verified answer not found', 404, 'ANSWER_NOT_FOUND');
    }
    await prisma.applicationAnswerProfile.delete({ where: { id: existing.id } });
    return true;
  }
}
