# Resume Module Architecture

## High-Level Diagram

```text
Client
  |
  | POST /api/v1/resumes/upload
  v
Resume Upload API
  |
  | validate type/size, generate resumeId
  v
ResumeStorage interface
  |-------------------|
  v                   v
Local storage      Amazon S3
  |
  v
Resume metadata in Postgres
  |
  v
Async processing task
  |
  v
TextExtractionService -> ResumeParser interface -> FieldMappingService
  |
  v
ResumeExtraction + CandidateProfile
```

## Backend Service Design

- `controllers/resume.controller.ts`: HTTP upload, status, parsed-data, and confirmation handlers.
- `services/resume.service.ts`: upload orchestration, metadata creation, public user fallback.
- `storage/*`: storage abstraction with `LOCAL` and `S3` implementations selected by `RESUME_STORAGE_DRIVER`.
- `services/resume-processing.service.ts`: background processing boundary. This should move to RabbitMQ workers as scale grows.
- `parsers/*`: AI-ready parser contract. Current engine is `RuleBasedResumeParser`.
- `mappers/resume-field.mapper.ts`: normalizes parsed output into onboarding profile payloads.

## Database Schema

- `Resume`: file metadata, storage key, storage driver, status, timestamps, failure reason.
- `ResumeExtraction`: extracted text, structured parsed JSON, parser version, optional confidence score.
- `CandidateProfile`: normalized onboarding profile fields and confirmation timestamp.

## S3 Storage Design

```text
users/
  {userId}/
    resumes/
      {resumeId}.pdf
```

- Bucket access should be private only.
- Application writes use IAM-scoped credentials with `s3:PutObject` limited to the resume prefix.
- Objects are uploaded with server-side encryption (`AES256`) in the current adapter.
- Future direct browser uploads should use short-lived pre-signed URLs and a follow-up completion API.
- Lifecycle policies can transition old resumes to infrequent access and expire unconfirmed resumes after the product retention window.

## API Contracts

### `POST /api/v1/resumes/upload`

Multipart form-data:

- `resume`: PDF, DOC, or DOCX file.
- `userId`: optional for the current public MVP. Later this should come from the auth token.

Response:

```json
{
  "status": "success",
  "message": "Resume uploaded successfully",
  "data": {
    "id": "uuid",
    "status": "UPLOADED",
    "fileName": "uuid.pdf",
    "storageDriver": "LOCAL",
    "uploadedAt": "timestamp"
  }
}
```

### `GET /api/v1/resumes/{resumeId}/status`

Returns `UPLOADED`, `PROCESSING`, `PROCESSED`, or `FAILED`.

### `GET /api/v1/resumes/{resumeId}/parsed-data`

Returns the latest extraction, parser version, confidence score, and structured resume data.

### `POST /api/v1/profiles/{userId}/confirm`

Body:

```json
{
  "resumeId": "uuid"
}
```

Confirms the latest extracted data into `CandidateProfile`.

## Processing Workflow

```text
User upload
  -> Resume Upload API
  -> Store file locally or in S3
  -> Insert Resume metadata
  -> Start processing task
  -> Extract text with PDF/DOC/DOCX tooling
  -> Parse through ResumeParser interface
  -> Map into onboarding schema
  -> Save ResumeExtraction
  -> Upsert CandidateProfile
  -> Mark Resume PROCESSED or FAILED
```

## Error Handling

- Unsupported extension or MIME type returns `400`.
- Missing file returns `400`.
- Missing resume or extraction returns `404`.
- Processing failures are recorded on `Resume.failureReason` and status becomes `FAILED`.
- Scalable version should add retry count, dead-letter queue, and replay APIs.

## Security Considerations

- Keep S3 buckets private; do not expose public object URLs.
- Prefer pre-signed upload URLs once the frontend can upload directly.
- Add malware scanning before processing or profile mapping.
- Enforce authenticated `userId` from JWT when auth is available.
- Store only required extracted data and define retention rules for raw resumes.
- Add audit events for upload, parse, confirm, reprocess, and delete actions.

## AI Integration Roadmap

- Keep `ResumeParser.parseResume(document, extractedText)` as the stable contract.
- Add `AIResumeParser` implementing the same interface.
- Switch by config: `PARSER_ENGINE=RULE_BASED` or `PARSER_ENGINE=AI`.
- Store parser versions per extraction for auditability and reprocessing.
- Extend output with confidence scoring, semantic field provenance, and resume suggestions without changing upload/storage.

## Development Phases

1. MVP: local/S3 toggle, metadata, basic extraction, rule-based parsing, public user fallback.
2. Scalable version: pre-signed uploads, queue workers, retry/dead-letter handling, malware scanning, object retention policies.
3. AI enhancement: AI parser adapter, confidence/provenance, extraction review UI, profile enrichment, resume improvement suggestions.
