import express from "express";
import {
  confirmProfileController,
  getParsedDataController,
  getResumeStatusController,
  resumeUploadMiddleware,
  uploadResumeController,
} from "@/modules/resumes/controllers/resume.controller.js";
import { validateResource } from "@/shared/middlewares/validateResource.js";
import { confirmProfileSchema, resumeIdParamsSchema } from "@/modules/resumes/validations/resume.schema.js";

const router = express.Router();

router.post("/upload", resumeUploadMiddleware, uploadResumeController);
router.get("/:resumeId/status", validateResource(resumeIdParamsSchema), getResumeStatusController);
router.get("/:resumeId/parsed-data", validateResource(resumeIdParamsSchema), getParsedDataController);
router.post("/profiles/:userId/confirm", validateResource(confirmProfileSchema), confirmProfileController);

export default router;
