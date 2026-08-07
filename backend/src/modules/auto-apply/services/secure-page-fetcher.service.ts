import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import { AppError } from '@/shared/utils/errors/AppError.js';
import type {
  ISecurePageFetcher,
  SecurePageFetchResult,
} from '@/modules/auto-apply/contracts/application-page-analysis.contract.js';
import { stripHtmlToText } from '@/modules/auto-apply/services/page-text-sanitize.util.js';

const MAX_REDIRECTS = 5;
const MAX_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 12_000;
const ALLOWED_CONTENT_TYPES = [
  'text/html',
  'application/xhtml+xml',
  'text/plain',
  'application/json',
];

export function isPrivateOrBlockedIp(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, '');

  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
  if (
    normalized.startsWith('fe80:') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd')
  ) {
    return true;
  }
  if (normalized.startsWith('::ffff:')) {
    return isPrivateOrBlockedIp(normalized.slice('::ffff:'.length));
  }

  if (isIP(normalized) !== 4) {
    return normalized === '::' || normalized.startsWith('2001:db8:');
  }

  const parts = normalized.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  const [a, b] = parts as [number, number, number, number];

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

export async function assertHostResolvesPublic(hostname: string): Promise<void> {
  const host = hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal'
  ) {
    throw new AppError('URL host is not allowed', 400, 'ANALYSIS_URL_BLOCKED');
  }

  if (isIP(host)) {
    if (isPrivateOrBlockedIp(host)) {
      throw new AppError('URL resolves to a blocked address', 400, 'ANALYSIS_URL_BLOCKED');
    }
    return;
  }

  let records: { address: string; family: number }[];
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new AppError('Unable to resolve job page host', 400, 'ANALYSIS_URL_UNRESOLVABLE');
  }

  if (!records.length || records.some((record) => isPrivateOrBlockedIp(record.address))) {
    throw new AppError('URL resolves to a blocked address', 400, 'ANALYSIS_URL_BLOCKED');
  }
}

export function assertSafeHttpUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new AppError('Invalid job page URL', 400, 'ANALYSIS_URL_INVALID');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new AppError('Only http(s) job page URLs are allowed', 400, 'ANALYSIS_URL_BLOCKED');
  }

  if (parsed.protocol === 'http:' && process.env.ALLOW_INSECURE_ANALYSIS_FETCH !== 'true') {
    throw new AppError('HTTPS is required for job page analysis', 400, 'ANALYSIS_URL_INSECURE');
  }

  if (parsed.username || parsed.password) {
    throw new AppError('Authenticated URLs are not allowed', 400, 'ANALYSIS_URL_BLOCKED');
  }

  return parsed;
}

function contentHashOf(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * Fetches public job pages with SSRF controls.
 * Does not send cookies; treats response body as untrusted data.
 */
export class SecurePublicPageFetcher implements ISecurePageFetcher {
  async fetchPublicPage(url: string): Promise<SecurePageFetchResult> {
    let current = assertSafeHttpUrl(url);
    await assertHostResolvesPublic(current.hostname);

    let redirectCount = 0;

    while (true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(current.toString(), {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
            'User-Agent': 'CareerCopilot-JobAnalyzer/1.0',
          },
        });
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          throw new AppError('Job page fetch timed out', 504, 'ANALYSIS_FETCH_TIMEOUT');
        }
        throw new AppError('Unable to fetch job page', 502, 'ANALYSIS_FETCH_FAILED');
      } finally {
        clearTimeout(timer);
      }

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        redirectCount += 1;
        if (redirectCount > MAX_REDIRECTS) {
          throw new AppError(
            'Too many redirects while fetching job page',
            400,
            'ANALYSIS_URL_BLOCKED',
          );
        }
        const location = response.headers.get('location');
        if (!location) {
          throw new AppError('Redirect without Location header', 502, 'ANALYSIS_FETCH_FAILED');
        }
        current = assertSafeHttpUrl(new URL(location, current).toString());
        await assertHostResolvesPublic(current.hostname);
        continue;
      }

      const contentType = response.headers.get('content-type');
      const mime = contentType?.split(';')[0]?.trim().toLowerCase() ?? '';
      if (mime && !ALLOWED_CONTENT_TYPES.some((allowed) => mime.startsWith(allowed))) {
        throw new AppError('Unsupported job page content type', 415, 'ANALYSIS_CONTENT_TYPE');
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > MAX_BYTES) {
        throw new AppError(
          'Job page response exceeds size limit',
          413,
          'ANALYSIS_RESPONSE_TOO_LARGE',
        );
      }

      const raw = buffer.toString('utf8');
      const sanitizedText = stripHtmlToText(raw);
      const fetchedAt = new Date();

      return {
        finalUrl: current.toString(),
        httpStatus: response.status,
        contentType: mime || null,
        sanitizedText,
        contentHash: contentHashOf(sanitizedText),
        fetchedAt,
        redirectCount,
      };
    }
  }
}

export const __testables = {
  isPrivateOrBlockedIp,
  assertSafeHttpUrl,
  stripHtmlToText,
  contentHashOf,
};
