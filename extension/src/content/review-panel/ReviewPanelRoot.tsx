import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReviewPanel } from './components/ReviewPanel';
import { FieldInfo } from './components/ReviewFieldList';
import { fillFormFields } from '../index';

let drawerRoot: ReturnType<typeof createRoot> | null = null;

export function mountReviewPanel(
  fields: FieldInfo[],
  answers: Record<string, string>,
  vaultKeys: Record<string, string | null> = {},
  contentGenerationAllowed: boolean = false,
) {
  let container = document.getElementById('career-copilot-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'career-copilot-root';
    document.body.appendChild(container);
  }

  let shadowRoot = container.shadowRoot;
  if (!shadowRoot) {
    shadowRoot = container.attachShadow({ mode: 'open' });
  }

  let mountPoint = shadowRoot.getElementById('drawer-mount');
  if (!mountPoint) {
    mountPoint = document.createElement('div');
    mountPoint.id = 'drawer-mount';
    shadowRoot.appendChild(mountPoint);
  }

  if (!drawerRoot) {
    drawerRoot = createRoot(mountPoint);
  }

  const handleConfirm = async (selectedAnswers: Record<string, string>) => {
    // Actual autofill execution with Resume upload support
    await fillFormFields(selectedAnswers);
    closeReviewPanel();
  };

  const handleCancel = () => {
    closeReviewPanel();
  };

  drawerRoot.render(
    <ReviewPanel
      fields={fields}
      answers={answers}
      vaultKeys={vaultKeys}
      contentGenerationAllowed={contentGenerationAllowed}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />,
  );
}

export function closeReviewPanel() {
  if (drawerRoot) {
    drawerRoot.unmount();
    drawerRoot = null;
  }
  const container = document.getElementById('career-copilot-root');
  if (container) {
    container.remove();
  }
}
