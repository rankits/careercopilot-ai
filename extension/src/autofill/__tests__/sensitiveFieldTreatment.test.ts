import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { PreviewDrawer } from '../../content/components/PreviewDrawer.js';

describe('sensitiveFieldTreatment', () => {
  it('does not render a checkbox for sensitive fields and shows proper text', () => {
    const mockOnConfirm = vi.fn();
    const mockOnCancel = vi.fn();
    const fields = [
      {
        identifier: 'normal_field',
        tagName: 'input',
        type: 'text',
        label: 'First Name',
        isSensitive: false,
      },
      {
        identifier: 'sensitive_field',
        tagName: 'select',
        type: 'select-one',
        label: 'Race/Ethnicity',
        isSensitive: true,
      },
    ];

    // We pass an empty answer for normal_field so it renders as 'Not answered yet'
    const answers = {};

    // Mock chrome.runtime
    (global as any).chrome = {
      runtime: {
        sendMessage: vi.fn(),
      },
    };

    const html = renderToString(
      React.createElement(PreviewDrawer, {
        fields,
        answers,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      }),
    );

    // sensitive_field should have "Answer this yourself"
    expect(html).toContain('Answer this yourself');

    // For sensitive_field, there shouldn't be an input checkbox for it.
    // Wait, since we are doing static string checks, let's just assert that it contains the text.
    expect(html).toContain('Race/Ethnicity');
    expect(html).toContain('First Name');

    // We can count checkboxes. One for the normal field, zero for the sensitive field.
    const checkboxMatches = html.match(/type="checkbox"/g);
    expect(checkboxMatches).toHaveLength(1);
  });
});
