import type { NavigateFunction } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';

/**
 * AA-062: only allow internal Assisted Apply workspace return paths (open-redirect safe).
 */
export function isSafeAssistedApplyReturnTo(value: string | null | undefined): boolean {
  if (!value) return false;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return false;
  }
  if (!decoded.startsWith('/')) return false;
  if (decoded.startsWith('//')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return false;
  // Must be assisted-apply workspace (with optional query)
  const pathOnly = decoded.split('?')[0] ?? decoded;
  return /^\/assisted-apply\/[0-9a-fA-F-]{36}$/.test(pathOnly);
}

export function buildImproveResumeHref(input: {
  resumeId: string;
  jobApplicationId: string;
}): string {
  const returnTo = `${ROUTES.ASSISTED_APPLY_WORKSPACE.replace(
    ':jobApplicationId',
    input.jobApplicationId,
  )}?step=resume&resumeReturned=saved`;
  const params = new URLSearchParams({
    source: 'assisted-apply',
    jobApplicationId: input.jobApplicationId,
    returnTo,
  });
  return `${ROUTES.RESUME_BUILDER}/${input.resumeId}?${params.toString()}`;
}

export function resolveSafeReturnTo(
  raw: string | null | undefined,
  fallback: string,
): string {
  return isSafeAssistedApplyReturnTo(raw) ? decodeURIComponent(raw!) : fallback;
}

/** Returns true when navigation to a safe assisted-apply return path occurred. */
export function navigateAfterAssistedApplyExit(
  navigate: NavigateFunction,
  rawReturnTo: string | null | undefined,
  saved: boolean,
): boolean {
  if (!isSafeAssistedApplyReturnTo(rawReturnTo)) return false;
  let target = decodeURIComponent(rawReturnTo!);
  if (saved) {
    const url = new URL(target, window.location.origin);
    url.searchParams.set('resumeReturned', 'saved');
    target = `${url.pathname}${url.search}`;
  }
  void navigate(target);
  return true;
}

/** Extract jobApplicationId from a safe Assisted Apply returnTo path. */
export function extractJobApplicationIdFromReturnTo(
  raw: string | null | undefined,
): string | null {
  if (!isSafeAssistedApplyReturnTo(raw)) return null;
  let decoded = raw!;
  try {
    decoded = decodeURIComponent(raw!);
  } catch {
    return null;
  }
  const pathOnly = decoded.split('?')[0] ?? decoded;
  const match = pathOnly.match(/^\/assisted-apply\/([0-9a-fA-F-]{36})$/);
  return match?.[1] ?? null;
}
