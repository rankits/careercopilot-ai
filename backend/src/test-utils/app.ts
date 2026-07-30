import { fakeDb } from "@/test-utils/prisma-mock.js";
import "@/test-utils/messaging-mock.js";
import "@/test-utils/pdf-parse-mock.js";
import app from "@/app.js";

export default app;
export { fakeDb };
