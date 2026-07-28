import express from "express";
import { successResponse } from "./shared/utils/response.js";

const router = express.Router();

router.get("/status", (_req, res) => {
  res.status(200).json(successResponse("API v1 is operational"));
});

// Module routes will be mounted here (e.g., authRoutes)

export default router;
