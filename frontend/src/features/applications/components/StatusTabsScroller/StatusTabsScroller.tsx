import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import {
  StatusTabsFade,
  StatusTabsRow,
  StatusTabsScrollButton,
  StatusTabsScrollerRoot,
  StatusTabsTrack,
} from './styles';

export interface StatusTabsScrollerProps {
  activeTabId: string;
  children: ReactNode;
}

export function StatusTabsScroller({ activeTabId, children }: StatusTabsScrollerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    const overflow = element.scrollWidth > element.clientWidth + 1;
    setHasOverflow(overflow);
    setCanScrollLeft(element.scrollLeft > 1);
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    updateScrollState();

    let resizeObserver: ResizeObserver | undefined;

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateScrollState);
      resizeObserver.observe(element);
    }

    element.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      resizeObserver?.disconnect();
      element.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, children]);

  useEffect(() => {
    const element = scrollRef.current;
    const activeTab = element?.querySelector<HTMLElement>(`[data-status-tab="${activeTabId}"]`);

    if (typeof activeTab?.scrollIntoView === 'function') {
      activeTab.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTabId]);

  const scrollTabs = (direction: 'left' | 'right') => {
    const scrollDistance =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 47.5rem)').matches
        ? 180
        : 280;

    scrollRef.current?.scrollBy({
      behavior: 'smooth',
      left: direction === 'left' ? -scrollDistance : scrollDistance,
    });
  };

  return (
    <StatusTabsScrollerRoot>
      {hasOverflow ? (
        <StatusTabsScrollButton
          aria-label="Scroll status tabs backward"
          disabled={!canScrollLeft}
          onClick={() => scrollTabs('left')}
        >
          <ChevronLeftIcon fontSize="small" />
        </StatusTabsScrollButton>
      ) : null}

      <StatusTabsTrack>
        {hasOverflow ? <StatusTabsFade edge="left" visible={canScrollLeft} /> : null}

        <StatusTabsRow aria-label="Application status tabs" ref={scrollRef} role="tablist">
          {children}
        </StatusTabsRow>

        {hasOverflow ? <StatusTabsFade edge="right" visible={canScrollRight} /> : null}
      </StatusTabsTrack>

      {hasOverflow ? (
        <StatusTabsScrollButton
          aria-label="Scroll status tabs forward"
          disabled={!canScrollRight}
          onClick={() => scrollTabs('right')}
        >
          <ChevronRightIcon fontSize="small" />
        </StatusTabsScrollButton>
      ) : null}
    </StatusTabsScrollerRoot>
  );
}
