import express from "express";
import cookieParser from "cookie-parser";
import { requestInterceptor } from "./shared/interceptors/request.interceptor.js";

const router = express.Router();

router.use(cookieParser());
router.use(requestInterceptor);

export default router;
