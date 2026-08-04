import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  KeyboardArrowDownIcon,
  SmartToyOutlinedIcon,
  useMediaQuery,
} from '@/lib/material';

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

export function JobFilterBar({ filters, onFilterClick }: JobFilterBarProps) {
  const isCompact = useMediaQuery(COMPACT_QUERY);
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    setCanScrollLeft(track.scrollLeft > 2);
    setCanScrollRight(track.scrollLeft < maxScrollLeft - 2);
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
    const amount = Math.max(track.clientWidth * SCROLL_STEP_RATIO, 160);
    track.scrollBy({ behavior: 'smooth', left: direction * amount });
  };

  return (
    <FilterShell>
      {isCompact ? (
        <FilterScrollButton
          aria-label="Scroll filters left"
          disabled={!canScrollLeft}
          onClick={() => scrollByDirection(-1)}
          type="button"
        >
          <ChevronLeftIcon fontSize="small" />
        </FilterScrollButton>
      ) : null}

      <FilterTrack aria-label="Job filters" ref={trackRef}>
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
          aria-label="Scroll filters right"
          disabled={!canScrollRight}
          onClick={() => scrollByDirection(1)}
          type="button"
        >
          <ChevronRightIcon fontSize="small" />
        </FilterScrollButton>
      ) : null}
    </FilterShell>
  );
}
