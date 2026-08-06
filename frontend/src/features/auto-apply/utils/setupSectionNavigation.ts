import type { AutoApplyTabId } from '@/pages/AutoApplyPage/missingFieldNavigation';

import type { SetupSectionId } from '../types/autoApply.types';

/** Maps setup-status section ids to existing Application Setup tabs (AA-020). */
export const SETUP_SECTION_TO_TAB: Record<SetupSectionId, AutoApplyTabId> = {
  personal: 'profile',
  'work-auth': 'answers',
  preferences: 'profile',
  links: 'profile',
  answers: 'answers',
  resumes: 'resumes',
  education: 'profile',
  consents: 'consents',
  extension: 'profile',
};

export function tabForSetupSection(sectionId: string | null | undefined): AutoApplyTabId | null {
  if (!sectionId) return null;
  if (sectionId in SETUP_SECTION_TO_TAB) {
    return SETUP_SECTION_TO_TAB[sectionId as SetupSectionId];
  }
  return null;
}

export function firstIncompleteRequiredSectionId(
  sections: Array<{ id: SetupSectionId; complete: boolean; required: boolean }>,
): SetupSectionId | null {
  const incompleteRequired = sections.find((s) => s.required && !s.complete);
  if (incompleteRequired) return incompleteRequired.id;
  return sections[0]?.id ?? null;
}
