/** Pull a human-readable message from API/axios failures. */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!error) return fallback;

  if (typeof error === 'string' && error.trim()) return error.trim();

  if (error instanceof Error) {
    const axiosLike = error as Error & {
      response?: { data?: { message?: string; errors?: Array<{ message?: string }> } };
      message?: string;
    };
    const apiMessage = axiosLike.response?.data?.message?.trim();
    if (apiMessage) return apiMessage;

    const firstField = axiosLike.response?.data?.errors?.[0]?.message?.trim();
    if (firstField) return firstField;

    if (axiosLike.message && axiosLike.message !== 'HTTP request failed') {
      return axiosLike.message;
    }
  }

  return fallback;
}

export function getAnalysisFailureMessage(analysis: {
  failureReason?: string | null;
  weaknesses?: string[] | null;
}): string {
  const fromField = analysis.failureReason?.trim();
  if (fromField) return fromField.replace(/^Analysis failed:\s*/i, '');

  const fromWeakness = analysis.weaknesses?.find((item) =>
    /analysis failed|api|key|credit|unauthorized|expired|provider/i.test(item),
  );
  if (fromWeakness) return fromWeakness.replace(/^Analysis failed:\s*/i, '');

  return 'Analysis failed. Please try again.';
}
