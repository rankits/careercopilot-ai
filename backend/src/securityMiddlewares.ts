import express from "express";
import helmet from "helmet";
import cors from "cors";
import hpp from "hpp";

const router = express.Router();

router.use(helmet({ contentSecurityPolicy: false }));

router.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5001",
      "http://localhost:4200",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

router.use(
  express.json({
    limit: "1mb",
  }),
);

router.use(hpp());

router.use(express.urlencoded({ limit: "1mb", extended: true }));

export default router;
