import { useCallback, useEffect, useState } from 'react';

import {
  getCompanyLogoCacheStatus,
  loadCompanyLogo,
  markCompanyLogoFailed,
} from '@/features/jobs/utils/companyLogoCache';

export interface CachedCompanyLogoState {
  /** Remote URL to render once the logo is known-good (browser-cached after first load). */
  src?: string;
  failed: boolean;
  /** Call when the rendered <img> errors so we fall back to the company initial. */
  onLogoError: () => void;
}

function readCachedState(logoUrl?: string): Omit<CachedCompanyLogoState, 'onLogoError'> {
  if (!logoUrl) return { failed: true };
  const status = getCompanyLogoCacheStatus(logoUrl);
  if (status === 'ready') return { src: logoUrl, failed: false };
  if (status === 'error') return { failed: true };
  return { failed: false };
}

/** Loads each company logo URL once per session; later cards reuse the cache. */
export function useCachedCompanyLogo(logoUrl?: string): CachedCompanyLogoState {
  const [state, setState] = useState(() => readCachedState(logoUrl));

  useEffect(() => {
    if (!logoUrl) {
      setState({ failed: true });
      return;
    }

    const cached = readCachedState(logoUrl);
    if (cached.src || cached.failed) {
      setState(cached);
      return;
    }

    let cancelled = false;
    setState({ failed: false });
    void loadCompanyLogo(logoUrl).then((ok) => {
      if (cancelled) return;
      setState(ok ? { src: logoUrl, failed: false } : { failed: true });
    });

    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  const onLogoError = useCallback(() => {
    if (logoUrl) markCompanyLogoFailed(logoUrl);
    setState({ failed: true });
  }, [logoUrl]);

  return { ...state, onLogoError };
}
