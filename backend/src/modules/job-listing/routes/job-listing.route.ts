import express from "express";
import { validateResource } from "@/shared/middlewares/validateResource.js";
import { jobSearchQuerySchema, jobIdParamsSchema } from "../validations/job-listing.schema.js";
import { searchJobsController, getJobByIdController } from "../controllers/job-listing.controller.js";

const router = express.Router();

// TODO: Add authentication middleware later if required

router.get("/", validateResource(jobSearchQuerySchema), searchJobsController);
router.get("/:jobId", validateResource(jobIdParamsSchema), getJobByIdController);

export default router;
