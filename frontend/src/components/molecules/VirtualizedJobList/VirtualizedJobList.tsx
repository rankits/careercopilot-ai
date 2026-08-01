import { observeElementRect, useVirtualizer } from '@tanstack/react-virtual';
import { useRef, type ReactNode } from 'react';

import { VirtualListItem, VirtualListRoot, VirtualListSpacer } from './styles';

/** Approximate JobCard row height including gap. */
const ESTIMATED_ROW_HEIGHT = 140;
const ROW_GAP_PX = 12;
const OVERSCAN = 6;
const FALLBACK_VIEWPORT = { width: 1024, height: 720 };

export interface VirtualizedJobListProps<TItem> {
  ariaLabel: string;
  getKey: (item: TItem) => string;
  items: TItem[];
  renderItem: (item: TItem) => ReactNode;
}

export function VirtualizedJobList<TItem>({
  ariaLabel,
  getKey,
  items,
  renderItem,
}: VirtualizedJobListProps<TItem>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    gap: ROW_GAP_PX,
    overscan: OVERSCAN,
    getItemKey: (index) => getKey(items[index] as TItem),
    initialRect: FALLBACK_VIEWPORT,
    // jsdom reports 0x0; keep a usable viewport until real layout exists.
    observeElementRect: (instance, cb) =>
      observeElementRect(instance, (rect) => {
        cb({
          width: rect.width || FALLBACK_VIEWPORT.width,
          height: rect.height || FALLBACK_VIEWPORT.height,
        });
      }),
  });

  return (
    <VirtualListRoot aria-label={ariaLabel} ref={parentRef}>
      <VirtualListSpacer style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          if (!item) return null;

          return (
            <VirtualListItem
              data-index={virtualRow.index}
              key={virtualRow.key}
              style={{
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem(item)}
            </VirtualListItem>
          );
        })}
      </VirtualListSpacer>
    </VirtualListRoot>
  );
}
