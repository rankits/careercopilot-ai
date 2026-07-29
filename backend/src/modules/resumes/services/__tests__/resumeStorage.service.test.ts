import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { ResumeStorageService } from "@/modules/resumes/services/storage/resumeStorage.service.js";

describe("ResumeStorageService", () => {
  const tempDir = path.join(os.tmpdir(), `resume-test-${Date.now()}`);

  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("stores a buffer to the local filesystem", async () => {
    const storage = new ResumeStorageService({
      driver: "local",
      localBasePath: tempDir,
    });

    const result = await storage.store({
      buffer: Buffer.from("hello resume"),
      originalName: "resume.pdf",
      mimeType: "application/pdf",
      resumeId: "resume-123",
      userId: "public-user",
    });

    expect(result.path).toBeTruthy();
    expect(result.url).toContain("resume-123");

    const saved = await fs.readFile(result.path as string);
    expect(saved.toString()).toBe("hello resume");
  });
});
