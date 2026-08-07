
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useCallback, useEffect, useRef, useState } from 'react';

import { JOB_FILTER_BAR_COPY, JOB_FILTER_BAR_SCROLL } from '@/constants/ui';

import { FilterButton, FilterScrollButton, FilterShell, FilterTrack } from './styles';

export interface JobFilter {
  active?: boolean;
  icon?: 'ai';
  id: string;
  label: string;
  menu?: boolean;
}

export interface JobFilterBarProps {
  filters: JobFilter[];
  onFilterClick?: (filter: JobFilter) => void;
}

const COMPACT_QUERY = '(max-width: 47.5rem)';
const SCROLL_STEP_RATIO = 0.75;

interface ScrollState {
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

const NO_SCROLL_STATE: ScrollState = { canScrollLeft: false, canScrollRight: false };

export function JobFilterBar({ filters, onFilterClick }: JobFilterBarProps) {
  const isCompact = useMediaQuery(COMPACT_QUERY);
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState<ScrollState>(NO_SCROLL_STATE);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) {
      setScrollState(NO_SCROLL_STATE);
      return;
    }

    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    setScrollState({
      canScrollLeft: track.scrollLeft > JOB_FILTER_BAR_SCROLL.edgeThresholdPx,
      canScrollRight: track.scrollLeft < maxScrollLeft - JOB_FILTER_BAR_SCROLL.edgeThresholdPx,
    });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    updateScrollState();
    track.addEventListener('scroll', updateScrollState, { passive: true });

    const resizeObserver = new ResizeObserver(() => updateScrollState());
    resizeObserver.observe(track);

    return () => {
      track.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [filters, updateScrollState]);

  const scrollByDirection = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const amount = Math.max(track.clientWidth * SCROLL_STEP_RATIO, JOB_FILTER_BAR_SCROLL.minStepPx);
    track.scrollBy({ behavior: 'smooth', left: direction * amount });
  };

  return (
    <FilterShell>
      {isCompact ? (
        <FilterScrollButton
          aria-label={JOB_FILTER_BAR_COPY.scrollLeftAria}
          disabled={!scrollState.canScrollLeft}
          onClick={() => scrollByDirection(-1)}
          type="button"
        >
          <ChevronLeftIcon fontSize="small" />
        </FilterScrollButton>
      ) : null}

      <FilterTrack aria-label={JOB_FILTER_BAR_COPY.trackAria} ref={trackRef}>
        {filters.map((filter) => (
          <FilterButton
            active={Boolean(filter.active)}
            aria-pressed={Boolean(filter.active)}
            key={filter.id}
            onClick={() => onFilterClick?.(filter)}
            type="button"
          >
            {filter.icon === 'ai' ? <SmartToyOutlinedIcon fontSize="small" /> : null}
            {filter.label}
            {filter.menu ? <KeyboardArrowDownIcon fontSize="small" /> : null}
          </FilterButton>
        ))}
      </FilterTrack>

      {isCompact ? (
        <FilterScrollButton
          aria-label={JOB_FILTER_BAR_COPY.scrollRightAria}
          disabled={!scrollState.canScrollRight}
          onClick={() => scrollByDirection(1)}
          type="button"
        >
          <ChevronRightIcon fontSize="small" />
        </FilterScrollButton>
      ) : null}
    </FilterShell>
  );
}
