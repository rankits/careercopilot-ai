#!/usr/bin/env node
/**
 * API-level happy path smoke for recommendations (JR-QA-004).
 * Requires backend running at BASE_URL with a valid USER access token.
 *
 * Usage:
 *   REC_E2E_TOKEN=<jwt> node scripts/recommendations-smoke.mjs
 */
const baseUrl = process.env.REC_E2E_BASE_URL ?? 'http://127.0.0.1:3000/api/v1';
const token = process.env.REC_E2E_TOKEN;

if (!token) {
  console.error('Set REC_E2E_TOKEN to a USER access token');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

const assertOk = async (label, response) => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(`${label} failed`, response.status, body);
    process.exit(1);
  }
  console.log(`${label}: ok`);
  return body;
};

const statusRes = await fetch(`${baseUrl}/job-recommendations/status`, { headers });
const statusBody = await assertOk('GET /job-recommendations/status', statusRes);

if (!statusBody?.data?.canGenerateFromProfile) {
  console.log('Profile not ready for generate — skipping POST generate step');
  process.exit(0);
}

const listRes = await fetch(`${baseUrl}/job-recommendations?page=1&limit=5`, { headers });
await assertOk('GET /job-recommendations', listRes);

const generateRes = await fetch(`${baseUrl}/job-recommendations`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ sourceType: 'PROFILE' }),
});
const generateBody = await assertOk('POST /job-recommendations', generateRes);

const first = Array.isArray(generateBody?.data) ? generateBody.data[0] : null;
if (first?.id) {
  const feedbackRes = await fetch(`${baseUrl}/job-recommendations/${first.id}/feedback`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'DISMISSED' }),
  });
  await assertOk('POST /job-recommendations/:id/feedback', feedbackRes);
}

console.log('Recommendations smoke path complete');
