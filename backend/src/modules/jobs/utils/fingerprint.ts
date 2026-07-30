import crypto from "crypto";

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function generateCanonicalHash(
  companyName: string,
  title: string,
  city?: string,
  isRemote = false
): string {
  const normCompany = normalizeText(companyName);
  const normTitle = normalizeText(title);
  const normCity = city ? normalizeText(city) : "";
  const remoteFlag = isRemote ? "remote" : "onsite";

  const payload = `${normCompany}:${normTitle}:${normCity}:${remoteFlag}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}
