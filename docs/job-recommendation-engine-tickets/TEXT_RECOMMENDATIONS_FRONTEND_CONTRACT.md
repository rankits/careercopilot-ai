# Text Recommendations Frontend Contract

Ticket: `JRE-FE-004`

## Entry Point

- The Text/Career tab is available at `/for-you?mode=text-career`.
- The tab renders a labeled multiline `Target role text` field.
- Empty text does not generate.
- Client-side validation blocks text longer than 20,000 trimmed characters to match the API limit.

## Generation

- `recommendationsService.generateFromText(targetText)` calls
  `POST /job-recommendations/from-text` with `{ targetText }`.
- Generation is explicit; opening the tab does not start extraction or matching.
- Double submit is blocked while generation is pending.

## Results

- Results render from the generate response.
- Cards reuse the shared recommendation card mapper and display backend `displayScore`.
- Text result cards support open, apply, save, dismiss, and not-relevant actions.
- No pasted text is logged or sent to client-side error reporting by this UI.
