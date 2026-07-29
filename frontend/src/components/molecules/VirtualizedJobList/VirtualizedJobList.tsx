import type { ReactNode } from 'react';

import { VirtualListItem, VirtualListRoot } from './styles';

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
  return (
    <VirtualListRoot aria-label={ariaLabel}>
      {items.map((item) => (
        <VirtualListItem key={getKey(item)}>{renderItem(item)}</VirtualListItem>
      ))}
    </VirtualListRoot>
  );
}
