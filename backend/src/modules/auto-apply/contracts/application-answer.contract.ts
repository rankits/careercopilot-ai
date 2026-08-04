import { ApplicationAnswerDto } from '@/modules/auto-apply/types/application-answer.types.js';

export interface CreateApplicationAnswerData {
  userId: string;
  questionKey: string;
  answer: string;
  sensitive: boolean;
  autoSubmitAllowed: boolean;
}

export interface UpdateApplicationAnswerData {
  answer?: string;
  autoSubmitAllowed?: boolean;
  sensitive?: boolean;
}

export interface IApplicationAnswerRepository {
  findManyByUserId(userId: string): Promise<ApplicationAnswerDto[]>;
  findByUserIdAndKey(userId: string, questionKey: string): Promise<ApplicationAnswerDto | null>;
  findById(userId: string, id: string): Promise<ApplicationAnswerDto | null>;
  create(data: CreateApplicationAnswerData): Promise<ApplicationAnswerDto>;
  update(
    userId: string,
    id: string,
    data: UpdateApplicationAnswerData,
  ): Promise<ApplicationAnswerDto>;
  delete(userId: string, id: string): Promise<boolean>;
}
