import dotenv from "dotenv";
import { appLogger } from "./shared/utils/logger.js";
import app from "@/app.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 5001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.listen(PORT, "0.0.0.0", () => {
  appLogger.info({ port: PORT, baseUrl: BASE_URL }, "Server started");
});
