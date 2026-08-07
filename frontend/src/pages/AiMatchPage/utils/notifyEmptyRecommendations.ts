import type { ToastOptions } from '@/components/organisms/Toast/ToastContext';

type ShowToast = (options: ToastOptions) => void;

type RecommendationRunResult = {
  items?: readonly unknown[];
  total?: number;
};

export function notifyEmptyRecommendations(showToast: ShowToast, message: string): void {
  showToast({ severity: 'info', message });
}

export function hasNoRecommendationResults(
  result: readonly unknown[] | RecommendationRunResult,
): boolean {
  if (Array.isArray(result)) return result.length === 0;

  const runResult = result as RecommendationRunResult;
  if (typeof runResult.total === 'number') return runResult.total === 0;
  return (runResult.items?.length ?? 0) === 0;
}
