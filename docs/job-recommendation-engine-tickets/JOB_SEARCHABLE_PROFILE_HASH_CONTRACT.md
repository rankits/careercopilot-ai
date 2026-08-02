# Job Searchable Profile Hash Contract

Ticket: `JRE-DATA-005`

## Searchable Job Profile

The job embedding document is the normalized searchable profile built from:

- company slug and semantic company name
- title
- description text with HTML noise stripped
- remote/work arrangement
- employment type
- skills
- tags

Salary, apply URL, source priority, and provider raw metadata are not embedding material.

## Hash And Versioning

- `createJobEmbeddingContentHash` hashes the normalized searchable profile plus the document schema version.
- Equivalent casing, spacing, HTML noise, and skill/tag ordering produce the same hash.
- Material searchable-profile changes produce a different hash.
- Document schema version changes produce a different hash.
- `Job.version` increments only when embeddable canonical fields change.
- Metadata-only changes do not increment `Job.version` and do not enqueue semantic-content events.

## Re-Embed Behavior

- Inserted jobs enqueue `jobs.semantic-content.changed.v1`.
- Material semantic updates increment `Job.version` and enqueue `jobs.semantic-content.changed.v1`.
- The worker skips only when `jobVersion`, `contentHash`, and dimensions all match the current embedding.
- If the current embedding hash differs for the current job version, the worker re-embeds and upserts the new hash.
- Inactive or removed jobs delete embeddings instead of returning stale vectors.

## Verification

- Job repository tests cover insert, unchanged repeat, metadata-only update, and semantic update event creation.
- Content tests cover stable hashing and material hash changes.
- Worker tests cover already-current skip and current-version hash-change reindexing.
- Backfill tests cover missing/current detection and force reindexing.
