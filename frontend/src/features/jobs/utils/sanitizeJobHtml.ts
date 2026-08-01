/**
 * Minimal HTML sanitizer for job descriptions until DOMPurify lands (JOB-SEC-002).
 * Strips scripts, event handlers, and javascript: URLs.
 */
export function sanitizeJobHtml(html: string): string {
  if (!html) return '';

  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"')
    .replace(/<\/?(iframe|object|embed|link|meta)[^>]*>/gi, '');
}
