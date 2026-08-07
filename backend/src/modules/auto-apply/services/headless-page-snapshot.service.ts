import { createHash } from 'node:crypto';

import { env } from '@/shared/config/env.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { logger } from '@/shared/logger/logger.js';
import type {
  HeadlessPageSnapshotResult,
  IHeadlessPageSnapshot,
} from '@/modules/auto-apply/contracts/application-page-analysis.contract.js';
import {
  assertHostResolvesPublic,
  assertSafeHttpUrl,
} from '@/modules/auto-apply/services/secure-page-fetcher.service.js';
import { stripHtmlToText } from '@/modules/auto-apply/services/page-text-sanitize.util.js';
import { recordHeadlessSnapshot } from '@/modules/auto-apply/observability/analysis.metrics.js';
import type { ApplicationProvider } from '@/modules/auto-apply/types/application-page-analysis.types.js';

const NAV_TIMEOUT_MS = 20_000;
/** Prefer headless when HTTP text is shorter than this (SPA shells). */
export const HEADLESS_THIN_TEXT_THRESHOLD = 200;

const JS_HEAVY_PROVIDERS = new Set<ApplicationProvider | string>([
  'ASHBY',
  'GREENHOUSE',
  'LEVER',
  'WORKDAY',
]);

export function shouldAttemptHeadlessSnapshot(input: {
  enabled: boolean;
  applyUrl?: string | null;
  provider: string;
  httpSanitizedLength: number;
}): boolean {
  if (!input.enabled || !input.applyUrl) return false;
  if (JS_HEAVY_PROVIDERS.has(input.provider)) return true;
  return input.httpSanitizedLength < HEADLESS_THIN_TEXT_THRESHOLD;
}

function contentHashOf(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function resolveChromiumExecutable(): string | undefined {
  return (
    env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim() ||
    process.env.CHROMIUM_PATH?.trim() ||
    undefined
  );
}

/** No browser available / feature off — analyzer continues with HTTP/JD text. */
export class NoopHeadlessPageSnapshot implements IHeadlessPageSnapshot {
  readonly enabled = false;

  async snapshot(_url: string): Promise<HeadlessPageSnapshotResult | null> {
    return null;
  }
}

/**
 * Controlled Chromium snapshot for JS-rendered job pages.
 * Reuses SSRF URL/DNS checks; no cookies; model never drives navigation.
 */
export class PlaywrightHeadlessPageSnapshot implements IHeadlessPageSnapshot {
  readonly enabled = true;

  async snapshot(url: string): Promise<HeadlessPageSnapshotResult | null> {
    const started = Date.now();
    const startUrl = assertSafeHttpUrl(url);
    await assertHostResolvesPublic(startUrl.hostname);

    let playwright: typeof import('playwright-core');
    try {
      playwright = await import('playwright-core');
    } catch {
      recordHeadlessSnapshot({
        success: false,
        durationMs: Date.now() - started,
        failureCode: 'PLAYWRIGHT_MISSING',
      });
      logger.warn(
        { metric: 'auto_apply.analysis.headless_unavailable' },
        'playwright-core not installed',
      );
      return null;
    }

    const executablePath = resolveChromiumExecutable();
    let browser: Awaited<ReturnType<typeof playwright.chromium.launch>> | null = null;

    try {
      browser = await playwright.chromium.launch({
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-networking',
        ],
      });

      const context = await browser.newContext({
        javaScriptEnabled: true,
        acceptDownloads: false,
        bypassCSP: false,
        userAgent: 'CareerCopilot-JobAnalyzer-Headless/1.0',
        locale: 'en-US',
      });
      await context.clearCookies();

      const page = await context.newPage();
      page.setDefaultTimeout(NAV_TIMEOUT_MS);
      page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);

      const response = await page.goto(startUrl.toString(), {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT_MS,
      });

      // Short settle for SPA content without networkidle (can hang on analytics).
      await new Promise((resolve) => setTimeout(resolve, 1_500));

      const finalUrl = page.url();
      const finalParsed = assertSafeHttpUrl(finalUrl);
      await assertHostResolvesPublic(finalParsed.hostname);

      const html = await page.content();
      if (Buffer.byteLength(html, 'utf8') > 1_500_000) {
        throw new AppError('Headless page exceeds size limit', 413, 'ANALYSIS_RESPONSE_TOO_LARGE');
      }

      const sanitizedText = stripHtmlToText(html);
      const result: HeadlessPageSnapshotResult = {
        finalUrl,
        httpStatus: response?.status() ?? 0,
        contentType: 'text/html',
        sanitizedText,
        contentHash: contentHashOf(sanitizedText),
        fetchedAt: new Date(),
        redirectCount: 0,
        renderMethod: 'HEADLESS_CHROMIUM',
      };

      recordHeadlessSnapshot({
        success: true,
        durationMs: Date.now() - started,
        textLength: sanitizedText.length,
      });

      await context.close();
      return result;
    } catch (error) {
      recordHeadlessSnapshot({
        success: false,
        durationMs: Date.now() - started,
        failureCode: error instanceof AppError ? String(error.code) : 'HEADLESS_FAILED',
      });
      logger.warn(
        {
          err: error instanceof Error ? error.message : String(error),
          metric: 'auto_apply.analysis.headless_failed',
        },
        'Headless job page snapshot failed; continuing with HTTP/JD text',
      );
      return null;
    } finally {
      if (browser) {
        await browser.close().catch(() => undefined);
      }
    }
  }
}

export function createHeadlessPageSnapshot(): IHeadlessPageSnapshot {
  if (!env.ENABLE_AUTO_APPLY_HEADLESS_SNAPSHOT) return new NoopHeadlessPageSnapshot();
  return new PlaywrightHeadlessPageSnapshot();
}
