import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

import type { AnalysisResult } from '@/services/resumeBuilder.service';
import { resumeBuilderService } from '@/services/resumeBuilder.service';

import type { ResumeBuilderStep as Step } from '../constants';
import { shouldBlockAnalyzeContinue } from '../utils';

export function useResumeBuilderNavigation({
  paramResumeId,
  resumeId,
  analysis,
  targetRole,
  jobDescription,
  discardDefineRoleDraft,
  onStartAnalysis,
  step: controlledStep,
  setStep: controlledSetStep,
}: {
  paramResumeId?: string;
  resumeId: string;
  analysis: AnalysisResult | null;
  targetRole: string;
  jobDescription: string;
  discardDefineRoleDraft: () => void;
  onStartAnalysis: () => void | Promise<void>;
  /** When provided, step is controlled by the caller (avoids circular hook init). */
  step?: Step;
  setStep?: Dispatch<SetStateAction<Step>>;
}) {
  const [internalStep, internalSetStep] = useState<Step>(paramResumeId ? 2 : 1);
  const step = controlledStep ?? internalStep;
  const setStep = controlledSetStep ?? internalSetStep;
  const [atsLeaveOpen, setAtsLeaveOpen] = useState(false);

  const goTo = useCallback(
    (s: Step) => {
      setStep(s);
      if (resumeId) resumeBuilderService.updateStep(resumeId, s).catch(() => {});
    },
    [resumeId, setStep],
  );

  const goBackToUpload = useCallback(() => {
    discardDefineRoleDraft();
    setStep(1);
  }, [discardDefineRoleDraft, setStep]);

  const analysisIncomplete = (() => {
    const status = String(analysis?.status || '').toUpperCase();
    return status !== 'COMPLETED' && status !== 'FAILED';
  })();

  const handleHeaderNext = () => {
    if (step === 1) {
      if (resumeId) setStep(2);
      return;
    }
    if (step === 2) {
      void onStartAnalysis();
      return;
    }
    if (step === 3) {
      if (String(analysis?.status || '').toUpperCase() !== 'COMPLETED') return;
      if (shouldBlockAnalyzeContinue(analysis)) return;
      goTo(5);
      return;
    }
    if (step === 4 || step === 5) {
      goTo(10);
      return;
    }
    goTo(Math.min(10, step + 1) as Step);
  };

  const confirmAtsLeave = useCallback(() => {
    setAtsLeaveOpen(false);
    setStep(2);
  }, [setStep]);

  const closeAtsLeaveDialog = useCallback(() => {
    setAtsLeaveOpen(false);
  }, []);

  const handleHeaderBack = () => {
    if (step === 1) return;
    if (step === 2) {
      goBackToUpload();
      return;
    }
    if (step === 3) {
      if (analysisIncomplete) {
        setAtsLeaveOpen(true);
        return;
      }
      setStep(2);
      return;
    }
    if (step === 4 || step === 5) {
      goTo(3);
      return;
    }
    if (step === 10) {
      // Export is terminal — no back to Optimize.
      return;
    }
    goTo(Math.max(1, step - 1) as Step);
  };

  const canContinue =
    step === 1
      ? Boolean(resumeId)
      : step === 2
        ? Boolean(targetRole.trim() && jobDescription.trim() && resumeId)
        : step === 3
          ? String(analysis?.status || '').toUpperCase() === 'COMPLETED' &&
            !shouldBlockAnalyzeContinue(analysis)
          : true;

  return {
    step,
    setStep,
    goTo,
    goBackToUpload,
    handleHeaderNext,
    handleHeaderBack,
    canContinue,
    atsLeaveOpen,
    confirmAtsLeave,
    closeAtsLeaveDialog,
  };
}
