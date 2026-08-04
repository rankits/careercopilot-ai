export interface ApprovedResumeVersionDto {
  id: string;
  userId: string;
  resumeId: string;
  label: string;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
