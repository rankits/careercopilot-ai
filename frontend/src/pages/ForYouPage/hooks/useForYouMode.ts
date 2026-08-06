import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { getModeFromSearchParams, recommendationModes, type RecommendationMode } from '../utils';

export function useForYouMode() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeMode = getModeFromSearchParams(searchParams);
  const similarSourceJobId = searchParams.get('jobId') || undefined;
  const activeModeMeta =
    recommendationModes.find((mode) => mode.id === activeMode) ?? recommendationModes[0]!;
  const [page, setPage] = useState(1);
  const modeTabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectMode = useCallback(
    (mode: RecommendationMode) => {
      setPage(1);
      const nextParams = new URLSearchParams(searchParams);

      if (mode === 'profile') {
        nextParams.delete('mode');
      } else {
        nextParams.set('mode', mode);
      }

      if (mode !== 'similar') {
        nextParams.delete('jobId');
      }

      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams],
  );

  const focusModeTab = useCallback(
    (index: number) => {
      const nextIndex = (index + recommendationModes.length) % recommendationModes.length;
      const mode = recommendationModes[nextIndex];
      if (!mode) return;

      selectMode(mode.id);
      window.setTimeout(() => modeTabRefs.current[nextIndex]?.focus(), 0);
    },
    [selectMode],
  );

  const handleModeTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          focusModeTab(index - 1);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          focusModeTab(index + 1);
          break;
        case 'Home':
          event.preventDefault();
          focusModeTab(0);
          break;
        case 'End':
          event.preventDefault();
          focusModeTab(recommendationModes.length - 1);
          break;
        default:
          break;
      }
    },
    [focusModeTab],
  );

  return {
    activeMode,
    activeModeMeta,
    similarSourceJobId,
    page,
    setPage,
    selectMode,
    handleModeTabKeyDown,
    modeTabRefs,
  };
}
