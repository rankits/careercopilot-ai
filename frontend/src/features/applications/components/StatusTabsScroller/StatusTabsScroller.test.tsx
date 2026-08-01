import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { applicationStatusTabs } from '@/constants/pages/applications';

import { StatusTabsScroller } from './StatusTabsScroller';

describe('StatusTabsScroller', () => {
  it('renders status tabs inside a tablist', () => {
    render(
      <StatusTabsScroller activeTabId="all">
        {applicationStatusTabs.map((tab) => (
          <button data-status-tab={tab.id} key={tab.id} type="button">
            {tab.label}
          </button>
        ))}
      </StatusTabsScroller>,
    );

    expect(screen.getByRole('tablist', { name: /application status tabs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^screening$/i })).toBeInTheDocument();
  });
});
