import express from "express";
import { successResponse } from "./shared/utils/response.js";
import { authRoutes } from "./modules/auth/index.js";

const router = express.Router();

router.get("/status", (_req, res) => {
  res.status(200).json(successResponse("API v1 is operational"));
});

// Sample API Flow: Mount /auth routes
router.use("/auth", authRoutes);

export default router;
