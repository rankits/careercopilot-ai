const DEFAULT_GENERATE_TIMEOUT_MS = 55_000;

export const withRecommendationTimeout = async <T>(
  operation: () => Promise<T>,
  timeoutMs = DEFAULT_GENERATE_TIMEOUT_MS,
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('RECOMMENDATION_GENERATION_TIMEOUT'));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};
