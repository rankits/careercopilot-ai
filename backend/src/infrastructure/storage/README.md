# File storage

Centralized store/retrieve/delete abstraction (`FileStorage`, via `createFileStorage()`), backed by either the
local filesystem (`LOCAL`, the dev default) or S3 (`S3`). Config is passed in explicitly by the caller — this
module never reads `process.env` itself, so any module can reuse it with its own env vars. `modules/resumes` is
the first consumer; see `modules/resumes/storage/resume-storage.factory.ts` for how it wires its own
`RESUME_*`/`AWS_REGION` env vars into this factory.

Downloads are server-proxied (the app fetches the object and streams it to the client) rather than presigned
URLs — the bucket stays fully private with no public access or CORS configuration needed.

## Creating the S3 bucket (manual — do this once per environment)

1. **Create the bucket** in the AWS Console (or `aws s3api create-bucket`), same region you'll set `AWS_REGION` to.
2. **Block all public access** — leave every "Block Public Access" setting ON. Nothing needs to be public; the
   app is the only thing that ever reads or writes to it.
3. **Default encryption**: enable SSE-S3 (`AES256`) at the bucket level. The app also sets
   `ServerSideEncryption: 'AES256'` on every upload explicitly, so this is defense-in-depth, not load-bearing.
4. **Versioning**: optional, not required by the app.
5. **CORS**: not needed — the browser never talks to S3 directly.

## IAM policy (least privilege)

Attach this to whatever IAM user/role the app authenticates as (env vars, or an instance/task role if deployed
on EC2/ECS — the AWS SDK's default credential chain picks either up automatically):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::<your-bucket-name>/*"
    }
  ]
}
```

## `.env` values

```
RESUME_STORAGE_DRIVER=S3
RESUME_S3_BUCKET=<your-bucket-name>
RESUME_S3_PREFIX=users
AWS_REGION=<same region as the bucket>
```

If authenticating via static credentials rather than an instance/task role, also set the standard AWS SDK
variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) — not app-specific, so they aren't declared in
`resume.config.ts`; the SDK reads them directly.

Switching `RESUME_STORAGE_DRIVER` back to `LOCAL` at any time falls back to disk storage
(`RESUME_LOCAL_STORAGE_DIR`) with no other code changes.
