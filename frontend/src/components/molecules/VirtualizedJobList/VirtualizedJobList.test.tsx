import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VirtualizedJobList } from './VirtualizedJobList';

describe('VirtualizedJobList', () => {
  it('renders only a window of rows for large lists using stable keys', () => {
    const items = Array.from({ length: 200 }, (_, index) => ({
      id: `job-${index}`,
      title: `Role ${index}`,
    }));

    const { container } = render(
      <div style={{ height: 400, overflow: 'auto' }}>
        <VirtualizedJobList
          ariaLabel="Job feed results"
          getKey={(item) => item.id}
          items={items}
          renderItem={(item) => <div>{item.title}</div>}
        />
      </div>,
    );

    expect(screen.getByLabelText(/job feed results/i)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /job feed results/i })).toBeInTheDocument();
    expect(screen.getByText('Role 0')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('aria-setsize', '200');
    expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('aria-posinset', '1');
    // Windowed render: far rows are not all mounted at once.
    expect(screen.queryByText('Role 199')).not.toBeInTheDocument();
    const mounted = container.querySelectorAll('[data-index]').length;
    expect(mounted).toBeGreaterThan(0);
    expect(mounted).toBeLessThan(80);
  });
});
