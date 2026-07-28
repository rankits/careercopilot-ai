import express from "express";
import { jobsHealthController, triggerJobsController } from "../controllers/jobs.controller.js";
import { validateResource } from "../../../shared/middlewares/validateResource.js";
import { triggerJobsSchema } from "../validations/jobs.schema.js";

const router = express.Router();

router.get("/health", jobsHealthController);
router.post("/trigger", validateResource(triggerJobsSchema), triggerJobsController);

export default router;

