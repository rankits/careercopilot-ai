# Resume Recommendations Frontend Contract

Ticket: `JRE-FE-002`

## Source Selection

- The Resume tab is available at `/for-you?mode=resume`.
- The tab uses the authenticated user's candidate profile to discover the owned `sourceResumeId`.
- When a `sourceResumeId` exists, the tab renders a labeled completed-resume selector.
- When no completed resume source exists, the tab links to the Profile page to upload/confirm one.

## Generation

- `recommendationsService.generateFromResume(resumeId)` calls `POST /job-recommendations` with
  `{ sourceType: "RESUME", sourceId: resumeId }`.
- Generation is explicit; opening the Resume tab does not start a recommendation run.
- Backend 404/422 errors are surfaced in the tab without falling back to mock results.

## Results

- Resume results render from the generate response.
- Cards reuse the shared recommendation card mapper and display backend `displayScore`.
- Resume cards support open, apply, save, dismiss, and not-relevant actions through the same handlers
  as Profile recommendations.
