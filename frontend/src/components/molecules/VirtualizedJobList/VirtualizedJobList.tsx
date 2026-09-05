import CircularProgress from '@mui/material/CircularProgress';
import { observeElementRect, useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';

import {
  VirtualListItem,
  VirtualListLoadingMore,
  VirtualListRoot,
  VirtualListSpacer,
} from './styles';

/** Approximate JobCard row height including gap. */
const ESTIMATED_ROW_HEIGHT = 140;
const ROW_GAP_PX = 12;
const OVERSCAN = 6;
const FALLBACK_VIEWPORT = { width: 1024, height: 720 };
const DEFAULT_END_THRESHOLD = 6;

function findScrollParent(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;

  while (current) {
    const { overflowY } = getComputedStyle(current);
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

export interface VirtualizedJobListProps<TItem> {
  ariaLabel: string;
  endReachedThreshold?: number;
  getKey: (item: TItem) => string;
  /** Shows a compact spinner under the list while the next page loads. */
  isLoadingMore?: boolean;
  items: TItem[];
  loadingMoreLabel?: string;
  onEndReached?: () => void;
  renderItem: (item: TItem) => ReactNode;
}

export function VirtualizedJobList<TItem>({
  ariaLabel,
  endReachedThreshold = DEFAULT_END_THRESHOLD,
  getKey,
  isLoadingMore = false,
  items,
  loadingMoreLabel = 'Loading more jobs…',
  onEndReached,
  renderItem,
}: VirtualizedJobListProps<TItem>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const endReachedIndexRef = useRef(-1);

  const getScrollElement = useCallback(() => {
    const scrollParent = findScrollParent(parentRef.current);
    return scrollParent ?? parentRef.current;
  }, []);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    gap: ROW_GAP_PX,
    overscan: OVERSCAN,
    getItemKey: (index) => getKey(items[index] as TItem),
    initialRect: FALLBACK_VIEWPORT,
    measureElement: (element) => element.getBoundingClientRect().height,
    // jsdom reports 0x0; keep a usable viewport until real layout exists.
    observeElementRect: (instance, cb) =>
      observeElementRect(instance, (rect) => {
        cb({
          width: rect.width || FALLBACK_VIEWPORT.width,
          height: rect.height || FALLBACK_VIEWPORT.height,
        });
      }),
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    endReachedIndexRef.current = -1;
  }, [items.length]);

  useEffect(() => {
    if (!onEndReached || items.length === 0 || isLoadingMore) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    const thresholdIndex = Math.max(0, items.length - endReachedThreshold);
    if (lastItem.index < thresholdIndex) return;
    if (endReachedIndexRef.current === items.length) return;

    endReachedIndexRef.current = items.length;
    onEndReached();
  }, [endReachedThreshold, isLoadingMore, items.length, onEndReached, virtualItems]);

  return (
    <VirtualListRoot aria-label={ariaLabel} ref={parentRef} role="list">
      <VirtualListSpacer style={{ height: virtualizer.getTotalSize() }}>
        {virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index];
          if (!item) return null;

          return (
            <VirtualListItem
              aria-posinset={virtualRow.index + 1}
              aria-setsize={items.length}
              data-index={virtualRow.index}
              key={virtualRow.key}
              ref={virtualizer.measureElement}
              role="listitem"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem(item)}
            </VirtualListItem>
          );
        })}
      </VirtualListSpacer>

      {isLoadingMore ? (
        <VirtualListLoadingMore aria-busy="true" aria-live="polite" role="status">
          <CircularProgress color="inherit" size={18} thickness={5} />
          {loadingMoreLabel}
        </VirtualListLoadingMore>
      ) : null}
    </VirtualListRoot>
  );
}
