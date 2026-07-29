import { resumeConfig } from "@/modules/resumes/config/resume.config.js";
import { LocalResumeStorage } from "@/modules/resumes/storage/local-resume.storage.js";
import { ResumeStorage } from "@/modules/resumes/storage/resume-storage.interface.js";
import { S3ResumeStorage } from "@/modules/resumes/storage/s3-resume.storage.js";

export const createResumeStorage = (): ResumeStorage => {
  if (resumeConfig.storageDriver === "S3") {
    return new S3ResumeStorage();
  }

  return new LocalResumeStorage();
};
