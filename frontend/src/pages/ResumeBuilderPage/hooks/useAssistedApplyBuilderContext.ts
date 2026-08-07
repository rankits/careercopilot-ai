import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { autoApplyService } from '@/features/auto-apply/services/autoApply.service';
import { extractJobApplicationIdFromReturnTo } from '@/features/auto-apply/utils/returnToNavigation';

import type { ResumeBuilderStep as Step } from '../constants';
import { getApiErrorMessage } from '../utils';

import { skillsKeyOf, type CleanSnapshot } from './resumeBuilder.shared';

type ShowToast = (input: {
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
  autoHideDuration?: number;
}) => void;

function decodeHtml(value: string) {
  if (typeof document === 'undefined') {
    return value
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ');
  }
  const el = document.createElement('textarea');
  el.innerHTML = value;
  return el.value;
}

export function useAssistedApplyBuilderContext({
  searchParams,
  showToast,
  editedContentRef,
  setStep,
  setTargetRole,
  setIndustry,
  setEmploymentType,
  setExperienceLevel,
  setSkills,
  setJobDescription,
  setCleanSnapshot,
}: {
  searchParams: URLSearchParams;
  showToast: ShowToast;
  editedContentRef: React.MutableRefObject<string>;
  setStep: Dispatch<SetStateAction<Step>>;
  setTargetRole: Dispatch<SetStateAction<string>>;
  setIndustry: Dispatch<SetStateAction<string>>;
  setEmploymentType: Dispatch<SetStateAction<string>>;
  setExperienceLevel: Dispatch<SetStateAction<'entry' | 'mid' | 'senior' | 'lead' | 'executive'>>;
  setSkills: Dispatch<SetStateAction<string[]>>;
  setJobDescription: Dispatch<SetStateAction<string>>;
  setCleanSnapshot: Dispatch<SetStateAction<CleanSnapshot>>;
}) {
  const [assistedApplyContextNotice, setAssistedApplyContextNotice] = useState(false);
  /** Job application id whose context was successfully applied (not merely requested). */
  const assistedApplyHydratedForRef = useRef<string | null>(null);

  const assistedApplySource = searchParams.get('source');
  const assistedApplyJobApplicationId =
    searchParams.get('jobApplicationId') ||
    extractJobApplicationIdFromReturnTo(searchParams.get('returnTo'));

  useEffect(() => {
    const fromAssistedApply =
      assistedApplySource === 'assisted-apply' || Boolean(assistedApplyJobApplicationId);
    if (!fromAssistedApply || !assistedApplyJobApplicationId) return;
    if (assistedApplyHydratedForRef.current === assistedApplyJobApplicationId) return;

    let cancelled = false;

    void (async () => {
      try {
        const ctx = await autoApplyService.getResumeBuilderContext(assistedApplyJobApplicationId);
        if (cancelled) return;

        const nextRole = (ctx.targetRole || '').trim();
        const nextJd = decodeHtml(ctx.jobDescription || '').trim();
        const nextSkills = ctx.skills ?? [];
        const nextIndustry = ctx.industry ?? '';
        const nextEmployment = ctx.employmentType ?? '';
        const nextLevel = ctx.experienceLevel || 'mid';

        setTargetRole(nextRole);
        setIndustry(nextIndustry);
        setEmploymentType(nextEmployment);
        setExperienceLevel(nextLevel);
        setSkills(nextSkills);
        setJobDescription(nextJd);
        setAssistedApplyContextNotice(true);
        setStep(2);
        setCleanSnapshot({
          content: editedContentRef.current,
          targetRole: nextRole,
          jobDescription: nextJd,
          skillsKey: skillsKeyOf(nextSkills),
          skills: [...nextSkills],
        });
        assistedApplyHydratedForRef.current = assistedApplyJobApplicationId;
      } catch (error) {
        if (cancelled) return;
        showToast({
          message: `Could not load Assisted Apply job details: ${getApiErrorMessage(error)}`,
          severity: 'warning',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    assistedApplyJobApplicationId,
    assistedApplySource,
    editedContentRef,
    setCleanSnapshot,
    setEmploymentType,
    setExperienceLevel,
    setIndustry,
    setJobDescription,
    setSkills,
    setStep,
    setTargetRole,
    showToast,
  ]);

  return {
    assistedApplyContextNotice,
    setAssistedApplyContextNotice,
    assistedApplyHydratedForRef,
    assistedApplyJobApplicationId:
      assistedApplyJobApplicationId &&
      (assistedApplySource === 'assisted-apply' || assistedApplyJobApplicationId)
        ? assistedApplyJobApplicationId
        : extractJobApplicationIdFromReturnTo(searchParams.get('returnTo')),
  };
}
