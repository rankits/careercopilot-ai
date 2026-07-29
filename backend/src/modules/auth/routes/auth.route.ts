import express from "express";
import { signinController } from "@/modules/auth/controllers/auth.controller.js";
import { validateResource } from "@/shared/middlewares/validateResource.js";
import { signinSchema } from "@/modules/auth/validations/auth.schema.js";

const router = express.Router();

// Sample API Flow: POST /api/v1/auth/signin
router.post("/signin", validateResource(signinSchema), signinController);

export default router;
