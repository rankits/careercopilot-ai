import express from "express";
import { successResponse } from "./shared/utils/response.js";
import { authRoutes } from "./modules/auth/index.js";
import { userRoutes } from "./modules/user/index.js";
import { adminRoutes } from "./modules/admin/index.js";
import { resumeRoutes } from "./modules/resume/index.js";
import { resumeAnalysisRoutes } from "./modules/resume-analysis/index.js";
import { jobsRoutes } from "./modules/jobs/index.js";
import { applicationsRoutes } from "./modules/applications/index.js";
import { interviewsRoutes } from "./modules/interviews/index.js";
import { recommendationsRoutes } from "./modules/recommendations/index.js";
import { notificationsRoutes } from "./modules/notifications/index.js";
import { careerRoutes } from "./modules/career/index.js";

const router = express.Router();

router.get("/status", (_req, res) => {
  res.status(200).json(successResponse("API v1 is operational"));
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/admin", adminRoutes);
router.use("/resumes", resumeRoutes);
router.use("/resume-analysis", resumeAnalysisRoutes);
router.use("/jobs", jobsRoutes);
router.use("/applications", applicationsRoutes);
router.use("/interviews", interviewsRoutes);
router.use("/recommendations", recommendationsRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/career", careerRoutes);

export default router;
