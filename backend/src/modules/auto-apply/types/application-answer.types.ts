export interface ApplicationAnswerDto {
  id: string;
  userId: string;
  questionKey: string;
  answer: string;
  source: 'USER_VERIFIED';
  sensitive: boolean;
  autoSubmitAllowed: boolean;
  lastVerifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
