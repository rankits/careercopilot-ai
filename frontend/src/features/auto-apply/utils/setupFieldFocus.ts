import type { SxProps, Theme } from '@/lib/material';

/** WCAG 2.5.5 — minimum 44×44px touch target (AA-030). */
export const setupTouchTargetSx: SxProps<Theme> = {
  minHeight: 44,
  minWidth: 44,
};

export const setupFieldHighlightSx: SxProps<Theme> = {
  outline: '2px solid',
  outlineColor: 'primary.main',
  outlineOffset: 2,
  borderRadius: 1,
};

export function focusSetupField(fieldId: string | null | undefined): void {
  if (!fieldId) return;
  requestAnimationFrame(() => {
    const element = document.getElementById(`setup-field-${fieldId}`);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    element.focus?.({ preventScroll: true });
    element.classList.add('setup-field-highlight');
    window.setTimeout(() => element.classList.remove('setup-field-highlight'), 2400);
  });
}

export function buildSetupDeepLink(sectionId: string, fieldId?: string): string {
  const params = new URLSearchParams({ section: sectionId });
  if (fieldId) params.set('field', fieldId);
  return `/auto-apply?${params.toString()}`;
}
