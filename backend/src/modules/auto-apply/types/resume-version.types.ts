export interface ApprovedResumeVersionDto {
  id: string;
  userId: string;
  resumeId: string;
  label: string;
  category: string;
  tags: string[];
  /** Optional pin to Resume Builder ResumeVersion.id */
  builderResumeVersionId?: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
